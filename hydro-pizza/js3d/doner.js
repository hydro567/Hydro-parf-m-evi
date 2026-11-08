/* Döner sahnesi: dönen şiş, lavaş ve dürüm sarma */
import { THREE, Stage, tween, ease, tex, paint, shot, shadow, planarUV, contactShadow, make, rng, fbm, noise, smooth, mix, normalFrom, bakeable, footprintY, surfaceY, withFinal, sauceStroke, smoothHeights } from './core.js';
import * as F from './food.js';

const $ = id => document.getElementById(id);
const hex = window.HydroArt.hex;
const { std, phys, mixc, displace } = F;

/* ---------- dokular ---------- */
function slateFloor() {
  const a = hex('#26221f'), b = hex('#3a3430'), c = hex('#15110f');
  const m = paint(1024, 1024, (u, v, o, i, j) => {
    const n = fbm(i * .006, j * .018, 5);
    mixc(o, a, b, smooth(.3, .7, n));
    if (Math.abs(fbm(i * .004 + 5, j * .004, 4) - .5) < .0028) mixc(o, o, c, .4);
    const g = noise(i * .8, j * .8) * 10 - 5; o[0] += g; o[1] += g; o[2] += g;
  });
  const t = tex(m, { repeat: [5, 5], mirror: true });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), std({ map: t, roughness: .62, metalness: .1, normalMap: (() => { const n = normalFrom(m, 1.5); n.wrapS = n.wrapT = THREE.MirroredRepeatWrapping; n.repeat.set(5, 5); return n; })() }));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
  return f;
}
function woodBoard(w, d) {
  const a = hex('#7a4a22'), b = hex('#a9743d'), c = hex('#4e2d13');
  const m = paint(1024, 680, (u, v, o, i, j) => {
    const n = fbm(i * .004 + 3, j * .05, 4);
    mixc(o, a, b, smooth(.3, .7, n));
    const ring = Math.abs(Math.sin((j * .06 + fbm(i * .003, j * .01, 3) * 16)));
    if (ring < .1) mixc(o, o, c, .45);
    const s = noise(i * .3, j * 1.2) * 14 - 7; o[0] += s; o[1] += s; o[2] += s;
  });
  const s = new THREE.Shape(), r = .55, W = w / 2, D = d / 2;
  s.moveTo(-W + r, -D); s.lineTo(W - r, -D); s.quadraticCurveTo(W, -D, W, -D + r); s.lineTo(W, D - r); s.quadraticCurveTo(W, D, W - r, D); s.lineTo(-W + r, D); s.quadraticCurveTo(-W, D, -W, D - r); s.lineTo(-W, -D + r); s.quadraticCurveTo(-W, -D, -W + r, -D);
  const g = new THREE.ExtrudeGeometry(s, { depth: .28, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getZ(i) / d + .5);
  return shadow(new THREE.Mesh(g, std({ map: tex(m), normalMap: normalFrom(m, 1.2), roughness: .58 })));
}
function meatTex(kind) {
  const P = {
    et: ['#2c120a', '#6e3314', '#a65f26'],
    tavuk: ['#8d5519', '#d39a42', '#f1c876'],
    adana: ['#3b1208', '#8a2e12', '#c45a22'],
    urfa: ['#3a1a0b', '#83481f', '#b57a3e']
  }[kind].map(hex);
  return paint(512, 512, (u, v, o, i, j) => {
    const n = fbm(i * .018 + 3, j * .05 + 7, 4), fine = fbm(i * .08, j * .14, 3);
    mixc(o, P[0], P[1], smooth(.25, .58, n));
    mixc(o, o, P[2], smooth(.56, .74, fine) * .85);
    if (kind === 'adana' && noise(i * .35, j * .35) > .86) { o[0] = 170; o[1] = 40; o[2] = 16; }
  });
}
function meatMat(kind, ns = 1) {
  const c = meatTex(kind);
  const n = normalFrom(c, 7);
  return std({ map: tex(c, { repeat: [1, 1] }), normalMap: n, normalScale: new THREE.Vector2(ns, ns), roughness: kind === 'tavuk' ? .5 : .42, metalness: .02 });
}

/* ---------- dönen şiş ---------- */
function spit() {
  const g = new THREE.Group();
  const steel = F.steelMat();
  const c = paint(1024, 1024, (u, v, o, i, j) => {
    const P = [hex('#26100a'), hex('#6d3214'), hex('#b0682a'), hex('#e0a050')];
    const band = fbm(i * .012, j * .1, 4), fine = fbm(i * .09, j * .22, 3);
    mixc(o, P[0], P[1], smooth(.28, .55, band));
    mixc(o, o, P[2], smooth(.5, .68, fine));
    mixc(o, o, P[3], smooth(.74, .86, fine) * .55);
    const ch = fbm(i * .03 + 11, j * .03 + 2, 3); if (ch > .63) mixc(o, o, P[0], smooth(.63, .72, ch) * .85);
  });
  const mat = std({ map: tex(c, { repeat: [2, 1] }), normalMap: (() => { const n = normalFrom(c, 9); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(2, 1); return n; })(), normalScale: new THREE.Vector2(1.5, 1.5), roughness: .34 });
  const prof = [];
  const Hh = 5.2;
  for (let i = 0; i <= 44; i++) { const t = i / 44; prof.push([1.02 + .75 * Math.pow(t, .8), t * Hh]); }
  prof.unshift([0, 0]); prof.push([.2, Hh + .12], [0, Hh + .12]);
  const geo = F.lathe(prof, 120);
  displace(geo, (p, i) => {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
    if (r < .3) return;
    const k = 1 + (fbm(Math.cos(a) * 3 + y * .9, Math.sin(a) * 3 + y * 1.3, 4) - .5) * .17 + Math.sin(y * 19 + a * 2) * .008;
    p.setX(i, x * k); p.setZ(i, z * k);
  });
  const meat = new THREE.Mesh(geo, mat);
  const rotor = new THREE.Group(); rotor.add(meat);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, Hh + 2.4, 16), steel); rod.position.y = (Hh + 2.4) / 2 - .3;
  const tomato = new THREE.Mesh(new THREE.SphereGeometry(.52, 24, 16), phys({ color: 0xb51d12, roughness: .22, clearcoat: 1 })); tomato.scale.y = .7; tomato.position.y = Hh + .35;
  rotor.add(rod, tomato);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, .14, 48), steel); plate.position.y = .08; rotor.add(plate);
  rotor.position.y = .3;
  g.add(rotor);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, .3, 48), steel); base.position.y = .15; g.add(base);

  // ısı panosu
  const pan = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 7.2, .35), std({ color: 0x1c1a1a, metalness: .85, roughness: .4 })); frame.position.set(0, 3.6, -2.7); pan.add(frame);
  const em = paint(256, 512, (u, v, o, i, j) => {
    const row = Math.abs(((v * 11) % 1) - .5) * 2, col = Math.abs(((u * 7) % 1) - .5) * 2;
    const k = smooth(.8, .2, row) * .75 + smooth(.8, .2, col) * .25;
    const n = fbm(i * .03, j * .03, 3);
    o[0] = 30 + 225 * k; o[1] = 8 + 110 * k * n; o[2] = 3;
  });
  const glowM = std({ color: 0x220a02, emissive: 0xffffff, emissiveMap: tex(em), emissiveIntensity: 1.8, roughness: .7 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 6.4), glowM); panel.position.set(0, 3.7, -2.5); pan.add(panel);
  g.add(pan);
  const L1 = new THREE.PointLight(0xff6a1e, 110, 18, 1.5); L1.position.set(0, 3.5, -1.5); g.add(L1);
  const L2 = new THREE.PointLight(0xff8a3a, 50, 16, 1.5); L2.position.set(1.8, 2, 1.6); g.add(L2);
  shadow(rotor); shadow(pan);
  return { group: g, update(dt, now) { rotor.rotation.y += dt * .00055; const f = .9 + .1 * Math.sin(now * .011) + .05 * Math.sin(now * .027); L1.intensity = 110 * f; glowM.emissiveIntensity = 1.8 * f; } };
}

/* ---------- lavaş ---------- */
function lavash() {
  const w = 7.2, l = 7.8;
  const mk = baked => paint(1024, 1024, (u, v, o, i, j) => {
    const x = u * 2 - 1, y = v * 2 - 1;
    const se = Math.pow(Math.abs(x), 3.2) + Math.pow(Math.abs(y), 3.2);
    const edge = se + (fbm(u * 6 + 3, v * 6, 3) - .5) * .25;
    o[3] = edge < .96 ? 255 : 0;
    const A1 = hex('#f3e3bd'), A2 = hex('#e7cf9b'), S = hex('#9a6228');
    mixc(o, A1, A2, smooth(.25, .7, fbm(u * 7, v * 7, 4)));
    const sp = fbm(u * 46 + 3, v * 46 + 8, 3);
    mixc(o, o, S, smooth(.62, .74, sp) * .6);
    if (noise(i * .6, j * .6) > .9) { o[0] += 8; o[1] += 8; o[2] += 8; }
    if (baked) {
      const G = hex('#3a1c09');
      mixc(o, o, hex('#c98c3e'), .35);
      const line = Math.abs(((u * 16 + v * 3) % 1) - .5) * 2;
      mixc(o, o, G, smooth(.16, .04, line) * .85 * smooth(.3, .6, fbm(u * 10, v * 10, 2) + .3));
    }
  });
  const raw = mk(false), baked = mk(true);
  const mat = bakeable(std({ map: tex(raw), alphaTest: .5, side: THREE.DoubleSide, roughness: .78, normalMap: normalFrom(raw, 2.2), normalScale: new THREE.Vector2(.6, .6) }), tex(baked));
  const g = new THREE.PlaneGeometry(w, l, 90, 40); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, base = p.array.slice();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  const flatH = (x, z) => .012 * Math.sin(x * 2.6 + z * 1.5) + .012 * Math.sin(z * 3.3 - x);
  m.roll = (t) => {
    const R = t <= 0 ? 0 : mix(30, .78, Math.pow(t, .34));
    const H = Math.max(0, t);
    for (let i = 0; i < p.count; i++) {
      const s = base[i * 3], z = base[i * 3 + 2];
      if (t <= 0) { p.setXYZ(i, s, flatH(s, z), z); continue; }
      const sign = s < 0 ? -1 : 1, as = Math.abs(s);
      const th = as / R;
      // İki taraf üst üste binmesin diye sarmal yarıçap
      const r = R + (sign > 0 ? .012 : .03) * th * H + .005;
      p.setXYZ(i, sign * r * Math.sin(th), R - r * Math.cos(th) + flatH(s, z) * (1 - t), z);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
  };
  m.roll(0);
  return { mesh: m, mat, w, l };
}

export function donerView() {
  const st = new Stage({ anchor: $('dBox'), width: 11, tilt: 47, exposure: 1.1, env: .55 });
  const s = st.scene;
  st.key.intensity = 2.2;
  st.key.position.set(-6, 22, 12);
  s.add(slateFloor());

  const sp = spit();
  sp.group.position.set(0, 0, -5.4); sp.group.scale.setScalar(.82);
  s.add(sp.group);
  st.onUpdate(sp.update);

  const board = woodBoard(10.2, 6.2);
  s.add(contactShadow(12, 8, .7), board);
  const TOP = .36;

  const lav = lavash();
  const roll = new THREE.Group(); roll.rotation.y = Math.PI / 2; roll.position.set(0, TOP, .1);
  roll.add(lav.mesh); s.add(roll);
  const fills = new THREE.Group(); roll.add(fills);

  /* ---------- tam ekmek (yarım ekmek arası) ---------- */
  const BREAD_L = 5.6, BREAD_R = .9, BREAD_H = 1.0, BREAD_HB = .34, BREAD_TOP = BREAD_HB;
  const crustC = paint(512, 512, (u, v, o, i, j) => {
    // u: ekmeğin boyu, v: çevresi (0 ve 1 kenarlar, .5 sırt)
    const a = hex('#5a2a0c'), b = hex('#8e4a14'), c = hex('#b8732a');
    mixc(o, a, b, smooth(.3, .7, fbm(u * 10, v * 6, 4)));
    const top = Math.max(0, 1 - Math.abs(v - .5) * 3.2);
    mixc(o, o, c, top * .55 * smooth(.35, .75, fbm(u * 16 + 4, v * 9, 3)));
    // sırtta 4 çapraz bıçak çentiği: açık renkli, kenarları koyu
    const k = (u * 4.2 + (v - .5) * 1.6) % 1, d = Math.abs(k - .5);
    if (u > .1 && u < .9 && Math.abs(v - .5) < .17) {
      if (d < .035) mixc(o, o, hex('#e6c07c'), .85);
      else if (d < .07) mixc(o, o, hex('#3a1806'), .45);
    }
    // uçlar biraz daha koyu
    const e = Math.min(u, 1 - u); if (e < .12) mixc(o, o, a, (1 - e / .12) * .5);
  });
  const crumbC = paint(512, 256, (u, v, o, i, j) => {
    const a = hex('#f4e6c4'), b = hex('#e3cf9f');
    mixc(o, a, b, smooth(.4, .7, fbm(u * 18, v * 9, 3)));
    if (noise(i * .25, j * .25) > .78) { o[0] *= .86; o[1] *= .84; o[2] *= .8; }
  });
  const crustM = std({ map: tex(crustC), normalMap: normalFrom(crustC, 3), roughness: .62, side: THREE.DoubleSide });
  const crumbM = std({ map: tex(crumbC), normalMap: normalFrom(crumbC, 4), roughness: .9 });
  const rAt = u => BREAD_R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.4)), .5);
  function shell(hgt, sign) {
    const SU = 48, SV = 18, pos = [], uv = [], idx = [];
    for (let i = 0; i <= SU; i++) for (let j = 0; j <= SV; j++) {
      const u = i / SU * 2 - 1, v = j / SV * Math.PI, rr = rAt(u), hh = hgt * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.2)), .5);
      pos.push(Math.cos(v) * rr, sign * Math.sin(v) * hh, u * BREAD_L / 2);
      uv.push(i / SU, j / SV);
    }
    for (let i = 0; i < SU; i++) for (let j = 0; j < SV; j++) {
      const a = i * (SV + 1) + j, b = a + SV + 1;
      if (sign > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function crumbFace(up) {
    const sh = new THREE.Shape(), N = 40;
    for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; const x = rAt(u), z = u * BREAD_L / 2; i ? sh.lineTo(x, z) : sh.moveTo(x, z); }
    for (let i = N; i >= 0; i--) { const u = i / N * 2 - 1; sh.lineTo(-rAt(u), u * BREAD_L / 2); }
    const g = new THREE.ShapeGeometry(sh, 4);
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
    planarUV(g, BREAD_L);
    return g;
  }
  function makeBread(open) {
    const b = new THREE.Group();
    const bottom = new THREE.Group();
    bottom.add(new THREE.Mesh(shell(BREAD_HB, -1), crustM), new THREE.Mesh(crumbFace(true), crumbM));
    const h = new THREE.Group(); h.position.x = -BREAD_R;
    const top = new THREE.Group(); top.position.x = BREAD_R;
    top.add(new THREE.Mesh(shell(BREAD_H, 1), crustM), new THREE.Mesh(crumbFace(false), crumbM));
    h.add(top); h.rotation.z = open ? Math.PI : 0;
    b.add(bottom, h); b.position.y = BREAD_HB;
    b.userData = { bottom, hinge: h };
    return shadow(b);
  }
  const bread = makeBread(true); bread.visible = false; roll.add(bread);
  const breadBase = bread.userData.bottom, hinge = bread.userData.hinge;

  /* ---------- malzemeler ---------- */
  const r = rng(77);
  const mats = { et: meatMat('et'), tavuk: meatMat('tavuk', .7), adana: meatMat('adana', 1.3), urfa: meatMat('urfa', 1.3) };
  const stripG = () => {
    const g = new THREE.PlaneGeometry(.9, .42, 12, 6); g.rotateX(-Math.PI / 2);
    const off = r() * 9;
    return displace(g, (p, i) => { const x = p.getX(i), z = p.getZ(i); p.setY(i, .08 * Math.sin(x * 4 + off) + .05 * Math.cos(z * 6 + off) + .04 * Math.pow(Math.abs(x) * 2, 2)); });
  };
  const stripGs = [stripG(), stripG(), stripG(), stripG()];
  const logG = (() => {
    const g = new THREE.CapsuleGeometry(.27, 4.5, 10, 28, 1); g.rotateX(Math.PI / 2);
    // CapsuleGeometry uç halkaları için ek bölümleme
    const seg = new THREE.CylinderGeometry(.27, .27, 4.6, 28, 46, false); seg.rotateX(Math.PI / 2);
    return displace(seg, (p, i) => {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(y, x);
      const k = 1 + .15 * Math.sin(z * 9) + (fbm(z * 2 + 3, a * 2, 3) - .5) * .25;
      const taper = smooth(2.3, 2.0, Math.abs(z));
      p.setX(i, x * k * (.4 + .6 * taper)); p.setY(i, y * k * (.4 + .6 * taper));
    });
  })();
  const BA = window.HydroBurgerArt;
  const tomMat = phys({ map: tex(BA.pieceCanvas('tomato')), roughness: .3, clearcoat: .4 });
  const tomSide = std({ color: 0xa81a12, roughness: .4 });
  const pickMat = phys({ map: tex(BA.pieceCanvas('pickles')), roughness: .35, clearcoat: .3 });
  const pickSide = std({ color: 0x4f6b18, roughness: .4 });
  const sumac = paint(128, 64, (u, v, o, i, j) => { o[0] = 240; o[1] = 228; o[2] = 232; if (noise(i * .5, j * .5) > .72) { o[0] = 120; o[1] = 22; o[2] = 30; } });
  const onionM = std({ map: tex(sumac, { repeat: [4, 1] }), roughness: .4 });
  const parsleyC = make(128), px = parsleyC.getContext('2d');
  px.fillStyle = '#2f8a2a';
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; px.beginPath(); px.ellipse(64 + Math.cos(a) * 28, 64 + Math.sin(a) * 28, 22, 14, a, 0, 7); px.fill(); }
  px.fillStyle = '#4cab3c'; px.beginPath(); px.arc(64, 64, 28, 0, 7); px.fill();
  const parsleyM = std({ map: tex(parsleyC), alphaTest: .5, side: THREE.DoubleSide, roughness: .5 }); parsleyM.userData.noAO = true;
  const parsleyG = (() => { const g = new THREE.PlaneGeometry(.42, .42, 4, 4); g.rotateX(-Math.PI / 2); return displace(g, (p, i) => p.setY(i, Math.sin(p.getX(i) * 7) * .04)); })();
  const lettuceM = std({ color: 0x8ccc48, roughness: .5, side: THREE.DoubleSide });
  const lettuceG = (() => { const g = new THREE.PlaneGeometry(1.3, .34, 18, 4); g.rotateX(-Math.PI / 2); return displace(g, (p, i) => p.setY(i, .06 * Math.sin(p.getX(i) * 13) * (1 + p.getZ(i) * 3))); })();
  const friesG = new THREE.BoxGeometry(.14, .14, 1.1), friesM = std({ color: 0xeeb24a, roughness: .55 });
  const pepperM = phys({ color: 0x2c6d1e, roughness: .28, clearcoat: .8 });
  const pepperG = (() => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(Math.sin(t * 3) * .28, 0, t * 3 - 1.5)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .15, 10); })();

  const mesh = (g, m) => new THREE.Mesh(g, m);
  const halfTom = () => { const g = new THREE.CylinderGeometry(.5, .5, .09, 24, 1, false, 0, Math.PI); F.lathe; const uv = g.attributes.uv; const p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.11 + .5, p.getZ(i) / 1.11 + .5); return new THREE.Mesh(g, [tomSide, tomMat, tomMat]); };
  const pickleS = () => { const g = new THREE.CylinderGeometry(.27, .27, .05, 20); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .6 + .5, p.getZ(i) / .6 + .5); return new THREE.Mesh(g, [pickSide, pickMat, pickMat]); };
  const onionArc = () => { const t = new THREE.TorusGeometry(.24 + r() * .14, .028, 6, 20, 2.4 + r() * 2); t.rotateX(Math.PI / 2); return new THREE.Mesh(t, onionM); };

  const FILL = {
    adana: { n: 2, y: .3, x: [-.32, .32], make: () => mesh(logG, mats.adana), log: true },
    urfa: { n: 2, y: .3, x: [-.32, .32], make: () => mesh(logG, mats.urfa), log: true },
    et: { n: 64, y: .12, make: i => { const m = mesh(stripGs[i % 4], mats.et); m.scale.setScalar(1.35); return m; } },
    tavuk: { n: 60, y: .12, make: i => { const m = mesh(stripGs[i % 4], mats.tavuk); m.scale.setScalar(1.35); return m; } },
    marul: { n: 22, y: .06, make: () => mesh(lettuceG, lettuceM), z: 1 },
    domates: { n: 18, y: .35, make: halfTom },
    sogan: { n: 36, y: .42, make: onionArc },
    maydanoz: { n: 42, y: .5, make: () => mesh(parsleyG, parsleyM) },
    tursu: { n: 16, y: .4, make: pickleS },
    patates: { n: 22, y: .3, make: () => mesh(friesG, friesM) },
    biber: { n: 5, y: .4, make: () => mesh(pepperG, pepperM) }
  };
  const SAUCE = { aci: 0xa3200f, sarimsak: 0xf4efdc };
  const entries = [];

  const _w = new THREE.Vector3();
  let dDiscs = []; // konmuş malzemelerin kapladığı alan ve üst yüksekliği (lavaş/ekmek grubuna göre)
  function placeFill(id, level) {
    const d = FILL[id], g = new THREE.Group(), key = id + '-' + level;
    fills.add(g);
    const list = [];
    for (let i = 0; i < d.n; i++) {
      const m = d.make(i);
      if (bread.visible && !d.log) m.scale.multiplyScalar(.72);
      if (d.log) {
        // ekmekte şiş kebabı ekmeğin sivri uçlarından taşmasın: kısalt ve ortaya topla
        if (bread.visible) { m.scale.set(.8, .8, .74); m.position.set(d.x[i] * .62 + level * .06 * (i ? 1 : -1), 0, (r() - .5) * .15); }
        else m.position.set(d.x[i] + level * .1 * (i ? 1 : -1), 0, (r() - .5) * .3);
      }
      else {
        // eşit dağılım: aday noktalardan diğer parçalara en uzak olanı
        const W = bread.visible ? .95 : 2.1, Lz = bread.visible ? 4.3 : 5.4;
        let best = null, bd = -1;
        for (let k = 0; k < 10; k++) {
          const x = (r() - .5) * W, z = (r() - .5) * Lz;
          let dd = Infinity; for (const c of list) dd = Math.min(dd, Math.hypot(c.position.x - x, (c.position.z - z) * .6));
          if (dd > bd) { bd = dd; best = [x, z]; }
        }
        // ekmekte uçlar sivri: genişlik ekmeğin o noktadaki eninde kalsın
        if (bread.visible) {
          // uzun parçalar (biber, patates, marul) ekmek boyunca yatsın; her parça kenarlardan içeride kalsın
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const gb = m.geometry.boundingBox, s0 = m.scale.x;
          let ex = (gb.max.x - gb.min.x) * s0 * .5, ez = (gb.max.z - gb.min.z) * s0 * .5, ry = (r() - .5) * .35;
          if (ex > ez * 1.3) { ry += Math.PI / 2; [ex, ez] = [ez, ex]; } else if (ez <= ex * 1.3) ry = r() * 7;
          const zMax = Math.max(0, BREAD_L / 2 * .8 - ez);
          best[1] = Math.max(-zMax, Math.min(zMax, best[1]));
          const xMax = Math.max(0, .78 * rAt(best[1] / (BREAD_L / 2)) - ex);
          best[0] = Math.max(-xMax, Math.min(xMax, best[0] * .62 * rAt(best[1] / (BREAD_L / 2)) / BREAD_R));
          m.position.set(best[0], 0, best[1]);
          m.rotation.set((r() - .5) * .2, ry, (r() - .5) * .2);
        } else {
          m.position.set(best[0], 0, best[1]);
          m.rotation.set((r() - .5) * .3, r() * 7, (r() - .5) * .3);
        }
      }
      shadow(m);
      g.add(m);
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const sy = m.scale.y, bb = m.geometry.boundingBox;
      const half = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * m.scale.x * .5;
      const rr = Math.min(.35, half * .6);
      const cap = bread.visible ? BREAD_TOP + .34 * Math.pow(rAt(m.position.z / (BREAD_L / 2)) / BREAD_R, 1.5) : .42;
      let under = bread.visible ? BREAD_TOP : .02;
      for (const q of dDiscs) if (q.key !== key && Math.hypot(q.x - m.position.x, q.z - m.position.z) < (rr + q.r) * .8) under = Math.max(under, q.top);
      const y = Math.min(cap, under) + r() * .05 - bb.min.y * sy + .01;
      m.position.y = y; m.userData.finalY = y;
      dDiscs.push({ x: m.position.x, z: m.position.z, r: rr, top: y + bb.max.y * sy, key, g });
      list.push(m);
    }
    list.forEach((m, i) => {
      if (F_reduced) return;
      const y0 = m.userData.finalY; m.visible = false; m.position.y = y0 + 3.2;
      tween(460, t => { m.visible = true; m.position.y = y0 + 3.2 * (1 - t); }, { delay: i * (d.n > 20 ? 11 : 30), ease: ease.bounce });
    });
    return g;
  }
  const F_reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* paket kağıdı */
  const paperC = make(1024, 512), pc = paperC.getContext('2d');
  pc.fillStyle = '#f4ead4'; pc.fillRect(0, 0, 1024, 512);
  pc.strokeStyle = 'rgba(122,28,20,.8)'; pc.lineWidth = 10; for (let i = 0; i < 12; i++) { pc.beginPath(); pc.moveTo(i * 90, 0); pc.lineTo(i * 90 + 40, 512); pc.stroke(); }
  pc.fillStyle = '#7a1c14'; pc.textAlign = 'center';
  [[256, 300], [768, 300]].forEach(a => { pc.fillStyle = '#f4ead4'; pc.fillRect(a[0] - 190, 150, 380, 210); pc.fillStyle = '#7a1c14'; pc.font = '86px "Bowlby One"'; pc.fillText('HYDRO', a[0], 262); pc.font = '60px Anton'; pc.fillText('DÖNER', a[0], 334); });
  const paperMat = std({ map: tex(paperC), roughness: .8, side: THREE.DoubleSide });
  // ekmek arası kağıdı: kraft, kırmızı-beyaz şeritli, ayrı baskı
  const kraftC = make(1024, 512), kc = kraftC.getContext('2d');
  kc.fillStyle = '#c9a06a'; kc.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 2600; i++) { kc.fillStyle = 'rgba(90,55,20,' + (Math.random() * .12) + ')'; kc.fillRect(Math.random() * 1024, Math.random() * 512, 2 + Math.random() * 10, 1); }
  for (let i = 0; i < 1024; i += 64) { kc.fillStyle = (i / 64) % 2 ? '#f3ece0' : '#b8231a'; kc.fillRect(i, 0, 64, 70); kc.fillRect(i, 442, 64, 70); }
  kc.fillStyle = '#5a1810'; kc.textAlign = 'center';
  [[256, 270], [768, 270]].forEach(a => { kc.font = '70px "Bowlby One"'; kc.fillText('HYDRO', a[0], a[1]); kc.font = '40px Anton'; kc.fillText('EKMEK ARASI DÖNER', a[0], a[1] + 60); });
  const breadPaperMat = std({ map: tex(kraftC), roughness: .92, side: THREE.DoubleSide });
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 1, 48, 1, true), paperMat);
  paper.rotation.x = Math.PI / 2; paper.visible = false; shadow(paper);
  roll.add(paper);
  // kapalı uç: kağıdın büzülmüş sonu
  const endG = new THREE.ConeGeometry(1.02, .5, 48, 1, true); endG.rotateX(-Math.PI / 2);
  const paperEnd = new THREE.Mesh(endG, paperMat); paperEnd.visible = false; shadow(paperEnd); roll.add(paperEnd);
  const MOUTH = 1.1; // açık kalan ağız kısmı

  // uç kapakları
  const capC = meatTex('et'), capM = std({ map: tex(capC), roughness: .6 });
  const caps = [1, -1].map(sg => { const c = new THREE.Mesh(new THREE.CircleGeometry(.7, 24), capM); c.position.set(0, .78, sg * (lav.l / 2 - .32)); c.rotation.y = sg > 0 ? 0 : Math.PI; c.visible = false; roll.add(c); return c; });

  /* yan ürünler */
  const sideRoot = new THREE.Group(); sideRoot.position.set(5.85, 0, .4); s.add(sideRoot);
  function glass(colorHex, foam) {
    const g = new THREE.Group();
    const G = phys({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const body = new THREE.Mesh(F.lathe([[.5, 0], [.6, 2.3]], 36), G); body.renderOrder = 5;
    const liquid = new THREE.Mesh(F.lathe([[0, .05], [.47, .05], [.56, 2]], 36), phys({ color: colorHex, roughness: .3, clearcoat: .6 }));
    const top = new THREE.Mesh(new THREE.CircleGeometry(.56, 36), std({ color: foam, roughness: .85 })); top.rotation.x = -Math.PI / 2; top.position.y = 2;
    g.add(liquid, top, body);
    return shadow(g);
  }
  const SIDE = {
    kola: () => F.drink('kola'),
    su: () => F.drink('su'),
    ayran: () => glass(0xf6f3e6, 0xfffef6),
    salgam: () => glass(0x5c0d2c, 0x8a1540),
    patates: () => { const c = F.sideCup('fries', { bg: '#7a1c14', ink: '#f4ead4', sub: 'DÖNER' }); c.scale.setScalar(.9); return c; }
  };

  let rollT = 0;
  const applyRoll = t => {
    rollT = t;
    lav.mesh.roll(t);
    const k = smooth(0, .75, t);
    fills.scale.set(1 - k * .62, 1 - k * .35, 1 - k * .1);
    fills.position.y = k * .12;
    fills.visible = t < .92;
    caps.forEach(c => { c.visible = t > .88; });
  };

  const view = {
    stage: st,
    thumb(id) {
      const d = FILL[id];
      const t = F.metalTray(5, 3.6);
      const r2 = rng(id.length * 9);
      const n = { adana: 4, urfa: 4, et: 60, tavuk: 60, marul: 26, domates: 22, sogan: 60, maydanoz: 60, tursu: 24, patates: 34, biber: 6 }[id];
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const m = d.make(i);
        if (d.log) { m.rotation.y = Math.PI / 2; m.position.set(0, .38, -1.2 + i * .8); }
        else {
          m.position.set((r2() - .5) * 4, .15 + r2() * .35, (r2() - .5) * 2.8);
          m.rotation.set((r2() - .5) * .5, r2() * 7, (r2() - .5) * .5);
          const sc = { domates: 1.3, tursu: 1.5, maydanoz: 1.4, sogan: 1.5, patates: 1.2 }[id] || 1;
          m.scale.setScalar(sc);
        }
        g.add(m);
      }
      t.add(shadow(g));
      return shot(t, { w: 340, h: 280, tilt: 42, fill: .62 });
    },
    sideThumb(id) { return shot(SIDE[id](), { w: 200, h: 300, tilt: 66, fill: .64 }); },
    sauceThumb(id) { const b = F.bottle(SAUCE[id], SAUCE[id], F.bottleLabel('DÖNER')); return shot(b, { w: 170, h: 400, tilt: 80, fill: .5, yaw: .25 }); },
    add(id, level) { const obj = placeFill(id, level); return { obj, kind: 'fill' }; },
    sauce(id) {
      // dolgunun üstünde, lavaşın ortasındaki şeridin dışına taşmadan rastgele
      const eb = bread.visible;
      const flat = sauceStroke(Math.random, (x, z) => Math.abs(x) < (eb ? .45 : .85) && Math.abs(z) < (eb ? 2.1 : 2.75), { span: eb ? .38 : .62, len: eb ? 3.9 : 4.8, along: 'z' });
      const pts = flat.map(([x, z]) => {
        let top = eb ? BREAD_TOP : .02;
        for (const q of dDiscs) if (Math.hypot(q.x - x, q.z - z) < q.r * 1.1) top = Math.max(top, q.top);
        return [x, top + .05, z];
      });
      const tube = F.sauceTube(smoothHeights(pts, 4), SAUCE[id], .05 + Math.random() * .025);
      fills.add(tube);
      tween(900, t => tube.setProgress(t), { ease: ease.linear });
      return { obj: tube, kind: 'fill' };
    },
    addSide(id) {
      const o = SIDE[id]();
      const i = sideRoot.children.length;
      o.position.set((i % 2) * 1.45, 4, -2.4 + Math.floor(i / 2) * 1.9);
      sideRoot.add(o);
      tween(520, t => { o.position.y = 4 * (1 - t); }, { ease: ease.bounce });
      return { obj: o, kind: 'side' };
    },
    remove(e) {
      if (e.kind === 'side') { sideRoot.remove(e.obj); sideRoot.children.forEach((c, i) => { c.position.x = (i % 2) * 1.45; c.position.z = -2.4 + Math.floor(i / 2) * 1.9; }); return; }
      fills.remove(e.obj);
      dDiscs = dDiscs.filter(q => q.g !== e.obj);
    },
    breadThumb(k) {
      if (k === 'lavas') { const l = lavash(); l.mesh.roll(0); return shot(l.mesh, { w: 260, h: 200, tilt: 40, fill: .62 }); }
      return shot(makeBread(true), { w: 260, h: 200, tilt: 40, fill: .62, yaw: .3 });
    },
    setBread(k) {
      const e = k === 'ekmek';
      bread.visible = e; lav.mesh.visible = !e;
      hinge.rotation.z = Math.PI;
    },
    roll(on) {
      if (bread.visible) {
        // ekmek: üst yarım menteşeden kapanır
        const from = hinge.rotation.z, to = on ? .02 : Math.PI;
        if (!on) fills.visible = true;
        // kapanırken malzeme ekmeğin içinde kalır (dışarıdan görünmez)
        return tween(on ? 900 : 600, t => { hinge.rotation.z = from + (to - from) * t; if (on && t > .55) fills.visible = false; }, { ease: ease.inOut });
      }
      const from = rollT, to = on ? 1 : 0;
      const pr = tween(on ? 1250 : 700, t => applyRoll(from + (to - from) * t), { ease: ease.inOut });
      const m = lav.mat.userData.bake;
      tween(1100, t => { m.value = on ? t : 1 - t; }, { delay: on ? 700 : 0 });
      return pr;
    },
    wrap(on) {
      // kağıt kapalı uçtan başlar, ağız kısmı hariç dürümün tamamını sarar
      if (!on) { paper.visible = paperEnd.visible = false; return; }
      paper.visible = paperEnd.visible = true;
      const eb = bread.visible, len0 = eb ? BREAD_L : lav.l, cy = eb ? BREAD_TOP + .12 : .78, sc = eb ? 1.08 : 1;
      paper.material = paperEnd.material = eb ? breadPaperMat : paperMat;
      const half = len0 / 2 + .05, L = len0 + .1 - MOUTH;
      paperEnd.scale.set(sc, 1, sc);
      paperEnd.position.set(0, cy, -half - .25);
      return tween(900, t => {
        const len = Math.max(.01, L * t);
        paper.scale.set(sc, len, sc);
        paper.position.set(0, cy, -half + len / 2);
      }, { ease: ease.inOut });
    },
    clear() {
      fills.clear(); dDiscs = []; sideRoot.clear(); applyRoll(0); hinge.rotation.z = Math.PI; lav.mat.userData.bake.value = 0; paper.visible = paperEnd.visible = false;
      fills.scale.set(1, 1, 1); fills.position.y = 0; fills.visible = true;
    }
  };
  return view;
}
