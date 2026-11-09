"""Baut die Player-Seite einer Schatzsuche aus tools/specs/<id>.json:
   <id>/index.html (aus tools/vorlage_schatzsuche.html) und <id>/config.js.
   Aufruf: python3 tools/build_player.py alpaka   (GAS-Adresse steht in der Spec unter "gas")"""
import json, re, sys, time, os
G = re.compile(r'\{([^{}|]*)\|([^{}|]*)\}')
def build(pid):
    s = json.load(open(f"tools/specs/{pid}.json", encoding="utf-8"))
    bs = []
    for b in s["botschaften"]:
        teile = []
        for i, t in enumerate(b["teile"], 1):
            if t.get("p"): teile.append({"p": 1, "v": t["v"]})
            else: teile.append({"f": f"b{b['nr']}_{i}", "g": 1, "v": t["v"]} if G.search(t["t"]) else {"f": f"b{b['nr']}_{i}", "v": t["v"]})
        bs.append({k: b[k] for k in ("nr", "seite", "wer", "titel", "aufgabe", "bild")} | {"teile": teile})
    cfg = {"id": pid, "titel": s["titel"], "gas": s.get("gas", ""), "team": s.get("team"), "finale": s.get("finale"),
           "confetti": s.get("confetti"), "voices": {k: {"name": v["name"], "img": v["img"]} for k, v in s["voices"].items()},
           "botschaften": bs}
    os.makedirs(pid, exist_ok=True)
    open(f"{pid}/config.js", "w", encoding="utf-8").write("// automatisch erzeugt aus tools/specs/%s.json – nicht von Hand ändern\nwindow.SCHATZ=%s;\n" % (pid, json.dumps(cfg, ensure_ascii=False, indent=1)))
    h = open("tools/vorlage_schatzsuche.html", encoding="utf-8").read()
    rep = {"TITEL": s["titel"], "UNTERTITEL": s["untertitel"], "THEME_COLOR": s.get("theme_color", "#f6c94f"),
           "COVER_ALT": s.get("cover_alt", s["titel"]), "KARTE": s.get("karte", "Eure Schatzkarte"),
           "FIGUREN": s.get("figuren", "Die Figuren"), "V": time.strftime("%Y%m%d%H%M")}
    for k, v in rep.items(): h = h.replace("{{%s}}" % k, v)
    open(f"{pid}/index.html", "w", encoding="utf-8").write(h)
    print("gebaut:", pid, len(bs), "Botschaften")
if __name__ == "__main__":
    for p in sys.argv[1:]: build(p)
