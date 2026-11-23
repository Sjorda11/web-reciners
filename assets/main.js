/* Reciners Informàtica — interaccions de la pàgina */
(() => {
'use strict';
const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const initLang = root.lang || 'ca';
let lang = initLang;
root.classList.add('js');

/* textos del xip d'estat i del formulari */
const box = $('#i18n');
const T = l => { try { return JSON.parse(box.dataset['t' + l[0].toUpperCase() + l.slice(1)] || box.dataset.tCa); } catch (e) { return {}; } };

/* ---------- cinta: duplica el contingut per fer un bucle continu ---------- */
const track = $('#t1');
if (track) track.innerHTML += track.innerHTML.replace(/<span/g, '<span aria-hidden="true"');

/* ---------- menú amb cursor en forma de xip ---------- */
const nav = $('#nav'), ind = $('#ind');
const navA = nav ? $$('a', nav) : [];
let active = null;
const roll = t => { const l = [...t].map((c, i) => `<i style="--i:${i}">${c}</i>`).join(''); return `<span class="roll"><span class="r1">${l}</span><span class="r2" aria-hidden="true">${l}</span></span>`; };
function moveInd(a) {
  if (!ind) return;
  if (!a) { ind.style.opacity = 0; navA.forEach(x => x.classList.remove('hot')); return; }
  ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = `translateX(${a.offsetLeft}px)`;
  navA.forEach(x => x.classList.toggle('hot', x === a));
}
const buildNav = () => navA.forEach(a => { const t = a.dataset['l' + lang[0].toUpperCase() + lang.slice(1)] || a.textContent; a.innerHTML = roll(t); });
navA.forEach(a => {
  a.addEventListener('mouseenter', () => moveInd(a));
  a.addEventListener('focus', () => moveInd(a));
  a.addEventListener('click', e => {
    const r = a.getBoundingClientRect(); const s = document.createElement('span');
    s.className = 'rip'; s.style.left = ((e.clientX || r.left + r.width / 2) - r.left) + 'px'; s.style.top = ((e.clientY || r.top + r.height / 2) - r.top) + 'px';
    a.appendChild(s); setTimeout(() => s.remove(), 650);
    ind.classList.remove('zap'); void ind.offsetWidth; ind.classList.add('zap'); active = a; moveInd(a);
  });
});
if (nav) nav.addEventListener('mouseleave', () => moveInd(active));
buildNav();

/* ---------- canvi d'idioma ----------
   Al web publicat (reciners.com) cada idioma té la seva adreça: l'enllaç navega.
   En vista prèvia o en local, el canvi es fa a la mateixa pàgina. */
const live = /(^|\.)reciners\.com$/.test(location.hostname);
const store = (el, key, val) => { if (el.dataset[key] === undefined) el.dataset[key] = val; };
function swap(l) {
  if (l === lang) return;
  const ik = initLang;
  $$('[data-es],[data-en]').forEach(el => { store(el, ik, el.innerHTML); const v = l === ik ? el.dataset[ik] : (el.dataset[l] ?? el.dataset[ik]); el.innerHTML = v; });
  $$('[data-alt-es],[data-alt-en]').forEach(el => { const K = 'alt' + ik[0].toUpperCase() + ik.slice(1); store(el, K, el.alt); const k = 'alt' + l[0].toUpperCase() + l.slice(1); el.alt = el.dataset[k] ?? el.dataset[K]; });
  $$('[data-aria-es],[data-aria-en]').forEach(el => { const K = 'aria' + ik[0].toUpperCase() + ik.slice(1); store(el, K, el.getAttribute('aria-label') || ''); const k = 'aria' + l[0].toUpperCase() + l.slice(1); el.setAttribute('aria-label', el.dataset[k] ?? el.dataset[K]); });
  lang = l; root.lang = l;
  $$('.lang a').forEach(a => a.toggleAttribute('aria-current', a.hreflang === l));
  buildNav(); requestAnimationFrame(() => moveInd(active)); status();
}
$$('.lang a').forEach(a => a.addEventListener('click', e => { if (live || document.body.dataset.page === 'legal') return; e.preventDefault(); swap(a.hreflang); }));

/* ---------- capçalera, barra de progrés i paral·laxi ---------- */
const hdr = $('#hdr'), prog = $('#prog'), pars = $$('.par');
let lastY = 0, ticking = false;
function onScroll() {
  ticking = false;
  const y = scrollY, h = document.body.scrollHeight - innerHeight;
  hdr.classList.toggle('solid', y > 60);
  hdr.classList.toggle('up', y > lastY && y > 420 && !hdr.classList.contains('open'));
  lastY = y;
  if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  if (!rm) pars.forEach(p => { const r = p.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; p.style.translate = `0 ${Math.max(-60, Math.min(0, -k * 60 - 30)).toFixed(1)}px`; });
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

/* ---------- menú de mòbil ---------- */
const burger = $('#burger'), menu = $('#menu');
const setMenu = o => {
  if (!menu) return;
  hdr.classList.toggle('open', o); menu.classList.toggle('open', o); burger.setAttribute('aria-expanded', o);
  document.body.style.overflow = o ? 'hidden' : '';
  $$('a', menu).forEach((a, i) => a.style.transitionDelay = o ? (.25 + i * .06) + 's' : '0s');
};
if (burger) burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
if (menu) $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ---------- secció activa al menú ---------- */
if (nav && 'IntersectionObserver' in window) {
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    active = navA.find(x => x.getAttribute('href') === '#' + e.target.id) || null;
    if (!nav.matches(':hover')) moveInd(active);
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secIO.observe(s));
}

/* ---------- aparicions en fer scroll ---------- */
$$('.stag').forEach(s => [...s.children].forEach((c, i) => c.style.setProperty('--d', (i % 5) * 0.07 + 's')));
const flow = $('#flow'), mapw = $('#mapw');
const rvs = $$('.rv,.wipe');
function animFlow() { const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / 1500); flow.style.setProperty('--fl', (p * 100).toFixed(1) + '%'); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
function showAll() { rvs.forEach(r => r.classList.add('in')); if (mapw) mapw.classList.add('in'); if (flow) flow.style.setProperty('--fl', '100%'); }
if ('IntersectionObserver' in window && !rm) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target === flow) animFlow();
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  rvs.forEach(r => io.observe(r));
  if (mapw) io.observe(mapw);
  setTimeout(showAll, 9000);
} else showAll();

/* ---------- comptadors ---------- */
$$('[data-count]').forEach(el => {
  if (rm || !('IntersectionObserver' in window)) return;
  const n = +el.dataset.count; el.textContent = '0';
  const o = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; o.disconnect(); const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
  o.observe(el);
});

/* ---------- llum que segueix el cursor i botons magnètics ---------- */
$$('.prod,.svc').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));
if (fine && !rm) $$('.mag').forEach(b => {
  b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .18) + 'px'); b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .3) + 'px'); });
  b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
});

/* ---------- horari: obert o tancat ara (hora de Banyoles) ---------- */
const SLOTS = [[570, 780], [930, 1200]]; // 9:30–13:00 i 15:30–20:00
const OPEN_DAYS = [1, 2, 3, 4, 5];       // dilluns a divendres
const hm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
function nowMadrid() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
  return { d, m: (+g('hour') % 24) * 60 + +g('minute') };
}
function status() {
  const els = $$('#st,#st2'); if (!els.length) return;
  const t = T(lang); if (!t.open) return;
  const { d, m } = nowMadrid();
  let txt, on = false;
  const today = OPEN_DAYS.includes(d) ? SLOTS : [];
  const cur = today.find(([a, b]) => m >= a && m < b);
  if (cur) { on = true; txt = t.open.replace('{t}', hm(cur[1])); }
  else {
    const later = today.find(([a]) => m < a);
    if (later) txt = t.closedToday.replace('{t}', hm(later[0]));
    else {
      let k = 1; while (!OPEN_DAYS.includes((d + k) % 7)) k++;
      txt = k === 1 ? t.closedTomorrow.replace('{t}', hm(SLOTS[0][0])) : t.closedNext.replace('{d}', t.days[(d + k) % 7]).replace('{t}', hm(SLOTS[0][0]));
    }
  }
  els.forEach(el => { el.classList.toggle('on', on); const s = $('span', el); if (s) { s.textContent = txt; s.removeAttribute('data-es'); s.removeAttribute('data-en'); } });
  $$('#hours tr').forEach(tr => tr.classList.toggle('today', tr.dataset.days.split(',').map(Number).includes(d)));
}
status(); setInterval(status, 60000);

/* ---------- formulari de contacte ---------- */
const form = $('#form');
if (form) {
  const msg = $('#msg'), send = $('#f-send'), tIn = $('#f-t');
  if (tIn) tIn.value = Date.now();
  const say = (k, cls) => { msg.textContent = T(lang)[k] || ''; msg.className = cls; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const ok = form.nom.value.trim().length >= 2 && form.contacte.value.trim().length >= 5 && form.missatge.value.trim().length >= 10 && form.privacitat.checked;
    if (!ok) { say('invalid', 'err'); return; }
    send.disabled = true; say('sending', '');
    try {
      const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { say('sent', 'ok'); form.reset(); if (tIn) tIn.value = Date.now(); }
      else say(j.error === 'invalid' ? 'invalid' : 'fail', 'err');
    } catch (err) { say('fail', 'err'); }
    send.disabled = false;
  });
}

const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
