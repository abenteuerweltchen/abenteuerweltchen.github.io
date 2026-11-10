/**
 * Abenteuerweltchen – Wo ist das Alpaka Luna? (alpaka) personalisieren · Version 2 mit Hörspiel-Player
 * Eigenes Skript nur für dieses Produkt. Das alte Skript (Version 1, Audio im Drive-Ordner) bleibt unverändert.
 * Automatisch erzeugt aus tools/specs/alpaka.json mit tools/build_apps_script.py – Texte bitte dort ändern.
 *
 *  1. Make schickt die Bestellung (Name, Geschlecht, E-Mail – auch als rohe Etsy-Angaben) an doPost.
 *  2. Das Skript erzeugt einen geheimen Zufallscode (z. B. k7x2m9q4ab3d) – der Name steht NIE in einer Adresse.
 *  3. Es baut die PDF (Name wie bisher + auf jeder Botschafts-Seite eine QR-Karte „Botschaft hören“ mit dem Code)
 *     und legt sie mit der Anleitung in „02 Auslieferungen (automatisch)/<Bestellnr>_<Name>“ (per Link lesbar).
 *  4. Es legt einen PRIVATEN Ordner „Hörspiel (privat)/<Code>“ an und liefert Make die wenigen Sätze mit dem Namen.
 *     Make lässt sie von ElevenLabs sprechen und legt die MP3s in diesen privaten Ordner.
 *     Alles andere (ohne Namen) liegt schon fertig im Player: https://abenteuerweltchen.github.io/alpaka/
 *  5. Der Player ruft doGet mit dem Code auf und bekommt Name + persönliche Sätze. Fehlt ein Satz, wird er übersprungen.
 *  6. Aufräumen: Bestellungen älter als 400 Tage werden täglich gelöscht (Funktion „einrichten“ einmal ausführen).
 */
var CONFIG = {
  TOKEN: '__TOKEN__',                                   // geheimer Schlüssel – muss in Make identisch sein
  TEMPLATE_ID: '1UA92VNkSqWLLQ5TWt5te8lbrDsVNCABs',                       // alpaka_vorlage.pdf (darf verschoben/umbenannt werden, nicht löschen)
  ANLEITUNG_ID: '1dySFXxVjDKhW7sOmgpXYgdmBnN3e5q20',                     // Anleitung (PDF)
  OUTPUT_FOLDER_ID: '1Afrq-TwLsQ5uvulyVUBl8lFXUSvTvd07', // 02 Auslieferungen (automatisch)
  PRIVATE_FOLDER_ID: '1j_uwyXnwFZ-D_AhYFCxBqacTACu4O3B-',                  // 01 Produkte › … › Hörspiel (privat)
  PLAYER_URL: 'https://abenteuerweltchen.github.io/alpaka/',
  PDF_PREFIX: 'Alpaka-Schatzsuche_',
  ANLEITUNG_NAME: 'Anleitung_Alpaka-Schatzsuche.pdf',
  AUDIO_MODEL: 'eleven_v3',
  KEEP_DAYS: 400,
};
var VOICES = {"E": "tGtWQn05zwm3hVZ7EsfC", "L": "bnDKguL8HsKn1Ma0sci1"};
// Persönliche Sätze je Botschaft (in der Reihenfolge, in der der Player sie abspielt). {NAME}, {Junge-Form|Mädchen-Form}
var PERSONAL = [
 {
  "nr": 1,
  "saetze": [
   [
    "E",
    "Und genau diese wichtige Aufgabe hast du, {NAME}! Du bist {der Alpaka-Hüter|die Alpaka-Hüterin} der Farm."
   ]
  ]
 },
 {
  "nr": 2,
  "saetze": [
   [
    "L",
    "[excited] Hallo {NAME}!"
   ]
  ]
 },
 {
  "nr": 3,
  "saetze": [
   [
    "L",
    "{NAME}, schaffst du es gemeinsam mit deinen Freunden, alle Hindernisse zu überqueren?"
   ]
  ]
 },
 {
  "nr": 4,
  "saetze": [
   [
    "L",
    "{NAME}, hilfst du mir, die Möhren zu finden?"
   ]
  ]
 },
 {
  "nr": 5,
  "saetze": [
   [
    "L",
    "Ob {NAME} und die anderen Farm-Mitarbeiter den Bach überqueren könnten?"
   ]
  ]
 },
 {
  "nr": 6,
  "saetze": [
   [
    "L",
    "{NAME}, ich glaube an dich!"
   ]
  ]
 },
 {
  "nr": 7,
  "saetze": [
   [
    "E",
    "Und jetzt geht es zurück zur Sonnenhof-Farm, um {NAME} und alle Farm-Mitarbeiter zu feiern!"
   ]
  ]
 }
];
// QR-Karten: Seite (Position im Heft), linke untere Ecke in pt, Farbe
var QRS = [{"b": 1, "pos": 2, "color": "#df6a4c", "x": 24, "y": 27}, {"b": 2, "pos": 5, "color": "#df6a4c", "x": 24, "y": 455}, {"b": 3, "pos": 6, "color": "#df6a4c", "x": 24, "y": 27}, {"b": 4, "pos": 8, "color": "#df6a4c", "x": 24, "y": 27}, {"b": 5, "pos": 11, "color": "#df6a4c", "x": 24, "y": 27}, {"b": 6, "pos": 15, "color": "#df6a4c", "x": 24, "y": 27}, {"b": 7, "pos": 17, "color": "#df6a4c", "x": 720, "y": 27}];

// ---------------- Make → neue Bestellung ----------------
function doPost(e) { return json_(bestellung_((e && e.parameter) || {})); }

function bestellung_(p) {
  var t0 = Date.now(), props = PropertiesService.getScriptProperties();
  try {
    if (p.token !== CONFIG.TOKEN) return { ok: false, error: 'UNAUTHORIZED: falscher Schlüssel' };
    var input = readInput_(p);
    var order = String(p.order_id || ('TEST-' + Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyyMMdd-HHmmss')));
    var code = props.getProperty('o_' + order) || neuerCode_();      // Nachliefern → gleicher Code, gedruckte QR-Codes bleiben gültig
    var qrs = QRS.map(function (q) { return { pos: q.pos, x: q.x, y: q.y, scale: q.scale, color: q.color, url: CONFIG.PLAYER_URL + '?b=' + q.b + '&k=' + code }; });
    var r = personalizeSchatz(DriveApp.getFileById(CONFIG.TEMPLATE_ID).getBlob().getBytes(), input.name, input.gender, qrs);

    var folderName = safe_(order) + '_' + safe_(r.name);
    var parent = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    var it = parent.getFoldersByName(folderName);
    var folder = it.hasNext() ? it.next() : parent.createFolder(folderName);
    var files = folder.getFiles();
    while (files.hasNext()) files.next().setTrashed(true);
    var pdfName = CONFIG.PDF_PREFIX + safe_(r.name) + '.pdf';
    var signed = new Array(r.bytes.length);
    for (var i = 0; i < r.bytes.length; i++) signed[i] = r.bytes[i] > 127 ? r.bytes[i] - 256 : r.bytes[i];
    var pdf = folder.createFile(Utilities.newBlob(signed, 'application/pdf', pdfName));
    var anleitung = DriveApp.getFileById(CONFIG.ANLEITUNG_ID).makeCopy(CONFIG.ANLEITUNG_NAME, folder);
    var shared = true;
    try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { shared = false; }

    var priv = privatOrdner_(code, true);
    var old = priv.getFiles();
    while (old.hasNext()) old.next().setTrashed(true);
    priv.createFile('info.json', JSON.stringify({ name: r.name, g: r.gender, order: order, created: new Date().toISOString() }), 'application/json');
    props.setProperty('o_' + order, code);
    props.setProperty('k_' + code, priv.getId());

    var jobs = audioJobs_(r.name, r.gender);
    return {
      ok: true, order_id: order, name: r.name, gender: r.gender, email: input.email, code: code,
      player_url: CONFIG.PLAYER_URL + '?b=1&k=' + code,
      folder_id: folder.getId(), folder_url: folder.getUrl(), folder_shared: shared,
      file_id: pdf.getId(), file_name: pdfName, anleitung_id: anleitung.getId(), anleitung_name: CONFIG.ANLEITUNG_NAME,
      audio_folder_id: priv.getId(), audio_jobs: jobs, audio_count: jobs.length,
      audio_chars: jobs.reduce(function (t, j) { return t + j.body.text.length; }, 0),
      size_kb: Math.round(r.bytes.length / 1024), ms: Date.now() - t0,
    };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err), ms: Date.now() - t0 };
  }
}

function audioJobs_(name, gender) {
  var girl = gender === 'w';
  var fill = function (t) { return t.replace(/\{NAME\}/g, name).replace(/\{([^{}|]*)\|([^{}|]*)\}/g, function (_, m, w) { return girl ? w : m; }); };
  var jobs = [];
  PERSONAL.forEach(function (b) {
    b.saetze.forEach(function (s, i) {
      jobs.push({ file_name: 'b' + b.nr + '_p' + (i + 1) + '.mp3', voice_id: VOICES[s[0]],
                  body: { text: fill(s[1]), model_id: CONFIG.AUDIO_MODEL, language_code: 'de' } });
    });
  });
  return jobs;
}

// ---------------- Player → Name + persönliche Sätze ----------------
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    var k = String(p.k || '').toLowerCase();
    if (!/^[a-z0-9]{6,16}$/.test(k)) return json_({ ok: false, error: 'kein Code' });
    var fid = PropertiesService.getScriptProperties().getProperty('k_' + k);
    if (!fid) return json_({ ok: false, error: 'unbekannt' });
    var folder = DriveApp.getFolderById(fid);
    if (p.b === undefined) {
      var info = JSON.parse(folder.getFilesByName('info.json').next().getBlob().getDataAsString());
      return json_({ ok: true, name: info.name, g: info.g });
    }
    var nr = parseInt(p.b, 10), b = PERSONAL.filter(function (x) { return x.nr === nr; })[0], clips = [];
    if (b) b.saetze.forEach(function (_, i) {
      var f = folder.getFilesByName('b' + nr + '_p' + (i + 1) + '.mp3');
      clips.push(f.hasNext() ? Utilities.base64Encode(f.next().getBlob().getBytes()) : null);
    });
    return json_({ ok: true, clips: clips });
  } catch (err) {
    return json_({ ok: false, error: 'Fehler' });
  }
}

// ---------------- Einrichtung / Pflege (im Editor ausführen) ----------------
/** Einmal ausführen: täglicher Aufräum-Auftrag (löscht alte Bestellungen nach KEEP_DAYS Tagen). */
function einrichten() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'aufraeumen') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('aufraeumen').timeBased().everyDays(1).atHour(4).create();
  Logger.log('Aufräumen eingerichtet');
}
function aufraeumen() {
  var props = PropertiesService.getScriptProperties(), all = props.getProperties(), limit = Date.now() - CONFIG.KEEP_DAYS * 864e5;
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('k_') !== 0) return;
    try {
      var f = DriveApp.getFolderById(all[key]);
      if (f.getDateCreated().getTime() < limit) { f.setTrashed(true); props.deleteProperty(key); }
    } catch (e) { props.deleteProperty(key); }
  });
}
/** Test im Editor: baut eine Beispiel-Bestellung (Emma) – Ergebnis im Protokoll. */
function testlauf() {
  var r = bestellung_({ token: CONFIG.TOKEN, name: 'Emma', gender: 'Mädchen', email: 'test@example.com' });
  if (r.audio_jobs) r.audio_jobs = r.audio_jobs.length + ' Sätze, z. B.: ' + JSON.stringify(r.audio_jobs[0]);
  Logger.log(JSON.stringify(r, null, 1));
}

// ---------------- Hilfsfunktionen ----------------
function privatOrdner_(code, create) {
  var parent = DriveApp.getFolderById(CONFIG.PRIVATE_FOLDER_ID), it = parent.getFoldersByName(code);
  return it.hasNext() ? it.next() : (create ? parent.createFolder(code) : null);
}
function neuerCode_() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Math.random() + Date.now()), s = '';
  for (var i = 0; i < 12; i++) s += abc.charAt((bytes[i] & 255) % abc.length);
  return s;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function safe_(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
}
function decode_(s) {
  return String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
/** Liest Name, Geschlecht und E-Mail (direkt oder aus den rohen Etsy-Angaben var1…var10). Ein altes Audio-Feld wird ignoriert. */
function readInput_(p) {
  var name = p.name || '', gender = p.gender || '', email = p.email || '';
  var EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  var rawN = [], rawV = [];
  for (var k = 1; k <= 10; k++) {
    if (p['var' + k + '_name'] === undefined && p['var' + k + '_value'] === undefined) continue;
    rawN.push(p['var' + k + '_name'] || ''); rawV.push(p['var' + k + '_value'] || '');
  }
  var fields = [];
  for (var i = 0; i < rawN.length; i++) {
    var n0 = decode_(rawN[i]).trim(), v0 = decode_(rawV[i] || '').trim();
    if (!n0 && !v0) continue;
    var pairs = [], re = /(^|\n)\s*([^:\n]{2,60}?)\s*:\s*([^\n]*)/g, m;
    while ((m = re.exec(v0))) pairs.push([m[2], m[3].trim()]);
    if (pairs.length >= 2 && (rawN.length === 1 || (/personali/i.test(n0) && !/audio/i.test(n0)))) pairs.forEach(function (pr) { fields.push(pr); });
    else fields.push([n0, v0]);
  }
  fields.forEach(function (f) {
    var n = f[0].toLowerCase(), v = f[1];
    var mMail = EMAIL_RE.exec(v);
    if (mMail) {
      if (!email) email = mMail[0];
      v = v.replace(mMail[0], '').replace(/(e-?mail(-adresse)?|adresse)\s*[:=\-]?\s*/ig, '').trim();
    }
    if (/mail/.test(n)) return;
    if (/audio|hörspiel|hoerspiel|botschaft/.test(n)) return;
    if (/geschlecht|junge|mädchen|maedchen|gender/.test(n)) { if (!gender) gender = v; return; }
    if (/personali|name/.test(n)) {
      if (!v) return;
      var mName = /(?:vor)?name[^:=\n]*[:=]\s*([^\n,;|]+)/i.exec(v);
      var mGen = /\b(junge|mädchen|maedchen)\b/i.exec(v);
      if (!name) name = mName ? mName[1] : (mGen ? v.replace(mGen[0], '') : v).replace(/[,;|]+/g, ' ');
      if (!gender && mGen) gender = mGen[1];
    }
  });
  return { name: String(name).replace(/\s+/g, ' ').trim(), gender: gender, email: email };
}
