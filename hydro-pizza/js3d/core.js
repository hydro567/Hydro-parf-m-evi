/* Ortak 3D çekirdek: renderer, sahne, animasyon, doku yardımcıları */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE };

const A = window.HydroArt;
export const { rng, noise, fbm, clamp, smooth, mix, make } = A;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // ekran kartını yormamak için
renderer.debug.checkShaderErrors = false; // yayında gereksiz doğrulama uyarılarını sustur
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Ekran kartı bağlamı düşerse çökmeden bekle; geri gelince three.js kaynakları yeniden yükler
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); document.documentElement.classList.add('gl-lost'); });
canvas.addEventListener('webglcontextrestored', () => { document.documentElement.classList.remove('gl-lost'); });
const pmrem = new THREE.PMREMGenerator(renderer);
export const envMap = pmrem.fromScene(new RoomEnvironment(), .03).texture;

/* ---------- sahne: kamera DOM'daki bir kutuya hizalanır ---------- */
let active = null;
export class Stage {
  constructor({ anchor, width, tilt = 20, exposure = 1, env = .42 }) {
    this.anchor = anchor; this.width = width; this.tilt = tilt * Math.PI / 180; this.exposure = exposure;
    this.scene = new THREE.Scene();
    this.scene.environment = envMap;
    this.scene.environmentIntensity = env;
    this.camera = new THREE.PerspectiveCamera(20, 1, 1, 300);
    this.dist = 40;
    this.updaters = [];
    this.key = new THREE.DirectionalLight(0xfff4e6, 1.75);
    this.key.position.set(-9, 22, 7);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    this.key.shadow.bias = -.0004; this.key.shadow.normalBias = .02; this.key.shadow.radius = 5;
    this.scene.add(this.key);
  }
  fit() {
    const W = innerWidth, H = innerHeight, r = this.anchor.getBoundingClientRect();
    if (!r.width) return;
    const p = r.width / this.width;
    const c = this.camera;
    c.aspect = W / H;
    c.fov = 2 * Math.atan(H / (2 * p * this.dist)) * 180 / Math.PI;
    c.position.set(0, Math.cos(this.tilt) * this.dist, Math.sin(this.tilt) * this.dist);
    c.lookAt(0, 0, 0);
    c.setViewOffset(W, H, W / 2 - (r.left + r.width / 2), H / 2 - (r.top + r.height / 2), W, H);
    c.updateProjectionMatrix();
  }
  onUpdate(fn) { this.updaters.push(fn); }
}
/* ---------- ortam gölgesi (GTAO): temas noktalarında yumuşak koyuluk ---------- */
let composer, rp, ao, aoOn = true, slow = 0, frames = 0;
// Şeffaf ve alfa kesimli yüzeyler gölge hesabında kare gibi görünmesin
const _ov = GTAOPass.prototype.overrideVisibility;
GTAOPass.prototype.overrideVisibility = function () {
  _ov.call(this);
  this.scene.traverse(o => {
    if (!o.visible) return;
    const m = o.material, list = Array.isArray(m) ? m : m ? [m] : [];
    if (o.isSprite || list.some(x => x.transparent || (x.userData && x.userData.noAO))) o.visible = false;
  });
};
function ensureComposer(stage) {
  if (!composer) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    rp = new RenderPass(stage.scene, stage.camera);
    ao = new GTAOPass(stage.scene, stage.camera, 1, 1);
    ao.blendIntensity = .95;
    ao.updateGtaoMaterial({ radius: .85, distanceExponent: 1.6, thickness: 1.4, scale: 1.05, samples: 12 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(rp); composer.addPass(ao); composer.addPass(new OutputPass());
  }
  rp.scene = ao.scene = stage.scene;
  rp.camera = ao.camera = stage.camera;
}
let cw = 0, ch = 0;
function renderFrame(dt) {
  if (!aoOn) { renderer.render(active.scene, active.camera); return; }
  ensureComposer(active);
  const pr = renderer.getPixelRatio();
  if (cw !== innerWidth || ch !== innerHeight) { cw = innerWidth; ch = innerHeight; composer.setPixelRatio(pr); composer.setSize(cw, ch); }
  composer.render(dt / 1000);
  // Zayıf ekran kartında akıcılık için gölge katmanını kapat
  if (!document.hidden && dt > 0) {
    frames++;
    if (dt > 40) slow++;
    if (frames >= 120) { if (slow > 70) { aoOn = false; console.info('Hydro: ortam gölgesi akıcılık için kapatıldı'); } frames = 0; slow = 0; }
  }
}
export function setAO(on) { aoOn = on; }
export function activate(stage) {
  active = stage;
  canvas.style.display = stage ? 'block' : 'none';
  if (stage) renderer.toneMappingExposure = stage.exposure;
}

/* ---------- katmanlar: bir noktanın altındaki en üst yüzey ---------- */
const _rc = new THREE.Raycaster(), _down = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3();
function shown(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
export function surfaceY(objects, x, z, skip) {
  _o.set(x, 60, z); _rc.set(_o, _down);
  const hit = _rc.intersectObjects(objects, true).find(i => i.object !== skip && i.object.parent !== skip && !i.object.isSprite && shown(i.object));
  return hit ? hit.point.y : -Infinity;
}
/* Bir disk alanının altındaki en yüksek nokta (malzeme üst üste otursun) */
export function footprintY(objects, x, z, r, skip) {
  let y = surfaceY(objects, x, z, skip);
  for (const k of [.5, 1]) for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + k;
    y = Math.max(y, surfaceY(objects, x + Math.cos(a) * r * k, z + Math.sin(a) * r * k, skip));
  }
  return y;
}
/* Düşmekte olan parçaları hesap süresince son yerlerine koyar */
export function withFinal(root, fn) {
  const saved = [];
  root.traverse(o => { if (o.userData.finalY !== undefined) { saved.push([o, o.position.y, o.visible]); o.position.y = o.userData.finalY; o.visible = true; } });
  root.updateMatrixWorld(true);
  try { return fn(); } finally { saved.forEach(([o, y, v]) => { o.position.y = y; o.visible = v; }); root.updateMatrixWorld(true); }
}
/* Rastgele sos çizgisi: zikzak, spiral ya da serbest; inside(x,z) dışına taşmaz */
export function sauceStroke(rand, inside, { span = 1.2, len = 2.4, along = 'free' } = {}) {
  const pts = [], style = rand();
  if (along === 'z') {
    // dürüm: lavaş boyunca dalgalı zikzak
    const rows = 6 + Math.floor(rand() * 6), amp = span * (.45 + rand() * .5), ph = rand() * 6;
    const dir = rand() > .5 ? 1 : -1;
    for (let i = 0; i <= rows * 8; i++) {
      const t = i / (rows * 8);
      const x = Math.sin(t * rows * Math.PI + ph) * amp * (.75 + .25 * Math.sin(t * 9 + ph)) + (rand() - .5) * .08;
      pts.push([x, dir * (len / 2 - t * len) + (rand() - .5) * .05]);
    }
  } else if (style < .55) {
    // zikzak: rastgele açı, düzensiz aralık ve uzunluk
    const ang = rand() * Math.PI, c = Math.cos(ang), s = Math.sin(ang);
    const rows = 4 + Math.floor(rand() * 4);
    let u = -span * (.55 + rand() * .2);
    const step = (span * 1.2) / rows;
    for (let i = 0; i <= rows; i++) {
      const half = Math.sqrt(Math.max(0, span * span - u * u)) * (.55 + rand() * .4);
      const side = i % 2 ? 1 : -1;
      const v = side * half;
      pts.push([u * c - v * s, u * s + v * c]);
      if (i < rows) { const mu = u + step * .5, mv = (rand() - .5) * half * .5; pts.push([mu * c - mv * s, mu * s + mv * c]); }
      u += step * (.75 + rand() * .5);
    }
  } else if (style < .8) {
    // spiral
    const cx = (rand() - .5) * span * .3, cz = (rand() - .5) * span * .3, turns = 2 + rand() * 1.5, a0 = rand() * 6.3;
    for (let i = 0; i <= 90; i++) { const t = i / 90, r = span * (.12 + .78 * t) * (1 + (rand() - .5) * .08), a = a0 + t * turns * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  } else {
    // serbest karalama
    let x = (rand() - .5) * span, z = (rand() - .5) * span, a = rand() * 6.3, w = 0;
    for (let i = 0; i < 80; i++) {
      w = w * .85 + (rand() - .5) * .7; a += w;
      let nx = x + Math.cos(a) * span * .09, nz = z + Math.sin(a) * span * .09, k = 0;
      while (!inside(nx, nz) && k++ < 10) { a += 1.2 + rand() * 1.5; nx = x + Math.cos(a) * span * .09; nz = z + Math.sin(a) * span * .09; }
      if (!inside(nx, nz)) break;
      x = nx; z = nz; pts.push([x, z]);
    }
  }
  return pts.filter(p => inside(p[0], p[1]));
}

/* Sos yüksekliğini yumuşat: malzeme tepelerinde sivri zıplamasın, ama altına da girmesin */
export function smoothHeights(pts, win = 3) {
  const y = pts.map(p => p[1]);
  const hi = y.map((_, i) => Math.max(...y.slice(Math.max(0, i - win), i + win + 1)));
  return pts.map((p, i) => { const s = hi.slice(Math.max(0, i - win), i + win + 1); return [p[0], s.reduce((a, b) => a + b, 0) / s.length, p[2]]; });
}

/* ---------- animasyon ---------- */
const tweens = [];
export const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  linear: t => t,
  bounce: t => { const n = 7.56, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }
};
export function tween(ms, fn, opts = {}) {
  return new Promise(res => {
    if (reduced) { fn(1); res(); return; }
    tweens.push({ t: -(opts.delay || 0), ms, fn, e: opts.ease || ease.out, res });
  });
}
let last = performance.now(), lastFrame = 0;
function tick(now) {
  const dt = Math.min(now - last, 400); last = now; lastFrame = now;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    w.t += dt;
    if (w.t < 0) continue;
    const k = Math.min(1, w.t / w.ms);
    w.fn(w.e(k));
    if (k >= 1) { tweens.splice(i, 1); w.res(); }
  }
  if (active) {
    if (renderer.domElement.width !== Math.floor(innerWidth * renderer.getPixelRatio())
      || renderer.domElement.height !== Math.floor(innerHeight * renderer.getPixelRatio())) renderer.setSize(innerWidth, innerHeight, false);
    active.fit();
    active.updaters.forEach(f => f(dt, now));
    renderFrame(dt);
  }
}
(function raf(n) { tick(n); requestAnimationFrame(raf); })(performance.now());
// Sekme arka plandayken de animasyon sonlansın
setInterval(() => { const n = performance.now(); if (n - lastFrame > 300) tick(n); }, 250);

/* ---------- doku yardımcıları ---------- */
export function tex(c, { srgb = true, repeat, mirror } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
/* Her piksel için fn(u,v,out) ile renk üretir: out = [r,g,b,a] */
export function paint(w, h, fn) {
  const c = make(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data, o = [0, 0, 0, 255];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    o[3] = 255; fn(i / w, j / h, o, i, j);
    const k = (j * w + i) * 4;
    d[k] = clamp(o[0], 0, 255); d[k + 1] = clamp(o[1], 0, 255); d[k + 2] = clamp(o[2], 0, 255); d[k + 3] = clamp(o[3], 0, 255);
  }
  x.putImageData(im, 0, 0);
  return c;
}
/* Parlaklıktan normal haritası */
export function normalFrom(c, strength = 2) {
  const w = c.width, h = c.height, s = c.getContext('2d').getImageData(0, 0, w, h).data;
  const L = (x, y) => { const k = (((y + h) % h) * w + ((x + w) % w)) * 4; return (s[k] * .3 + s[k + 1] * .59 + s[k + 2] * .11) / 255; };
  const n = paint(w, h, (u, v, o, i, j) => {
    const dx = (L(i + 1, j) - L(i - 1, j)) * strength, dy = (L(i, j + 1) - L(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    o[0] = (-dx / l * .5 + .5) * 255; o[1] = (dy / l * .5 + .5) * 255; o[2] = (1 / l * .5 + .5) * 255;
  });
  return tex(n, { srgb: false });
}
export const color = h => new THREE.Color(h);

/* Malzemeyi fırınlanabilir yapar: uBake 0→1 ile bakedMap'e geçer */
export function bakeable(mat, bakedTex) {
  const u = { value: 0 };
  mat.userData.bake = u;
  mat.onBeforeCompile = s => {
    s.uniforms.uBake = u; s.uniforms.bakedMap = { value: bakedTex };
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBake; uniform sampler2D bakedMap;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(bakedMap, vMapUv).rgb, uBake);');
  };
  mat.customProgramCacheKey = () => 'bake';
  return mat;
}
/* Üstten düz UV */
export function planarUV(g, size, axisA = 'x', axisB = 'z') {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (axisA === 'x' ? p.getX(i) : p.getY(i)) / size + .5;
    uv[i * 2 + 1] = (axisB === 'z' ? p.getZ(i) : p.getY(i)) / size + .5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
export function shadow(o, cast = true, recv = true) {
  o.traverse(m => { if (m.isMesh && !m.userData.proxy) { m.castShadow = cast; m.receiveShadow = recv; } });
  return o;
}
/* Yumuşak temas gölgesi */
let blobTex;
export function contactShadow(w, d, op = .55) {
  if (!blobTex) {
    const c = make(128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.6, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    blobTex = tex(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .012;
  return m;
}

/* ---------- SVG → tuval (kutu kapağı baskıları) ---------- */
function applyTransform(x, s) {
  if (!s) return;
  const re = /(translate|rotate|scale)\(([^)]+)\)/g; let m;
  while ((m = re.exec(s))) {
    const a = m[2].split(/[ ,]+/).map(Number);
    if (m[1] === 'translate') x.translate(a[0], a[1] || 0);
    if (m[1] === 'scale') x.scale(a[0], a[1] === undefined ? a[0] : a[1]);
    if (m[1] === 'rotate') { const r = a[0] * Math.PI / 180; if (a.length > 1) { x.translate(a[1], a[2]); x.rotate(r); x.translate(-a[1], -a[2]); } else x.rotate(r); }
  }
}
function fontOf(n) {
  const cls = n.getAttribute('class') || '';
  const fam = cls.includes('wordmark') ? '"Bowlby One"' : cls.includes('subword') ? 'Anton' : (n.getAttribute('font-family') || 'sans-serif');
  return `${n.getAttribute('font-weight') || 400} ${n.getAttribute('font-size')}px ${fam}`;
}
function drawText(n, x, st) {
  x.font = fontOf(n);
  x.fillStyle = st.fill === 'currentColor' ? st.current : st.fill;
  const tp = n.querySelector('textPath');
  if (tp) {
    const path = document.querySelector(tp.getAttribute('href'));
    const text = tp.textContent, total = path.getTotalLength();
    x.textAlign = 'left';
    const natural = x.measureText(text).width, target = +tp.getAttribute('textLength') || natural, sc = target / natural;
    let at = total / 2 - target / 2;
    for (const ch of text) {
      const w = x.measureText(ch).width * sc, p = path.getPointAtLength(at + w / 2), q = path.getPointAtLength(at + w / 2 + 1);
      x.save(); x.translate(p.x, p.y); x.rotate(Math.atan2(q.y - p.y, q.x - p.x)); x.scale(sc, 1);
      x.fillText(ch, -w / sc / 2, 0); x.restore();
      at += w;
    }
    return;
  }
  const anchor = n.getAttribute('text-anchor');
  x.textAlign = anchor === 'middle' ? 'center' : 'left';
  x.letterSpacing = (n.getAttribute('letter-spacing') || 0) + 'px';
  const tl = +n.getAttribute('textLength');
  const tx = +n.getAttribute('x'), ty = +n.getAttribute('y');
  if (tl) { const w = x.measureText(n.textContent).width; x.save(); x.translate(tx, ty); x.scale(tl / w, 1); x.fillText(n.textContent, 0, 0); x.restore(); }
  else x.fillText(n.textContent, tx, ty);
  x.letterSpacing = '0px';
}
function walk(n, x, parent) {
  if (n.nodeType !== 1) return;
  const tag = n.tagName.toLowerCase();
  if (['defs', 'symbol', 'lineargradient', 'radialgradient', 'pattern'].includes(tag) && parent.top !== n) return;
  const st = Object.assign({}, parent);
  ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(a => { if (n.hasAttribute(a)) st[a] = n.getAttribute(a); });
  x.save();
  applyTransform(x, n.getAttribute('transform'));
  const fs = () => {
    if (st.fill && st.fill !== 'none') { x.fillStyle = st.fill; x.fill(st.pathObj); }
    if (st.stroke && st.stroke !== 'none') {
      x.strokeStyle = st.stroke; x.lineWidth = +(st['stroke-width'] || 1);
      x.lineCap = st['stroke-linecap'] || 'butt'; x.lineJoin = st['stroke-linejoin'] || 'miter';
      x.stroke(st.pathObj);
    }
  };
  if (tag === 'path') { st.pathObj = new Path2D(n.getAttribute('d')); fs(); }
  else if (tag === 'rect') { const p = new Path2D(); p.roundRect(+n.getAttribute('x') || 0, +n.getAttribute('y') || 0, +n.getAttribute('width'), +n.getAttribute('height'), +n.getAttribute('rx') || 0); st.pathObj = p; fs(); }
  else if (tag === 'circle') { const p = new Path2D(); p.arc(+n.getAttribute('cx') || 0, +n.getAttribute('cy') || 0, +n.getAttribute('r'), 0, 7); st.pathObj = p; fs(); }
  else if (tag === 'ellipse') { const p = new Path2D(); p.ellipse(+n.getAttribute('cx') || 0, +n.getAttribute('cy') || 0, +n.getAttribute('rx'), +n.getAttribute('ry'), 0, 0, 7); st.pathObj = p; fs(); }
  else if (tag === 'text') drawText(n, x, st);
  else if (tag === 'use') {
    const sym = document.querySelector(n.getAttribute('href'));
    const vb = (sym.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
    const w = +n.getAttribute('width') || vb[2], h = +n.getAttribute('height') || vb[3];
    x.scale(w / vb[2], h / vb[3]);
    [...sym.children].forEach(c => walk(c, x, Object.assign({}, st, { top: sym })));
  } else [...n.children].forEach(c => walk(c, x, st));
  x.restore();
}
export function svgToCanvas(svg, w, h, current = '#c4161c', bg) {
  const c = make(w, h), x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  x.scale(w / vb[2], h / vb[3]);
  [...svg.children].forEach(n => walk(n, x, { current, fill: '#000' }));
  return c;
}

/* ---------- küçük görsel çekici (kutucuk resimleri) ---------- */
let thumbR, thumbEnv;
export let lastShot = null;
/* Son çekimde bir nesnenin resim üstündeki yeri (0..1) */
export function shotPoint(o) {
  const v = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).project(lastShot.cam);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
}
export function shot(obj, { w = 340, h = 280, tilt = 38, fill = .92, yaw = 0, lightY = 16 } = {}) {
  if (!thumbR) {
    thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    thumbR.toneMapping = THREE.ACESFilmicToneMapping;
    thumbR.debug.checkShaderErrors = false;
    thumbR.shadowMap.enabled = true; thumbR.shadowMap.type = THREE.PCFSoftShadowMap;
    thumbR.setClearColor(0, 0);
    thumbEnv = new THREE.PMREMGenerator(thumbR).fromScene(new RoomEnvironment(), .03).texture;
  }
  thumbR.setSize(w, h, false);
  const s = new THREE.Scene();
  s.environment = thumbEnv; s.environmentIntensity = .5;
  const holder = new THREE.Group(); holder.add(obj); holder.rotation.y = yaw; s.add(holder);
  const l = new THREE.DirectionalLight(0xfff2e0, 1.7); l.position.set(-5, lightY, 6); l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  const box = new THREE.Box3().setFromObject(holder), size = box.getSize(new THREE.Vector3()), cen = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z);
  Object.assign(l.shadow.camera, { left: -R, right: R, top: R, bottom: -R, far: 60 }); l.shadow.bias = -.001;
  s.add(l);
  const rad = size.length() / 2;
  const cam = new THREE.PerspectiveCamera(18, w / h, .1, 200);
  const t = tilt * Math.PI / 180;
  const fit = rad / Math.sin(9 * Math.PI / 180) / Math.min(1, w / h) * fill;
  cam.position.set(cen.x, cen.y + Math.cos(t) * fit, cen.z + Math.sin(t) * fit);
  cam.lookAt(cen);
  thumbR.render(s, cam);
  const url = thumbR.domElement.toDataURL('image/png');
  holder.remove(obj);
  // Son çekimin kamerası: modeldeki bir noktanın resimdeki yerini bulmak için
  lastShot = { cam, w, h };
  return url;
}
