// Test de plages-kine/index.html dans Chromium à 390 × 844.
// Usage : node tests/test.mjs [--fixture] [--page=chemin.html] [dossier_captures]
//   --fixture : injecte un jeu d'occupations fictif qui reproduit le jeu de test
//               (utile tant que le vrai emploi du temps n'est pas intégré).
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join('/opt/node22/lib/node_modules', 'playwright'))); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const useFixture = args.includes('--fixture');
const outDir = args.find(a => !a.startsWith('--')) || path.join(here, 'captures');
fs.mkdirSync(outDir, { recursive: true });

// Occupations fictives (aucune donnée réelle) construites pour retomber sur le jeu de test.
const FIXTURE = {
  '2026-10-12': [[480, 720, 'Cours fictif', 'Cours'], [810, 990, 'Cours fictif', 'Cours']],
  '2026-10-13': [[480, 720, 'Cours fictif', 'Cours'], [810, 1000, 'Cours fictif', 'Cours'], [1000, 1040, 'Orthoptiste', 'Médical']],
  '2026-10-14': [[480, 720, 'Cours fictif', 'Cours']],
  '2026-10-16': [[480, 720, 'Cours fictif', 'Cours'], [810, 1070, 'Cours fictif', 'Cours']],
  '2026-10-19': [[870, 900, 'Activité fictive', 'Vacances']],
};

const EXPECTED = {
  '2026-10-12': [['exceptionnelle', '12:20', '12:40'], ['normale', '16:50', '18:10']],
  '2026-10-13': [['exceptionnelle', '12:20', '12:40'], ['normale', '17:40', '18:10']],
  '2026-10-14': [['exceptionnelle', '12:20', '13:00'], ['normale', '13:01', '18:10']],
  '2026-10-16': [['exceptionnelle', '12:20', '12:40'], ['normale', '18:10', '18:10']],
  '2026-10-19': [['normale', '08:20', '11:59'], ['exceptionnelle', '12:00', '13:00'], ['normale', '13:01', '13:40'], ['normale', '15:20', '18:10']],
};

const pageArg = args.find(a => a.startsWith('--page='));
let src = pageArg ? path.resolve(pageArg.slice(7)) : path.resolve(here, '..', 'index.html');
if (useFixture) {
  const html = fs.readFileSync(src, 'utf8').replace(
    /(<script id="edt-data" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_, a, b) => a + '\n' + JSON.stringify(FIXTURE) + '\n' + b);
  src = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pk-')), 'index.html');
  fs.writeFileSync(src, html);
}
const url = 'file://' + src;

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  OK   ' : '  ÉCHEC ') + msg); if (!cond) fails++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', d => { errors.push('dialog: ' + d.type()); d.dismiss(); });

await page.goto(url);
await page.waitForFunction(() => window.PlagesKine);

const nbJours = await page.evaluate(() => PlagesKine.nbJours());
console.log(`Données intégrées : ${nbJours} jour(s) avec occupations${useFixture ? ' (jeu FICTIF)' : ''}`);

console.log('\n1. Jeu de test (valeurs par défaut)');
if (nbJours === 0) {
  console.log('  IGNORÉ aucune donnée intégrée : relancer avec --fixture ou après build_data.py');
} else {
  for (const [day, exp] of Object.entries(EXPECTED)) {
    const got = await page.evaluate(d => PlagesKine.plagesDuJour(d), day);
    const g = got.map(p => [p.type, p.premier, p.dernier]);
    ok(JSON.stringify(g) === JSON.stringify(exp), `${day} : ${got.map(p => `${p.type} ${p.premier}→${p.dernier} (${p.departs})`).join(' ; ')}`);
  }
}

console.log('\n2. Règles annexes');
const extra = await page.evaluate(() => {
  const D = PlagesKine.defaults();
  const r = {};
  r.vide = PlagesKine.computeDay([], D).plages.map(p => [p.type, p.first, p.last, p.departs.length]);
  r.sansExc = PlagesKine.computeDay([], Object.assign({}, D, { excOn: false })).plages.map(p => [p.type, p.first, p.last]);
  r.excl = PlagesKine.computeDay([], Object.assign({}, D, { excl: [[600, 660]] })).plages.map(p => [p.type, p.first, p.last]);
  r.hors = PlagesKine.computeDay([[400, 500, 'x', ''], [1100, 1300, 'y', '']], D).plages.map(p => [p.type, p.first, p.last]);
  return r;
});
ok(JSON.stringify(extra.vide) === JSON.stringify([['n', 500, 719, 22], ['e', 720, 780, 7], ['n', 781, 1090, 31]]), 'jour libre : 08:20→11:59 (22), exc 12:00→13:00 (7), 13:01→18:10 (31)');
ok(JSON.stringify(extra.sansExc) === JSON.stringify([['n', 500, 719], ['n', 781, 1090]]), 'plage exceptionnelle désactivée');
ok(JSON.stringify(extra.excl) === JSON.stringify([['n', 500, 570], ['n', 660, 719], ['e', 720, 780], ['n', 781, 1090]]), 'exclusion 10:00–11:00 : aucun RDV ne la chevauche');
ok(JSON.stringify(extra.hors) === JSON.stringify([['n', 520, 719], ['e', 720, 780], ['n', 781, 1050]]), 'occupations ramenées à l’amplitude');

console.log('\n3. Interface');
const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
await page.fill('#date', '2026-10-12');
await page.dispatchEvent('#date', 'change');
ok((await page.textContent('#title')).includes('12 octobre 2026'), 'sélecteur de date → lundi 12 octobre 2026');
ok(await noHScroll(), 'vue Jour : pas de défilement horizontal');
const deps = await page.$$('.dep');
if (deps.length) {
  await deps[0].click();
  ok(await page.isVisible('#rdv'), 'toucher un départ affiche le RDV et ses marges');
  ok((await page.$$('.marg')).length === 2, 'deux zones de marge affichées');
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(outDir, 'vue-jour.png') });
await page.screenshot({ path: path.join(outDir, 'vue-jour-complete.png'), fullPage: true });

await page.click('#next');
ok((await page.textContent('#title')).includes('13 octobre'), 'bouton suivant → mardi 13');
await page.click('#prev');

await page.click('#fab');
await page.waitForTimeout(350);
const small = await page.evaluate(() => [...document.querySelectorAll('button, input')]
  .map(e => e.closest('label') || e)
  .filter(e => e.offsetParent)
  .map(e => { const r = e.getBoundingClientRect(); return { t: e.id || e.className || e.type, w: r.width, h: r.height }; })
  .filter(r => r.h < 44 || r.w < 44));
ok(small.length === 0, 'zones tactiles ≥ 44 px (vue Jour + panneau)' + (small.length ? ' : ' + JSON.stringify(small.slice(0, 5)) : ''));
await page.click('#close');
await page.waitForTimeout(350);

await page.click('#vWeek');
ok((await page.$$('.wcol')).length === 5, 'vue Semaine : 5 colonnes');
ok(await noHScroll(), 'vue Semaine : pas de défilement horizontal');
await page.screenshot({ path: path.join(outDir, 'vue-semaine.png'), fullPage: true });
await page.click('.wcol[data-day="2026-10-14"]');
ok((await page.textContent('#title')).includes('mercredi 14 octobre'), 'toucher un jour ouvre la vue Jour');

await page.click('#fab');
await page.waitForTimeout(350);
ok(await page.evaluate(() => document.getElementById('sheet').classList.contains('open')), 'bouton Contraintes ouvre le panneau');
const fonts = await page.evaluate(() => [...document.querySelectorAll('#sheet input, #date')].map(i => parseFloat(getComputedStyle(i).fontSize)));
ok(fonts.every(f => f >= 16), `police des champs ≥ 16 px (min ${Math.min(...fonts)})`);
await page.click('#addExcl');
ok((await page.textContent('#badge')).trim() === '1', 'compteur de contraintes actives = 1 après ajout d’une exclusion');
ok(await noHScroll(), 'panneau : pas de défilement horizontal');
await page.screenshot({ path: path.join(outDir, 'contraintes.png') });

await page.reload();
await page.waitForFunction(() => window.PlagesKine);
ok((await page.textContent('#badge')).trim() === '1', 'réglages conservés après rechargement (localStorage)');
await page.click('#fab');
await page.waitForTimeout(350);
await page.click('#reset');
ok((await page.textContent('#badge')).trim() === '0', 'Réinitialiser remet le compteur à 0');

// Mode sombre
const dark = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
const p2 = await dark.newPage();
p2.on('pageerror', e => errors.push('pageerror (sombre): ' + e.message));
await p2.goto(url);
await p2.fill('#date', '2026-10-12');
await p2.dispatchEvent('#date', 'change');
const bg = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(bg === 'rgb(15, 17, 21)', 'mode sombre appliqué (' + bg + ')');
await p2.screenshot({ path: path.join(outDir, 'vue-jour-sombre.png') });

console.log('\n4. Erreurs JavaScript');
ok(errors.length === 0, errors.length ? errors.join('\n') : 'aucune erreur, aucun dialogue');

await browser.close();
console.log(`\n${fails ? fails + ' échec(s)' : 'Tous les tests passent'} — captures dans ${outDir}`);
process.exit(fails ? 1 : 0);
