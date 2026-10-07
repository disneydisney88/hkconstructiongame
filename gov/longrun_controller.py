"""Small resumable controller for governance manifests; it does not execute game work."""
from __future__ import annotations
import argparse,json,os,pathlib,time
from datetime import datetime,timezone
from longrun_completion_guard import TERMINAL
def now(): return datetime.now(timezone.utc).isoformat()
def alive(pid):
    if not pid: return False
    try: os.kill(int(pid),0); return True
    except Exception: return False
def main(argv=None):
    p=argparse.ArgumentParser(); p.add_argument('--run-id',required=True); p.add_argument('--manifest',required=True); p.add_argument('--dry-run',action='store_true'); p.add_argument('--recover',action='store_true'); p.add_argument('--retry-blocked',action='store_true'); p.add_argument('--max-steps',type=int,default=1); p.add_argument('--once',action='store_true'); a=p.parse_args(argv)
    path=pathlib.Path(a.manifest); data=json.loads(path.read_text(encoding='utf-8')); lock=path.parent/(path.name+'.lock'); owner=None
    if lock.exists():
        try: owner=json.loads(lock.read_text(encoding='utf-8'))
        except Exception: owner={}
        if alive(owner.get('pid')) and not a.recover: print(f"refusing: active controller pid {owner.get('pid')}"); return 4
        if not a.recover and owner: print("stale lock exists; rerun with --recover"); return 4
    executable=[]
    for i in data.get('items',[]):
        if i.get('status') in TERMINAL and not (a.retry_blocked and i.get('status')=='BLOCKED'): continue
        deps={d.get('status') for d in data.get('items',[]) if d.get('id') in (i.get('depends_on') or [])}
        if deps and not deps.issubset(TERMINAL): continue
        if i.get('status') in {'NOT_STARTED','RUNNING','DONE'} or (a.retry_blocked and i.get('status')=='BLOCKED'): executable.append(i)
    executable.sort(key=lambda x:(-int(x.get('priority',0)),x.get('id',''))); chosen=executable[0] if executable else None
    print(f"next: {chosen.get('id')} — {chosen.get('title')}" if chosen else "next: none")
    if a.dry_run: return 0
    lock.write_text(json.dumps({'run_id':a.run_id,'pid':os.getpid(),'created_at':now()}),encoding='utf-8')
    try:
        data['controller_pid']=os.getpid(); data['updated_at']=now(); data.setdefault('history',[]).append({'at':now(),'event':'selected','item':chosen.get('id') if chosen else None}); path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    finally:
        try: lock.unlink()
        except FileNotFoundError: pass
    return 0
if __name__=='__main__': raise SystemExit(main())
