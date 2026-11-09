/**
 * Abenteuerweltchen – Kern der Schatzsuchen-Personalisierung, Version mit Hörspiel-QR-Codes (Player).
 * Wie bisher: hängt an die Vorlage ein PDF-„Inkrement“ an (Seitenreihenfolge Junge/Mädchen + Name als Vektorpfade).
 * Neu: auf jede Botschafts-Seite kommt eine QR-Karte („Botschaft hören“) mit dem persönlichen Code.
 * Läuft in Google Apps Script und lokal in Node (zum Testen). Braucht qrcode.js (qrcode-generator).
 */
function cleanName_(raw) {
  var name = String(raw || '').normalize('NFC').replace(/\([^)]*\)/g, ' ').replace(/[„“"”]/g, '').replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('EMPTY_NAME: Kein Name angegeben');
  if (/[@0-9]/.test(name)) throw new Error('BAD_NAME: Name sieht falsch aus: "' + name + '"');
  if (Array.from(name).length > 30) throw new Error('NAME_TOO_LONG: Name zu lang (max. 30 Zeichen)');
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    name = name.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, function (_, sep, ch) { return sep + ch.toUpperCase(); });
  }
  return name;
}
function cleanGender_(raw) {
  var g = String(raw || '').trim().toLowerCase();
  if (['mädchen', 'maedchen', 'madchen', 'w', 'weiblich', 'girl', 'f', 'female', 'tochter'].indexOf(g) >= 0) return 'w';
  if (['junge', 'm', 'männlich', 'maennlich', 'mannlich', 'boy', 'male', 'sohn'].indexOf(g) >= 0) return 'm';
  throw new Error('BAD_GENDER: Unbekanntes Geschlecht "' + raw + '" (erwartet Junge oder Mädchen)');
}

/**
 * @param qrs  Liste {pos, x, y, url, color}: pos = Seitenposition (1-basiert), x/y = linke untere Ecke der Karte in pt
 */
function personalizeSchatz(tplBytes, rawName, rawGender, qrs) {
  var name = cleanName_(rawName), gender = cleanGender_(rawGender);
  var bytes = tplBytes instanceof Uint8Array ? tplBytes : Uint8Array.from(tplBytes, function (b) { return b & 255; });
  var data = readData_(bytes), font = data.font;
  var missing = Array.from(name).filter(function (ch) { return !font.glyphs[ch]; });
  if (missing.length) throw new Error('UNSUPPORTED_CHAR: Zeichen nicht in der Schrift: ' + missing.join(' '));

  var tail = asciiSlice_(bytes, Math.max(0, bytes.length - 2048), bytes.length);
  var prev = parseInt(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail)[1], 10);
  var size = parseInt(/\/Size\s+(\d+)/.exec(tail.slice(tail.lastIndexOf('trailer')))[1], 10);
  var infoM = /\/Info\s+(\d+)\s+0\s+R/.exec(tail.slice(tail.lastIndexOf('trailer')));

  var order = [];
  for (var p = 1; p <= data.variants.base_pages; p++) {
    var alt = gender === 'w' ? data.variants.girl_pages[String(p)] : null;
    order.push((alt || p) - 1);
  }

  var ops = {};
  data.slots.forEach(function (slot) {
    var segText = function (seg) { return seg.text.replace('{name}', name); };
    var widthAt = function (scale) {
      return slot.segments.reduce(function (w, seg, i) {
        var l = layout_(font, segText(seg), seg.size * scale, seg.tracking_em, seg.kern);
        return w + l.width + (i < slot.segments.length - 1 ? seg.tracking_em * seg.size * scale : 0);
      }, 0);
    };
    var scale = Math.min(1, slot.max_width / widthAt(1));
    var x = slot.center_x - widthAt(scale) / 2, s = rgb_(slot.color, 'rg');
    slot.segments.forEach(function (seg, i) {
      var sz = seg.size * scale, k = sz / font.upem, l = layout_(font, segText(seg), sz, seg.tracking_em, seg.kern);
      l.items.forEach(function (it) { if (it.path) s += svgToPdf_(it.path, x + it.x, slot.baseline_y + (seg.dy || 0), k) + 'f\n'; });
      x += l.width + (i < slot.segments.length - 1 ? seg.tracking_em * sz : 0);
    });
    ops[slot.page] = (ops[slot.page] || '') + s;
  });
  (qrs || []).forEach(function (q) { ops[q.pos] = (ops[q.pos] || '') + qrCardOps_(font, q); });

  var objs = [], next = size, qObj = next++, QObj = next++;
  objs.push([qObj, stream_('q')], [QObj, stream_('Q')]);
  order.forEach(function (idx, pos) {
    var pg = data.pages[idx], contents = pg.contents;
    if (ops[pos + 1]) {
      var o = next++;
      objs.push([o, stream_('q\n' + ops[pos + 1] + 'Q')]);
      contents = qObj + ' 0 R ' + contents + ' ' + QObj + ' 0 R ' + o + ' 0 R';
    }
    objs.push([pg.obj, pg.dict.replace('__PARENT__', data.root + ' 0 R').replace('__CONTENTS__', '[' + contents + ']')]);
  });
  objs.push([data.root, '<</Type/Pages/Kids[' + order.map(function (idx) { return data.pages[idx].obj + ' 0 R'; }).join(' ') + ']/Count ' + order.length + '>>']);
  if (infoM) objs.push([parseInt(infoM[1], 10), '<</Title' + pdfText_(data.title + ' – Schatzsuche für ' + name) + '/Producer(Abenteuerweltchen)>>']);

  var parts = ['\n'], offset = bytes.length + 1, xref = [];
  objs.forEach(function (o) { var txt = o[0] + ' 0 obj\n' + o[1] + '\nendobj\n'; xref.push([o[0], offset]); parts.push(txt); offset += txt.length; });
  xref.sort(function (a, b) { return a[0] - b[0]; });
  var xs = 'xref\n0 1\n0000000000 65535 f \n';
  xref.forEach(function (e) { xs += e[0] + ' 1\n' + ('0000000000' + e[1]).slice(-10) + ' 00000 n \n'; });
  xs += 'trailer\n<</Size ' + next + '/Root ' + data.catalog + ' 0 R' + (infoM ? '/Info ' + infoM[1] + ' 0 R' : '') + '/Prev ' + prev + '>>\nstartxref\n' + offset + '\n%%EOF\n';
  parts.push(xs);
  var add = parts.join(''), out = new Uint8Array(bytes.length + add.length);
  out.set(bytes, 0);
  for (var i = 0; i < add.length; i++) out[bytes.length + i] = add.charCodeAt(i) & 255;
  return { bytes: out, name: name, gender: gender };
}

/** QR-Karte: weiße abgerundete Karte mit farbigem Rand, QR-Code, darunter „Botschaft hören“ und ein Play-Symbol. */
var QR_CARD = { w: 96, h: 116, qr: 78, label: 'Botschaft hören', fs: 9.6 };
function qrCardOps_(font, q) {
  var sc = q.scale || 1, W = QR_CARD.w * sc, H = QR_CARD.h * sc, x = q.x, y = q.y, col = q.color || '#df6a4c';
  var s = '1 1 1 rg ' + rgb_(col, 'RG') + '2.2 w\n' + rrect_(x, y, W, H, 12 * sc) + 'B\n';
  // QR
  var qr = qrcode(0, 'M'); qr.addData(q.url); qr.make();
  var n = qr.getModuleCount(), sz = QR_CARD.qr * sc, m = sz / n, qx = x + (W - sz) / 2, qy = y + H - (W - sz) / 2 - sz;
  s += '0.13 0.15 0.2 rg\n';
  for (var r = 0; r < n; r++) {
    var c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) { c++; continue; }
      var c0 = c; while (c < n && qr.isDark(r, c)) c++;
      s += fmt_(qx + c0 * m) + ' ' + fmt_(qy + sz - (r + 1) * m) + ' ' + fmt_((c - c0) * m + 0.03) + ' ' + fmt_(m + 0.03) + ' re\n';
    }
  }
  s += 'f\n';
  // Play-Kreis + Text
  var fs = QR_CARD.fs * sc, l = layout_(font, QR_CARD.label, fs, 0, true);
  if (l.width + 16 > W - 14) { fs = fs * (W - 30) / l.width; l = layout_(font, QR_CARD.label, fs, 0, true); }
  var k = fs / font.upem;
  var total = 12 + 4 + l.width, lx = x + (W - total) / 2, by = y + 10 * sc;
  s += rgb_(col, 'rg') + circle_(lx + 6, by + 3.2, 6) + 'f\n1 1 1 rg\n' +
    fmt_(lx + 4.3) + ' ' + fmt_(by + 0.2) + ' m ' + fmt_(lx + 4.3) + ' ' + fmt_(by + 6.2) + ' l ' + fmt_(lx + 9) + ' ' + fmt_(by + 3.2) + ' l h f\n';
  s += rgb_(col, 'rg');
  l.items.forEach(function (it) { if (it.path) s += svgToPdf_(it.path, lx + 16 + it.x, by, k) + 'f\n'; });
  return s;
}

// ---------- Hilfsfunktionen ----------
function rgb_(hex, op) {
  var n = parseInt(hex.slice(1), 16);
  return fmt_(((n >> 16) & 255) / 255) + ' ' + fmt_(((n >> 8) & 255) / 255) + ' ' + fmt_((n & 255) / 255) + ' ' + op + '\n';
}
function circle_(cx, cy, r) {
  var c = 0.5523 * r;
  return fmt_(cx + r) + ' ' + fmt_(cy) + ' m ' + fmt_(cx + r) + ' ' + fmt_(cy + c) + ' ' + fmt_(cx + c) + ' ' + fmt_(cy + r) + ' ' + fmt_(cx) + ' ' + fmt_(cy + r) + ' c ' +
    fmt_(cx - c) + ' ' + fmt_(cy + r) + ' ' + fmt_(cx - r) + ' ' + fmt_(cy + c) + ' ' + fmt_(cx - r) + ' ' + fmt_(cy) + ' c ' +
    fmt_(cx - r) + ' ' + fmt_(cy - c) + ' ' + fmt_(cx - c) + ' ' + fmt_(cy - r) + ' ' + fmt_(cx) + ' ' + fmt_(cy - r) + ' c ' +
    fmt_(cx + c) + ' ' + fmt_(cy - r) + ' ' + fmt_(cx + r) + ' ' + fmt_(cy - c) + ' ' + fmt_(cx + r) + ' ' + fmt_(cy) + ' c h\n';
}
function rrect_(x, y, w, h, r) {
  var c = 0.5523 * r;
  return fmt_(x + r) + ' ' + fmt_(y) + ' m ' + fmt_(x + w - r) + ' ' + fmt_(y) + ' l ' +
    fmt_(x + w - r + c) + ' ' + fmt_(y) + ' ' + fmt_(x + w) + ' ' + fmt_(y + r - c) + ' ' + fmt_(x + w) + ' ' + fmt_(y + r) + ' c ' +
    fmt_(x + w) + ' ' + fmt_(y + h - r) + ' l ' +
    fmt_(x + w) + ' ' + fmt_(y + h - r + c) + ' ' + fmt_(x + w - r + c) + ' ' + fmt_(y + h) + ' ' + fmt_(x + w - r) + ' ' + fmt_(y + h) + ' c ' +
    fmt_(x + r) + ' ' + fmt_(y + h) + ' l ' +
    fmt_(x + r - c) + ' ' + fmt_(y + h) + ' ' + fmt_(x) + ' ' + fmt_(y + h - r + c) + ' ' + fmt_(x) + ' ' + fmt_(y + h - r) + ' c ' +
    fmt_(x) + ' ' + fmt_(y + r) + ' l ' +
    fmt_(x) + ' ' + fmt_(y + r - c) + ' ' + fmt_(x + r - c) + ' ' + fmt_(y) + ' ' + fmt_(x + r) + ' ' + fmt_(y) + ' c h\n';
}
function readData_(bytes) {
  var start = indexOf_(bytes, '%%AWDATA-BEGIN%%'), end = indexOf_(bytes, '%%AWDATA-END%%', start);
  if (start < 0 || end < 0) throw new Error('TEMPLATE: Vorlage ohne Layoutdaten (falsche Datei?)');
  return JSON.parse(utf8_(bytes.subarray(start + 16, end)));
}
function utf8_(u) { // Layoutdaten können Umlaute enthalten (Titel)
  var s = asciiSlice_(u, 0, u.length);
  try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
}
function indexOf_(bytes, ascii, from) {
  var first = ascii.charCodeAt(0), n = ascii.length;
  outer: for (var i = from || 0; i <= bytes.length - n; i++) {
    if (bytes[i] !== first) continue;
    for (var j = 1; j < n; j++) if (bytes[i + j] !== ascii.charCodeAt(j)) continue outer;
    return i;
  }
  return -1;
}
function asciiSlice_(bytes, a, b) {
  var s = '', CH = 8192;
  for (var i = a; i < b; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(b, i + CH)));
  return s;
}
function layout_(font, text, size, tracking, kern) {
  var s = size / font.upem, chars = Array.from(text), items = [], x = 0;
  chars.forEach(function (ch, i) {
    var gl = font.glyphs[ch];
    items.push({ x: x, path: gl[1] });
    var k = kern && i + 1 < chars.length ? (font.kern && font.kern[ch + chars[i + 1]]) || 0 : 0;
    x += (gl[0] + k) * s + tracking * size;
  });
  return { items: items, width: x - tracking * size };
}
function svgToPdf_(d, ox, oy, k) {
  var t = d.match(/[MLHVQCZmlhvqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [], i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, out = '';
  var X = function (v) { return fmt_(ox + v * k); }, Y = function (v) { return fmt_(oy - v * k); };
  var num = function () { return parseFloat(t[i++]); };
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { cx = num(); cy = num(); sx = cx; sy = cy; out += X(cx) + ' ' + Y(cy) + ' m\n'; cmd = 'L'; }
    else if (cmd === 'L') { cx = num(); cy = num(); out += X(cx) + ' ' + Y(cy) + ' l\n'; }
    else if (cmd === 'H') { cx = num(); out += X(cx) + ' ' + Y(cy) + ' l\n'; }
    else if (cmd === 'V') { cy = num(); out += X(cx) + ' ' + Y(cy) + ' l\n'; }
    else if (cmd === 'Q') {
      var qx = num(), qy = num(), x = num(), y = num();
      out += X(cx + 2 / 3 * (qx - cx)) + ' ' + Y(cy + 2 / 3 * (qy - cy)) + ' ' + X(x + 2 / 3 * (qx - x)) + ' ' + Y(y + 2 / 3 * (qy - y)) + ' ' + X(x) + ' ' + Y(y) + ' c\n';
      cx = x; cy = y;
    } else if (cmd === 'C') {
      var a = num(), b = num(), c = num(), e = num(); cx = num(); cy = num();
      out += X(a) + ' ' + Y(b) + ' ' + X(c) + ' ' + Y(e) + ' ' + X(cx) + ' ' + Y(cy) + ' c\n';
    } else if (cmd === 'Z' || cmd === 'z') { out += 'h\n'; cx = sx; cy = sy; cmd = ''; }
    else throw new Error('Unbekannter Pfadbefehl: ' + cmd);
  }
  return out;
}
function fmt_(v) { return (Math.round(v * 1000) / 1000).toString(); }
function stream_(s) { return '<</Length ' + s.length + '>>\nstream\n' + s + '\nendstream'; }
function pdfText_(s) {
  var h = '<FEFF';
  for (var i = 0; i < s.length; i++) h += ('000' + s.charCodeAt(i).toString(16)).slice(-4);
  return h + '>';
}
