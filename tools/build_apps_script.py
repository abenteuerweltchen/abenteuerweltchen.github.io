"""Erzeugt das Apps Script (Version 2 mit Player) für eine Schatzsuche aus tools/specs/<id>.json.
   Aufruf: python3 tools/build_apps_script.py <id> <ausgabeordner> <token> <template_id> <private_folder_id>
   Ergebnis: <ausgabe>/<id>_Code.gs (enthält den geheimen Token → NICHT ins öffentliche Repo!)
   Dazu gehören im Apps-Script-Projekt noch die Dateien schatz_core.gs und qrcode.gs."""
import json, sys
pid, out, token, tpl, priv = sys.argv[1:6]
s = json.load(open(f"tools/specs/{pid}.json", encoding="utf-8"))
personal = [{"nr": b["nr"], "saetze": [[t["v"], t["t"]] for t in b["teile"] if t.get("p")]} for b in s["botschaften"]]
qrs = [dict(b=b["nr"], pos=b["seite"], color=s["qr_farbe"], **b["qr"]) for b in s["botschaften"]]
voices = {k: v["id"] for k, v in s["voices"].items()}
prefix = {"alpaka": "Alpaka-Schatzsuche_", "wald": "Wald-Schatzsuche_", "weihnachten": "Weihnachts-Schatzsuche_"}[pid]
rep = {"ID": pid, "TITEL": s["titel"], "TOKEN": token, "TEMPLATE_ID": tpl, "ANLEITUNG_ID": "1dySFXxVjDKhW7sOmgpXYgdmBnN3e5q20",
       "PRIVATE_ID": priv, "PLAYER_URL": f"https://abenteuerweltchen.github.io/{pid}/", "PDF_PREFIX": prefix,
       "ANLEITUNG_NAME": "Anleitung_" + prefix.rstrip("_") + ".pdf",
       "VOICES": json.dumps(voices), "PERSONAL": json.dumps(personal, ensure_ascii=False, indent=1), "QRS": json.dumps(qrs)}
g = open("tools/apps_script_vorlage.gs", encoding="utf-8").read()
for k, v in rep.items(): g = g.replace("{{%s}}" % k, v)
assert "{{" not in g, "Platzhalter übrig"
open(f"{out}/{pid}_Code.gs", "w", encoding="utf-8").write(g)
print(pid, sum(len(p["saetze"]) for p in personal), "persönliche Sätze,", sum(len(x[1]) for p in personal for x in p["saetze"]), "Zeichen")
