// Abstand zwischen Gegenstand und Fenster bzw. zum Bildschirmrand (in px)
const ABSTAND = 12;
const RAND = 16;

let offenesFenster = null;
let ausloeser = null;

// Setzt das Fenster direkt neben den angeklickten Gegenstand
function positioniere(dialog, trigger) {
  if (window.matchMedia('(max-width: 600px)').matches) return; // Handy: Fenster unten (CSS)

  const ziel = trigger.getBoundingClientRect();
  const breite = dialog.offsetWidth;
  const hoehe = dialog.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left;
  let origin;

  if (ziel.right + ABSTAND + breite <= vw - RAND) {
    // Platz rechts vom Gegenstand
    left = ziel.right + ABSTAND;
    origin = 'left center';
  } else if (ziel.left - ABSTAND - breite >= RAND) {
    // sonst links davon
    left = ziel.left - ABSTAND - breite;
    origin = 'right center';
  } else {
    // sonst mittig darunter
    left = ziel.left + ziel.width / 2 - breite / 2;
    origin = 'top center';
  }

  let top = (origin === 'top center')
    ? ziel.bottom + ABSTAND
    : ziel.top + ziel.height / 2 - hoehe / 2;

  // Nie über den Bildschirmrand hinaus
  left = Math.min(Math.max(left, RAND), vw - breite - RAND);
  top = Math.min(Math.max(top, RAND), vh - hoehe - RAND);

  dialog.style.left = left + 'px';
  dialog.style.top = top + 'px';
  dialog.style.transformOrigin = origin;
}

document.querySelectorAll('[data-open]').forEach(function (trigger) {
  // Hover-Text auch für Screenreader
  if (trigger.dataset.label && !trigger.getAttribute('aria-label')) {
    trigger.setAttribute('aria-label', trigger.dataset.label);
  }

  trigger.addEventListener('click', function (event) {
    event.preventDefault();
    const dialog = document.getElementById(trigger.dataset.open);
    if (!dialog) return;
    if (offenesFenster && offenesFenster !== dialog) offenesFenster.close();

    dialog.showModal();
    positioniere(dialog, trigger);
    offenesFenster = dialog;
    ausloeser = trigger;
  });
});

document.querySelectorAll('dialog.panel').forEach(function (dialog) {
  dialog.querySelector('.panel__close').addEventListener('click', function () {
    dialog.close();
  });

  // Klick neben das Fenster schließt es
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const draussen = event.clientX < r.left || event.clientX > r.right ||
                     event.clientY < r.top  || event.clientY > r.bottom;
    if (draussen) dialog.close();
  });

  dialog.addEventListener('close', function () {
    if (offenesFenster === dialog) offenesFenster = null;
  });
});

// Beim Ändern der Fenstergröße oder Scrollen bleibt das Fenster am Gegenstand
['resize', 'scroll'].forEach(function (ereignis) {
  window.addEventListener(ereignis, function () {
    if (offenesFenster && ausloeser) positioniere(offenesFenster, ausloeser);
  }, { passive: true });
});
// Escape schließt ein offenes Fenster automatisch (eingebaut in <dialog>)


// ===== ANIMATIONEN =====

/* true  = Aufbau-Animation nur beim allerersten Besuch
   false = bei jedem Laden (praktisch, solange du noch baust) */
const AUFBAU_NUR_BEIM_ERSTEN_BESUCH = false;

(function () {
  const scene = document.querySelector('.scene');
  const img = scene.querySelector('.scene__img');

  // Aufbau beim Laden
  let gesehen = false;
  try { gesehen = localStorage.getItem('aufbau-gesehen') === '1'; } catch (e) {}
  if (AUFBAU_NUR_BEIM_ERSTEN_BESUCH && gesehen) {
    scene.classList.remove('intro');
  } else {
    try { localStorage.setItem('aufbau-gesehen', '1'); } catch (e) {}
  }

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
})();
