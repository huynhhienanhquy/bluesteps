"""Behavior checks for handoff gates. Fixtures are temporary; no product code is run."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import record_task_handoff as handoff_tool

class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);(self.root/'evidence.txt').write_text('fixture only')
        self.patch=patch.object(handoff_tool,'WORKSPACE',self.root);self.patch.start();self.addCleanup(self.patch.stop)
        self.task={'id':'TEST-BUILD','stage':'BUILD','kind':'implementation','dispatchStatus':'ready','inputPins':{'source':'a'*64},'inputFingerprint':'b'*64,'allowedPaths':['evidence.txt']}
        self.h={'taskId':'TEST-BUILD','status':'done','inputHashes':{'source':'a'*64},'changedFiles':['evidence.txt'],'commands':[{'cwd':str(self.root),'command':'fixture test','exitCode':0,'outputPath':'evidence.txt'}],'evidence':['evidence.txt'],'unresolved':[],'runtimeVerified':True}
    def test_success_keeps_output_hashes(self):
        r=handoff_tool.assess(self.h,self.task,'fixture-reviewer');self.assertEqual('done',r['state']);self.assertIn('evidence.txt',r['outputHashes'])
    def test_documentation_only_does_not_finish_runtime(self):
        self.h['runtimeVerified']=False
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_failed_check_not_done(self):
        self.h['commands'][0]['exitCode']=1
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_unresolved_decision_not_done(self):
        self.h['unresolved']=['DEC05']
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_pending_prerequisite_not_bypassed(self):
        self.task['dispatchStatus']='waiting_for_dependencies'
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_changed_input_not_accepted(self):
        self.h['inputHashes']['source']='c'*64
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_missing_evidence_not_accepted(self):
        self.h['evidence']=['missing.txt']
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_changed_file_outside_scope_not_accepted(self):
        self.task['allowedPaths']=['other.txt']
        with self.assertRaises(ValueError):handoff_tool.assess(self.h,self.task,'reviewer')
    def test_planning_can_be_done_without_runtime_claim(self):
        self.task['stage']='SPEC';self.task['kind']='specification';self.h['runtimeVerified']=False
        self.assertEqual('done',handoff_tool.assess(self.h,self.task,'reviewer')['state'])
    def test_resume_preserves_old_evidence_without_completing(self):
        old={'state':'blocked','handoffPath':'old.json','outputHashes':{'evidence.txt':'a'*64}}
        new=handoff_tool.resume_record(old,'reviewer')
        self.assertEqual('not_started',new['state']);self.assertEqual('old.json',new['handoffPath']);self.assertEqual(old['outputHashes'],new['outputHashes'])
    def test_resume_does_not_reset_running_or_done_tasks(self):
        for state in ['in_progress','done']:
            with self.assertRaises(ValueError):handoff_tool.resume_record({'state':state},'reviewer')

if __name__=='__main__':unittest.main()
