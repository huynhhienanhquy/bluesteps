"""Validate execution-plan integrity and the JSON Schema subset used by fixtures.

Uses independent standard validators when installed. Built-in checks deliberately
report a narrower result rather than claiming full OpenAPI metaschema validation.
"""
from pathlib import Path
import hashlib
import json
import re
import sys
import uuid
from datetime import datetime

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.validation-packages'))

def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
def pointer(doc,p):
    if not p.startswith('#/'):raise ValueError('External reference is not pinned: '+p)
    for key in p[2:].split('/'):doc=doc[key.replace('~1','/').replace('~0','~')]
    return doc

def validate_subset(value,schema,root):
    if '$ref' in schema:return validate_subset(value,pointer(root,schema['$ref']),root)
    if 'oneOf' in schema:
        successes=0
        for child in schema['oneOf']:
            try:validate_subset(value,child,root);successes+=1
            except (ValueError,TypeError):pass
        if successes!=1:raise ValueError('Expected exactly one variant')
        return
    if 'enum' in schema and value not in schema['enum']:raise ValueError('enum')
    if 'const' in schema and value!=schema['const']:raise ValueError('const')
    typ=schema.get('type');kinds=typ if isinstance(typ,list) else [typ] if typ else []
    matches={'null':value is None,'object':isinstance(value,dict),'array':isinstance(value,list),'string':isinstance(value,str),
      'boolean':isinstance(value,bool),'integer':isinstance(value,int) and not isinstance(value,bool),'number':isinstance(value,(int,float)) and not isinstance(value,bool)}
    if kinds and not any(matches.get(k,False) for k in kinds):raise ValueError('type '+str(kinds))
    if isinstance(value,dict):
        for key in schema.get('required',[]):
            if key not in value:raise ValueError('required '+key)
        props=schema.get('properties',{});extra=schema.get('additionalProperties',True)
        for key,child in value.items():
            if key in props:validate_subset(child,props[key],root)
            elif extra is False:raise ValueError('extra '+key)
            elif isinstance(extra,dict):validate_subset(child,extra,root)
    if isinstance(value,list):
        for child in value:validate_subset(child,schema.get('items',{}),root)
    if isinstance(value,str):
        if len(value)<schema.get('minLength',0) or len(value)>schema.get('maxLength',float('inf')):raise ValueError('length')
        if 'pattern' in schema and not re.search(schema['pattern'],value):raise ValueError('pattern')
        if schema.get('format')=='uuid':
            try:uuid.UUID(value)
            except ValueError:raise ValueError('uuid') from None
        if schema.get('format')=='email' and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',value):raise ValueError('email')
        if schema.get('format')=='date-time':
            try:datetime.fromisoformat(value.replace('Z','+00:00'))
            except ValueError:raise ValueError('datetime') from None
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        if value<schema.get('minimum',-float('inf')) or value>schema.get('maximum',float('inf')):raise ValueError('range')

def check():
    errors=[];core=read('contracts/core.openapi.json');inventory=read('contracts/operation-inventory.json')['operations']
    manifest=read('execution/tasks.json');tasks={t['id']:t for t in manifest['tasks']}
    caprows=read('execution/capabilities.json')['capabilities'];caps={r[0]:r for r in caprows}
    backlog=read('backlog.json');epics={e['id']:e for e in backlog['tasks']}
    state=read('execution/task-state.json')['taskStates']
    decisions={d['id']:d for d in read('execution/decisions.json')['decisions']}
    if len(tasks)!=len(manifest['tasks']):errors.append('Duplicate packet IDs')
    if set(r[1] for r in caprows)!=set(epics):errors.append('Capability coverage differs from all epic IDs')
    if manifest['scopePageId']!='386:7053':errors.append('Unexpected Figma scope')
    if decisions['AUTH-OWNER']['status']!='confirmed' or decisions['AUTH-OWNER']['supabaseAuthEnabled'] is not False:errors.append('Auth owner must be user-confirmed Python')
    graph={key:t['dependsOn'] for key,t in tasks.items()};visiting=set();done=set()
    def walk(k):
        if k not in graph:errors.append('Missing prerequisite '+k);return
        if k in visiting:errors.append('Packet cycle '+k);return
        if k in done:return
        visiting.add(k)
        for dep in graph[k]:walk(dep)
        visiting.remove(k);done.add(k)
    for key in graph:walk(key)
    inventorykeys=set();opids=set()
    for op in inventory:
        key=(op['method'],op['path'])
        if key in inventorykeys:errors.append('Duplicate operation '+str(key))
        inventorykeys.add(key)
        if op['operationId'] in opids:errors.append('Duplicate operation ID '+op['operationId'])
        opids.add(op['operationId'])
        if any(c in op['path'] for c in ['*','[',']','|']):errors.append('Unexpanded operation '+op['path'])
        if op['ownerCapability'] not in caps or op['contractPacket'] not in tasks:errors.append('Missing operation owner '+op['operationId'])
        if op['schemaStatus']=='specified':
            schema_file=op['schemaRef'].split('#',1)[0]
            actual_doc=read('contracts/'+schema_file)
            actual=actual_doc['paths'].get(op['path'],{}).get(op['method'].lower())
            if not actual or actual['operationId']!=op['operationId']:errors.append('Specified schema mismatch '+op['operationId'])
        elif op['codeGenerationAllowed']:errors.append('Unspecified operation allows code generation')
    def refs(obj):
        if isinstance(obj,dict):
            if '$ref' in obj:
                try:pointer(core,obj['$ref'])
                except (ValueError,KeyError,TypeError):errors.append('Broken core ref '+obj['$ref'])
            for child in obj.values():refs(child)
        elif isinstance(obj,list):
            for child in obj:refs(child)
    refs(core)
    for path,ops in core['paths'].items():
        pathkeys=set(re.findall(r'\{([^}]+)\}',path))
        for method,op in ops.items():
            actual={p['name'] for p in op.get('parameters',[]) if p['in']=='path' and p.get('required')}
            if actual!=pathkeys:errors.append('Path parameter mismatch '+method+path)
            if not op.get('responses') or 'operationId' not in op:errors.append('Incomplete operation '+method+path)
    fixtures=read('contracts/examples.json');checked=0
    for valid,group in [(True,fixtures['valid']),(False,fixtures['invalid'])]:
        for case in group:
            try:validate_subset(case['value'],core['components']['schemas'][case['schema']],core);accepted=True
            except (ValueError,TypeError):accepted=False
            checked+=1
            if accepted!=valid:errors.append('Unexpected fixture acceptance '+case['schema']+':'+json.dumps(case['value']))
    standards='not_run: jsonschema/openapi-spec-validator unavailable in current offline environment'
    try:
        from jsonschema import Draft202012Validator, FormatChecker
        from openapi_spec_validator import validate
        validate(core)
        for other in (ROOT/'contracts/capabilities').glob('*.openapi.json') if (ROOT/'contracts/capabilities').exists() else []:
            validate(json.loads(other.read_text(encoding='utf-8')))
        Draft202012Validator.check_schema(read('execution/handoff.schema.json'))
        for valid,group in [(True,fixtures['valid']),(False,fixtures['invalid'])]:
            for case in group:
                schema={'$ref':'#/components/schemas/'+case['schema'],'components':core['components']}
                accepted=not list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(case['value']))
                if accepted!=valid:errors.append('Standard validator fixture mismatch '+case['schema'])
        standards='passed: OpenAPI metaschema and JSON Schema fixtures'
    except ImportError:
        if '--allow-subset-only' not in sys.argv:errors.append('Install tools/validation-requirements.lock for standard OpenAPI/JSON Schema validation; subset-only mode is explicit and not equivalent')
    except Exception as exc:errors.append('Standard validator error: '+str(exc))
    ready=[]
    for tid,t in tasks.items():
        if t['parentEpic'] not in epics or t['capabilityId'] not in caps:errors.append('Packet owner unknown '+tid)
        if not (ROOT/t['packetPath']).is_file():errors.append('Packet file missing '+tid)
        if not t['allowedPaths'] or not t['verification'] or not t['requiredOutputs'] or not t['acceptanceScenarios']:errors.append('Incomplete packet '+tid)
        if state.get(tid,{}).get('state')!=t['state'] or state.get(tid,{}).get('inputFingerprint')!=t['inputFingerprint']:errors.append('Task state drift '+tid)
        for source,expected in t['inputPins'].items():
            path=ROOT/source
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=expected:errors.append('Input pin changed '+tid+':'+source)
        if t['stage']=='BUILD' and (t['capabilityId']+'-SPEC') not in t['dependsOn']:errors.append('BUILD without own SPEC '+tid)
        if t['stage']=='VERIFY' and (t['capabilityId']+'-BUILD') not in t['dependsOn']:errors.append('VERIFY without BUILD '+tid)
        for d in t['decisionContext']:
            if d not in decisions:errors.append('Unknown decision '+tid+':'+d)
        if t['dispatchStatus']=='ready':
            ready.append(tid)
            if t['decisionGates'] or t['conditionalScopeEpic']:errors.append('Ready packet bypasses gate '+tid)
            if any(tasks[d]['state'] not in ['done','provided_design'] for d in t['dependsOn']):errors.append('Ready packet missing evidence prerequisite '+tid)
        if t['state']=='done' and not (ROOT/t['handoffPath']).is_file():errors.append('Done task without handoff '+tid)
    if ready!=manifest['readyTaskIds']:errors.append('Ready queue mismatch')
    releases=read('execution/release-manifest.json')
    pending={r['epicId'] for r in releases['conditionalCandidates'] if r['disposition']=='pending_user_decision'}
    if {r['epicId'] for r in releases['conditionalCandidates']}!={'S08','G03'}:errors.append('Conditional candidates lost from scope')
    for candidate in releases['conditionalCandidates']:
        if candidate['disposition'] not in ['include','defer','exclude','pending_user_decision']:errors.append('Invalid conditional scope disposition')
        if candidate['disposition']!='pending_user_decision' and not candidate.get('decisionRecord'):errors.append('Scope disposition missing explicit source decision')
    if pending and releases['fullProductionReleaseReady']:errors.append('Unapproved conditional release scope')
    for coreqa in ['Q01','Q02','O02']:
        if set(epics[coreqa]['dependsOn'])&pending:errors.append('Core QA depends directly on unknown conditional implementation '+coreqa)
    if 'QUEUE-VERIFY' not in tasks['SCAN-JOB-BUILD']['dependsOn']:errors.append('Scanner queue prerequisite absent')
    if 'SAVED-CORE-VERIFY' not in tasks['EVENT-CALENDAR-BUILD']['dependsOn']:errors.append('Calendar saved-data prerequisite absent')
    if 'MEDIA-VERIFY' not in tasks['PROFILE-BUILD']['dependsOn']:errors.append('Avatar media prerequisite absent')
    if 'CHAT-SOCKET-VERIFY' in tasks['GAME-LOBBY-BUILD']['dependsOn']:errors.append('Game transport incorrectly coupled to social chat')
    core_required={t['capabilityId']+'-VERIFY' for t in tasks.values() if t['stage']=='BUILD' and t['capabilityId']!='RELEASE' and t['parentEpic'] not in ['S08','G03']}
    if not core_required<=set(tasks['RELEASE-BUILD']['dependsOn']):errors.append('Release packet does not require all core capability verification')
    if 'OAUTH-GOOGLE-SPEC' not in tasks['OAUTH-FACEBOOK-BUILD']['dependsOn']:errors.append('Shared OAuth contract dependency absent')
    result={'status':'passed' if not errors else 'failed','scope':'backuped only; Python Identity; Supabase Database',
      'epics':len(epics),'capabilities':len(caps),'packets':len(tasks),'concreteOperations':len(inventory),
      'specifiedOperations':sum(o['schemaStatus']=='specified' for o in inventory),'fixtureCasesChecked':checked,
      'schemaSubsetChecks':'refs, oneOf, strict properties, type/enum/const, bounds, uuid/email/datetime formats used by supplied fixtures',
      'standardMetaschemaValidation':standards,'readyTaskIds':ready,'packetDag':'acyclic' if not errors else 'see errors',
      'runtimeTestsRun':False,'productionReleaseReady':False,'errors':errors}
    (ROOT/'execution/validation-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return result

if __name__=='__main__':
    raise SystemExit(0 if check()['status']=='passed' else 1)
