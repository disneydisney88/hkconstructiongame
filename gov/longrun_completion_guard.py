"""Machine completion guard for durable multi-item runs."""
from __future__ import annotations
import argparse,json,pathlib,sys
TERMINAL={"VERIFIED","BLOCKED","FAILED","SKIPPED"}; ALLOWED={"NOT_STARTED","RUNNING","DONE",*TERMINAL}
def load(path):
    try: data=json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError: return None,2,f"manifest missing: {path}"
    except Exception as e: return None,3,f"invalid JSON: {e}"
    required={"run_id","title","created_at","updated_at","controller_pid","lock_file","items","history"}
    if not isinstance(data,dict) or not required.issubset(data) or not isinstance(data.get("items"),list) or not isinstance(data.get("history"),list): return None,3,"schema invalid: manifest required fields"
    for i in data["items"]:
        fields={"id","title","priority","status","started_at","updated_at","last_success","evidence","blocker","error","next_action","depends_on","notes"}
        if not isinstance(i,dict) or not fields.issubset(i) or not i.get("id") or i.get("status") not in ALLOWED or not isinstance(i.get("evidence"),list): return None,3,"schema invalid: item fields"
    return data,0,""
def check(data):
    bad=[]
    for i in data["items"]:
        s=i["status"]; ev=i.get("evidence") or []; why=None
        if s not in TERMINAL: why=f"status {s} is not terminal"
        elif s=="VERIFIED" and not ev: why="VERIFIED requires evidence"
        elif s=="BLOCKED" and (not i.get("blocker") or not ev): why="BLOCKED requires blocker and evidence"
        elif s=="FAILED" and (not i.get("error") or not ev): why="FAILED requires error and evidence"
        elif s=="SKIPPED":
            n=i.get("notes")
            required={"reason","attempted_checks","evidence","why_safe_to_skip","follow_up"}
            if not isinstance(n,dict) or not required.issubset(n): why="SKIPPED requires notes.reason, attempted_checks, evidence, why_safe_to_skip and follow_up"
            elif not isinstance(n.get("attempted_checks"),list) or not n.get("attempted_checks") or not isinstance(n.get("evidence"),list) or not n.get("evidence") or not n.get("reason") or not n.get("why_safe_to_skip") or not n.get("follow_up"): why="SKIPPED notes fields must be non-empty and arrays must be arrays"
            elif i.get("core") is True and not n.get("skip_approved_by_user") and not (i.get("blocker") and n.get("hard_blocker") is True and n.get("evidence")): why="core SKIPPED requires user approval or hard blocker evidence"
        if why: bad.append((i["id"],why))
    return bad
def main(argv=None):
    p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(required=True); g.add_argument("--run-id"); g.add_argument("--manifest"); p.add_argument("--json",action="store_true"); a=p.parse_args(argv)
    path=pathlib.Path(a.manifest) if a.manifest else pathlib.Path("gov/runs")/a.run_id/"manifest.json"; data,code,msg=load(path)
    if code:
        out={"run_id":a.run_id,"code":code,"error":msg}; print(json.dumps(out,ensure_ascii=False) if a.json else msg); return code
    counts={s:sum(i["status"]==s for i in data["items"]) for s in sorted(ALLOWED)}; bad=check(data); out={"run_id":data["run_id"],"total_items":len(data["items"]),"counts":counts,"failing_item_ids":[x[0] for x in bad],"failures":[{"id":x[0],"reason":x[1]} for x in bad],"code":1 if bad else 0}
    if a.json: print(json.dumps(out,ensure_ascii=False,indent=2))
    else:
        print(f"run_id: {data['run_id']}\ntotal items: {len(data['items'])}"); print("counts: "+", ".join(f"{k}={v}" for k,v in counts.items())); print("failing item IDs: "+(", ".join(out["failing_item_ids"]) or "none")); [print(f"- {x}: {y}") for x,y in bad]
    return out["code"]
if __name__=="__main__": sys.exit(main())
