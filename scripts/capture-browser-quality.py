import base64
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
phase = root / "docs/qa/step10"
data = json.loads(
    (root / "apps/web/test-results/results.json").read_text(encoding="utf-8-sig")
)
label = sys.argv[1]
summary = {"stats": data["stats"], "cases": [], "axe_audits": 0, "axe_violations": 0}


def walk(suite):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            summary["cases"].append(
                {
                    "title": spec["title"],
                    "file": spec.get("file"),
                    "project": test["projectName"],
                    "status": test.get("status"),
                    "results": [
                        {k: r.get(k) for k in ("status", "duration", "retry")}
                        for r in test.get("results", [])
                    ],
                }
            )
            for result in test.get("results", []):
                for a in result.get("attachments", []):
                    if "axe" not in a["name"] or not (a.get("path") or a.get("body")):
                        continue
                    if a.get("body"):
                        audit = json.loads(base64.b64decode(a["body"]))
                    else:
                        source = Path(a["path"]).resolve()
                        assert source.is_relative_to(
                            (root / "apps/web/test-results").resolve()
                        )
                        audit = json.loads(source.read_text(encoding="utf-8"))
                    summary["axe_audits"] += 1
                    summary["axe_violations"] += len(audit["violations"])
                    destination = (
                        phase / "axe" / f"{label}-{summary['axe_audits']:03d}.json"
                    )
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_text(
                        json.dumps(
                            {
                                k: audit[k]
                                for k in (
                                    "url",
                                    "timestamp",
                                    "testEngine",
                                    "violations",
                                )
                            },
                            ensure_ascii=False,
                            indent=2,
                        )
                        + "\n",
                        encoding="utf-8",
                    )
    for child in suite.get("suites", []):
        walk(child)


for suite in data["suites"]:
    walk(suite)
(phase / f"{label}-summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps({k: v for k, v in summary.items() if k != "cases"}))
