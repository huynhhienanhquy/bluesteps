"""Build dispatchable planning packets and gated implementation work from reviewed inputs."""
from pathlib import Path
from collections import defaultdict
import hashlib
import json
import re
import sys

ROOT=Path(__file__).resolve().parents[1]

def write(name,data):
    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n' if not isinstance(data,str) else data,encoding='utf-8')

def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
def digest(name):return hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
def ref(name):return {'$ref':'#/components/schemas/'+name}
def obj(props,required=None):return {'type':'object','additionalProperties':False,'properties':props,'required':required or list(props)}

def build_contracts():
    uid={'type':'string','format':'uuid'};text={'type':'string','minLength':1};points={'type':'string','pattern':'^(0|[1-9][0-9]*)$'}
    schemas={
      'Error':obj({'error':obj({'code':text,'message':text,'retryable':{'type':'boolean'},'requestId':text,'fieldErrors':{'type':'array','items':obj({'field':text,'message':text})}},['code','message','retryable','requestId'])}),
      'Liveness':obj({'status':{'const':'ok','type':'string'}}),
      'ScanSortingRequest':obj({'source':{'type':'string','const':'scan'},'scanId':uid,'itemId':uid}),
      'ManualSortingRequest':obj({'source':{'type':'string','const':'manual'},'itemId':uid}),
      'SortingRequest':{'oneOf':[ref('ScanSortingRequest'),ref('ManualSortingRequest')],'discriminator':{'propertyName':'source','mapping':{'scan':'#/components/schemas/ScanSortingRequest','manual':'#/components/schemas/ManualSortingRequest'}}},
      'NoAward':obj({'status':{'type':'string','const':'not_awarded'},'points':{'type':'string','const':'0'},'ruleVersion':{'type':['string','null']},'reason':{'type':'string','enum':['POLICY_NOT_ENABLED','SOURCE_INELIGIBLE','LIMIT_REACHED']}}),
      'PendingAward':obj({'status':{'type':'string','const':'pending_review'},'points':{'type':'string','const':'0'},'ruleVersion':{'type':['string','null']},'reason':{'type':'string','const':'PENDING_REVIEW'}}),
      'GrantedAward':obj({'status':{'type':'string','const':'awarded'},'points':{'type':'string','pattern':'^[1-9][0-9]*$'},'ruleVersion':{'type':'string','minLength':1},'reason':{'type':'string','const':'AWARDED'}}),
      'SortingAward':{'oneOf':[ref('NoAward'),ref('PendingAward'),ref('GrantedAward')]},
      'SortingResponse':obj({'actionId':uid,'itemId':uid,'evidenceStatus':{'type':'string','enum':['user_confirmed','self_reported']},'award':ref('SortingAward'),'walletBalance':points},['actionId','itemId','evidenceStatus','award']),
      'LoginRequest':obj({'email':{'type':'string','format':'email','maxLength':254},'password':{'type':'string','minLength':1,'maxLength':128},'deviceLabel':{'type':'string','minLength':1,'maxLength':100}},['email','password']),
      'RefreshRequest':obj({'refreshToken':{'type':'string','minLength':32,'maxLength':1024}}),
      'TokenPair':obj({'accessToken':text,'refreshToken':text,'tokenType':{'type':'string','const':'Bearer'},'expiresIn':{'type':'integer','minimum':1},'sessionId':uid}),
      'Session':obj({'id':uid,'deviceLabel':{'type':['string','null']},'isCurrent':{'type':'boolean'},'createdAt':{'type':'string','format':'date-time'},'lastSeenAt':{'type':['string','null'],'format':'date-time'}}),
      'SessionList':obj({'items':{'type':'array','items':ref('Session')}}),
      'ReviewDecision':obj({'decision':{'type':'string','enum':['approve','reject']},'reason':{'type':'string','minLength':1,'maxLength':2000},'expectedVersion':{'type':'integer','minimum':1}}),
      'ReviewResult':obj({'id':uid,'status':{'type':'string','enum':['approved','rejected']},'version':{'type':'integer','minimum':2},'reviewedAt':{'type':'string','format':'date-time'}})}
    paths={}
    def operation(path,method,opid,request=None,response=None,status='200',public=False,params=None,errors=None):
        op={'operationId':opid,'tags':[opid.split('_')[0]],'security':[] if public else [{'BearerAuth':[]}],
            'responses':{status:{'description':'Success','content':{'application/json':{'schema':ref(response)}}} if response else {'description':'Success without response body'}}}
        if request:op['requestBody']={'required':True,'content':{'application/json':{'schema':ref(request)}}}
        if params:op['parameters']=params
        for code in errors or ([] if public and path=='/health/live' else ['401','403','422','429','503']):
            op['responses'][code]={'description':'Error envelope; see x-error-codes','content':{'application/json':{'schema':ref('Error')}}}
        paths.setdefault(path,{})[method]=op
        return op
    operation('/health/live','get','health_live',response='Liveness',public=True)
    operation('/v1/auth/login','post','auth_login','LoginRequest','TokenPair',public=True,errors=['401','422','429','503'])
    operation('/v1/auth/refresh','post','auth_refresh','RefreshRequest','TokenPair',public=True,errors=['401','422','429','503'])
    operation('/v1/auth/logout','post','auth_logout',status='204',errors=['401','429','503'])
    operation('/v1/me/sessions','get','auth_list_sessions',response='SessionList')
    operation('/v1/me/sessions/{id}','delete','auth_revoke_session',status='204',params=[{'name':'id','in':'path','required':True,'schema':uid}],errors=['401','404','422','429','503'])
    op=operation('/v1/sorting-actions','post','sorting_create','SortingRequest','SortingResponse','201',params=[{'name':'Idempotency-Key','in':'header','required':True,'schema':{'type':'string','minLength':16,'maxLength':128}}],errors=['401','404','409','422','429','503'])
    op['x-error-codes']={'401':['AUTH_REQUIRED','SESSION_REVOKED'],'404':['SCAN_NOT_FOUND','ITEM_NOT_FOUND'],'409':['SCAN_NOT_READY','SOURCE_ALREADY_RECORDED','IDEMPOTENCY_CONFLICT'],'422':['VALIDATION_ERROR'],'429':['RATE_LIMITED'],'503':['SERVICE_UNAVAILABLE']}
    op['x-business-gate']={'decisionId':'DEC05','recordActionWithoutAward':True,'awardUntilApprovedPolicy':'not_awarded / 0 / POLICY_NOT_ENABLED'}
    for name in ['point-proposals','point-reports']:
        moderation=operation('/v1/admin/'+name+'/{id}/decision','post','moderation_'+name.replace('-','_')+'_decision','ReviewDecision','ReviewResult',params=[{'name':'id','in':'path','required':True,'schema':uid}],errors=['401','403','404','409','422','429','503'])
        moderation['x-authorization']={'role':'moderator','resourceScope':name,'deny':'403 without scope; 404 unavailable record; member cannot approve own request','concurrency':'expectedVersion compare-and-swap; stale/repeated decision409'}
    api={'openapi':'3.1.0','info':{'title':'BlueSteps pinned bootstrap/auth/sorting/moderation contracts','version':'0.2.0','description':'Design contract only; no server deployed. Python owns identity, Supabase is database. Other operations require their capability contract packet.'},
      'paths':paths,'components':{'securitySchemes':{'BearerAuth':{'type':'http','scheme':'bearer','bearerFormat':'JWT'}},'schemas':schemas},
      'x-source-page-id':'386:7053','x-contract-status':'specified_design_not_runtime_verified'}
    write('contracts/core.openapi.json',api)
    u='11111111-1111-4111-8111-111111111111';v='22222222-2222-4222-8222-222222222222'
    write('contracts/examples.json',{'schemaFile':'core.openapi.json','valid':[
      {'schema':'SortingRequest','value':{'source':'scan','scanId':u,'itemId':v}},
      {'schema':'SortingRequest','value':{'source':'manual','itemId':v}},
      {'schema':'SortingResponse','value':{'actionId':u,'itemId':v,'evidenceStatus':'user_confirmed','award':{'status':'not_awarded','points':'0','ruleVersion':None,'reason':'POLICY_NOT_ENABLED'}}},
      {'schema':'LoginRequest','value':{'email':'member@example.test','password':'fixture-password'}},
      {'schema':'ReviewDecision','value':{'decision':'reject','reason':'Fixture duplicate location','expectedVersion':1}}],
      'invalid':[
      {'schema':'SortingRequest','value':{'source':'scan','scanId':u,'confirmedCategory':'recyclable'}},
      {'schema':'SortingRequest','value':{'source':'manual','itemId':v,'scanId':u}},
      {'schema':'SortingRequest','value':{'source':'scan','scanId':u,'itemId':v,'points':500}},
      {'schema':'SortingRequest','value':{'source':'manual','itemId':v,'confirmedItemId':v}},
      {'schema':'SortingRequest','value':{'source':'scan','scanId':'bad-id','itemId':v}},
      {'schema':'ReviewDecision','value':{'decision':'approve','reason':'','expectedVersion':1}},
      {'schema':'SortingResponse','value':{'actionId':u,'itemId':v,'evidenceStatus':'user_confirmed','award':{'status':'awarded','points':'0','ruleVersion':None,'reason':'AWARDED'}}},
      {'schema':'SortingResponse','value':{'actionId':u,'itemId':v,'evidenceStatus':'user_confirmed','award':{'status':'not_awarded','points':'5','ruleVersion':None,'reason':'POLICY_NOT_ENABLED'}}}]})

def operation_inventory():
    text=(ROOT/'03-backend-and-api.md').read_text(encoding='utf-8')
    rows=[]
    for line in text.splitlines():
        if not line.startswith('| ') or '`' not in line:continue
        first=line.split('| ')[1] if False else line[2:].split(' | ')[0]
        # Backticks delimit complete paths, including alternatives containing '|'.
        matches=list(re.finditer(r'`([^`]+)`',first));methods=[];previous=0
        for m in matches:
            before=first[previous:m.start()];found=re.findall(r'\b(?:GET|POST|PUT|PATCH|DELETE)\b',before)
            if found:methods=found
            previous=m.end();path=m.group(1)
            if not path.startswith('/') or '*' in path:continue
            if '[/{id}]' in path:
                paths=[path.replace('[/{id}]',''),path.replace('[/{id}]','/{id}')]
                combos=[(p,met) for p in paths for met in methods if (p.endswith('/{id}') and met in ['GET','PATCH','DELETE']) or (not p.endswith('/{id}') and met in ['GET','POST'])]
            elif '|' in path:
                head,tail=path.rsplit('/',1);combos=[(head+'/'+part,met) for part in tail.split('|') for met in methods]
            else:combos=[(path,met) for met in methods]
            for p,met in combos:rows.append((met,'/v1'+p))
    for resource in ['articles','waste-items','knowledge-sources','events','event-occurrences','event-roles','event-staff','rewards']:
        rows.extend([('POST','/v1/admin/'+resource),('PATCH','/v1/admin/'+resource+'/{id}')])
    rows.extend([('POST','/v1/admin/reward-inventory/{id}/adjustments'),('POST','/v1/admin/rewards/{id}/vouchers')])
    core=read('contracts/core.openapi.json')
    for p,ops in core['paths'].items():
        for method in ops:rows.append((method.upper(),p))
    entries=[]
    for method,path in sorted(set(rows)):
        opid=method.lower()+'_'+re.sub('[^a-zA-Z0-9]+','_',path).strip('_')
        canonical=core['paths'].get(path,{}).get(method.lower())
        if canonical:opid=canonical['operationId']
        owner='F03' if '/auth/' in path or '/me/sessions' in path else 'D03'
        entries.append({'operationId':opid,'method':method,'path':path,'ownerEpic':owner,
          'schemaStatus':'specified' if canonical else 'contract_task_required',
          'schemaRef':('core.openapi.json#/paths/'+path.replace('~','~0').replace('/','~1')+'/'+method.lower()) if canonical else None,
          'codeGenerationAllowed':bool(canonical),'sourcePageId':'386:7053',
          'requiredContractFields':['request/response/errors','actor-object authorization','pagination/version/timezone','fixtures and negative cases'],
          'role':'public' if canonical and canonical.get('security')==[] else ('scoped_operator' if '/admin/' in path or '/operator/' in path else 'contract_defined_actor')})
    assert entries and len({x['operationId'] for x in entries})==len(entries)
    write('contracts/operation-inventory.json',{'version':'0.2.0','scope':'backuped only','operations':entries,
      'note':'Concrete operation inventory. Entries marked contract_task_required are not executable schema and must not be generated as empty DTOs.'})
    return entries

def build_decisions():
    source=(ROOT/'06-decisions-and-gaps.md').read_text(encoding='utf-8')
    ds=[]
    for line in source.splitlines():
        if not re.match(r'\| DEC\d\d \|',line):continue
        cols=line.split(' | ');key=cols[0].replace('|','').strip()
        ds.append({'id':key,'status':'partially_resolved' if key=='DEC02' else 'product_input_pending',
          'question':cols[1],'candidate':cols[2],'impact':cols[3].rstrip(' |'),
          'owner':'product_owner' if key!='DEC02' else 'technical_lead',
          'safeIndependentWork':'Contract/adapter/schema design and synthetic fixtures; keep production behavior behind disabled configuration until required policy is recorded.',
          'mustNotInfer':'Do not turn Figma sample values or elapsed time into approval.'})
    for d in ds:
        if d['id'] in ['DEC02','DEC03','DEC04','DEC10','DEC12','DEC15','DEC21','DEC23']:
            d['status']='technical_default_recorded'
            d['owner']='technical_lead'
            d['resolutionScope']='Architecture/protocol defaults only; product sample numbers, live data, provider costs and release permission are not approved by this record.'
    ds.append({'id':'AUTH-OWNER','status':'confirmed','owner':'user','value':'Python Identity owns users/passwords/OTP/sessions/JWT; Supabase Database only',
       'evidence':'User reply: Python tự quản lý tài khoản, mật khẩu và session','supabaseAuthEnabled':False})
    write('execution/decisions.json',{'version':'0.2.0','decisions':ds,'technicalDefaults':{
      'framework':'FastAPI + Pydantic; local reversible baseline, pin versions in bootstrap',
      'dataAccess':'SQLAlchemy + psycopg, sync Session per request/job; no session sharing',
      'schema':'app_private, not exposed through Supabase Data API',
      'migrations':'supabase/migrations SQL, one owner; no Alembic/create_all production',
      'authOwner':'Python, confirmed by user',
      'sortingWire':'source + itemId; scanId only for scan; category/material/points derived server-side',
      'unapprovedPointPolicy':'Record action, award 0 with POLICY_NOT_ENABLED; earning feature stays disabled',
      'unresolvedProviders':'Fake adapters only in test/demo, explicit labels; no cloud credentials required for local foundation'}})

def auth_policy():
    write('contracts/auth-policy.json',{'version':'0.2.0','owner':'Python Identity, user-confirmed','supabaseAuthEnabled':False,
      'password':{'algorithm':'Argon2id via maintained password hashing library','minLength':8,'maxLength':128,'normalizeOrTrim':False,'rehashOnLogin':True,'neverLog':True},
      'accessToken':{'format':'JWT','algorithmAllowlist':['RS256'],'requiredClaims':['sub','sid','jti','iss','aud','iat','exp'],'keyIdRequired':True,'issuer':'bluesteps-python-api','audience':'bluesteps-mobile','ttlSeconds':900,'secretHandling':'Private signing keys only in server secret configuration; fail startup outside test if absent; no embedded development fallback'},
      'refreshToken':{'format':'opaque random token, at least 256 bits entropy','store':'SHA-256 token hash only','ttlSeconds':2592000,'rotation':'One-time compare-and-swap under transaction; consumed token retained as hash until family expiry','replay':'Consumed-token reuse revokes family including newly rotated token; mobile uses single-flight refresh; no silent grace window'},
      'session':{'activeStateChecked':'Every protected HTTP command/query and WS command must validate active user/session; signature alone is insufficient','revoke':'Owner can revoke own session; outsider gets404; logout revokes current session; family invalidation closes/rejects protected socket commands','mutableRoles':'Read roles/assignments from server state, not client role fields'},
      'challenge':{'code':'Six decimal digits','hash':'HMAC with server-held pepper, not a plaintext code or bare weak hash','ttlSeconds':300,'maxAttempts':5,'resendCooldownSeconds':60,'purposes':['verify_email','password_reset','email_change'],'singleUse':True,'purposeRecipientBinding':True,'rateLimit':'Per recipient hash + IP/device; config required; accepted response does not reveal existence'},
      'recovery':'Reset token is purpose-bound, short-lived, hash-stored and consumed atomically; password reset revokes all session families',
      'registration':'Contract packet specifies pending_email_verification flow and terms version; no active session before email proof; this is the recorded security default, not a Supabase Auth flow',
      'parameters':'These are explicit technical configuration defaults for the plan, not measured service guarantees. Changing policy requires versioned ADR, contract/fixture updates and regression tests.'})

def capabilities_and_packets(operations):
    cap_config=read('execution/capabilities.json')
    caps=cap_config['capabilities'];capids={r[0] for r in caps}
    assert len(capids)==len(caps)
    for row in caps:assert set(row[3])<=capids, row[0]
    visiting=set();done=set()
    def visit(k):
        assert k not in visiting,'Capability dependency cycle '+k
        if k in done:return
        visiting.add(k)
        for dep in next(r[3] for r in caps if r[0]==k):visit(dep)
        visiting.remove(k);done.add(k)
    for k in capids:visit(k)
    scopes=defaultdict(list)
    for trace in read('interface-task-traceability.json'):
        for e in trace['tasks']:scopes[e].append(trace['nodeId'])
    decisionmap={d['id']:d for d in read('execution/decisions.json')['decisions']}
    docs=['03-backend-and-api.md','04-database.md','08-tech-stack.md','09-python-supabase.md','11-agent-execution-guide.md','12-agent-start-here.md']
    docs=[d for d in docs if (ROOT/d).exists()]
    pins={p:digest(p) for p in docs+['execution/capabilities.json','execution/decisions.json','contracts/core.openapi.json','contracts/auth-policy.json','contracts/access-matrix.json']}
    def owner(op):
        p=op['path'];m=op['method']
        if p=='/health/live':return 'API-BASE'
        if '/auth/oauth' in p:return 'OAUTH-GOOGLE'
        if p in ['/v1/auth/login','/v1/auth/refresh','/v1/auth/logout'] or '/me/sessions' in p:return 'AUTH-TOKENS'
        rules=[('/auth/','AUTH-RECOVERY'),('/me/email-change','EMAIL-CHANGE'),('/me/password','EMAIL-CHANGE'),('/me/preferences','SETTINGS'),('/me/interests','ONBOARD-PREFS'),('/me/goals','ONBOARD-PREFS'),('/me/activity','PROFILE'),('/me/friends','SOCIAL-GRAPH'),('/users/','SOCIAL-GRAPH'),('/me/push-devices','NOTIFY-INBOX'),('/me/notifications','NOTIFY-INBOX'),('/me/wallet','WALLET-READ'),('/me/point-transactions','WALLET-READ'),('/me/daily-claims','DAILY-CLAIM'),('/me/redemptions','FULFILL'),('/me/tickets','TICKET'),('/me/registrations','REGISTRATION'),('/me/calendar','EVENT-CALENDAR'),('/me/saved-events','SAVED-CORE'),('/me/event-collections','COLLECTIONS'),('/me/event-reminders','EVENT-REMINDER'),('/me/reminders/daily','DAILY-REMINDER'),('/me/saved-posts','SOCIAL-ACTIONS'),('/me/follows','SOCIAL-GRAPH'),('/me/blocks','SOCIAL-GRAPH'),('/me/status-note','MOOD-NOTES'),('/status-notes','MOOD-NOTES'),('/me/badges','LEVELS'),('/me/statistics','STATS'),('/statistics/','STATS'),('/me/game-schedules','GAME-EXT-IMPLEMENT'),('/home','HOME'),('/bootstrap','ONBOARD-PREFS'),('/media/','MEDIA'),('/scans','SCAN-JOB'),('/sorting-actions','SORT-ACTION'),('/waste-','TAXONOMY'),('/point-proposals','PROPOSAL'),('/routes','ROUTE-EDIT'),('/tickets','TICKET'),('/registrations','REGISTRATION'),('/articles','NEWS'),('/content-metrics','NEWS'),('/posts','POSTS'),('/friendships','SOCIAL-GRAPH'),('/moderation-reports','SOCIAL-GRAPH'),('/conversations','CHAT-DATA'),('/assistant/transcriptions','VOICE'),('/assistant/','BOT'),('/point-rules','POINT-EARN'),('/levels','LEVELS'),('/leaderboard','LEVELS'),('/rewards','REWARD-CATALOG'),('/redemptions','REDEEM-ATOMIC'),('/game-schedules','GAME-EXT-IMPLEMENT'),('/game-rooms','GAME-LOBBY'),('/game-sessions','GAME-ENGINE'),('/games','GAME-ENGINE')]
        if '/admin/point-' in p or p=='/v1/admin/review-queue':return 'MODERATION'
        if '/operator/handovers/' in p:return 'HANDOVER-VERIFY'
        if '/operator/redemptions/' in p:return 'REFUND' if p.endswith('refund') else 'FULFILL'
        if '/admin/reward' in p:return 'REWARD-CATALOG'
        if '/admin/event' in p:return 'EVENT-DATA'
        if '/admin/' in p:return 'CONTENT-ADMIN'
        if '/collection-points/' in p and any(x in p for x in ['/reports','/reviews']):return 'POINT-REPORT'
        if p.endswith('/collection-points/compare'):return 'MAP-FILTER'
        if '/collection-points' in p:return 'POINTS-GEO'
        if p.endswith('/feedback'):return 'FEEDBACK'
        if p.endswith('/album') or p.endswith('/impact'):return 'EVENT-ALBUM'
        if '/events/' in p and '/registrations' in p:return 'REGISTRATION'
        if '/events' in p:return 'EVENT-DATA'
        if p=='/v1/me':return 'PROFILE'
        return next((target for prefix,target in rules if prefix in p),'CONTRACTS')
    opids=defaultdict(list)
    authored_pins=defaultdict(dict)
    for op in operations:
        c=owner(op);op['ownerCapability']=c;op['ownerEpic']=next(r[1] for r in caps if r[0]==c)
        op['contractPacket']=c+'-SPEC';opids[c].append(op['operationId'])
        if op['schemaStatus']!='specified':
            target='contracts/capabilities/'+c.lower()+'.openapi.json';op['expectedContractPath']=target
            if (ROOT/target).is_file():
                authored=read(target);detail=authored.get('paths',{}).get(op['path'],{}).get(op['method'].lower())
                if detail:
                    assert detail.get('operationId')==op['operationId'],'Authored operation ID must match inventory: '+op['operationId']
                    op['schemaStatus']='specified';op['codeGenerationAllowed']=True
                    op['schemaRef']=target.removeprefix('contracts/')+'#/paths/'+op['path'].replace('~','~0').replace('/','~1')+'/'+op['method'].lower()
                    authored_pins[c][target]=digest(target)
    write('contracts/operation-inventory.json',{'version':'0.2.0','operations':operations,'scope':'backuped only','note':'Each concrete operation has an owning contract packet. Unspecified operations must not produce placeholder DTOs or be dispatched to implementation before SPEC review.'})
    tasks=[]
    state_path=ROOT/'execution/task-state.json'
    stored=read('execution/task-state.json') if state_path.exists() else {'version':'0.2.0','taskStates':{}}
    state_rows=stored['taskStates']
    conditional={'CALL-IMPLEMENT':'S08','GAME-EXT-IMPLEMENT':'G03'}
    provided={'API-BASE'}
    for c,parent,title,deps,gates,interface,data,acceptance in caps:
        gates=[g for g in gates if decisionmap[g]['status'] not in ['confirmed','technical_default_recorded']]
        for stage in ['SPEC','BUILD','VERIFY']:
            tid=c+'-'+stage
            prerequisite=[d+'-SPEC' for d in deps] if stage=='SPEC' else ([c+'-SPEC']+[d+'-VERIFY' for d in deps] if stage=='BUILD' else [c+'-BUILD'])
            if stage in ['SPEC','BUILD']:prerequisite+=cap_config.get('sharedContractDependencies',{}).get(c,[])
            status='provided_design' if stage=='SPEC' and c in provided else 'not_started'
            ui_only={'UI-SPEC','MOBILE-BASE','UI-PRIMITIVES','NAVIGATION','ONBOARD-INTRO','ONBOARD-PERM','HANDBOOK-LIST','HANDBOOK-DETAIL','SCAN-CAMERA','MAP-UI','UI-AUDIT'}
            ui_required=c in ui_only or c in {'AUTH-RECOVERY','OAUTH-GOOGLE','OAUTH-FACEBOOK','ONBOARD-PREFS','PROFILE','SETTINGS','MAP-FILTER','HOME','WALLET-READ','LEVELS','DAILY-CLAIM','DAILY-REMINDER','REWARD-CATALOG','FULFILL','PROPOSAL','POINT-REPORT','ROUTE-PREVIEW','ROUTE-EDIT','HANDOVER','NOTIFY-INBOX','EVENT-DISCOVERY','EVENT-CALENDAR','REGISTRATION','TICKET','COLLECTIONS','EVENT-REMINDER','FEEDBACK','EVENT-ALBUM','NEWS','POSTS','SOCIAL-ACTIONS','CHAT-DATA','CHAT-MEDIA','MOOD-NOTES','VOICE','BOT','GAME-LOBBY','GAME-EXT-IMPLEMENT','STATS','CALL-IMPLEMENT'}
            backend=c not in ui_only
            domain=c.lower().replace('-','_')
            allowed=['contracts/capabilities/'+c.lower()+'.openapi.json','contracts/capabilities/'+c.lower()+'.schema.json','contracts/examples/'+c.lower()+'.json','execution/specs/'+c.lower()+'.md','execution/decisions.json'] if stage=='SPEC' else (
                 ['apps/api/src/bluesteps_api/modules/'+domain+'/','apps/api/tests/'+domain+'/','supabase/migrations/','packages/backend/'+domain+'/'] if backend else ['apps/mobile/src/features/'+domain+'/','apps/mobile/tests/'+domain+'/','packages/design-tokens/'])
            foundation_paths={
              'API-BASE':['apps/api/pyproject.toml','apps/api/uv.lock','apps/api/requirements.lock','apps/api/src/bluesteps_api/__init__.py','apps/api/src/bluesteps_api/main.py','apps/api/tests/health/','apps/api/README.md','.gitignore'],
              'DB-HARNESS':['supabase/config.toml','supabase/migrations/','apps/api/src/bluesteps_api/database/','apps/api/tests/db_harness/','infra/compose/','apps/api/pyproject.toml'],
              'DB-ACCESS':['supabase/migrations/','supabase/tests/roles/','apps/api/tests/db_access/','apps/api/src/bluesteps_api/database/'],
              'OUTBOX':['supabase/migrations/','packages/backend/outbox/','apps/api/tests/outbox/'],
              'QUEUE':['apps/worker/','packages/backend/jobs/','apps/api/tests/queue/','infra/compose/'],
              'SOCKET-BASE':['apps/api/src/bluesteps_api/realtime/','apps/api/tests/socket_base/','infra/compose/'],
              'CI-BASE':['.github/workflows/','packages/api-client/','apps/api/tests/contracts/','apps/api/pyproject.toml','supabase/tests/']}
            if c in foundation_paths and stage!='SPEC':allowed=foundation_paths[c]
            if backend and ui_required and stage!='SPEC':allowed+=['apps/mobile/src/features/'+domain+'/','apps/mobile/tests/'+domain+'/']
            kind='specification' if stage=='SPEC' else ('verification' if stage=='VERIFY' else ('local_spike' if parent=='D04' else ('planning_artifact' if parent in ['D01','D02','S07','G02'] else 'implementation')))
            test=({'cwd':'D:/BlueSteps/docs/figma-analysis','command':'<python> tools/validate_execution_pack.py','availability':'available_after_this_update','expected':'0 exit; all refs/schema examples/DAG/ownership/hash checks pass; no claim runtime works'} if stage=='SPEC' else {
                'cwd':'D:/BlueSteps/apps/api' if backend else 'D:/BlueSteps/apps/mobile',
                'command':'python -m pytest tests/'+domain+' -q' if backend else 'pnpm test -- --runInBand '+domain,
                'availability':'planned_target; create actual script/test path in bootstrap or this packet and record it, not a command already run',
                'expected':'Assertions cover: '+acceptance})
            if c=='API-BASE' and stage!='SPEC':test['command']='python -m pytest tests/health -q'
            if c=='CI-BASE' and stage!='SPEC':test['command']='python -m pytest tests/contracts -q'
            if parent in ['D01','D02','S07','G02']:
                test={'cwd':'D:/BlueSteps/docs/figma-analysis','command':'<python> tools/validate_execution_pack.py','availability':'available','expected':'Valid scoped specification/review artifacts; no claim device/provider/runtime implementation has run'}
            t={'id':tid,'capabilityId':c,'parentEpic':parent,'stage':stage,'kind':kind,'title':title+' — '+stage,
              'state':status,'dependsOn':prerequisite,'decisionGates':gates if stage!='SPEC' else [],
              'decisionContext':gates,'sourcePageId':'386:7053','sourceNodeIds':scopes[parent],
              'scopeNote':'Foundation has no direct product frame; UI sourceNodeIds are parent candidates: select exact frames in SPEC, never claim all are visually verified.',
              'contractOperations':opids[c],'interface':interface,'dataScope':data,'allowedPaths':allowed,
              'excluded':['Other Figma pages','unrelated module rewrites','production/cloud mutations','hardcoded product policy values from mock UI'],
              'inputPins':{**pins,**({} if stage=='SPEC' else authored_pins[c]),**{p:h for d in deps for p,h in authored_pins[d].items()}},'acceptanceScenarios':acceptance.split('; '),'verification':[test],
              'uiVerificationRequired':ui_required,'runtimeVerificationRequired':stage!='SPEC' and parent not in ['D01','D02','S07','G02'],
              'requiredOutputs':(['Canonical request/response/error/state/authorization schemas or explicit N/A','Valid and invalid fixtures; exact frame selection; no unresolved technical shape','Record product decision alternatives without claiming approval'] if stage=='SPEC' else (
                 ['Scoped code/migration and tests','Exact commands executed with environment and output','Contract and state compatibility report'] if stage=='BUILD' else ['Independent acceptance results with real DB/roles/device where relevant','Failure injection/race results required by scenarios','No unexplained skipped required checks'])),
              'handoffPath':'execution/handoffs/'+tid+'.json','conditionalScopeEpic':conditional.get(c),
              'definitionOfDone':'All required outputs exist, relevant gates resolved, requested checks actually pass; handoff records paths/commands/exit codes; no deployment implied.'}
            if c=='API-BASE' and stage=='BUILD':t['existingPacket']='agent-packets/AG-001-api-bootstrap.md'
            if backend and ui_required and stage!='SPEC' and t['runtimeVerificationRequired']:
                t['verification'].append({'cwd':'D:/BlueSteps/apps/mobile','command':'pnpm test -- --runInBand '+domain,'availability':'planned_target; bootstrap records actual scripts','expected':'UI happy/error/permission/large-text and exact frame screenshot evidence where relevant'})
            tasks.append(t)
    byid={t['id']:t for t in tasks}
    for t in tasks:
        if t['stage']=='BUILD' and t['capabilityId']=='UI-AUDIT':
            t['dependsOn']+= [other['capabilityId']+'-VERIFY' for other in tasks if other['stage']=='BUILD' and other['uiVerificationRequired'] and other['parentEpic'] not in ['Q01','Q02','O01','O02','S08','G03','D01','D02']]
        if t['stage']=='BUILD' and t['capabilityId']=='RELEASE':
            t['dependsOn'] += [other['capabilityId']+'-VERIFY' for other in tasks if other['stage']=='BUILD' and other['capabilityId']!='RELEASE' and other['parentEpic'] not in ['S08','G03']]
        t['dependsOn']=list(dict.fromkeys(t['dependsOn']))
        fingerprint=hashlib.sha256(json.dumps({k:t[k] for k in ['inputPins','dependsOn','decisionGates','allowedPaths','acceptanceScenarios','contractOperations','runtimeVerificationRequired']},sort_keys=True).encode()).hexdigest()
        old=state_rows.get(t['id'],{})
        if old.get('state') not in [None,'not_started','provided_design']:
            workspace=ROOT.parents[1]
            outputs_changed=any(not (workspace/p).is_file() or hashlib.sha256((workspace/p).read_bytes()).hexdigest()!=h for p,h in old.get('outputHashes',{}).items())
            if old.get('inputFingerprint')!=fingerprint or outputs_changed:
                old={**old,'previousState':old['state'],'state':'needs_input_review','invalidatedBy':'Pinned input/packet contract changed; preserve previous handoff for review'}
            t['state']=old['state']
        t['inputFingerprint']=fingerprint
        state_rows[t['id']]={**old,'state':t['state'],'inputFingerprint':fingerprint,'handoffPath':old.get('handoffPath',t['handoffPath'])}
    prior_release=read('execution/release-manifest.json') if (ROOT/'execution/release-manifest.json').exists() else {'conditionalCandidates':[]}
    dispositions={r['epicId']:r['disposition'] for r in prior_release['conditionalCandidates']}
    changed=True
    while changed:
        changed=False
        for t in tasks:
            if t['state'] in ['done','in_progress','review_required'] and any(byid[d]['state'] in ['needs_input_review','blocked'] for d in t['dependsOn']):
                state_rows[t['id']]['previousState']=t['state'];state_rows[t['id']]['state']='needs_input_review'
                state_rows[t['id']]['invalidatedBy']='Prerequisite evidence changed; review dependent work without deleting its handoff'
                t['state']='needs_input_review';changed=True
    def dispatch(t):
        if t['state'] in ['provided_design','done','in_progress','review_required','needs_input_review','blocked']:return t['state']
        if t['conditionalScopeEpic']:
            disposition=dispositions.get(t['conditionalScopeEpic'],'pending_user_decision')
            if disposition in ['defer','exclude']:return 'deferred_by_explicit_decision'
            if disposition!='include':return 'needs_scope_decision'
        if t['decisionGates']:return 'needs_product_decision'
        if any(byid[d]['state'] not in ['done','provided_design'] for d in t['dependsOn']):return 'waiting_for_dependencies'
        return 'ready'
    for t in tasks:
        t['dispatchStatus']=dispatch(t)
        md=[f'# {t["id"]} — {t["title"]}', '', f'Type: **{t["kind"]}** · Parent epic: **{t["parentEpic"]}** · Dispatch: **{t["dispatchStatus"]}** · State: **{t["state"]}**.', '',
          'Phạm vi: backuped `386:7053`; backend Python tự quản lý Identity; Supabase chỉ làm database. Đây là task plan, chưa có runtime code được triển khai.', '',
          '## Đầu vào và prerequisite', '', f'- Task trước: {", ".join(t["dependsOn"]) or "Không có"}. Chỉ bắt đầu phần implementation khi có handoff/evidence đạt của prerequisite.',
          f'- Product decision gates: {", ".join(t["decisionGates"]) or "Không có gate sản phẩm cho stage này"}. Context: {", ".join(t["decisionContext"]) or "N/A"}.',
          f'- Interface/contract: {interface}. Operation IDs: {", ".join(t["contractOperations"]) or "N/A: internal/UI contract; phải ghi schema tương tác trong SPEC"}.',
          f'- Data: {data}.', '- Source revisions: `inputPins` SHA-256 trong `execution/tasks.json`; nếu hash đổi, review/invalidate task trước chạy tiếp.',
          '- Frame candidates: '+(', '.join(t['sourceNodeIds']) or 'N/A cho infrastructure; không tự tạo chức năng từ lớp phụ')+'. SPEC phải chọn frame cụ thể, không coi tất cả candidates là scope visual.', '',
          '## Scope ownership', '', *['- `'+p+'`' for p in allowed], '',
          'Chỉ sửa migration/schema/shared client tương ứng capability này; cần thêm path thì ghi lý do vào handoff. Migrations là vùng ghi có owner tuần tự, không để hai task chiếm cùng số migration. Không tự spawn agent.', '',
          '## Hành vi phải chứng minh', '', *['- '+s+'.' for s in t['acceptanceScenarios']], '',
          '## Kết quả bàn giao', '', *['- '+s+'.' for s in t['requiredOutputs']], '',
          '## Verification', '', f'- CWD: `{test["cwd"]}`.',f'- Command contract: `{test["command"]}`.',f'- Availability: {test["availability"]}.',f'- Expected: {test["expected"]}.',
          '- Nếu API/DB/worker: kiểm real runtime roles và connections cho ACL/race; mock service không thay transaction test. Nếu UI: render đúng frame/state/viewport trên target build và đính ảnh evidence.',
          '- Nếu command chưa tồn tại, tạo script/config trong scope rồi ghi lệnh thật đã chạy; không báo planned command đã pass.', '',
          '## Handoff và stop conditions', '',f'Ghi `{t["handoffPath"]}` theo `execution/handoff.schema.json`: changed files, command/cwd/exit, evidence paths, decision/contract revisions, unresolved failures.',
          'Không triển khai cloud/provider thật hoặc thay product policy trong task này. Gặp gate chưa rõ chỉ dừng phần phụ thuộc; tiếp tục fixture/schema/local work đã rõ. Mọi implementation phải giữ điểm thưởng tắt khi chưa có policy được ghi nhận.']
        write('agent-packets/generated/'+tid+'.md','\n'.join(md)+'\n')
        t['packetPath']='agent-packets/generated/'+tid+'.md'
    write('execution/tasks.json',{'version':'0.2.0','scopePageId':'386:7053','scheduler':'Use packet DAG, not coarse epic order. SPEC precedes BUILD; VERIFY supplies runtime evidence; unresolved product policy only blocks affected BUILD/VERIFY.',
      'tasks':tasks,'readyTaskIds':[t['id'] for t in tasks if t['dispatchStatus']=='ready'],
      'providedDesignTaskIds':[t['id'] for t in tasks if t['state']=='provided_design'],
      'notExecuted':'All implementation and runtime verification are not_started. provided_design means specification supplied, not code or tests passed.'})
    stored['taskStates']=state_rows;write('execution/task-state.json',stored)
    return caps,tasks

def update_roadmap(caps,tasks):
    b=read('backlog.json');epics={t['id']:t for t in b['tasks']}
    changes={'F01':[], 'D03':['D01','F01'],'D04':['F01'],'F06':['F02','F03','C03'],
      'E05':['E01','F02','N01'],'E02':['E01','F02','E05'],
      'G01':['C01','R01','F01'],
      'Q01':list(dict.fromkeys([d for d in epics['Q01']['dependsOn'] if d not in ['S08','G03']]+['E02'])),
      'Q02':[d for d in epics['Q02']['dependsOn'] if d not in ['S08','G03']],
      'O02':['A01','Q01','Q02','O01','S07','G02']}
    for key,deps in changes.items():epics[key]['dependsOn']=deps
    b['status']='decomposed_gated_execution_plan';b['agentImplementationReadiness']='ready_to_start_gated_packets'
    b['technologyDecision']['identityOwner']='Python self-managed, user-confirmed; Supabase Auth disabled'
    b['technologyDecision']['supabaseAuthStorageRealtime']='Auth not selected: explicitly Python-owned. Supabase platform use is database-only in baseline.'
    b['packetManifest']='execution/tasks.json';b['releaseManifest']='execution/release-manifest.json'
    b['dependencyReview']={'sourceOfSchedulingTruth':'execution/tasks.json packet DAG','resolvedSplits':['F01 bootstrap before D03 schema generation','Queue/outbox infrastructure in F01 before scanner; notification delivery in N01','E05 saved-core before E02 calendar; collections and event reminders separate packets','Socket transport foundation independent of social chat'],
      'conditionalScope':'S08/G03 isolated from core Q gates; production full release still requires explicit disposition for both; no silent exclusion'}
    for e in epics.values():
        own=[t for t in tasks if t['parentEpic']==e['id']];e['packetIds']=[t['id'] for t in own]
        e['capabilityIds']=sorted({t['capabilityId'] for t in own})
        e['implementationReady']=False;e['executionPlanStatus']='decomposed_with_explicit_gates'
        e['decisionGates']=sorted({d for t in own for d in t['decisionContext']})
        e['readinessRef']='agent-readiness.json#'+e['id']
    write('backlog.json',b)
    lines=(ROOT/'05-delivery-plan.md').read_text(encoding='utf-8').splitlines()
    for i,line in enumerate(lines):
        cells=line.split('|')
        if len(cells)==9 and cells[1].strip() in epics:cells[6]=' '+(', '.join(epics[cells[1].strip()]['dependsOn']) or '—')+' ';lines[i]='|'.join(cells)
    write('05-delivery-plan.md','\n'.join(lines)+'\n')
    conditional=['S08','G03'];core=[e for e in epics if e not in conditional]
    previous_release=read('execution/release-manifest.json') if (ROOT/'execution/release-manifest.json').exists() else {'conditionalCandidates':[]}
    previous_candidates={r['epicId']:r for r in previous_release['conditionalCandidates']}
    candidates=[{'epicId':e,'disposition':'pending_user_decision','blocksOnly':'Production release scope activation and affected conditional implementation; independent core packet may proceed','requiredForInclude':'Approved scope/rules/provider plus all packets verified','requiredForDeferOrExclude':'Explicit user/product decision recorded; do not infer approval from this manifest',**previous_candidates.get(e,{})} for e in conditional]
    write('execution/release-manifest.json',{'version':'0.2.0','manifestType':'candidate_scope_not_release_authorization',
      'coreCandidateEpics':core,'conditionalCandidates':candidates,
      'fullProductionReleaseReady':False,'activationRequirements':['Core selected packets verified with runtime evidence','Each conditional candidate has explicit disposition; included candidates verified','Other relevant product/retention/provider decisions resolved','UAT, restore/load, migration rehearsal and explicit deployment authority'],
      'preservedScope':'Both conditional candidates remain in full roadmap and packet inventory. No feature silently dropped.'})
    rows=[]
    for e in epics.values():
        own=[t for t in tasks if t['parentEpic']==e['id']]
        rows.append({'id':e['id'],'kind':'epic','implementationReady':False,'status':'decomposed_gated_packets','decisionGates':e['decisionGates'],
          'sourcePageId':'386:7053','sourceNodeIds':sorted({n for t in own for n in t['sourceNodeIds']}),
          'prerequisiteEpics':e['dependsOn'],'packets':[t['packetPath'] for t in own],
          'packetIds':e['packetIds'],'conditionalScope':'pending_explicit_disposition' if e['id'] in conditional else 'core_candidate'})
    next_ids=[t['id'] for t in tasks if t['dispatchStatus']=='ready']
    write('agent-readiness.json',{'reviewDate':'2026-10-29','scope':{'pageId':'386:7053','otherPagesExcluded':True},
      'verdict':'ready_to_start_gated_packets_not_production_ready','epicCount':len(epics),'implementationReadyEpicCount':0,
      'capabilityCount':len(caps),'packetCount':len(tasks),'readyTaskIds':next_ids,
      'nextPacket':{'id':'API-BASE-BUILD','path':'agent-packets/generated/API-BASE-BUILD.md','specificationStatus':'specified_design','executionStatus':'not_started','requires':'Request to implement; inspect workspace/toolchain and run scoped checks. Current task updates plan only.'},
      'openContractIssueIds':['CI-002'],'unresolvedConditionalScopeEpics':[r['epicId'] for r in candidates if r['disposition']=='pending_user_decision'],
      'runtimeEvidence':'No implementation/provider/DB execution performed by plan generation','epics':rows})
    write('api-contract-issues.json',{'scope':'backuped; Python Identity; Supabase Database','issues':[
      {'id':'CI-001','status':'resolved_design','severity':'P1','operation':'POST /sorting-actions','blocks':[],
       'resolution':'Canonical source + itemId; scanId only with source=scan; legacy confirmedCategory/confirmedItemId/manualItemId forbidden. Strict oneOf schema and valid/invalid fixtures supplied.',
       'artifacts':['contracts/core.openapi.json','contracts/examples.json'],'runtimeVerified':False},
      {'id':'CI-002','status':'open','severity':'P1','operation':'Remaining domain contract schemas','blocks':[],
       'resolution':'All grouped/wildcard paths expanded into concrete operation IDs and each assigned an owning SPEC packet. Non-core schemas must be authored/reviewed by that packet, never generated as placeholder DTOs.',
       'artifacts':['contracts/operation-inventory.json','execution/tasks.json'],
       'blockingRule':'Only BUILD packets using an unspecified operation are blocked until owner SPEC schema is reviewed; bootstrap and contract refinement remain runnable.','runtimeVerified':False}]})
    return b

def build_permissions():
    cases=[]
    def add(role,resource,action,outcome,layer,reason):cases.append({'role':role,'resource':resource,'action':action,'expected':outcome,'layer':layer,'reason':reason})
    for role in ['PUBLIC','anon','authenticated']:
        for target in ['app_private schema','wallets','point_ledger','event_occurrences','sessions','privileged SQL functions']:
            add(role,target,'access_or_execute','deny','db_grants_and_rls','No direct client data path; revoke current and default grants')
    for role in ['app_api','app_worker']:
        add(role,'schema/table/role ownership','DDL_or_grant','deny','database','Runtime is not owner, superuser or BYPASSRLS')
        add(role,'point_ledger','UPDATE_or_DELETE','deny','database','Append-only ledger; compensation is new entry')
    for action in ['read_own_profile','read_own_scan','read_own_session','read_own_wallet']:
        add('member_owner',action,'HTTP','allow','Python_service','Actor from verified active session')
        add('member_other',action,'HTTP','404','Python_service','No existence or PII leakage')
    for target in ['point_review','event_checkin','redemption_fulfillment']:
        add('scoped_operator',target,'command','allow','Python_scope_check','Correct point/event/operator assignment')
        add('unscoped_operator',target,'command','403','Python_scope_check','Role name alone is insufficient')
    for case in cases:
        if case['role']=='PUBLIC':case['executionMethod']='Inspect PUBLIC ACL/default privileges; PUBLIC is a pseudo-role, not a login/SET ROLE target.'
    add('revoked_session','all protected operations','HTTP_or_WS','401','Python_identity','DB/session state checked, not only JWT signature')
    add('app_migrator','app_private DDL','migration','allow','deployment','Only isolated migration job with distinct credentials')
    write('contracts/access-matrix.json',{'version':'0.2.0','authOwner':'Python','schema':'app_private','clientDataApiEnabled':False,
      'runtimeRlsModel':'Runtime-role policies plus mandatory Python object authorization; auth.uid() is not automatically populated by psycopg.',
      'requiredMigrationArtifacts':['schema and runtime roles','current + default table/sequence/function grants','RLS policy allowlist per runtime table/action','role-based positive and negative integration tests','Data API exposed-schema configuration proof'],
      'cases':cases,'note':'Design/acceptance matrix, not SQL already installed. Runtime allow grants must be added by capability migration; default deny before capability exists.'})

if __name__=='__main__':
    # Authored contracts/decisions are not overwritten by routine task regeneration.
    # --refresh-design is only for the authoring step before runtime work begins.
    refresh='--refresh-design' in sys.argv
    if refresh and (ROOT/'execution/task-state.json').exists():
        assert all(r['state'] in ['not_started','provided_design'] for r in read('execution/task-state.json')['taskStates'].values()),'Cannot refresh authored design over active/completed work'
    for path,builder in [('contracts/core.openapi.json',build_contracts),('execution/decisions.json',build_decisions),('contracts/access-matrix.json',build_permissions),('contracts/auth-policy.json',auth_policy)]:
        if refresh or not (ROOT/path).exists():builder()
    ops=operation_inventory()
    caps,tasks=capabilities_and_packets(ops);update_roadmap(caps,tasks)
    print(json.dumps({'specifiedOperations':sum(x['schemaStatus']=='specified' for x in ops),'concreteOperations':len(ops),'capabilities':len(caps),'packets':len(tasks),'ready':[t['id'] for t in tasks if t['dispatchStatus']=='ready']},ensure_ascii=False))
