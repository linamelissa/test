/* =====================================================
   EINSTELLUNGEN
   ===================================================== */

/* true  = Aufbau-Animation nur beim allerersten Besuch
   false = bei jedem Laden (praktisch, solange du noch baust) */
const AUFBAU_NUR_BEIM_ERSTEN_BESUCH = false;

const MAX_ZOOM = 2.4;          // wie nah die Kamera höchstens heranfährt
const HANDY_BREITE = 800;      // ab hier: Karte unten statt daneben


/* =====================================================
   SCROLL-TOUR
   ===================================================== */
const nav = document.querySelector('.nav');
const scene = document.querySelector('.scene');
const img = scene.querySelector('.scene__img');
const steps = Array.from(document.querySelectorAll('.step'));
const BILD_VERHAELTNIS = 1100 / 2576;

let aktiverStep = steps[0];

function istHandy() {
  return window.innerWidth <= HANDY_BREITE;
}

function fokusLesen(step) {
  const [x, y, w, h] = step.dataset.focus.split(',').map(Number);
  return { x, y, w, h };
}

// Karte auf die Seite legen, auf der der Gegenstand NICHT ist
function seitenSetzen() {
  steps.forEach(function (step) {
    if (step.classList.contains('step--start')) return;
    const f = fokusLesen(step);
    const mitte = f.x + f.w / 2;
    step.classList.toggle('step--left', mitte >= 50);
  });
}

// Berechnet, wohin die "Kamera" fahren muss
function kameraAuf(step) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const oben = nav.offsetHeight;
  const W = vw;                          // Grundbreite der Zeichnung
  const H = W * BILD_VERHAELTNIS;
  const f = fokusLesen(step);

  let s, zielX, zielY, mx, my;
  let fx0 = 0, fw = vw, fy0 = oben, fh = vh - oben;   // freier Bereich für die Zeichnung

  // Übersicht: ganze Zeichnung, Platz oben für die Begrüßung
  const platzText = istHandy() ? 150 : 140;
  const sGanz = Math.min((vw - 32) / W, (vh - oben - platzText - 24) / H);

  if (step.classList.contains('step--start')) {
    // auf dem Handy etwas näher ran, damit die Zeichnung nicht winzig ist
    s = istHandy() ? sGanz * 1.7 : sGanz;
    mx = W / 2;
    my = H / 2;
    zielX = vw / 2;
    zielY = oben + platzText + (vh - oben - platzText) / 2;
  } else {
    // freier Bereich neben bzw. über der Karte

    if (istHandy()) {
      // Platz über der Karte (Karte sitzt unten)
      const karteH = step.querySelector('.step__card').offsetHeight + 32;
      fh = Math.max(vh - oben - karteH, (vh - oben) * 0.4);
    } else {
      const karte = step.querySelector('.step__card').offsetWidth + vw * 0.05 + 24;
      if (step.classList.contains('step--left')) { fx0 = karte; }
      fw = vw - karte;
    }

    const rw = f.w / 100 * W;
    const rh = f.h / 100 * H;
    s = Math.min(fw * 0.7 / rw, fh * 0.7 / rh, MAX_ZOOM);
    s = Math.max(s, sGanz);
    // Handy: Zeichnung füllt den Bereich über der Karte ganz aus
    if (istHandy()) s = Math.max(s, fh * 1.15 / H);

    mx = (f.x + f.w / 2) / 100 * W;
    my = (f.y + f.h / 2) / 100 * H;
    zielX = fx0 + fw / 2;
    zielY = fy0 + fh / 2;
  }

  let tx = zielX - mx * s;
  let ty = zielY - my * s;

  // Nie über den Rand der Zeichnung hinausfahren (sonst sieht man, wo sie aufhört):
  // erst den ganzen Bildschirm füllen, sonst wenigstens den freien Bereich
  if (W * s >= vw)           tx = Math.min(0, Math.max(tx, vw - W * s));
  else if (W * s >= fw)      tx = Math.min(fx0, Math.max(tx, fx0 + fw - W * s));
  if (H * s >= vh - oben)    ty = Math.min(oben, Math.max(ty, vh - H * s));
  else if (H * s >= fh)      ty = Math.min(fy0, Math.max(ty, fy0 + fh - H * s));

  scene.style.width = W + 'px';
  scene.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')';
  scene.style.setProperty('--inv', (1 / s).toFixed(3));
}

function aktiviere(step) {
  aktiverStep = step;
  steps.forEach(function (s) { s.classList.toggle('is-active', s === step); });
  kameraAuf(step);
}

// Welche Station ist gerade in der Bildschirmmitte?
const beobachter = new IntersectionObserver(function (eintraege) {
  eintraege.forEach(function (e) {
    if (e.isIntersecting) aktiviere(e.target);
  });
}, { rootMargin: '-50% 0px -50% 0px' });

steps.forEach(function (step) { beobachter.observe(step); });

// Klick auf einen Gegenstand → zur passenden Station scrollen
document.querySelectorAll('.hotspot').forEach(function (spot) {
  spot.setAttribute('aria-label', spot.dataset.label);
  spot.addEventListener('click', function () {
    const ziel = document.getElementById(spot.dataset.go);
    if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

seitenSetzen();
aktiviere(steps[0]);

let resizeTimer;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () { kameraAuf(aktiverStep); }, 100);
});


/* =====================================================
   ANIMATIONEN
   ===================================================== */

// Aufbau beim Laden
(function () {
  let gesehen = false;
  try { gesehen = localStorage.getItem('aufbau-gesehen') === '1'; } catch (e) {}
  if (AUFBAU_NUR_BEIM_ERSTEN_BESUCH && gesehen) {
    scene.classList.remove('intro');
  } else {
    try { localStorage.setItem('aufbau-gesehen', '1'); } catch (e) {}
  }
})();

// Bildausschnitt für jeden Gegenstand setzen, damit er sich beim Hovern bewegen kann
function ausschnitteSetzen() {
  const quelle = img.currentSrc || img.src;
  scene.querySelectorAll('.hotspot').forEach(function (spot) {
    const obj = spot.querySelector('.hotspot__obj');
    if (!obj) return;
    const st = spot.style;
    const x = parseFloat(st.getPropertyValue('--x'));
    const y = parseFloat(st.getPropertyValue('--y'));
    const w = parseFloat(st.getPropertyValue('--w'));
    const h = parseFloat(st.getPropertyValue('--h'));
    obj.style.backgroundImage = 'url("' + quelle + '")';
    obj.style.backgroundSize = (10000 / w) + '% ' + (10000 / h) + '%';
    obj.style.backgroundPosition = (x / (100 - w) * 100) + '% ' + (y / (100 - h) * 100) + '%';
  });
}

if (img.complete) ausschnitteSetzen();
img.addEventListener('load', ausschnitteSetzen);
