import json, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; GUARD=ROOT/'gov/longrun_completion_guard.py'; CTRL=ROOT/'gov/longrun_controller.py'; FIX=ROOT/'tests/fixtures/longrun'
OUTCOME=ROOT/'gov/longrun_outcome_guard.py'
def run(*args): return subprocess.run([sys.executable,*args],cwd=ROOT,text=True,capture_output=True)
def mutate(base, status, field=None):
    d=json.loads((FIX/base).read_text()); i=d['items'][0]; i['status']=status
    i['evidence']=[]
    if field: i.update(field)
    p=ROOT/'tests'/'fixtures'/'longrun'/'_tmp_case.json'; p.write_text(json.dumps(d)); return p
def main():
    checks=[]
    checks.append(('incomplete',run(str(GUARD),'--manifest',str(FIX/'incomplete_13_items.json')).returncode==1))
    checks.append(('blocked',run(str(GUARD),'--manifest',str(FIX/'blocked_allowed.json')).returncode==0))
    checks.append(('outcome not met fails',run(str(OUTCOME),'--manifest',str(FIX/'outcome_not_met_but_items_terminal.json')).returncode==1))
    checks.append(('outcome met passes',run(str(OUTCOME),'--manifest',str(FIX/'outcome_met.json')).returncode==0))
    checks.append(('outcome blocked not allowed fails',run(str(OUTCOME),'--manifest',str(FIX/'outcome_blocked_not_allowed.json')).returncode==1))
    checks.append(('outcome blocked allowed passes',run(str(OUTCOME),'--manifest',str(FIX/'outcome_blocked_allowed_with_evidence.json')).returncode==0))
    checks.append(('skipped without evidence',run(str(GUARD),'--manifest',str(FIX/'skipped_without_evidence.json')).returncode==1))
    checks.append(('core skipped without approval',run(str(GUARD),'--manifest',str(FIX/'core_skipped_without_approval.json')).returncode==1))
    checks.append(('core skipped with blocker',run(str(GUARD),'--manifest',str(FIX/'core_skipped_with_blocker.json')).returncode==0))
    for name,status,field in [('DONE','DONE',{}),('VERIFIED','VERIFIED',{}),('BLOCKED','BLOCKED',{'blocker':'x'}),('FAILED','FAILED',{'error':'x'}),('SKIPPED','SKIPPED',{})]:
        p=mutate('blocked_allowed.json',status,field); checks.append((name+' validation',run(str(GUARD),'--manifest',str(p)).returncode==1)); p.unlink(missing_ok=True)
    rr=run(str(CTRL),'--run-id','resume_case','--manifest',str(FIX/'resume_case.json'),'--dry-run'); checks.append(('resume dry-run',rr.returncode==0 and 'next — next work' in rr.stdout))
    checks.append(('missing',run(str(GUARD),'--manifest',str(FIX/'missing.json')).returncode==2))
    p=ROOT/'tests'/'fixtures'/'longrun'/'_invalid_case.json'; p.write_text('{bad'); checks.append(('invalid schema',run(str(GUARD),'--manifest',str(p)).returncode==3)); p.unlink(missing_ok=True)
    for n,ok in checks: print(('PASS' if ok else 'FAIL')+' '+n)
    return 0 if all(x[1] for x in checks) else 1
if __name__=='__main__': raise SystemExit(main())
