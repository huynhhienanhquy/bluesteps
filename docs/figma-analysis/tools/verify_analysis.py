"""Verify source coverage, document links, schema references and backlog integrity."""
from pathlib import Path
import json
import re
import importlib.util

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('catalog', ROOT/'tools'/'build_catalog.py')
catalog=importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)

def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf-8'))

def main():
    evidence=read('evidence/backuped-all.json')['screens']
    coverage=read('coverage.json')
    backlog=read('backlog.json')
    errors=[]
    technology=backlog.get('technologyDecision',{})
    if technology.get('backendLanguage')!='Python' or not technology.get('databasePlatform','').startswith('Supabase'):
        errors.append('Technology decision must be Python backend and Supabase database')
    for name in ['README.md','03-backend-and-api.md','04-database.md','05-delivery-plan.md','08-tech-stack.md','09-python-supabase.md']:
        body=(ROOT/name).read_text(encoding='utf-8')
        if 'Python' not in body or 'Supabase' not in body:errors.append('Missing selected stack in '+name)
        if any(old in body for old in ['NestJS','TypeORM','BullMQ','Socket.IO']):errors.append('Stale backend stack in '+name)
    if len(evidence)!=180 or len({s['id'] for s in evidence})!=180:errors.append('Primary evidence missing/duplicate IDs')
    if {s['id'] for s in evidence}!={s['id'] for s in coverage['screens']}:errors.append('Coverage differs from evidence')
    inventory=read('evidence/backuped-inventory.json')
    pages=[inventory]
    if inventory['id']!='386:7053' or coverage['pageCount']!=1:errors.append('Scope must be backuped only')
    all_text_count=sum(len(s['texts']) for s in evidence)
    if {n['id'] for n in inventory['children']}!={s['id'] for s in evidence}:errors.append('Primary IDs differ from Figma inventory')
    component=catalog.read('components.json')
    if sum(c['count'] for c in component['components'])!=752:errors.append('Instance reference sum differs')
    db=(ROOT/'04-database.md').read_text(encoding='utf-8')
    tables=set(re.findall(r'^\| `([a-z_]+)` \|',db,re.M))
    for key,m in catalog.MODULES.items():
        if key in {'support','navigation'}:continue
        for name in [x.strip() for x in m[2].split(',')]:
            if name not in tables:errors.append(f'Undocumented table {key}:{name}')
    tasks={t['id']:t for t in backlog['tasks']}
    if len(tasks)!=48:errors.append('Backlog task count differs')
    readiness=read('agent-readiness.json')
    contract_issues=read('api-contract-issues.json')
    readiness_tasks={r['id']:r for r in readiness['epics']}
    if set(readiness_tasks)!=set(tasks):errors.append('Agent readiness register differs from backlog')
    if readiness['scope']['pageId']!='386:7053':errors.append('Agent readiness source scope differs')
    ready_count=sum(r['implementationReady'] for r in readiness['epics'])
    if readiness['implementationReadyEpicCount']!=ready_count:errors.append('Readiness count inconsistent')
    for key, task in tasks.items():
        r=readiness_tasks.get(key,{})
        if task.get('kind')!='epic':errors.append('Backlog must distinguish epic granularity: '+key)
        if task.get('implementationReady')!=r.get('implementationReady'):errors.append('Readiness state mismatch '+key)
        if task['dependsOn']!=r.get('prerequisiteEpics'):errors.append('Readiness dependency mismatch '+key)
        if task.get('decisionGates')!=r.get('decisionGates'):errors.append('Decision gates mismatch '+key)
        for packet in r.get('packets',[]):
            if not (ROOT/packet).is_file():errors.append('Missing agent packet '+packet)
    open_issues=[i['id'] for i in contract_issues['issues'] if i['status']=='open']
    if open_issues!=readiness['openContractIssueIds']:errors.append('Contract issue state mismatch')
    for issue in contract_issues['issues']:
        if issue['status']=='open':
            affected=[key for key in issue['blocks'] if readiness_tasks.get(key,{}).get('implementationReady')]
            if affected:errors.append('Ready epics blocked by '+issue['id']+': '+','.join(affected))
    if 'C03' not in tasks['F06']['dependsOn']:errors.append('Avatar task F06 missing media prerequisite')
    plan=(ROOT/'05-delivery-plan.md').read_text(encoding='utf-8')
    plan_ids=set()
    for line in plan.splitlines():
        cells=line.split('|')
        if len(cells)==9 and cells[1].strip() in tasks:
            key=cells[1].strip();plan_ids.add(key)
            deps=[d.strip() for d in cells[6].split(',') if d.strip() not in {'','—'}]
            if deps!=tasks[key]['dependsOn']:errors.append('Plan/backlog dependency mismatch '+key)
    if plan_ids!=set(tasks):errors.append('Plan epic table differs from backlog')
    visiting=set();visited=set()
    def visit(task):
        if task in visiting:errors.append('Backlog cycle at '+task);return
        if task in visited:return
        if task not in tasks:errors.append('Missing task '+task);return
        visiting.add(task)
        for dep in tasks[task]['dependsOn']:visit(dep)
        visiting.remove(task);visited.add(task)
    for key in tasks:visit(key)
    for field,total in [('frontendDays','frontend'),('backendDays','backend'),('qaDays','qa')]:
        if sum(t[field] for t in tasks.values())!=backlog['totals'][total]:errors.append('Estimate arithmetic mismatch '+field)
    module_tasks={
      'onboarding':['F05'],'auth':['F03','F04'],'profile':['F06'],'settings':['F06','Q01'],
      'notifications':['N01'],'community':['S02','S03','S04'],'chat':['S05','S07','S08'],
      'assistant':['S06'],'collection':['C06','C07','R05'],'routes':['R06','R07'],
      'activities':['E01','E02','E03','E04','E06'],'favorites':['E05'],
      'news':['S01'],'rewards':['C05','R01','R02','R03','R04'],'handbook':['C01','C02'],
      'scanner':['C03','C04','C05'],'games':['G01','G02','G03'],'statistics':['C08','A01'],
      'navigation':['F02','C08'],'support':['D02']}
    trace=[]
    for s in evidence:
        mod=catalog.classify(s)
        if mod not in module_tasks:errors.append('No task mapping '+s['id'])
        ids=module_tasks.get(mod,[])
        if any(t not in tasks for t in ids):errors.append('Trace references missing task '+s['id'])
        trace.append({'nodeId':s['id'],'module':mod,'tasks':ids,'evidenceFile':'evidence/backuped-all.json'})
    (ROOT/'interface-task-traceability.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'verification-results.json').write_text(json.dumps({'status':'running'}),encoding='utf-8')
    release_ancestors=set()
    def ancestors(task):
        for dep in tasks[task]['dependsOn']:
            if dep not in release_ancestors:
                release_ancestors.add(dep)
                ancestors(dep)
    if not errors:
        ancestors('O02')
        release_manifest=read('execution/release-manifest.json')
        conditional={c['epicId'] for c in release_manifest['conditionalCandidates']}
        uncovered=set(tasks)-release_ancestors-{'O02'}-conditional
        if uncovered:errors.append('Core release gate misses tasks: '+','.join(sorted(uncovered)))
        if any(c['disposition']!='pending_user_decision' and not c.get('decisionRecord') for c in release_manifest['conditionalCandidates']):errors.append('Scope disposition missing decision record')
    linked_files=0
    for path in ROOT.glob('*.md'):
        text=path.read_text(encoding='utf-8')
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if target.startswith(('https:','http:','#','mailto:')):continue
            target=target.split('#',1)[0]
            if not (path.parent/target).exists():errors.append('Missing local link '+str(path.name)+':'+target)
            linked_files+=1
    shots=list((ROOT/'evidence'/'screenshots').glob('*.png'))
    for shot in shots:
        if not shot.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'):errors.append('Invalid PNG '+shot.name)
    if len(shots)!=8:errors.append('Screenshot count differs')
    if 'error_code' in (ROOT/'evidence'/'backuped-all.json').read_text(encoding='utf-8'):errors.append('Failed tool result in canonical evidence')
    report={'status':'passed' if not errors else 'failed','snapshotDate':'2026-10-29','sourceScope':{'pageId':'386:7053','pageName':'backuped','otherPagesExcluded':True},'pageCount':len(pages),'topLevelObjects':sum(len(p['children']) for p in pages),'traversedTextNodes':all_text_count,'primaryObjects':len(evidence),'primaryFrames':sum(s['type']=='FRAME' for s in evidence),'primaryTextNodes':sum(len(s['texts']) for s in evidence),'primaryInstances':component['instanceCount'],'uniqueMainComponents':len(component['components']),'databaseTablesDocumented':len(tables),'backlogTasks':len(tasks),'backlogDependencyGraph':'acyclic' if not errors else 'see errors','estimateDays':backlog['totals'],'screenshots':len(shots),'checkedLocalLinks':linked_files,'errors':errors,'limits':['Source scope is only page backuped (386:7053).','No runtime implementation or migrations exist in this deliverable.','Only eight representative screenshots were visually inspected.','Schema/API checks establish documentation traceability, not implementation correctness.']}
    report['technologyDecision']=technology
    report['documentationIntegrity']=report['status']
    spec=importlib.util.spec_from_file_location('execution_validator',ROOT/'tools/validate_execution_pack.py')
    execution_validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(execution_validator)
    execution_result=execution_validator.check()
    if execution_result['status']!='passed':errors.append('Execution pack validation failed')
    report['status']='passed' if not errors else 'failed';report['errors']=errors
    report['documentationIntegrity']=report['status']
    report['agentImplementationReadiness']={'status':readiness['verdict'],'implementationReadyEpicCount':ready_count,
        'epicCount':len(readiness_tasks),'openContractIssueIds':open_issues,
        'conditionalScopePending':readiness['unresolvedConditionalScopeEpics'],
        'nextPacket':readiness['nextPacket'],
        'readyPacketIds':execution_result['readyTaskIds'],'packetCount':execution_result['packets'],
        'standardContractValidation':execution_result['standardMetaschemaValidation'],
        'productionReleaseReady':False,
        'limits':'Packet workflow is ready to start; unspecified domain contracts require SPEC work and product decisions remain gated. No app/DB runtime is verified by this check.'}
    (ROOT/'verification-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)

if __name__=='__main__':main()
