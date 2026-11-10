import json
COMMON_HOW = """✨ So funktioniert's
1. Gib beim Kauf den Vornamen deines Kindes ein und wähle „Junge“ oder „Mädchen“.
2. Trag deine E-Mail-Adresse ein – dorthin schicken wir alles.
3. Wir erstellen die Schatzsuche und das persönliche Hörspiel automatisch und schicken dir beides in der Regel innerhalb von 30 Minuten (Absender: info@abenteuerweltchen.de).
4. Ausdrucken, {verstecken}, QR-Code scannen – und los geht's!"""
FOOT = """⚠️ Digitales Produkt: Es wird nichts per Post verschickt. Bitte prüfe die Schreibweise des Namens und deine E-Mail-Adresse genau. Keine Mail bekommen? Schau bitte im Spam-Ordner nach oder schreib uns über Etsy – wir helfen sofort!
Nur für den privaten Gebrauch."""
P = {
"alpaka": dict(
 title="Personalisierte Schatzsuche mit Hörspiel & Namen | Schnitzeljagd Kindergeburtstag zum Ausdrucken | Alpaka PDF 5–8 Jahre",
 intro="""🦙 Wo ist das Alpaka Luna? Die Schatzsuche, die mit deinem Kind spricht!

Dein Kind scannt den QR-Code im Heft – und Alpaka Luna ruft es persönlich beim Namen um Hilfe. Gänsehaut-Moment garantiert! Das ist keine Schatzsuche von der Stange, sondern ein Abenteuer, in dem DEIN Kind die Hauptrolle spielt – im Heft UND im Hörspiel.

Perfekt für den Kindergeburtstag, Regentage oder als besonderes Geschenk. Für Kinder von 5–8 Jahren, drinnen und draußen spielbar.""",
 verstecken="Wegweiser verstecken",
 bekommst="""📦 Du bekommst
• Personalisierte Schatzsuche als PDF (19 Seiten, DIN A4 quer) – mit dem Namen deines Kindes
• Persönliches Hörspiel: 7 Botschaften von Alpaka Luna und dem Erzähler, die dein Kind mit seinem Namen ansprechen
• QR-Code auf jeder Botschafts-Seite: Handy-Kamera drauf, grüner Knopf – Botschaft läuft. Keine App, kein Download, kein Account
• 5 Spiele & Bastelaktionen: Ausweise basteln, Bewegungsspiel, Möhren-Sammelspiel, Rätsel „Was gehört nicht zu den Alpakas?“, Luftballon-Wettrennen
• Farm-Ausweise – der Anführer-Ausweis ist schon mit dem Namen beschriftet
• Wegweiser zum Schatz und Urkunden für alle Kinder
• Anleitung für Eltern""",
 eck="""👧👦 Eckdaten
• 5–8 Jahre · 4–12+ Kinder
• ca. 40–60 Minuten Spielzeit, ca. 15 Minuten Vorbereitung
• drinnen und draußen spielbar"""),
"wald": dict(
 title="Personalisierte Schatzsuche Wald mit Hörspiel & Namen | Schnitzeljagd Kindergeburtstag Eichhörnchen Igel | PDF zum Ausdrucken",
 intro="""🌲 Die verlorene Vorratskammer – die Wald-Schatzsuche, die mit deinem Kind spricht!

QR-Code scannen – und Eichhörnchen Emil und Igel Iwan rufen dein Kind persönlich beim Namen um Hilfe: Ihre Wintervorräte sind verschwunden! Dein Kind führt das Waldhüter-Team an – im Heft UND im Hörspiel. So wird der Kindergeburtstag zum Abenteuer, von dem noch lange erzählt wird.

Perfekt für den Kindergeburtstag, Waldtage oder als besonderes Geschenk. Für Kinder von 5–8 Jahren, drinnen und draußen spielbar.""",
 verstecken="Spuren verstecken",
 bekommst="""📦 Du bekommst
• Personalisierte Schatzsuche als PDF (19 Seiten, DIN A4 quer) – mit dem Namen deines Kindes
• Persönliches Hörspiel: 7 Botschaften von Emil und Iwan, die dein Kind mit seinem Namen ansprechen
• QR-Code auf jeder Botschafts-Seite: Handy-Kamera drauf, grüner Knopf – Botschaft läuft. Keine App, kein Download, kein Account
• 6 Spiele & Bastelaktionen: Ausweise basteln, Spurenleser-Spiel, Bewegungsspiel, Snack-Sammelspiel, Tannenzapfen-Wettrennen, Vorräte-Staffel
• Waldhüter-Ausweise – der Anführer-Ausweis ist schon mit dem Namen beschriftet
• Spuren zum Schatz und Waldhüter-Urkunden für alle Kinder
• Anleitung für Eltern""",
 eck="""👧👦 Eckdaten
• 5–8 Jahre · 2–12 Kinder
• ca. 60–90 Minuten Spielzeit, ca. 15–20 Minuten Vorbereitung
• drinnen und draußen spielbar"""),
"weihnachten": dict(
 title="Personalisierte Weihnachts-Schatzsuche mit Hörspiel & Namen | Krümels Weihnachtsbäckerei | Schnitzeljagd Kinder PDF 5–8 Jahre",
 intro="""🎄 Krümels Weihnachtsbäckerei – die Weihnachts-Schatzsuche, die mit deinem Kind spricht!

Hausmaus Krümel wollte Plätzchen backen – doch Kater Moritz ist aufgewacht und alle Zutaten liegen im ganzen Haus verstreut. QR-Code scannen – und Krümel und Spatz Pia rufen dein Kind persönlich beim Namen: Es ist der neue Chef-Bäcker! Ein Weihnachtszauber im Heft UND im Hörspiel, den dein Kind nicht vergisst.

Perfekt für die Adventszeit, Nikolaus, Heiligabend, eine Weihnachtsfeier oder als besonderes Geschenk. Für Kinder von 5–8 Jahren, drinnen spielbar.""",
 verstecken="Zutaten-Karten verstecken",
 bekommst="""📦 Du bekommst
• Personalisierte Schatzsuche als PDF (24 Seiten, DIN A4 quer) – mit dem Namen deines Kindes
• Persönliches Hörspiel: 7 Botschaften von Maus Krümel und Spatz Pia, die dein Kind mit seinem Namen ansprechen
• QR-Code auf jeder Botschafts-Seite: Handy-Kamera drauf, grüner Knopf – Botschaft läuft. Keine App, kein Download, kein Account
• 7 Spiele & Bastelaktionen: Backstuben-Ausweise basteln, Schleich am Kater vorbei, Krümels Plätzchen-Blech (Bilder-Rätsel), Schokosterne sammeln, Pias Geheimschrift, Teig-Tanz-Bewegungswürfel, Schatz-Puzzle
• Backstuben-Ausweise – der Chef-Bäcker-Ausweis ist schon mit dem Namen beschriftet
• Zutaten-Karten, Weihnachtsbäcker-Urkunden für alle Kinder und ein Bonus-Plätzchenrezept
• Anleitung für Eltern""",
 eck="""👧👦 Eckdaten
• 5–8 Jahre · 2–12 Kinder
• ca. 60–90 Minuten Spielzeit, ca. 15–20 Minuten Vorbereitung
• drinnen spielbar – ideal für die Weihnachtszeit"""),
}
HOER = """🔊 So klingt's: Handy laut stellen oder an eine Bluetooth-Box koppeln – dann hören alle Kinder mit. Kein Handy zur Hand? Jede Botschaft steht auch als Text im Heft."""
out={}
for k,p in P.items():
    d="\n\n".join([p['intro'], COMMON_HOW.format(verstecken=p['verstecken']), p['bekommst'], HOER, p['eck'], FOOT])
    out[k]=dict(title=p['title'], desc=d, price="10,84")
    assert len(p['title'])<=140, (k,len(p['title']))
json.dump(out,open('neu.json','w'),ensure_ascii=False,indent=1)
for k,v in out.items(): print(k,len(v['title']),len(v['desc']))
