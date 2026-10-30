"""Record reviewed evidence into task state; never executes runtime/deployment commands."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parents[1]
sys.path.insert(0,str(ROOT/'.validation-packages'))

def resolve_workspace_path(value):
    p=Path(value)
    p=(p if p.is_absolute() else WORKSPACE/p).resolve()
    if not p.is_relative_to(WORKSPACE.resolve()):raise ValueError('Evidence/output path outside workspace: '+value)
    return p

def assess(handoff,task,reviewed_by):
    if not reviewed_by.strip():raise ValueError('Reviewer identity required for state transition')
    if handoff['taskId']!=task['id']:raise ValueError('Task ID mismatch')
    if handoff['inputHashes']!=task['inputPins']:raise ValueError('Handoff must match current pinned inputs')
    hashes={}
    for value in handoff['changedFiles']+handoff['evidence']:
        p=resolve_workspace_path(value)
        if not p.is_file():raise ValueError('Missing evidence/changed file: '+value)
        if value in handoff['changedFiles']:
            allowed=False
            for scope in task.get('allowedPaths',[]):
                base=ROOT if scope.startswith(('contracts/','execution/','agent-packets/','tools/')) else WORKSPACE
                target=(base/scope).resolve()
                if p==target or (scope.endswith('/') and p.is_relative_to(target)):allowed=True
            if not allowed:raise ValueError('Changed file outside packet ownership: '+value)
        hashes[p.relative_to(WORKSPACE).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
    for command in handoff['commands']:
        if command['exitCode'] is not None:
            p=resolve_workspace_path(command['outputPath'])
            if not p.is_file():raise ValueError('Missing command output log')
    if handoff['status']=='done':
        if task['dispatchStatus'] not in ['ready','in_progress','review_required']:raise ValueError('Task prerequisites/gates not ready')
        if handoff['unresolved']:raise ValueError('Done task cannot contain unresolved requirements')
        if not handoff['commands'] or any(c['exitCode']!=0 for c in handoff['commands']):raise ValueError('Done requires successful actual verification commands')
        if not handoff['evidence']:raise ValueError('Done requires evidence artifacts')
        runtime_required=task.get('runtimeVerificationRequired',task['stage'] in ['BUILD','VERIFY'] and task['kind'] not in ['planning_artifact'])
        if runtime_required and not handoff['runtimeVerified']:raise ValueError('Runtime implementation/verification cannot be marked done with only documentation evidence')
    return {'state':handoff['status'],'inputFingerprint':task['inputFingerprint'],'outputHashes':hashes,'reviewedBy':reviewed_by,'recordedAt':datetime.now(timezone.utc).isoformat()}

def resume_record(record,reviewed_by):
    if not reviewed_by.strip() or record['state'] not in ['blocked','needs_input_review']:raise ValueError('Only reviewed blocked/input-invalidated work can be resumed')
    return {**record,'previousState':record['state'],'state':'not_started','resumedBy':reviewed_by,'resumedAt':datetime.now(timezone.utc).isoformat()}

def main():
    parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group(required=True);mode.add_argument('--handoff');mode.add_argument('--resume');parser.add_argument('--reviewed-by',required=True);parser.add_argument('--accept-input-review',default='')
    args=parser.parse_args()
    if args.resume:
        state_path=ROOT/'execution/task-state.json';state=json.loads(state_path.read_text(encoding='utf-8'))
        state['taskStates'][args.resume]=resume_record(state['taskStates'][args.resume],args.reviewed_by)
        state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        subprocess.run([sys.executable,str(ROOT/'tools/build_execution_pack.py')],check=True)
        print('Resumed for prerequisite/gate re-evaluation; no evidence was marked verified or deleted.');return
    from jsonschema import Draft202012Validator
    path=Path(args.handoff);path=(path if path.is_absolute() else ROOT/path).resolve()
    expected_dir=(ROOT/'execution/handoffs').resolve()
    if not path.is_relative_to(expected_dir):raise ValueError('Handoff belongs in execution/handoffs')
    handoff=json.loads(path.read_text(encoding='utf-8'))
    schema=json.loads((ROOT/'execution/handoff.schema.json').read_text(encoding='utf-8'))
    Draft202012Validator(schema).validate(handoff)
    manifest=json.loads((ROOT/'execution/tasks.json').read_text(encoding='utf-8'))
    task=next(t for t in manifest['tasks'] if t['id']==handoff['taskId'])
    if path!=ROOT/task['handoffPath']:raise ValueError('Handoff path must match packet ID')
    if task['dispatchStatus']=='needs_input_review' and args.accept_input_review.strip():
        index={t['id']:t for t in manifest['tasks']}
        scope_allowed=True
        if task['conditionalScopeEpic']:
            release=json.loads((ROOT/'execution/release-manifest.json').read_text(encoding='utf-8'))
            scope_allowed=any(c['epicId']==task['conditionalScopeEpic'] and c['disposition']=='include' and c.get('decisionRecord') for c in release['conditionalCandidates'])
        if task['decisionGates'] or not scope_allowed or any(index[d]['state'] not in ['done','provided_design'] for d in task['dependsOn']):raise ValueError('Input review cannot bypass product/scope/prerequisite gates')
        task={**task,'dispatchStatus':'review_required'}
    record=assess(handoff,task,args.reviewed_by)
    if args.accept_input_review.strip():record['inputReviewReason']=args.accept_input_review
    for source,expected in task['inputPins'].items():
        if hashlib.sha256((ROOT/source).read_bytes()).hexdigest()!=expected:raise ValueError('Input changed; review/invalidate before recording')
    state_path=ROOT/'execution/task-state.json';state=json.loads(state_path.read_text(encoding='utf-8'))
    state['taskStates'][task['id']]={**state['taskStates'][task['id']],**record,'handoffPath':task['handoffPath']}
    state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'tools/build_execution_pack.py')],check=True)
    print(json.dumps({'taskId':task['id'],'state':record['state'],'runtimeCommandsExecutedByThisTool':False}))

if __name__=='__main__':main()
