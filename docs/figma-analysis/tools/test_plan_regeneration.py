"""Regression checks on isolated copies: never mutate live task state or decisions."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE=Path(__file__).resolve().parents[1]
FILES=['backlog.json','interface-task-traceability.json','03-backend-and-api.md','04-database.md','05-delivery-plan.md','06-decisions-and-gaps.md','08-tech-stack.md','09-python-supabase.md','11-agent-execution-guide.md','12-agent-start-here.md','execution/capabilities.json','execution/decisions.json','execution/release-manifest.json','execution/task-state.json','contracts/core.openapi.json','contracts/auth-policy.json','contracts/access-matrix.json','tools/build_execution_pack.py']

class RegenerationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'workspace'/'docs'/'figma-analysis';self.root.mkdir(parents=True)
        for name in FILES:
            target=self.root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(SOURCE/name,target)
    def load(self,name):return json.loads((self.root/name).read_text(encoding='utf-8'))
    def save(self,name,data):(self.root/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    def generate(self):
        r=subprocess.run([sys.executable,str(self.root/'tools/build_execution_pack.py')],capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(0,r.returncode,r.stderr)
    def active_fixture(self):
        state=self.load('execution/task-state.json');state['taskStates']['API-BASE-BUILD']['state']='in_progress';self.save('execution/task-state.json',state)
        p=self.root/'execution/handoffs/API-BASE-BUILD.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text('fixture evidence only',encoding='utf-8');return p
    def test_routine_generation_keeps_active_work_and_evidence(self):
        evidence=self.active_fixture();self.generate()
        self.assertEqual('in_progress',self.load('execution/task-state.json')['taskStates']['API-BASE-BUILD']['state'])
        self.assertEqual('fixture evidence only',evidence.read_text(encoding='utf-8'))
    def test_changed_input_invalidates_without_erasing_handoff(self):
        evidence=self.active_fixture();policy=self.load('contracts/auth-policy.json');policy['accessToken']['ttlSeconds']+=1;self.save('contracts/auth-policy.json',policy);self.generate()
        self.assertEqual('needs_input_review',self.load('execution/task-state.json')['taskStates']['API-BASE-BUILD']['state'])
        self.assertTrue(evidence.exists())
    def test_routine_generation_preserves_scope_and_product_records(self):
        release=self.load('execution/release-manifest.json');release['conditionalCandidates'][0].update({'disposition':'defer','decisionRecord':'Synthetic test fixture only; not a real product decision'});self.save('execution/release-manifest.json',release)
        decisions=self.load('execution/decisions.json');decisions['decisions'][0].update({'status':'confirmed','value':'Synthetic fixture only','evidence':'Unit fixture'});self.save('execution/decisions.json',decisions);self.generate()
        self.assertEqual('defer',self.load('execution/release-manifest.json')['conditionalCandidates'][0]['disposition'])
        self.assertEqual('Synthetic fixture only',self.load('execution/decisions.json')['decisions'][0]['value'])
    def test_authored_contract_is_not_silently_overwritten(self):
        contract=self.load('contracts/core.openapi.json');contract['info']['title']='Synthetic authored contract fixture';self.save('contracts/core.openapi.json',contract);self.generate()
        self.assertEqual('Synthetic authored contract fixture',self.load('contracts/core.openapi.json')['info']['title'])

if __name__=='__main__':unittest.main()
