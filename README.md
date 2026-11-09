# Abenteuerweltchen – Hörspiel-Player (Web-Apps)

Live: `https://abenteuerweltchen.github.io/<produkt>/` · jede Seite öffnet sich über die QR-Codes im Heft.

| Ordner | Produkt | Aufruf |
|---|---|---|
| `alpaka/` | Schatzsuche „Wo ist das Alpaka Luna?“ | `?b=1…7&k=CODE` |
| `wald/` | Schatzsuche „Die verlorene Vorratskammer“ | `?b=1…7&k=CODE` |
| `weihnachten/` | Schatzsuche „Krümels Weihnachtsbäckerei“ | `?b=1…7&k=CODE` |
| `mondmission/` | Lernreise „Mission zum Mond“ | `?s=0…16&k=CODE` |
| `dumpling/` | Detektiv-Fall (9–10 J., Test) | – |

**Aufbau jeder Schatzsuche:** `index.html` + `config.js` (beide erzeugt), `theme.css` (Farben/Deko), `img/` (Figuren aus dem Heft), `audio/` (alles **ohne** Namen, einmal vertont).
Gemeinsamer Player-Kern: `shared/schatz.js` + `shared/schatz.css`.

**Datenschutz:** Kein Kindername in Adressen oder im Repo. `k=CODE` ist ein Zufallscode; Name und persönliche Sätze liefert das Apps Script des Produkts nur zu diesem Code.

**Ändern / Neues Produkt**
1. Texte, Botschaften, Bilder, QR-Positionen: `tools/specs/<produkt>.json`
2. Seite neu bauen: `python3 tools/build_player.py <produkt>`
3. Apps Script erzeugen: `python3 tools/build_apps_script.py …` (Ausgabe enthält den geheimen Token → nicht hier einchecken)
4. Neue Audio-Dateien: Liste in `tools/holen.json` (`pfad` + `url`) pushen → GitHub-Action „Dateien holen“ lädt sie ins Repo.

Das alte Repo `mondmission-player` leitet nur noch hierher weiter (für bereits gedruckte QR-Codes).
