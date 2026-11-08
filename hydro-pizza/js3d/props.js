/* Eldiven imleci ve yazarkasa modelleri */
import { THREE, make, tex, paint, noise, fbm, normalFrom } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const phys = o => new THREE.MeshPhysicalMaterial(o);
const std = o => new THREE.MeshStandardMaterial(o);

/* ---------- nitril eldiven ---------- */
let gloveNormal;
function nitrileNormal() {
  if (gloveNormal) return gloveNormal;
  const c = paint(256, 256, (u, v, o, i, j) => {
    const n = noise(i * .55, j * .55) * .55 + fbm(i * .05, j * .05, 3) * .45;
    const g = 128 + (n - .5) * 70; o[0] = g; o[1] = g; o[2] = g;
  });
  gloveNormal = normalFrom(c, 1.6);
  gloveNormal.wrapS = gloveNormal.wrapT = THREE.RepeatWrapping;
  gloveNormal.repeat.set(3, 3);
  return gloveNormal;
}
/* Parmak eklemleri bükülme açılarıyla tanımlanır (radyan). Elin sırtı kameraya bakar,
   avuç içi -z yönünde. Pozlar: point, open, hold, ok */
const FINGERS = {
  //        kök (x, y)      bölüm uzunlukları      yarıçap  yan açı
  index: { base: [-1.1, 1.55], segs: [1.18, .8, .64], r: .45, spread: .08 },
  middle: { base: [-.36, 1.7], segs: [1.3, .88, .68], r: .46, spread: 0 },
  ring: { base: [.4, 1.62], segs: [1.22, .82, .64], r: .44, spread: -.07 },
  pinky: { base: [1.08, 1.36], segs: [.96, .66, .56], r: .38, spread: -.16 }
};
const POSES = {
  point: { index: [0, .04, .02], middle: [1.55, 1.7, 1.1], ring: [1.55, 1.7, 1.1], pinky: [1.5, 1.65, 1.05], thumb: { yaw: .1, roll: -.5, curl: [.55, .6] } },
  open: { index: [.08, .06, .04], middle: [.06, .05, .03], ring: [.08, .06, .04], pinky: [.12, .08, .05], thumb: { yaw: .95, roll: .25, curl: [.1, .1] }, spread: 1.6 },
  hold: { index: [.95, .85, .55], middle: [1, .9, .6], ring: [1, .9, .6], pinky: [.95, .85, .55], thumb: { yaw: .35, roll: -.2, curl: [.45, .5] } },
  ok: { index: [1.05, 1.15, .7], middle: [.1, .06, .04], ring: [.14, .08, .05], pinky: [.2, .1, .06], thumb: { yaw: .1, roll: -.55, curl: [.75, .65] }, spread: 1.2 }
};
export function glove(pose, colorHex) {
  const P = POSES[pose];
  const mat = phys({ color: colorHex, roughness: .34, metalness: 0, clearcoat: .55, clearcoatRoughness: .35, sheen: .5, sheenRoughness: .4, sheenColor: new THREE.Color(0x5a5a64), normalMap: nitrileNormal(), normalScale: new THREE.Vector2(.25, .25) });
  const hand = new THREE.Group();
  let tip = null;

  // avuç: yuvarlatılmış kutu, bileğe doğru daralır, sırtı hafif kubbeli
  const palmG = new RoundedBoxGeometry(3.25, 3.4, 1.55, 8, .74);
  const p = palmG.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = .88 + .12 * ((y + 1.7) / 3.4);
    p.setX(i, x * k);
    if (z > 0) p.setZ(i, z + .16 * Math.cos(x * .7) * Math.cos(y * .45));
  }
  palmG.computeVertexNormals();
  const palm = new THREE.Mesh(palmG, mat); palm.position.set(0, .05, 0);
  hand.add(palm);

  // parmak: kapsül zinciri, her eklemde bükülür
  Object.keys(FINGERS).forEach(name => {
    const f = FINGERS[name], curl = P[name];
    let parent = new THREE.Group();
    parent.position.set(f.base[0], f.base[1], -.05);
    parent.rotation.z = f.spread * (P.spread || 1);
    hand.add(parent);
    f.segs.forEach((L, s) => {
      const joint = new THREE.Group();
      joint.rotation.x = -curl[s];
      parent.add(joint);
      const r = f.r * (1 - s * .07);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, L, 6, 18), mat);
      m.position.y = L / 2;
      m.scale.z = .92;
      joint.add(m);
      // eklem kıvrımı
      if (s > 0) { const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 16, 12), mat); joint.add(k); }
      const end = new THREE.Group(); end.position.y = L; joint.add(end);
      parent = end;
      if (name === 'index' && s === f.segs.length - 1) { tip = new THREE.Group(); tip.position.y = r * .9; end.add(tip); }
    });
  });

  // başparmak: avucun yanından çapraz çıkar
  const T = P.thumb;
  const tb = new THREE.Group();
  tb.position.set(-1.45, -.55, -.15);
  tb.rotation.set(0, -T.yaw * .6, .95 + T.yaw * .45);
  tb.rotateX(T.roll);
  hand.add(tb);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(.72, 20, 16), mat); mound.scale.set(1, 1.3, .9); mound.position.set(.2, .35, 0); tb.add(mound);
  let tp = tb;
  [1.15, .85].forEach((L, s) => {
    const j = new THREE.Group(); j.position.y = s === 0 ? .55 : 0; j.rotation.x = -T.curl[s]; tp.add(j);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(.5 - s * .04, L, 6, 18), mat); m.position.y = L / 2; m.scale.z = .9; j.add(m);
    const e = new THREE.Group(); e.position.y = L; j.add(e); tp = e;
  });

  // bilek ve manşet
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.34, 1.3, 32), mat); wrist.position.y = -2.1; wrist.scale.z = .7; hand.add(wrist);
  const cuffPts = [[1.36, -2.7], [1.4, -3.2], [1.47, -3.8], [1.5, -4.05]].map(a => new THREE.Vector2(a[0], a[1]));
  const cuff = new THREE.Mesh(new THREE.LatheGeometry(cuffPts, 40), mat); cuff.scale.z = .7; hand.add(cuff);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, .12, 12, 48), mat); rim.rotation.x = Math.PI / 2; rim.position.y = -4.05; rim.scale.y = .7; hand.add(rim);

  // biraz yana dönük, hafif öne eğik dur
  hand.rotation.set(-.32, -.32, .14);
  hand.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: hand, tip };
}

/* ---------- yazarkasa ---------- */
function keyLabel(text, bg, fg, w = 128, h = 112) {
  const c = make(w, h), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${text.length > 2 ? 34 : 54}px "DM Sans", sans-serif`;
  x.fillText(text, w / 2, h / 2 + 3);
  return tex(c);
}
export function cashRegister(accent = '#c4161c') {
  const g = new THREE.Group();
  const shell = phys({ color: 0x24252a, roughness: .42, clearcoat: .35, clearcoatRoughness: .4 });
  const shell2 = phys({ color: 0x31333a, roughness: .5, clearcoat: .2 });
  const accentM = phys({ color: accent, roughness: .35, clearcoat: .6 });
  const steel = std({ color: 0xc8cbd0, metalness: .9, roughness: .3 });

  // çekmece gövdesi
  const base = new THREE.Mesh(new RoundedBoxGeometry(7.2, 1.6, 5.4, 4, .22), shell); base.position.y = .8; g.add(base);
  const drawer = new THREE.Mesh(new RoundedBoxGeometry(6.6, 1.05, .2, 3, .08), shell2); drawer.position.set(0, .78, 2.72); g.add(drawer);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(2.2, .16, .22, 2, .07), steel); handle.position.set(0, .98, 2.86); g.add(handle);
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .12, 20), steel); lock.rotation.x = Math.PI / 2; lock.position.set(2.7, .6, 2.85); g.add(lock);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.25, .1, 5.45), accentM); stripe.position.y = 1.62; g.add(stripe);

  // eğimli tuş takımı gövdesi (yandan kama)
  const prof = new THREE.Shape();
  prof.moveTo(-2.6, 0); prof.lineTo(2.5, 0); prof.lineTo(2.5, .55); prof.lineTo(-1.2, 2.15); prof.lineTo(-2.6, 2.15); prof.closePath();
  const wedgeG = new THREE.ExtrudeGeometry(prof, { depth: 6.8, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3 });
  wedgeG.translate(0, 0, -3.4); wedgeG.rotateY(-Math.PI / 2);
  const wedge = new THREE.Mesh(wedgeG, shell); wedge.position.y = 1.66; g.add(wedge);

  // tuşlar: eğimli yüzeyin üstünde
  const slope = Math.atan2(2.15 - .55, 2.5 + 1.2);
  const pad = new THREE.Group();
  pad.position.set(0, 1.66 + .55 + (2.15 - .55) / 2 + .08, (2.5 - 1.2) / 2);
  pad.rotation.x = -slope;
  g.add(pad);
  const keys = [
    ['7', '8', '9', 'İPT'], ['4', '5', '6', 'KDV'], ['1', '2', '3', 'NKT'], ['0', '00', ',', 'KRT']
  ];
  const keyG = new RoundedBoxGeometry(.78, .26, .62, 3, .1);
  keys.forEach((row, ri) => row.forEach((t, ci) => {
    const fn = ci === 3;
    const bg = fn ? '#55585f' : '#efe9dc', fg = fn ? '#ffffff' : '#222';
    const k = new THREE.Mesh(keyG, phys({ color: bg, roughness: .5, clearcoat: .2 }));
    const x = -2.3 + ci * .98, z = -1.02 + ri * .72;
    k.position.set(x, .12, z); pad.add(k);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(.6, .46), std({ map: keyLabel(t, bg, fg), roughness: .55 }));
    lab.rotation.x = -Math.PI / 2; lab.position.set(x, .255, z); pad.add(lab);
  }));
  // büyük TOPLAM tuşu
  const tk = new THREE.Mesh(new RoundedBoxGeometry(1.5, .28, 1.34, 3, .12), accentM); tk.position.set(2.15, .13, -.66); pad.add(tk);
  const tl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .6), std({ map: keyLabel('TOPLAM', accent, '#fff', 256, 118), roughness: .5 }));
  tl.rotation.x = -Math.PI / 2; tl.position.set(2.15, .275, -.66); pad.add(tl);
  const tk2 = new THREE.Mesh(new RoundedBoxGeometry(1.5, .26, .62, 3, .1), phys({ color: 0x55585f, roughness: .5 })); tk2.position.set(2.15, .12, .66); pad.add(tk2);

  // fiş yazıcısı: arkada, üstte yarık
  const prn = new THREE.Mesh(new RoundedBoxGeometry(3.1, 1.25, 2.1, 4, .2), shell2); prn.position.set(-1.7, 3.95, -1.55); g.add(prn);
  const slotM = std({ color: 0x050505, roughness: .8 });
  const slot = new THREE.Mesh(new THREE.BoxGeometry(2.5, .04, .1), slotM); slot.position.set(-1.7, 4.585, -1.05); g.add(slot);
  const cutter = new THREE.Mesh(new THREE.BoxGeometry(2.6, .05, .06), steel); cutter.position.set(-1.7, 4.6, -.96); g.add(cutter);
  const slotPoint = new THREE.Group(); slotPoint.position.set(-1.7, 4.6, -1.05); g.add(slotPoint);
  const slotEdgeL = new THREE.Group(); slotEdgeL.position.set(-2.95, 4.6, -1.05); g.add(slotEdgeL);
  const slotEdgeR = new THREE.Group(); slotEdgeR.position.set(-.45, 4.6, -1.05); g.add(slotEdgeR);

  // müşteri ekranı
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, 1.6, 16), steel); pole.position.set(1.95, 4.35, -1.9); g.add(pole);
  const dispBox = new THREE.Mesh(new RoundedBoxGeometry(2.9, 1.15, .5, 3, .12), shell); dispBox.position.set(1.95, 5.6, -1.9); dispBox.rotation.x = -.18; g.add(dispBox);
  const dc = make(512, 160);
  const dt = tex(dc);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.55, .8), new THREE.MeshBasicMaterial({ map: dt, toneMapped: false }));
  screen.position.set(1.95, 5.6, -1.64); screen.rotation.x = -.18; g.add(screen);
  const setDisplay = (top, bottom) => {
    const x = dc.getContext('2d');
    x.fillStyle = '#0b1a10'; x.fillRect(0, 0, 512, 160);
    x.fillStyle = '#7dff9c'; x.shadowColor = '#43ff79'; x.shadowBlur = 14;
    x.font = '700 40px "Courier Prime", monospace'; x.textAlign = 'left'; x.fillText(top, 22, 60);
    x.textAlign = 'right'; x.font = '700 58px "Courier Prime", monospace'; x.fillText(bottom, 492, 132);
    dt.needsUpdate = true;
  };
  setDisplay('HYDRO', '');

  // önde marka plakası
  const pc = make(512, 96), px = pc.getContext('2d');
  px.fillStyle = '#1b1c20'; px.fillRect(0, 0, 512, 96);
  px.fillStyle = '#e9e4d8'; px.textAlign = 'center'; px.font = '64px "Bowlby One"'; px.fillText('HYDRO', 256, 72);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .41), std({ map: tex(pc), metalness: .3, roughness: .4 }));
  plate.position.set(-1.9, 1.3, 2.705); g.add(plate);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, slotPoint, slotEdgeL, slotEdgeR, setDisplay };
}

/* ---------- POS cihazı (el terminali) ---------- */
export function posTerminal() {
  const g = new THREE.Group();
  const body = phys({ color: 0x1f2125, roughness: .5, clearcoat: .3, clearcoatRoughness: .45 });
  const body2 = phys({ color: 0x2c2f35, roughness: .55, clearcoat: .2 });
  const glass = phys({ color: 0x07090c, roughness: .08, metalness: .1, clearcoat: 1, clearcoatRoughness: .05 });
  const W = 4.2, H = 8.4, D = 1;

  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, .45), body); g.add(shell);
  // arka tutamak kabarıklığı
  const grip = new THREE.Mesh(new RoundedBoxGeometry(W * .82, H * .55, .7, 5, .3), body2); grip.position.set(0, -1.2, -.5); g.add(grip);
  // yazıcı başlığı: üstte, hafif kalın
  const prn = new THREE.Mesh(new RoundedBoxGeometry(W, 1.7, 1.7, 6, .5), body); prn.position.set(0, H / 2 - .55, -.3); g.add(prn);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(W * .76, .05, .12), std({ color: 0x050505, roughness: .9 })); slot.position.set(0, H / 2 + .3, .1); g.add(slot);
  const cutter = new THREE.Mesh(new THREE.BoxGeometry(W * .8, .06, .05), std({ color: 0xa9adb3, metalness: .9, roughness: .3 })); cutter.position.set(0, H / 2 + .31, .2); g.add(cutter);
  const slotPoint = new THREE.Group(); slotPoint.position.set(0, H / 2 + .32, .1); g.add(slotPoint);
  const slotEdgeL = new THREE.Group(); slotEdgeL.position.set(-W * .38, H / 2 + .32, .1); g.add(slotEdgeL);
  const slotEdgeR = new THREE.Group(); slotEdgeR.position.set(W * .38, H / 2 + .32, .1); g.add(slotEdgeR);

  // ekran: cam yüzey + çerçeve
  const scrY = 1.55, scrW = 3.35, scrH = 2.7;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(scrW + .3, scrH + .3, .06, 3, .1), glass); bezel.position.set(0, scrY, D / 2 + .01); g.add(bezel);
  const corner = (x, y) => { const o = new THREE.Group(); o.position.set(x, y, D / 2 + .05); g.add(o); return o; };
  const tl = corner(-scrW / 2, scrY + scrH / 2), tr = corner(scrW / 2, scrY + scrH / 2);
  const bl = corner(-scrW / 2, scrY - scrH / 2), br = corner(scrW / 2, scrY - scrH / 2);

  // temassız işareti ekranın üstünde
  const cc = make(256, 96), cx = cc.getContext('2d');
  cx.fillStyle = '#1f2125'; cx.fillRect(0, 0, 256, 96);
  cx.strokeStyle = '#d8dce2'; cx.lineWidth = 7; cx.lineCap = 'round';
  [16, 30, 44].forEach(r => { cx.beginPath(); cx.arc(108, 48, r, -0.75, 0.75); cx.stroke(); });
  cx.fillStyle = '#d8dce2'; cx.font = '700 28px "DM Sans", sans-serif'; cx.fillText('HYDRO', 150, 58);
  const nfc = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .64), std({ map: tex(cc), roughness: .6 })); nfc.position.set(0, scrY + scrH / 2 + .52, D / 2 + .01); g.add(nfc);

  // tuş takımı 3x4 + işlev tuşları
  const keyG = new RoundedBoxGeometry(.98, .56, .2, 3, .12);
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
  keys.forEach((row, ri) => row.forEach((t, ci) => {
    const x = -1.18 + ci * 1.18, y = -.62 - ri * .74;
    const k = new THREE.Mesh(keyG, phys({ color: 0x3a3e45, roughness: .45, clearcoat: .3 })); k.position.set(x, y, D / 2 + .06); g.add(k);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.7, .4), std({ map: keyLabel(t, '#3a3e45', '#f2f3f5', 128, 72), roughness: .5 }));
    l.position.set(x, y, D / 2 + .165); g.add(l);
  }));
  [['X', '#c62828'], ['<', '#e0a800'], ['O', '#2e9e4f']].forEach(([t, c], i) => {
    const x = -1.18 + i * 1.18, y = -.62 - 4 * .74 - .05;
    const k = new THREE.Mesh(keyG, phys({ color: c, roughness: .4, clearcoat: .4 })); k.position.set(x, y, D / 2 + .06); g.add(k);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.7, .4), std({ map: keyLabel(t, c, '#ffffff', 128, 72), roughness: .5 }));
    l.position.set(x, y, D / 2 + .165); g.add(l);
  });
  // alt kenarda çipli kart yuvası
  const cs = new THREE.Mesh(new THREE.BoxGeometry(W * .7, .07, .3), std({ color: 0x050505, roughness: .9 })); cs.position.set(0, -H / 2 + .04, .1); g.add(cs);

  g.rotation.x = -.28;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, tl, tr, bl, br, slotPoint, slotEdgeL, slotEdgeR };
}
