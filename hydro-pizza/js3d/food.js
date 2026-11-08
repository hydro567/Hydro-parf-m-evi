/* Yiyecek ve ambalaj modelleri */
import { THREE, rng, noise, fbm, smooth, mix, clamp, make, tex, paint, normalFrom, bakeable, planarUV, shadow, color } from './core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const std = o => new THREE.MeshStandardMaterial(o);
const phys = o => new THREE.MeshPhysicalMaterial(o);
const hex = window.HydroArt.hex;
function mixc(o, a, b, t) { o[0] = mix(a[0], b[0], t); o[1] = mix(a[1], b[1], t); o[2] = mix(a[2], b[2], t); }

/* ---------- ortak dokular ---------- */
export function kraftMat(tone = '#c89c63') {
  const c = hex(tone);
  const m = paint(512, 512, (u, v, o, i, j) => {
    const n = fbm(i * .012, j * .012, 3), f = noise(i * .9, j * .12), g = noise(i * .15, j * 1.1);
    const k = .88 + n * .16 + (f - .5) * .1 + (g - .5) * .08;
    o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
  });
  return std({ map: tex(m, { repeat: [1, 1] }), normalMap: normalFrom(m, 1.4), normalScale: new THREE.Vector2(.5, .5), roughness: .86 });
}
export function steelMat() {
  const m = paint(512, 512, (u, v, o, i, j) => { const s = 150 + 32 * noise(i * .012, j * .9) + 12 * noise(i * .4, j * .4); o[0] = s; o[1] = s + 2; o[2] = s + 5; });
  return std({ map: tex(m), metalness: .95, roughness: .38 });
}
export function steelFloor(canvas, { rough = .55, metal = .35, size = 62, tint = 0x8c8e92 } = {}) {
  const t = tex(canvas, { repeat: [2, 2], mirror: true });
  const g = new THREE.PlaneGeometry(size * 2, size * 2 * canvas.height / canvas.width);
  const m = new THREE.Mesh(g, std({ map: t, color: tint, roughness: rough, metalness: metal }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/* ---------- dalgalı kumaş ---------- */
export function cloth() {
  const c = make(650, 550); window.HydroArt.drawCloth(c);
  const g = new THREE.PlaneGeometry(13, 11, 90, 76); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, .22 + .16 * Math.sin(x * 1.3 + z * .6 + fbm(x * .3, z * .3, 2) * 4) + .1 * Math.sin(x * .5 - z * 1.4) + .13);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, std({ map: tex(c), alphaTest: .5, roughness: .95, side: THREE.DoubleSide }));
  return shadow(m);
}

/* ---------- PİZZA ---------- */
let pizzaTops;
function spriteMats(sprites, id) {
  return sprites[id].map(s => {
    const raw = tex(s.raw), baked = tex(s.baked);
    return { raw, baked };
  });
}
function radialDisc(rings, segs, radiusFn, heightFn) {
  const pos = [], idx = [];
  pos.push(0, heightFn(0, 0), 0);
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
    const a = s / segs * Math.PI * 2, k = r / rings, R = radiusFn(a) * k;
    pos.push(Math.cos(a) * R, heightFn(k, a), Math.sin(a) * R);
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + (s + 1) % segs, 1 + s);
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) {
    const a = 1 + (r - 1) * segs + s, b = 1 + (r - 1) * segs + (s + 1) % segs, c = 1 + r * segs + s, d = 1 + r * segs + (s + 1) % segs;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export function pizzaBase(radius) {
  const A = window.HydroArt;
  const raw = make(10), baked = make(10);
  A.drawBase(raw, false); A.drawBase(baked, true);
  const tr = tex(raw), tb = tex(baked);
  const g = radialDisc(90, 180, () => radius, (k, a) => {
    const w = fbm(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, 3);
    const crust = Math.exp(-Math.pow((k - .895) / .075, 2)) * (.3 + .13 * fbm(Math.cos(a) * 5 + 3, Math.sin(a) * 5, 3));
    const fall = k > .95 ? smooth(.95, 1, k) * -.1 : 0;
    return .1 + crust + fall + .02 * w * (k < .78 ? 1 : 0);
  });
  planarUV(g, radius * 2);
  const nm = normalFrom(raw, 2.4);
  const mat = bakeable(std({ map: tr, alphaTest: .5, roughness: .62, normalMap: nm, normalScale: new THREE.Vector2(.7, .7) }), tb);
  return { mesh: shadow(new THREE.Mesh(g, mat)), mat };
}
function bentPlane(size, seg, bend) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / size, z = p.getZ(i) / size; p.setY(i, bend(x, z)); }
  g.computeVertexNormals();
  return g;
}
const onionGeom = (() => { let g; return () => {
  if (g) return g;
  const parts = [[.46, .035], [.34, .03], [.22, .028]].map(a => { const t = new THREE.TorusGeometry(a[0], a[1], 8, 40); t.rotateX(Math.PI / 2); t.scale(1, .5, 1); return t; });
  g = mergeGeometries(parts);
  return g;
}; })();
const pepGeom = (() => { let g; return () => {
  if (g) return g;
  const pts = [[.5, 0], [.48, .03], [.42, .058], [.3, .072], [0, .075]].map(a => new THREE.Vector2(a[0], a[1]));
  g = new THREE.LatheGeometry(pts, 48); planarUV(g, 1 / .82);
  return g;
}; })();
const mozzGeom = v => {
  const off = v * 9.1;
  const g = radialDisc(14, 40, a => .5 * (.86 + .26 * (noise(Math.cos(a) * 1.7 + off, Math.sin(a) * 1.7 + off))), k => .1 * Math.pow(1 - k * k, .55) * (1 + .1 * Math.sin(k * 8 + off)));
  planarUV(g, 1.25);
  return g;
};
const mushGeom = () => {
  const s = new THREE.Shape();
  s.moveTo(-.46, .02); s.bezierCurveTo(-.48, .48, .48, .48, .46, .02); s.bezierCurveTo(.46, -.1, .3, -.12, .19, -.08); s.lineTo(.2, -.38);
  s.bezierCurveTo(.2, -.5, -.2, -.5, -.2, -.38); s.lineTo(-.19, -.08); s.bezierCurveTo(-.3, -.12, -.46, -.1, -.46, .02);
  const g = new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelThickness: .018, bevelSize: .018, bevelSegments: 2, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  planarUV(g, 1.25);
  return g;
};
const basilGeom = bentPlane(1, 18, (x, z) => .09 * Math.cos(x * 3.14) * Math.cos(z * 2.4) + .05 * Math.pow(Math.abs(x) * 2, 2) + .012 * Math.sin(z * 30) * Math.cos(x * 6));

export function buildToppings(sprites) {
  const out = {};
  const mk = (id, rough, extra = {}) => spriteMats(sprites, id).map(t => bakeable(std(Object.assign({ map: t.raw, roughness: rough }, extra)), t.baked));
  const pep = mk('pepperoni', .44), moz = mk('mozzarella', .5, { alphaTest: .3 }), mush = mk('mushroom', .75), bas = mk('basil', .42, { alphaTest: .5, side: THREE.DoubleSide });
  const olive = phys({ color: 0x17121a, roughness: .25, clearcoat: .8, clearcoatRoughness: .2 });
  const onion = phys({ color: 0xa82a8a, roughness: .35, clearcoat: .5 });
  const mozGeoms = [0, 1, 2].map(mozzGeom), mg = mushGeom();
  out.pepperoni = v => new THREE.Mesh(pepGeom(), pep[v]);
  out.mozzarella = v => new THREE.Mesh(mozGeoms[v], moz[v]);
  out.mushroom = v => new THREE.Mesh(mg, mush[v]);
  out.basil = v => new THREE.Mesh(basilGeom, bas[v]);
  // rendelenmiş kaşar: ince tel tel yığın, fırında erir ve kızarır
  const kasarMat = std({ color: 0xf3cf62, roughness: .45 });
  const kasarGeoms = [0, 1, 2].map(v => {
    const rr = rng(400 + v * 17), parts = [];
    for (let i = 0; i < 26; i++) {
      const L = .3 + rr() * .3, g = new THREE.CylinderGeometry(.022, .022, L, 5, 4);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + Math.sin(y * 9 + v) * .025); }
      g.rotateZ(Math.PI / 2 + (rr() - .5) * .5); g.rotateY(rr() * Math.PI * 2);
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * .36;
      g.translate(Math.cos(a) * d, .03 + rr() * .05, Math.sin(a) * d);
      parts.push(g);
    }
    const m = mergeGeometries(parts); m.computeVertexNormals(); return m;
  });
  // Üstüne gelecek malzeme bunların arasından ya da deliğinden aşağı kaymasın diye görünmez dolu disk
  const ghost = new THREE.MeshBasicMaterial({ visible: false });
  const proxy = (m, r, y) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .02, 16), ghost); p.position.y = y; p.castShadow = p.receiveShadow = false; p.userData.proxy = true; m.add(p); return m; };
  // fırında açılan erimiş kaşar gölü: kenarı düzensiz, ince, parlak
  const meltMat = phys({ color: 0xf5cf58, roughness: .3, clearcoat: .7, clearcoatRoughness: .25 });
  const meltGeoms = [0, 1, 2].map(v => {
    const g = new THREE.CylinderGeometry(.44, .46, .035, 48, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), d = Math.hypot(x, z);
      if (d < .01) { if (p.getY(k) > 0) p.setY(k, p.getY(k) + .012); continue; }
      const a = Math.atan2(z, x), f = 1 + .13 * Math.sin(a * 3 + v * 2) + .36 * (noise(Math.cos(a) * 2 + v * 5, Math.sin(a) * 2) - .5);
      p.setX(k, x * f); p.setZ(k, z * f);
    }
    g.computeVertexNormals(); return g;
  });
  out.kasar = v => {
    const m = proxy(new THREE.Mesh(kasarGeoms[v], kasarMat), .42, .09);
    const pool = new THREE.Mesh(meltGeoms[v], meltMat);
    pool.position.y = .025; pool.rotation.y = v * 2.1; pool.scale.setScalar(.001); pool.visible = false;
    pool.receiveShadow = true; pool.userData.melt = true; pool.userData.noAO = true;
    m.add(pool); return m;
  };
  out.olive = () => { const t = new THREE.TorusGeometry(.33, .17, 12, 24); t.rotateX(Math.PI / 2); t.scale(1, .75, 1); return proxy(new THREE.Mesh(t, olive), .48, .12); };
  out.onion = () => proxy(new THREE.Mesh(onionGeom(), onion), .48, .02);
  bas.forEach(m => { m.userData.noAO = true; });
  out.bakeMats = [...pep, ...moz, ...mush, ...bas];
  out.tints = [[olive, 0x0a0806], [onion, 0x5c1d33], [kasarMat, 0xe0a53e], [meltMat, 0xe4a43a]];
  out.kasarMat = kasarMat;
  pizzaTops = out;
  return out;
}

/* Kutu: açık tepsi + menteşeli kapak */
export function openBox({ w, d, h = .7, wallT = .1, kraft, inner }) {
  const g = new THREE.Group();
  const add = (sx, sy, sz, x, y, z, mat = kraft) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); g.add(m); return m; };
  add(w, wallT, d, 0, wallT / 2, 0);
  add(w, h, wallT, 0, h / 2, -d / 2 + wallT / 2);
  add(w, h, wallT, 0, h / 2, d / 2 - wallT / 2);
  add(wallT, h, d, -w / 2 + wallT / 2, h / 2, 0);
  add(wallT, h, d, w / 2 - wallT / 2, h / 2, 0);
  // üst kenar katlaması
  const f = .42;
  add(w, .05, f, 0, h, d / 2 - f / 2);
  add(f, .05, d, -w / 2 + f / 2, h, 0);
  add(f, .05, d, w / 2 - f / 2, h, 0);
  if (inner) { const p = new THREE.Mesh(inner.geom, inner.mat); p.position.y = wallT + .012; p.receiveShadow = true; g.add(p); }
  return shadow(g);
}
export function hingedLid({ w, d, artCanvas, kraft, depth = .45 }) {
  const pivot = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, .07, d), [kraft, kraft, std({ map: tex(artCanvas), roughness: .72, normalMap: kraft.normalMap, normalScale: new THREE.Vector2(.25, .25) }), kraft, kraft, kraft]);
  top.position.z = d / 2;
  pivot.add(top);
  const side = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, depth, sz), kraft); m.position.set(x, -depth / 2, z); pivot.add(m); };
  side(w, .06, 0, d - .03); side(.06, d, -w / 2 + .03, d / 2); side(.06, d, w / 2 - .03, d / 2); side(w, .06, 0, .03);
  return shadow(pivot);
}
export function parchment(size, tone = [244, 238, 224]) {
  const m = paint(512, 512, (u, v, o, i, j) => {
    const n = Math.abs(fbm(i * .012 + 40, j * .012 + 3, 4) - .5) * 2;
    const c = 238 + 12 * smooth(0, .1, n);
    o[0] = tone[0] * c / 250; o[1] = tone[1] * c / 250; o[2] = tone[2] * c / 250;
  });
  const g = new THREE.PlaneGeometry(size, size, 40, 40); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, (fbm(p.getX(i) * .5 + 9, p.getZ(i) * .5, 3) - .5) * .05);
  g.computeVertexNormals();
  return { geom: g, mat: std({ map: tex(m), normalMap: normalFrom(m, 3), roughness: .9 }) };
}

/* Metal tepsi (kutucuk görseli) */
export function metalTray(w = 5, d = 4) {
  const g = new THREE.Group(), mat = steelMat(), H = .55, T = .07;
  const add = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); g.add(m); };
  add(w, T, d, 0, 0, 0); add(w + .22, T, .22, 0, H, -d / 2); add(w + .22, T, .22, 0, H, d / 2); add(.22, T, d + .22, -w / 2, H, 0); add(.22, T, d + .22, w / 2, H, 0);
  add(w, H, T, 0, H / 2, -d / 2); add(w, H, T, 0, H / 2, d / 2); add(T, H, d, -w / 2, H / 2, 0); add(T, H, d, w / 2, H / 2, 0);
  return shadow(g);
}
/* Şeffaf plastik kap */
export function clearTub(w = 5, d = 3.6) {
  const g = new THREE.Group();
  const mat = phys({ color: 0xffffff, transparent: true, opacity: .2, roughness: .08, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const rim = phys({ color: 0xffffff, transparent: true, opacity: .55, roughness: .1, clearcoat: 1 });
  const H = 1.2;
  const wall = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), mat); m.position.set(x, H / 2, z); m.renderOrder = 5; g.add(m); };
  wall(w, .04, 0, -d / 2); wall(w, .04, 0, d / 2); wall(.04, d, -w / 2, 0); wall(.04, d, w / 2, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, .04, d), mat); g.add(base);
  const r = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, .07, sz), rim); m.position.set(x, H, z); g.add(m); };
  r(w + .2, .14, 0, -d / 2); r(w + .2, .14, 0, d / 2); r(.14, d + .2, -w / 2, 0); r(.14, d + .2, w / 2, 0);
  return g;
}
export function heap(factory, count, w, d, { h = .55, scale = 1, seed = 3, spread = 1, flat = .5 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  for (let i = 0; i < count; i++) {
    const m = factory(i % 3, r);
    m.position.set((r() - .5) * w * spread, .08 + r() * h + (i / count) * h * .6, (r() - .5) * d * spread);
    m.rotation.set((r() - .5) * flat, r() * 7, (r() - .5) * flat);
    m.scale.multiplyScalar(scale * (.88 + r() * .24));
    g.add(m);
  }
  return shadow(g);
}

/* ---------- BURGER ---------- */
function lathe(pts, seg = 64) { const p = pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts; return new THREE.LatheGeometry(p.map(a => new THREE.Vector2(a[0], a[1])), seg); }
function displace(g, fn) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) fn(p, i);
  g.computeVertexNormals();
  return g;
}
const R = 1.7;
export function burgerParts() {
  const gold = hex('#d99a3c'), deep = hex('#a55f18'), pale = hex('#f4d089'), dark = hex('#21100a'), mid = hex('#5a2e15'), lite = hex('#8e5425');

  // alt ekmek
  const bunMap = paint(512, 512, (u, v, o, i, j) => {
    const x = u * 2 - 1, y = v * 2 - 1, r = Math.hypot(x, y);
    const n = fbm(x * 5 + 3, y * 5 + 9, 4);
    mixc(o, pale, gold, smooth(.32, .7, n));
    mixc(o, o, deep, smooth(.58, .76, fbm(x * 12 + 1, y * 12 + 3, 3)) * smooth(.95, .4, r));
    mixc(o, o, deep, smooth(.8, .98, r) * .8);
  });
  const bunMat = std({ map: tex(bunMap), normalMap: normalFrom(bunMap, 2.5), roughness: .68 });
  const bunG = lathe([[0, .56], [1.3, .56], [1.55, .54], [R, .42], [R + .03, .25], [1.58, .06], [1.3, 0], [0, 0]]);
  planarUV(bunG, (R + .05) * 2);

  // köfte
  const pMap = paint(512, 512, (u, v, o, i, j) => {
    const x = u * 8, y = v * 8;
    mixc(o, dark, mid, smooth(.3, .6, fbm(x + 3, y + 7, 4)));
    mixc(o, o, lite, smooth(.6, .76, fbm(x * 2.6 + 5, y * 2.6, 3)) * .8);
    if (Math.abs(fbm(x * .7 + 11, y * .7 + 2, 3) - .5) < .014) { o[0] *= .5; o[1] *= .5; o[2] *= .5; }
  });
  const pMat = std({ map: tex(pMap), normalMap: normalFrom(pMap, 6), roughness: .58, normalScale: new THREE.Vector2(1.1, 1.1) });
  const pattyGeo = displaceP(lathe([[0, .44], [1.1, .46], [1.5, .42], [1.64, .3], [1.66, .16], [1.52, .04], [0, 0]], 90));
  function displaceP(g) {
    planarUV(g, 3.6);
    return displace(g, (p, i) => {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > .01) {
        const k = 1 + (fbm(Math.cos(a) * 2.6 + 4, Math.sin(a) * 2.6 + 4, 3) - .5) * .26 * smooth(.2, 1.6, r);
        p.setX(i, x * k); p.setZ(i, z * k);
      }
      p.setY(i, y + (fbm(x * 2.8 + 3, z * 2.8, 3) - .5) * .13);
    });
  }

  // cheddar: köşeleri sarkan kare
  const chMap = paint(256, 256, (u, v, o) => { o[0] = 248 - 12 * v; o[1] = 168 - 22 * v + 10 * fbm(u * 6, v * 6, 2); o[2] = 34; });
  const chMat = phys({ map: tex(chMap), roughness: .38, clearcoat: .55, clearcoatRoughness: .35, side: THREE.DoubleSide });
  const chGeo = () => {
    const S = 3.4, g = new THREE.PlaneGeometry(S, S, 36, 36); g.rotateX(-Math.PI / 2); g.rotateY(.5);
    return displace(g, (p, i) => {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      const k = smooth(1.45, 2.3, r);
      p.setY(i, .06 - k * .55);
      const s = 1 - k * .1; p.setX(i, x * s); p.setZ(i, z * s);
    });
  };
  const cheddarG = chGeo();

  // marul
  const lMap = paint(512, 512, (u, v, o) => {
    const x = u * 2 - 1, y = v * 2 - 1, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const c1 = hex('#c8e878'), c2 = hex('#7ec23c'), c3 = hex('#3f8c22');
    mixc(o, c1, c2, smooth(.1, .7, r)); mixc(o, o, c3, smooth(.72, 1, r) * .85);
    const vein = Math.abs(Math.sin(a * 13 + r * 2));
    if (vein < .06) { o[0] = mix(o[0], 232, .55); o[1] = mix(o[1], 245, .55); o[2] = mix(o[2], 180, .55); }
    const n = fbm(x * 9, y * 9, 3); o[0] *= .88 + n * .24; o[1] *= .88 + n * .24; o[2] *= .88 + n * .24;
  });
  const lMat = std({ map: tex(lMap), normalMap: normalFrom(lMap, 2), roughness: .5, side: THREE.DoubleSide, emissive: 0x1a3306, emissiveIntensity: .35 });
  const ruffle = seed => {
    const g = radialDisc(26, 200, a => 2.05 * (1 + .06 * Math.sin(a * 7 + seed) + (noise(Math.cos(a) * 2 + seed, Math.sin(a) * 2) - .5) * .18), (k, a) => {
      const e = Math.pow(k, 3.4);
      return .05 + e * (.19 * Math.sin(a * 23 + seed) + .11 * Math.sin(a * 37 + seed * 2)) - e * .17;
    });
    planarUV(g, 4.6);
    return g;
  };
  const lettuceG = [ruffle(1), ruffle(4)];

  // dilimler
  const BA = window.HydroBurgerArt;
  const slice = (type, rad, h, rough) => {
    const c = BA.pieceCanvas(type);
    const skin = type === 'tomato' ? '#a81a12' : '#4f6b18';
    const mat = phys({ map: tex(c), roughness: rough, clearcoat: .35 });
    const side = std({ color: skin, roughness: .45 });
    const g = new THREE.CylinderGeometry(rad, rad * 1.01, h, 44, 1);
    planarUV(g, rad * 2 / .9);
    return () => new THREE.Mesh(g, [side, mat, mat]);
  };
  const tomato = slice('tomato', .95, .13, .3), pickle = slice('pickles', .5, .07, .3);
  const onionMat = phys({ color: 0xb12f93, roughness: .34, clearcoat: .6 });
  const onionWhite = phys({ color: 0xf8e4f2, roughness: .4, clearcoat: .4 });
  const ring = (rr, mat) => { const t = new THREE.TorusGeometry(rr, .05, 10, 44); t.rotateX(Math.PI / 2); t.scale(1, .7, 1); return new THREE.Mesh(t, mat); };
  const onionSlice = () => {
    const g = new THREE.Group();
    [[.92, onionMat], [.78, onionWhite], [.62, onionMat], [.47, onionWhite]].forEach(a => g.add(ring(a[0], a[1])));
    return g;
  };

  // üst ekmek ve susam
  const topMap = paint(512, 256, (u, v, o, i, j) => {
    const n = fbm(i * .016 + 5, j * .03 + 3, 3);
    const c1 = hex('#c16a1c'), c2 = hex('#e08a28'), c3 = hex('#f2bc5e'), c4 = hex('#f8dea5');
    mixc(o, c1, c2, smooth(.0, .5, v + (n - .5) * .4));
    mixc(o, o, c3, smooth(.54, .8, v + (n - .5) * .2));
    mixc(o, o, c4, smooth(.84, .98, v));
  });
  const topMat = phys({ map: tex(topMap), roughness: .36, clearcoat: .8, clearcoatRoughness: .28 });
  const domePts = [];
  for (let i = 0; i <= 26; i++) { const t = i / 26, a = t * Math.PI / 2; domePts.push([Math.sin(a) * 1.78, .22 + Math.cos(a) * 1.2]); }
  domePts.push([1.8, .12], [1.68, .02], [0, 0]);
  const topG = lathe(domePts);
  const seedG = new THREE.SphereGeometry(.075, 10, 8); seedG.scale(1, .42, .55);
  const seedMat = std({ color: 0xfbf0d3, roughness: .5 });
  const topBun = () => {
    const g = new THREE.Group(), m = new THREE.Mesh(topG, topMat); g.add(m);
    const r = rng(8), N = 240, inst = new THREE.InstancedMesh(seedG, seedMat, N), d = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const t = Math.sqrt(r()) * .82 * Math.PI / 2, ph = r() * 6.283;
      const rr = Math.sin(t) * 1.78, y = .22 + Math.cos(t) * 1.2;
      d.position.set(Math.cos(ph) * rr, y + .004, Math.sin(ph) * rr);
      d.lookAt(Math.cos(ph) * rr * 2, y * 2, Math.sin(ph) * rr * 2); d.rotateX(Math.PI / 2); d.rotateY(r() * 6.3);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    }
    g.add(inst);
    return shadow(g);
  };

  // çıtır tavuk: galeta unlu, pütürlü altın kabuk
  const ckMap = paint(512, 512, (u, v, o, i, j) => {
    const a = hex('#9a5a18'), b = hex('#d99a3e'), c = hex('#f3c66c');
    const n = fbm(u * 14 + 3, v * 14, 4), f = noise(i * .5, j * .5);
    mixc(o, a, b, smooth(.3, .62, n)); mixc(o, o, c, smooth(.6, .78, fbm(u * 30, v * 30, 3)) * .8);
    if (f > .82) { o[0] *= .7; o[1] *= .66; o[2] *= .6; }
  });
  const ckMat = std({ map: tex(ckMap), normalMap: normalFrom(ckMap, 9), normalScale: new THREE.Vector2(1.4, 1.4), roughness: .66 });
  const chickenGeo = (() => {
    const g = lathe([[0, .5], [1.05, .52], [1.48, .46], [1.62, .32], [1.62, .16], [1.48, .04], [0, 0]], 90);
    planarUV(g, 3.6);
    return displace(g, (p, i) => {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > .01) { const k = 1 + (fbm(Math.cos(a) * 3 + 9, Math.sin(a) * 3 + 2, 3) - .5) * .2 * smooth(.2, 1.6, r); p.setX(i, x * k); p.setZ(i, z * k); }
      p.setY(i, y + (fbm(x * 5 + 1, z * 5 + 4, 3) - .5) * .1 + (noise(x * 14, z * 14) - .5) * .04);
    });
  })();
  const layers = {
    bun: { h: .55, make: () => new THREE.Mesh(bunG, bunMat) },
    chicken: { h: .5, make: () => { const m = new THREE.Mesh(chickenGeo, ckMat); m.rotation.y = Math.random() * 7; return m; } },
    patty: { h: .46, make: () => { const m = new THREE.Mesh(pattyGeo, pMat); m.rotation.y = Math.random() * 7; return m; } },
    cheddar: { h: .07, make: () => { const m = new THREE.Mesh(cheddarG, chMat); m.rotation.y = Math.random() * 2; return m; } },
    lettuce: { h: .16, make: () => { const m = new THREE.Mesh(lettuceG[Math.random() > .5 ? 0 : 1], lMat); m.rotation.y = Math.random() * 7; return m; } },
    tomato: { h: .17, make: () => { const g = new THREE.Group(); [[-.66, .14, .05], [.64, -.12, .02], [0, .62, .08], [.02, -.64, -.03], [-.1, .02, .1]].forEach(a => { const t = tomato(); t.position.set(a[0], .07 + a[2] * .5, a[1]); t.rotation.set(a[2], Math.random() * 6, a[2]); g.add(t); }); g.rotation.y = Math.random() * 3; return g; } },
    pickles: { h: .1, make: () => { const g = new THREE.Group(); [[-.78, .1], [.76, -.15], [0, .78], [.05, -.76], [0, 0], [-.55, -.55], [.55, .55], [.56, -.6], [-.55, .58]].forEach(a => { const t = pickle(); t.position.set(a[0], .05 + Math.random() * .03, a[1]); t.rotation.y = Math.random() * 6; g.add(t); }); return g; } },
    onion: { h: .13, make: () => { const g = new THREE.Group(); [[-.55, .15], [.6, -.2], [0, .55], [.05, -.6]].forEach((a, i) => { const t = onionSlice(); t.position.set(a[0], .05 + i * .03, a[1]); t.rotation.x = .04 * i; g.add(t); }); g.rotation.y = Math.random() * 3; return g; } }
  };
  Object.keys(layers).forEach(k => { const f = layers[k].make; layers[k].make = () => shadow(f()); });
  // kap içinde tek parçalar
  const parts = {
    bun: () => { const m = new THREE.Mesh(bunG, bunMat); m.scale.setScalar(.38); return m; },
    chicken: () => { const m = new THREE.Mesh(chickenGeo, ckMat); m.scale.set(.3, .45, .26); return m; },
    patty: () => { const m = new THREE.Mesh(pattyGeo, pMat); m.scale.setScalar(.36); return m; },
    cheddar: () => { const g = new THREE.BoxGeometry(1.1, .05, 1.1); return new THREE.Mesh(g, chMat); },
    lettuce: () => { const m = new THREE.Mesh(lettuceG[0], lMat); m.scale.setScalar(.34); return m; },
    tomato: () => tomato(),
    pickles: () => { const m = pickle(); return m; },
    onion: () => { const m = onionSlice(); m.scale.setScalar(.7); return m; }
  };
  return { layers, topBun, parts };
}

/* Sos tüpü: sıkıldıkça uzar */
export function sauceTube(points, colorHex, radius = .075) {
  // Yassılaştırma tüpü yerinde yapılır; aksi halde yükseklik de küçülüp sos ürünün içine gömülür
  const base = points.reduce((a, p) => a + p[1], 0) / points.length;
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const flat = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1] - base, p[2])));
  const g = new THREE.TubeGeometry(flat, Math.max(120, points.length * 4), radius, 10, false);
  g.scale(1, .62, 1);
  g.translate(0, base, 0);
  const m = new THREE.Mesh(g, phys({ color: colorHex, roughness: .24, clearcoat: 1, clearcoatRoughness: .15 }));
  m.castShadow = true;
  m.setProgress = t => g.setDrawRange(0, Math.floor(g.index.count * t / 6) * 6);
  m.setProgress(0);
  m.curve = curve;
  return m;
}
export function bottle(bodyHex, capHex, labelCanvas) {
  const g = new THREE.Group();
  const body = phys({ color: bodyHex, roughness: .24, clearcoat: .9, clearcoatRoughness: .2 });
  const cap = phys({ color: capHex, roughness: .3, clearcoat: .6 });
  const prof = [[0, 0], [.68, 0], [.76, .08], [.76, 2.1], [.68, 2.5], [.36, 2.86], [.34, 3], [0, 3]];
  const b = new THREE.Mesh(lathe(prof, 48), body);
  const c = new THREE.Mesh(lathe([[.38, 2.96], [.38, 3.25], [.16, 3.4], [.07, 4.05], [0, 4.05]], 32), cap);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(.77, .77, 1.36, 48, 1, true, -Math.PI, Math.PI * 2), std({ map: tex(labelCanvas), roughness: .55 }));
  lab.position.y = 1.08; lab.rotation.y = Math.PI / 2;
  g.add(b, c, lab);
  return shadow(g);
}
function printedLabel(w, h, bg, lines) {
  const c = make(w, h), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(l => { x.fillStyle = l.color; x.font = l.font; if (l.spacing) x.letterSpacing = l.spacing; x.fillText(l.text, l.x || w / 2, l.y); x.letterSpacing = '0px'; });
  return c;
}
export const label = printedLabel;
export function bottleLabel(sub = 'BURGER') {
  // Silindir etrafında iki kez tekrarlı baskı
  const c = make(1024, 340), x = c.getContext('2d');
  x.fillStyle = '#fbd23f'; x.fillRect(0, 0, 1024, 340);
  x.textAlign = 'center'; x.fillStyle = '#2529b4';
  [256, 768].forEach(cx => {
    x.font = '74px "Bowlby One"'; x.fillText('HYDRO', cx, 150);
    x.font = '56px Anton'; x.fillText(sub, cx, 228);
    x.fillStyle = '#d9201f'; x.fillRect(cx - 110, 256, 220, 8); x.fillStyle = '#2529b4';
  });
  return c;
}

/* Bardak ve yan ürünler */
export function sideCup(kind, { bg = '#fbcf3a', ink = '#2529b4', sub = 'BURGER' } = {}) {
  const g = new THREE.Group();
  const c = make(1024, 512), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = ink; x.textAlign = 'center';
  [256, 768].forEach(cx => { x.font = '110px "Bowlby One"'; x.fillText('HYDRO', cx, 240); x.font = '72px Anton'; x.fillText(sub, cx, 340); });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.05, .72, 1.9, 48, 1, true, -Math.PI, Math.PI * 2), std({ map: tex(c), roughness: .6, side: THREE.DoubleSide }));
  cup.position.y = .95; cup.rotation.y = Math.PI / 2;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(.72, 32), std({ color: bg })); floor.rotation.x = -Math.PI / 2; floor.position.y = .02;
  g.add(cup, floor);
  const r = rng(kind.length * 7 + 3);
  if (kind === 'crinkle' || kind === 'fries') {
    const n = 70, geo = new THREE.BoxGeometry(.17, 1.9, .17, 1, 10, 1);
    if (kind === 'crinkle') displace(geo, (p, i) => { const k = Math.sin(p.getY(i) * 15) * .022; p.setX(i, p.getX(i) + k); });
    const m = new THREE.InstancedMesh(geo, std({ color: 0xeeb24a, roughness: .62 }), n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * .82; d.position.set(Math.cos(a) * rr, 1.5 + r() * .9, Math.sin(a) * rr); d.rotation.set((r() - .5) * .55, r() * 3, (r() - .5) * .55); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, color(r() > .5 ? 0xffe0a0 : 0xffffff)); }
    g.add(m);
  } else if (kind === 'curly') {
    const mat = std({ color: 0xdf8f30, roughness: .6 });
    for (let i = 0; i < 22; i++) {
      const pts = []; const R0 = .22 + r() * .14, turns = 2.5 + r() * 2;
      for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * turns * 6.28; pts.push(new THREE.Vector3(Math.cos(a) * R0, t * 1 - .5, Math.sin(a) * R0)); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .075, 7), mat);
      const a = r() * 6.28, rr = Math.sqrt(r()) * .7;
      m.position.set(Math.cos(a) * rr, 2 + r() * .55, Math.sin(a) * rr); m.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(m);
    }
  } else {
    const cm = paint(256, 256, (u, v, o, i, j) => { const n = fbm(i * .09, j * .09, 3); const a = hex('#c7792a'), b = hex('#efb25b'); mixc(o, a, b, smooth(.3, .7, n)); if (noise(i * .6, j * .6) > .8) { o[0] *= .7; o[1] *= .7; o[2] *= .7; } });
    const mat = std({ map: tex(cm, { repeat: [3, 1] }), normalMap: normalFrom(cm, 7), roughness: .7 });
    for (let i = 0; i < 12; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(.36 + r() * .1, .15, 14, 34), mat);
      const a = r() * 6.28, rr = Math.sqrt(r()) * .62;
      t.position.set(Math.cos(a) * rr, 1.9 + r() * .7, Math.sin(a) * rr); t.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(t);
    }
  }
  return shadow(g);
}

/* Eldiven: kapsül parmaklı kauçuk */
export function gloveModel(pose, colorHex) {
  const P = {
    point: [[32, 88, 12, 72, 18], [54, 78, 54, 16, 19], [69, 82, 72, 72, 19], [84, 86, 88, 80, 18], [88, 94, 96, 90, 15]],
    open: [[30, 96, 8, 66, 18], [40, 72, 30, 22, 17], [58, 70, 56, 12, 18], [76, 72, 82, 18, 17], [92, 80, 108, 40, 15]],
    hold: [[30, 92, 16, 72, 18], [40, 72, 34, 48, 17], [58, 70, 57, 42, 18], [75, 72, 79, 46, 17], [92, 82, 100, 60, 15]],
    ok: [[36, 84, 26, 56, 16], [44, 50, 34, 46, 15], [66, 72, 62, 18, 17], [82, 74, 86, 22, 16], [95, 84, 108, 44, 14]]
  }[pose];
  const g = new THREE.Group();
  const mat = phys({ color: colorHex, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, sheen: .4 });
  const V = (x, y, z = 0) => new THREE.Vector3((x - 60) / 10, (120 - y) / 10, z);
  P.forEach(f => {
    const a = V(f[0], f[1]), b = V(f[2], f[3]), len = a.distanceTo(b), r = f[4] / 20 * .95;
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len, .01), 8, 16), mat);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
  });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat);
  palm.scale.set(3.75, 3.55, 1.3); palm.position.copy(V(61, 106));
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.45, 2.2, 28), mat);
  cuff.position.copy(V(61, 150));
  const bead = new THREE.Mesh(new THREE.TorusGeometry(2.42, .14, 10, 36), mat);
  bead.rotation.x = Math.PI / 2; bead.position.copy(V(61, 161));
  g.add(palm, cuff, bead);
  return g;
}
export { std, phys, lathe, displace, radialDisc, mixc };

/* ---------- içecekler ---------- */
export const DRINKS = {
  kola: { name: 'Kola', price: 45 },
  limonata: { name: 'Limonata', price: 40 },
  ayran: { name: 'Ayran', price: 30 },
  su: { name: 'Su', price: 15 }
};
function canLabel(bg, ink, title, wave) {
  const c = make(1024, 512), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 1024, 512);
  if (wave) {
    x.fillStyle = wave; x.beginPath(); x.moveTo(0, 300);
    for (let i = 0; i <= 1024; i += 16) x.lineTo(i, 300 + Math.sin(i / 1024 * Math.PI * 4) * 40);
    x.lineTo(1024, 360); for (let i = 1024; i >= 0; i -= 16) x.lineTo(i, 360 + Math.sin(i / 1024 * Math.PI * 4) * 40); x.closePath(); x.fill();
  }
  x.fillStyle = ink; x.textAlign = 'center';
  [256, 768].forEach(cx => { x.font = '64px "Bowlby One"'; x.fillText('HYDRO', cx, 190); x.font = '92px Anton'; x.fillText(title, cx, 290); });
  return c;
}
export function drink(kind) {
  const g = new THREE.Group();
  const alu = phys({ color: 0xd7dade, metalness: 1, roughness: .28 });
  if (kind === 'kola' || kind === 'limonata') {
    const L = kind === 'kola' ? canLabel('#c4161c', '#ffffff', 'KOLA', '#ffffff') : canLabel('#f5d231', '#2c6e1f', 'LİMONATA', '#ffffff');
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, 1.9, 48, 1, true, -Math.PI, Math.PI * 2), phys({ map: tex(L), metalness: .45, roughness: .32, clearcoat: .8, clearcoatRoughness: .2 }));
    body.position.y = 1.08; body.rotation.y = Math.PI / 2;
    const bottom = new THREE.Mesh(lathe([[.0, .02], [.5, .0], [.6, .06], [.62, .13]], 40), alu);
    const top = new THREE.Mesh(lathe([[.62, 2.03], [.56, 2.17], [.5, 2.2], [.48, 2.16], [0, 2.14]], 40), alu);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(.32, .03, .18), alu); tab.position.set(0, 2.17, .12);
    g.add(body, bottom, top, tab);
  } else if (kind === 'su') {
    const pet = phys({ color: 0xd8f0ff, transparent: true, opacity: .32, roughness: .05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const water = phys({ color: 0xbfe6ff, transparent: true, opacity: .35, roughness: .05, depthWrite: false });
    const prof = [[0, 0], [.55, 0], [.6, .1], [.6, 1.7], [.42, 2.2], [.22, 2.45], [.22, 2.6]];
    const bottle = new THREE.Mesh(lathe(prof, 40), pet); bottle.renderOrder = 5;
    const liq = new THREE.Mesh(lathe([[0, .04], [.55, .04], [.57, 1.9], [0, 1.9]], 40), water); liq.renderOrder = 4;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .25, 24), phys({ color: 0x1d6fd8, roughness: .4, clearcoat: .5 })); cap.position.y = 2.7;
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(.61, .61, .7, 40, 1, true), std({ map: tex(canLabel('#ffffff', '#1d6fd8', 'SU', '#cfe6ff')), roughness: .5 }));
    lab.position.y = 1.05; lab.rotation.y = Math.PI / 2;
    g.add(liq, bottle, cap, lab);
  } else {
    // ayran bardağı: folyo kapaklı
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.62, .5, 1.5, 40, 1, true, -Math.PI, Math.PI * 2), std({ map: tex(canLabel('#ffffff', '#1f6fb5', 'AYRAN', '#dcebf7')), roughness: .45, side: THREE.DoubleSide }));
    cup.position.y = .75; cup.rotation.y = Math.PI / 2;
    const foil = new THREE.Mesh(new THREE.CylinderGeometry(.66, .66, .04, 40), phys({ color: 0xc9d3dc, metalness: .9, roughness: .35 })); foil.position.y = 1.52;
    const base = new THREE.Mesh(new THREE.CircleGeometry(.5, 32), std({ color: 0xffffff })); base.rotation.x = -Math.PI / 2; base.position.y = .01;
    g.add(cup, foil, base);
  }
  return shadow(g);
}
