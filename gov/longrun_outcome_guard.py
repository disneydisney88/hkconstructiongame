"""Outcome gate: terminal task state is insufficient without mission outcome."""
from __future__ import annotations
import argparse,json,pathlib,sys
ALLOWED={"NOT_MET","MET","BLOCKED","WAIVED_BY_USER"}
def main(argv=None):
 p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(required=True); g.add_argument('--run-id'); g.add_argument('--manifest'); p.add_argument('--json',action='store_true'); a=p.parse_args(argv)
 path=pathlib.Path(a.manifest) if a.manifest else pathlib.Path('gov/runs')/a.run_id/'manifest.json'
 try: d=json.loads(path.read_text(encoding='utf-8-sig'))
 except FileNotFoundError: out={'run_id':a.run_id,'code':2,'error':f'manifest missing: {path}'}; print(json.dumps(out) if a.json else out['error']); return 2
 except Exception as e: out={'run_id':a.run_id,'code':3,'error':f'invalid JSON: {e}'}; print(json.dumps(out) if a.json else out['error']); return 3
 if not isinstance(d,dict) or not isinstance(d.get('outcomes'),list): out={'run_id':a.run_id,'code':3,'error':'schema invalid: outcomes must be an array'}; print(json.dumps(out) if a.json else out['error']); return 3
 bad=[]
 for o in d['outcomes']:
  if not isinstance(o,dict) or not o.get('id') or o.get('status') not in ALLOWED: bad.append((o.get('id','?'),'invalid outcome id/status')); continue
  character = o.get('character_candidate') is True or o.get('outcome_type') == 'production_character' or any(w in str(d.get('run_id','')).lower() for w in ['production_character','mpfb_worker'])
  if character and o.get('status') == 'MET':
   checks=o.get('character_checks',{})
   required_checks=['visible_in_actual_game','not_static_or_rest_pose','animation_in_game','ppe_visual_pass','body_visual_pass','performance_pass','fallback_pass','front_side_movement_evidence','licence_clean']
   if o.get('requires_walk') is True or o.get('id') == 'mpfb_worker_v2_animated_in_game':
    approval=o.get('idle_only_user_approval',{})
    if not (isinstance(approval,dict) and approval.get('approved') is True and approval.get('evidence')): required_checks.append('walk_in_game')
   for key in required_checks:
    check=checks.get(key,{})
    if not isinstance(check,dict) or check.get('pass') is not True or not isinstance(check.get('evidence'),list) or not check.get('evidence'):
     bad.append((o['id'],'character MET requires evidenced PASS: '+key))
   if o.get('classification') == 'TECHNICAL_PROTOTYPE_ONLY': bad.append((o['id'],'technical prototype cannot claim character MET'))
  if o.get('required') is True:
   ev=o.get('evidence') or []; s=o['status']
   if s=='MET' and not ev: bad.append((o['id'],'MET requires evidence'))
   elif s=='WAIVED_BY_USER' and not ev: bad.append((o['id'],'WAIVED_BY_USER requires evidence'))
   elif s=='BLOCKED':
    if not o.get('blocked_allowed'): bad.append((o['id'],'required BLOCKED outcome is not allowed'))
    elif not ev or not o.get('failure_reason') or o.get('hard_blocker_evidence') is not True: bad.append((o['id'],'BLOCKED requires hard blocker evidence'))
   elif s=='NOT_MET': bad.append((o['id'],'required outcome is NOT_MET'))
  elif o.get('status')=='MET' and not (o.get('evidence') or []): bad.append((o['id'],'MET requires evidence'))
 result={'run_id':d.get('run_id',a.run_id),'total_outcomes':len(d['outcomes']),'failing_outcome_ids':[x[0] for x in bad],'failures':[{'id':x[0],'reason':x[1]} for x in bad],'code':1 if bad else 0}
 if a.json: print(json.dumps(result,ensure_ascii=False,indent=2))
 else:
  print(f"run_id: {result['run_id']}\ntotal outcomes: {result['total_outcomes']}\nfailing outcome IDs: "+(', '.join(result['failing_outcome_ids']) or 'none'))
  for x,y in bad: print(f'- {x}: {y}')
 return result['code']
if __name__=='__main__': raise SystemExit(main())
