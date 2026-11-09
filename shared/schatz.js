/* Abenteuerweltchen – Hörspiel-Player für Schatzsuchen (gemeinsamer Kern für alle Schatzsuchen)
 * Die Seite eines Produkts (z. B. /alpaka/) lädt zuerst config.js (window.SCHATZ) und dann dieses Skript.
 * ?b=N    öffnet Botschaft N (QR-Code im Heft)
 * ?k=CODE persönlicher Code der Bestellung – Name + persönliche Sätze kommen vom Apps Script (nie im Klartext in der Adresse)
 */
(function () {
  const C = window.SCHATZ, $ = s => document.querySelector(s), qs = new URLSearchParams(location.search);
  const PREFIX = "aw_" + C.id + "_";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} }
  };
  const B = C.botschaften, N = B.length;
  let order = null, cur = 0, seq = [], part = 0, playing = false, gen = 0, actx = null;
  let done = new Set(store.get("done", []));
  const pcache = {};

  // ---------- Bestellung (Name + Geschlecht) ----------
  function kode() { const k = (qs.get("k") || store.get("k", "") || "").toLowerCase(); return /^[a-z0-9]{6,16}$/.test(k) ? k : ""; }
  async function loadOrder() {
    const k = kode(); if (!k || !C.gas) return;
    try {
      const d = await (await fetch(C.gas + "?k=" + k)).json(); if (!d.ok) throw 0;
      order = { name: d.name, g: d.g === "w" ? "w" : "m" }; store.set("k", k);
      document.querySelectorAll("[data-name]").forEach(e => e.textContent = order.name);
      document.body.classList.add("has-name");
      const t = $("#teamRole"); if (t && C.team) t.textContent = C.team[order.g];
    } catch (e) { console.warn("Bestellung nicht gefunden"); }
  }
  function b64url(b) { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: "audio/mpeg" })); }
  function personal(i) {
    if (!order) return Promise.resolve([]);
    if (!pcache[i]) pcache[i] = fetch(C.gas + "?k=" + kode() + "&b=" + B[i].nr).then(r => r.json())
      .then(d => (d.clips || []).map(c => c ? b64url(c) : null)).catch(() => { delete pcache[i]; return []; });
    return pcache[i];
  }
  // Reihenfolge der Teile einer Botschaft: neutrale Dateien + persönliche Sätze (ohne Bestellung werden die übersprungen)
  function build(i) {
    const g = order ? order.g : (C.defaultG || "m"); let pi = 0;
    return B[i].teile.map(t => t.p ? { p: pi++, v: t.v } : { f: "audio/" + t.f + (t.g ? "_" + g : "") + ".mp3", v: t.v })
      .filter(x => x.f || order);
  }
  async function src(x) { if (x.f) return x.f; const arr = await personal(cur); return arr[x.p] || null; }

  // ---------- Geräusche (ohne Dateien) ----------
  function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === "suspended") actx.resume(); return actx; }
  function chime() {
    const a = ctx(); if (!a) return Promise.resolve();
    const t = a.currentTime;
    [[660, 0], [880, .12], [1320, .24]].forEach(([f, d]) => {
      const o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(.16, t + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d + .45);
      o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + .5);
    });
    return new Promise(r => setTimeout(r, 650));
  }

  // ---------- Player ----------
  const au = $("#au");
  const fmt = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function speaker(v) {
    const p = C.voices[v] || C.voices[B[cur].wer];
    $("#spImg").src = "img/" + p.img + ".png"; $("#who").textContent = p.name;
  }
  function setStation(i, autoplay) {
    cur = Math.max(0, Math.min(N - 1, i)); const b = B[cur];
    gen++; au.pause(); playing = false; seq = build(cur); part = 0; ui(false); au.removeAttribute("src"); au.load();
    $("#kicker").textContent = "Botschaft " + b.nr + " von " + N + " · Heftseite " + b.seite;
    $("#title").textContent = b.titel; speaker(b.wer);
    $("#prog").style.width = "0"; $("#time").textContent = ""; $("#state").textContent = "Bereit";
    $("#task").hidden = true; $("#hint").textContent = "Drück den grünen Knopf und hört gut zu!";
    document.querySelectorAll(".stop").forEach((t, j) => t.setAttribute("aria-current", j === cur));
    history.replaceState(null, "", "?b=" + b.nr + (kode() ? "&k=" + kode() : ""));
    personal(cur);
    seq.forEach(x => { if (x.f) fetch(x.f).catch(() => {}); });   // vorladen, damit es ohne Pause weitergeht
    if (autoplay) start();
  }
  async function playPart() {
    const g = gen; let u = null;
    while (part < seq.length && !(u = await src(seq[part]))) part++;   // fehlender persönlicher Satz → überspringen
    if (g !== gen) return;
    if (!u) { finished(); return; }
    speaker(seq[part].v); au.src = u; au.load();
    const p = au.play(); if (p) p.catch(() => { ui(false); playing = false; $("#hint").textContent = "Tippe nochmal auf den grünen Knopf."; });
  }
  async function start() {
    const g = gen; ctx(); playing = true; ui(true); $("#state").textContent = "Botschaft kommt …";
    if (part === 0 && !au.currentTime) { await chime(); if (g !== gen || !playing) return; }
    if (au.src && !au.ended && au.currentTime > 0) au.play(); else playPart();
    $("#state").textContent = "Botschaft läuft"; media();
  }
  function pause() { au.pause(); playing = false; ui(false); $("#state").textContent = "Pause"; $("#hint").textContent = "Pause – mit dem grünen Knopf geht es weiter."; }
  function ui(on) {
    $("#box").classList.toggle("playing", on);
    $("#playIco").innerHTML = on ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    $("#play").setAttribute("aria-label", on ? "Pause" : "Abspielen");
    if (on) $("#hint").textContent = "Pssst … gut zuhören!";
  }
  au.addEventListener("ended", () => {
    if (part < seq.length - 1) { part++; const g = gen; setTimeout(() => { if (playing && g === gen) playPart(); }, 260); }
    else { playing = false; ui(false); finished(); }
  });
  au.addEventListener("timeupdate", () => {
    const d = au.duration || 0, frac = d ? au.currentTime / d : 0;
    $("#prog").style.width = ((part + frac) / Math.max(1, seq.length)) * 100 + "%";
    $("#time").textContent = "Teil " + (part + 1) + " von " + seq.length;
  });
  au.addEventListener("error", () => { if (!au.getAttribute("src")) return; if (part < seq.length - 1) { part++; playPart(); } else { ui(false); $("#state").textContent = "Störung – bitte nochmal versuchen"; } });
  function finished() {
    const b = B[cur]; done.add(b.nr); store.set("done", [...done]); renderMap();
    $("#prog").style.width = "100%"; $("#state").textContent = "Botschaft zu Ende"; $("#time").textContent = "";
    const t = $("#task"); t.hidden = false; $("#taskText").textContent = b.aufgabe;
    const n = $("#next");
    if (cur < N - 1) { n.hidden = false; n.textContent = "Weiter zu Botschaft " + B[cur + 1].nr + " →"; $("#hint").textContent = "Die nächste Botschaft wartet im Heft auf Seite " + B[cur + 1].seite + "."; }
    else { n.hidden = true; $("#hint").textContent = C.finale || "Geschafft! Ihr seid großartig!"; confetti(); }
  }
  $("#play").onclick = () => playing ? pause() : start();
  $("#back").onclick = () => { au.currentTime = Math.max(0, au.currentTime - 10); };
  $("#again").onclick = () => { gen++; au.pause(); part = 0; au.removeAttribute("src"); $("#task").hidden = true; start(); };
  $("#next").onclick = () => { setStation(cur + 1, false); $("#box").scrollIntoView({ behavior: "smooth", block: "start" }); };
  $("#bar").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); if (au.duration) au.currentTime = au.duration * ((e.clientX - r.left) / r.width); };
  function media() {
    if (!("mediaSession" in navigator)) return; const b = B[cur];
    navigator.mediaSession.metadata = new MediaMetadata({ title: b.titel, artist: C.titel, album: "Abenteuerweltchen",
      artwork: [{ src: new URL("img/" + C.voices[b.wer].img + ".png", location.href).href, sizes: "480x480", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("play", start); navigator.mediaSession.setActionHandler("pause", pause);
  }

  // ---------- Schatzkarte (alle Botschaften) ----------
  function renderMap() {
    const m = $("#map"); m.innerHTML = "";
    B.forEach((b, i) => {
      const el = document.createElement("button");
      el.className = "stop" + (done.has(b.nr) ? " done" : "") + (i % 2 ? " right" : "");
      el.setAttribute("aria-current", i === cur);
      el.innerHTML = `<span class="pic"><img src="img/${b.bild}.png" alt="" loading="lazy"></span>
        <span class="txt"><span class="nr">Botschaft ${b.nr}</span><span class="tt">${b.titel}</span><span class="pg">Heftseite ${b.seite}</span></span>`;
      el.onclick = () => { setStation(i, false); $("#box").scrollIntoView({ behavior: "smooth", block: "start" }); };
      m.appendChild(el);
    });
    const c = $("#count"); if (c) c.textContent = done.size + " von " + N;
  }
  $("#reset") && ($("#reset").onclick = () => { if (confirm("Fortschritt löschen und von vorne beginnen?")) { done = new Set(); store.set("done", []); renderMap(); setStation(0, false); } });

  // ---------- Konfetti zum Schluss ----------
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
    const x = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight, cols = C.confetti || ["#f4c64a", "#e0664a", "#8fbf6a", "#6aa9c9"];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, r: 4 + Math.random() * 5, vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, a: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    let t = 0; (function f() { x.clearRect(0, 0, W, H); ps.forEach(p => { p.y += p.vy; p.x += p.vx; p.a += .1; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); }); if (++t < 260) requestAnimationFrame(f); else cv.remove(); })();
  }

  // ---------- Start ----------
  $("#wave").innerHTML = Array.from({ length: 24 }, (_, i) => `<i style="animation-delay:${(i % 6) * .12}s"></i>`).join("");
  renderMap();
  loadOrder().then(() => { const b = parseInt(qs.get("b") || "1", 10); const i = B.findIndex(x => x.nr === b); setStation(i < 0 ? 0 : i, false); });
})();
