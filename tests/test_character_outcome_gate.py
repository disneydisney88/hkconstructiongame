import unittest,json,tempfile,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
KEYS=['visible_in_actual_game','not_static_or_rest_pose','animation_in_game','ppe_visual_pass','body_visual_pass','performance_pass','fallback_pass','front_side_movement_evidence','licence_clean']
class CharacterGate(unittest.TestCase):
 def run_gate(self,checks,status='MET',classification=None,requires_walk=False):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td)/'manifest.json';p.write_text(json.dumps({'run_id':'mpfb_worker_fixture','outcomes':[{'id':'worker','required':True,'status':status,'evidence':['x'],'character_checks':checks,'classification':classification,'requires_walk':requires_walk}]}));return subprocess.run([sys.executable,str(ROOT/'gov/longrun_outcome_guard.py'),'--manifest',str(p)],capture_output=True).returncode
 def test_walk_required_fails_without_walk(self):self.assertEqual(self.run_gate({k:{'pass':True,'evidence':['proof']} for k in KEYS},requires_walk=True),1)
 def test_visible_only_fails(self):self.assertEqual(self.run_gate({}),1)
 def test_static_fails(self):
  c={k:{'pass':True,'evidence':['proof']} for k in KEYS};c['not_static_or_rest_pose']['pass']=False;self.assertEqual(self.run_gate(c),1)
 def test_unexplained_performance_fails(self):
  c={k:{'pass':True,'evidence':['proof']} for k in KEYS};c['performance_pass']['pass']=False;self.assertEqual(self.run_gate(c),1)
 def test_evidenced_checks_pass(self):self.assertEqual(self.run_gate({k:{'pass':True,'evidence':['proof']} for k in KEYS}),0)
 def test_technical_prototype_cannot_met(self):self.assertEqual(self.run_gate({k:{'pass':True,'evidence':['proof']} for k in KEYS},classification='TECHNICAL_PROTOTYPE_ONLY'),1)
if __name__=='__main__':unittest.main()
