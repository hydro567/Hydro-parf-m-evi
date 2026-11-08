/* Ana yönlendirme: seçim ekranı → pizza / hamburger / döner */
import { activate, shot, shotPoint, svgToCanvas, THREE } from './core.js';
import { glove, posTerminal } from './props.js';
import { pizzaView, burgerView } from './views.js';
import { donerView } from './doner.js';
import * as F from './food.js';

const $ = id => document.getElementById(id);
const A = window.HydroArt, G = window.Glove;
const views = { '': $('chooser'), pizza: $('stage'), hamburger: $('bstage'), doner: $('dstage') };
const titles = {
  '': 'Hydro — Bugün ne yemek istersin?',
  pizza: 'Hydro Pizza — Hamuru bizden, gerisi senden',
  hamburger: 'Hydro Burger — Katını sen seç',
  doner: 'Hydro Döner — Dürümünü kendin sar'
};
const wipeText = { pizza: 'Fırın ısınıyor…', hamburger: 'Izgara kızıyor…', doner: 'Şiş dönüyor…', '': '' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));

function showApp() { document.documentElement.classList.remove('booting'); }

const built = {};
function build(route) {
  if (built[route]) return built[route];
  if (route === 'pizza') { const v = pizzaView(); window.HydroPizza.init(v); v.setLid(false, true); built[route] = v; }
  if (route === 'hamburger') { const v = burgerView(); window.HydroBurger.init(v); v.setLid(false, true); built[route] = v; }
  if (route === 'doner') { const v = donerView(); window.HydroDoner.init(v); built[route] = v; }
  return built[route];
}
const mods = { pizza: () => window.HydroPizza, hamburger: () => window.HydroBurger, doner: () => window.HydroDoner };

/* seçim ekranı görselleri */
async function chooserArt() {
  await Promise.race([
    Promise.all(['40px "Bowlby One"', '30px Anton', '20px "DM Sans"', '20px "Courier Prime"'].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 2500))
  ]).catch(() => {});
  A.drawCounter($('chooseCounter'));

  // eldivenler
  const urls = {}, hots = {};
  ['point', 'open', 'hold', 'ok'].forEach(p => {
    [['black', 0x1a1b20], ['red', 0xd0161d]].forEach(([name, hexc]) => {
      const m = glove(p, hexc);
      urls[name + '-' + p] = shot(m.group, { w: 300, h: 420, tilt: 84, fill: .7, lightY: 12 });
      const t = shotPoint(m.tip);
      hots[p] = [t.x, t.y];
    });
  });
  G.useImages(urls, hots);

  // POS cihazı: bir kez çekilir; ekran, yazıcı yarığı resimdeki yerleriyle döner
  let posArt = null;
  window.HydroPosArt = () => {
    if (posArt) return posArt;
    const p = posTerminal();
    const url = shot(p.group, { w: 640, h: 1060, tilt: 78, fill: .6, lightY: 16, yaw: -.18 });
    posArt = { url, tl: shotPoint(p.tl), tr: shotPoint(p.tr), bl: shotPoint(p.bl), br: shotPoint(p.br), slot: shotPoint(p.slotPoint), left: shotPoint(p.slotEdgeL), right: shotPoint(p.slotEdgeR) };
    return posArt;
  };

  const kraft = F.kraftMat();
  const pz = F.hingedLid({ w: 10, d: 10, artCanvas: svgToCanvas($('lid').querySelector('svg'), 1024, 1024), kraft, depth: .7 });
  pz.position.z = -5;
  $('pickPizzaArt').innerHTML = `<img alt="" src="${shot(pz, { w: 620, h: 520, tilt: 28, fill: .72 })}">`;

  const yel = F.kraftMat('#f7c52b');
  const bb = F.hingedLid({ w: 10, d: 6.4, artCanvas: svgToCanvas($('bBoxArt'), 1024, 655, '#2529b4', '#f7c52b'), kraft: yel, depth: 1.5 });
  bb.position.z = -3.2;
  $('pickBurgerArt').innerHTML = `<img alt="" src="${shot(bb, { w: 620, h: 520, tilt: 30, fill: .72 })}">`;

  // kağıda sarılı dürüm
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f4ead4'; x.fillRect(0, 0, 1024, 512);
  x.strokeStyle = 'rgba(122,28,20,.8)'; x.lineWidth = 10;
  for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(i * 90, 0); x.lineTo(i * 90 + 40, 512); x.stroke(); }
  x.textAlign = 'center';
  [256, 768].forEach(cx => { x.fillStyle = '#f4ead4'; x.fillRect(cx - 190, 150, 380, 210); x.fillStyle = '#7a1c14'; x.font = '86px "Bowlby One"'; x.fillText('HYDRO', cx, 262); x.font = '60px Anton'; x.fillText('DÖNER', cx, 334); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const wrap = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.6, 48), new THREE.MeshStandardMaterial({ map: t, roughness: .78 }));
  const lav = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 1.5, 48), new THREE.MeshStandardMaterial({ color: 0xdcb878, roughness: .8 }));
  lav.position.y = 2.9;
  const meat = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshStandardMaterial({ color: 0x5a2c12, roughness: .7 }));
  meat.rotation.x = -Math.PI / 2; meat.position.y = 3.66;
  wrap.add(paper, lav, meat);
  wrap.rotation.z = -1.1; wrap.rotation.y = .4;
  wrap.traverse(m => { if (m.isMesh) m.castShadow = true; });
  $('pickDonerArt').innerHTML = `<img alt="" src="${shot(wrap, { w: 620, h: 520, tilt: 42, fill: .62 })}">`;
}

let current = null, busy = false;
const routeFromHash = () => location.hash.replace('#', '');
async function show(route) {
  if (!(route in views)) route = '';
  if (route === current || busy) return;
  busy = true;
  const wipe = $('wipe');
  if (route) {
    wipe.dataset.to = route;
    wipe.querySelector('span').textContent = wipeText[route];
    wipe.classList.add('on');
    await wait(360);
    await new Promise(r => { requestAnimationFrame(() => setTimeout(r, 30)); setTimeout(r, 200); });
    views[route].hidden = false;
    build(route);
  }
  Object.keys(views).forEach(k => { views[k].hidden = k !== route; });
  document.title = titles[route];
  document.body.dataset.app = route || 'choose';
  if (route) { mods[route]().enter(); activate(built[route].stage); }
  else { activate(null); G.setColor('black'); G.setPoseFn(() => 'open'); }
  window.scrollTo(0, 0);
  current = route;
  wipe.classList.remove('on');
  $('chooser').classList.remove('leaving');
  busy = false;
  const want = routeFromHash();
  if (want !== current) show(want);
}

document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.pick').forEach(p => p.classList.toggle('sel', p === b));
  $('chooser').classList.add('leaving');
  location.hash = b.dataset.go;
}));
document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', e => {
  e.preventDefault();
  history.pushState('', '', location.pathname + location.search);
  show('');
}));
addEventListener('hashchange', () => show(routeFromHash()));

chooserArt().then(() => { showApp(); show(routeFromHash()); }).catch(e => window.__hydroFail && window.__hydroFail(e));
