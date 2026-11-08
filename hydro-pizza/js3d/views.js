/* Pizza ve burger sahneleri */
import { THREE, Stage, tween, ease, tex, paint, svgToCanvas, shot, shadow, contactShadow, make, rng, fbm, noise, smooth, footprintY, surfaceY, withFinal, sauceStroke, smoothHeights } from './core.js';
import * as F from './food.js';

const $ = id => document.getElementById(id);

function dropObject(obj, y, { delay = 0, from = 5, ms = 560 } = {}) {
  obj.userData.finalY = y;
  obj.position.y = y + from;
  obj.visible = false;
  return tween(ms, t => {
    obj.visible = true;
    obj.position.y = y + from * (1 - t);
  }, { delay, ease: ease.bounce });
}

/* ========== PİZZA ========== */
export function pizzaView() {
  const st = new Stage({ anchor: $('boxwrap'), width: 10.2, tilt: 17, exposure: .95 });
  const A = window.HydroArt, s = st.scene;
  const fc = make(10); A.drawCounter(fc);
  s.add(F.steelFloor(fc));
  const cl = F.cloth(); cl.position.set(11, 0, 5.4); cl.rotation.y = -.25; s.add(cl);

  const kraft = F.kraftMat(), B = 10;
  const box = F.openBox({ w: B, d: B, kraft, inner: F.parchment(B - .2) });
  s.add(contactShadow(B + 2.4, B + 2.4, .6), box);
  // ön dil
  const tab = new THREE.Mesh(new THREE.BoxGeometry(1.8, .05, .5), kraft); tab.position.set(0, .73, B / 2 + .1); box.add(tab);

  const R = 3.95, base = F.pizzaBase(R);
  base.mesh.position.y = .12; s.add(base.mesh);

  const sprites = A.buildSprites();
  const tops = F.buildToppings(sprites);
  const LY = { kasar: .22, mozzarella: .24, pepperoni: .29, mushroom: .33, onion: .36, olive: .37, basil: .41 };
  const groups = {}, root = new THREE.Group(); s.add(root);
  let discs = []; // konmuş parçaların kapladığı alan ve üst yüksekliği (kök grubuna göre)
  Object.keys(LY).forEach(k => { groups[k] = new THREE.Group(); root.add(groups[k]); });

  // içecekler kutunun önünde tezgâhta durur
  const drinks = new THREE.Group(); s.add(drinks);
  // içecekler kutunun sol önünde, tezgahta tam görünen boş alanda dizilir
  const layoutDrinks = () => drinks.children.forEach((d, i) => { d.position.x = -6.5 - (i % 3) * 1.45; d.position.z = 1.8 + Math.floor(i / 3) * 1.55; });

  // kapak
  const art = svgToCanvas($('lid').querySelector('svg'), 1400, 1400);
  const lid = F.hingedLid({ w: B + .1, d: B + .1, artCanvas: art, kraft, depth: .5 });
  lid.position.set(0, .82, -B / 2 - .05);
  s.add(lid);
  const openA = -1.82;

  // fırın ışığı ve buhar
  const glow = new THREE.PointLight(0xff7a1a, 0, 18, 1.6); glow.position.set(0, 3, 0); s.add(glow);
  const sc = make(128), sx = sc.getContext('2d'), gr = sx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
  const steamTex = tex(sc), steams = [];
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData = { off: i / 12, x: (Math.random() - .5) * 5, z: (Math.random() - .5) * 5 };
    s.add(sp); steams.push(sp);
  }
  let baking = 0;
  st.onUpdate((dt, now) => {
    if (glow.intensity > 0 || baking) glow.intensity = baking * (60 + 22 * Math.sin(now * .007));
    steams.forEach(sp => {
      const u = sp.userData, k = (now * .00028 + u.off) % 1;
      sp.position.set(u.x + Math.sin(k * 6 + u.off * 9) * .4, 1 + k * 5.5, u.z);
      sp.scale.setScalar(1.4 + k * 3.2);
      sp.material.opacity = baking * .4 * Math.sin(k * Math.PI);
    });
  });

  const view = {
    stage: st,
    thumb(id) {
      const t = F.metalTray(5, 4);
      const scale = { mozzarella: 1.7, pepperoni: 1.5, mushroom: 1.3, basil: 1.5, olive: .62, onion: 1.3, kasar: 1.6 }[id];
      const n = { mozzarella: 18, pepperoni: 20, mushroom: 20, basil: 18, olive: 44, onion: 20, kasar: 24 }[id];
      t.add(F.heap((v) => tops[id](v), n, 4, 3, { scale, seed: id.length * 5, h: .4 }));
      return shot(t, { w: 340, h: 300, tilt: 40, fill: .62 });
    },
    addLevel(id, level, list) {
      // Her parça, altındaki hamurun ya da daha önce konmuş malzemenin üstüne oturur.
      // Yükseklik, konmuş parçaların kapladığı disklerden okunur (hızlı; ışın atmaya gerek yok).
      // Aynı turda eklenen parçalar birbirini yükseltmez.
      const key = id + '-' + level;
      let zf = 0;
      const placed = list.map(p => {
        const m = tops[id](p.v);
        const sc = p.s / 100 * R * 2;
        m.scale.setScalar(sc);
        m.position.x = (p.x - 50) / 50 * R; m.position.z = (p.y - 50) / 50 * R;
        m.rotation.y = p.rot * Math.PI / 180;
        m.userData.level = level;
        shadow(m);
        groups[id].add(m);
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox, half = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * sc * .5;
        let under = .22, sink = 0;
        for (const d of discs) if (d.key !== key && Math.hypot(d.x - m.position.x, d.z - m.position.z) < (half + d.r) * .72 && d.top > under) { under = d.top; sink = d.sink; }
        const y = under - bb.min.y * sc + .008 + (zf++ % 6) * .004;
        m.position.y = y; m.userData.finalY = y; m.userData.sink = sink;
        // kaşar eriyince üstü alçalır; üstündekiler de onunla birlikte iner
        discs.push({ x: m.position.x, z: m.position.z, r: half, top: y + bb.max.y * sc, key, m, sink: sink + (id === 'kasar' ? bb.max.y * sc * .7 : 0) });
        return [m, y, p];
      });
      placed.forEach(([m, y, p]) => dropObject(m, y, { delay: p.d * 1000, from: 3.4, ms: 480 }));
    },
    removeLevel(id, level) {
      discs = discs.filter(d => d.key !== id + '-' + level);
      [...groups[id].children].filter(m => m.userData.level === level).forEach(m => {
        const s0 = m.scale.x;
        tween(200, t => m.scale.setScalar(s0 * (1 - t))).then(() => groups[id].remove(m));
      });
    },
    clear() { Object.values(groups).forEach(g => g.clear()); discs = []; drinks.clear(); view.bake(false, true); },
    // hamur: ince / normal / kalın. Kalınlık değişince malzemeler de hamurla birlikte iner/kalkar
    setDough(kind) {
      const k = { ince: .5, normal: 1, kalin: 1.75 }[kind] || 1;
      const from = base.mesh.scale.y, fromY = root.position.y;
      tween(450, t => { const s = from + (k - from) * t; base.mesh.scale.y = s; root.position.y = fromY + ((k - 1) * .1 - fromY) * t; }, { ease: ease.out });
    },
    // pişme: az / orta / çok. Çok pişmişte kabuk ve malzemeler koyulaşır
    bake(on, instant, level = 'orta') {
      const mats = [base.mat, ...tops.bakeMats];
      const amt = { az: .5, orta: 1, cok: 1 }[level] ?? 1, dark = level === 'cok' ? .72 : 1;
      const set = t => {
        mats.forEach(m => { m.userData.bake.value = t * amt; if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).multiplyScalar(1 - (1 - dark) * t); });
        tops.tints.forEach(([m, c]) => { if (!m.userData.c1) m.userData.c1 = m.color.clone(); m.color.copy(m.userData.c1).lerp(F.std({ color: c }).color, t * amt).multiplyScalar(1 - (1 - dark) * t); });
        const melt = t * amt;
        groups.mozzarella.children.forEach(m => { const b = m.userData.base || (m.userData.base = m.scale.x); m.scale.set(b * (1 + .2 * melt), b * (1 - .35 * melt), b * (1 + .2 * melt)); });
        groups.kasar.children.forEach(m => {
          const b = m.userData.base || (m.userData.base = m.scale.x);
          m.scale.set(b * (1 + .1 * melt), b * (1 - .8 * melt), b * (1 + .1 * melt));
          const pool = m.children.find(c => c.userData.melt);
          if (pool) {
            // göl kenardaki kabuğu geçmesin: parçanın merkeze uzaklığına göre en fazla ne kadar yayılabileceği
            const room = R * .84 - Math.hypot(m.position.x, m.position.z), mx = Math.max(.15, Math.min(1.15, room / (.62 * b * 1.1)));
            const k = .15 + (mx - .15) * melt;
            pool.visible = melt > .03; pool.scale.set(k, 1 / (1 - .8 * melt), k);
          }
        });
        Object.values(groups).forEach(g => g.children.forEach(m => { if (m.userData.finalY != null && m.userData.sink) m.position.y = m.userData.finalY - m.userData.sink * melt; }));
      };
      if (!on) { baking = 0; glow.intensity = 0; set(0); return; }
      if (instant) { set(1); return; }
      tween(500, t => { baking = t; });
      return tween(4400, set, { ease: t => t * t * (3 - 2 * t) });
    },
    setLid(open, instant) {
      const from = lid.rotation.x, to = open ? openA : 0;
      if (instant) { lid.rotation.x = to; root.visible = base.mesh.visible = open; return; }
      root.visible = base.mesh.visible = true;
      return tween(1000, t => { lid.rotation.x = from + (to - from) * t; if (!open && t > .45) root.visible = base.mesh.visible = false; }, { ease: ease.inOut });
    },
    drinkThumb(id) { return shot(F.drink(id), { w: 200, h: 300, tilt: 70, fill: .62 }); },
    addDrink(id) {
      const d = F.drink(id); d.scale.setScalar(.95);
      drinks.add(d); layoutDrinks();
      dropObject(d, 0, { from: 4, ms: 520 });
      return d;
    },
    removeDrink(d) { drinks.remove(d); layoutDrinks(); },
    stopOven() { tween(400, t => { baking = 1 - t; }).then(() => { glow.intensity = 0; }); }
  };
  return view;
}

/* ========== BURGER ========== */
export function burgerView() {
  const st = new Stage({ anchor: $('bBox'), width: 10.4, tilt: 40, exposure: .95 });
  const s = st.scene, BA = window.HydroBurgerArt;
  const fc = make(10); BA.drawCounter(fc);
  s.add(F.steelFloor(fc, { rough: .5, metal: .3, tint: 0xd8d2c8 }));
  const warm = new THREE.PointLight(0xffb26b, 90, 40, 1.5); warm.position.set(-12, 7, 3); s.add(warm);

  const W = 10, D = 6.4, H = 1;
  const yel = F.kraftMat('#f7c52b');
  const paperC = make(1024, 1024);
  (() => {
    const x = paperC.getContext('2d');
    x.fillStyle = '#fbf7ec'; x.fillRect(0, 0, 1024, 1024);
    x.translate(512, 512); x.rotate(-.35); x.translate(-1024, -1024);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 12; i++) {
      const px = i * 210 + (j % 2) * 105, py = j * 160;
      x.fillStyle = '#2529b4'; x.font = '40px "Bowlby One"'; x.fillText('HYDRO', px, py);
      x.strokeStyle = '#d9201f'; x.lineWidth = 4; x.beginPath(); x.moveTo(px + 44, py + 62); x.quadraticCurveTo(px + 72, py + 22, px + 100, py + 62); x.closePath(); x.stroke();
      x.beginPath(); x.moveTo(px + 44, py + 74); x.lineTo(px + 100, py + 74); x.stroke();
    }
  })();
  const paperM = F.std({ map: tex(paperC), roughness: .85 });
  const pg = (w, d) => { const g = new THREE.PlaneGeometry(w, d, 30, 20); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, (fbm(p.getX(i) * .6 + 3, p.getZ(i) * .6, 3) - .5) * .07); g.computeVertexNormals(); return g; };
  const box = F.openBox({ w: W, d: D, h: H, kraft: yel });
  const div = new THREE.Mesh(new THREE.BoxGeometry(.14, H, D - .2), yel); div.position.set(.1, H / 2, 0); box.add(div);
  [[-2.4, 4.6], [2.55, 4.5]].forEach(a => { const m = new THREE.Mesh(pg(a[1], D - .3), paperM); m.position.set(a[0], .13, 0); m.receiveShadow = true; box.add(m); });
  shadow(box); s.add(contactShadow(W + 2.2, D + 2.2, .65), box);

  // kapak baskısı
  const sym = document.getElementById('bBoxArt');
  const art = svgToCanvas(sym, 1400, 896, '#2529b4', '#f7c52b');
  const lid = F.hingedLid({ w: W + .1, d: D + .1, artCanvas: art, kraft: yel, depth: .7 });
  lid.position.set(0, H + .1, -D / 2 - .05);
  s.add(lid);
  const openA = -2.45;

  const parts = F.burgerParts();
  const stack = new THREE.Group(); stack.position.set(-2.4, .14, .08); s.add(stack);
  const cups = new THREE.Group(); cups.position.set(2.55, .13, .05); s.add(cups);
  let top = null;
  const entries = [];
  const bdrinks = new THREE.Group(); s.add(bdrinks);
  // kat oturtma: altındaki katların gerçek yüzeyine bakılır, böylece köftenin pürüzü,
  // sarkan peynir ve kıvrık marul bir sonraki katın içine girmez
  const CLEAR = { bun: 0, chicken: .02, patty: .02, cheddar: .025, lettuce: .085, tomato: .045, pickles: .03, onion: .045, top: -.04, sauce: .05 };
  const REACH = { bun: 1.2, chicken: 1.35, patty: 1.35, cheddar: 1.2, lettuce: 1.3, tomato: 1.3, pickles: 1.15, onion: 1.3, top: 1.25, sauce: 1 };
  function seatY(id, below) {
    if (!below.length) return 0;
    const sx = stack.position.x, sz = stack.position.z, rr = REACH[id] || 1.2;
    const y = footprintY(below, sx, sz, rr);
    return y === -Infinity ? 0 : y - stack.position.y;
  }
  const _bb = new THREE.Box3();
  function bottomOffset(obj, id) {
    if (id === 'cheddar' || id === 'lettuce' || id === 'top') return 0;
    obj.position.y = 0; obj.updateMatrixWorld(true);
    _bb.setFromObject(obj);
    return -(_bb.min.y - stack.position.y);
  }
  const heightOf = () => withFinal(stack, () => seatY('sauce', entries.map(e => e.obj)));

  function relayoutCups() {
    const n = cups.children.length, pos = n === 1 ? [[0, .2]] : n === 2 ? [[-.95, .2], [.95, .2]] : [[-1.05, .85], [1.05, .85], [0, -.95]];
    cups.children.forEach((c, i) => { c.position.x = pos[i][0]; c.position.z = pos[i][1]; });
  }
  function restack() {
    const finals = new Map();
    withFinal(stack, () => {
      const placed = [];
      entries.forEach(e => {
        if (e.kind === 'sauce') {
          const now = seatY('sauce', placed);
          finals.set(e.obj, now - e.at);
          e.obj.position.y = now - e.at;
        } else {
          const y = seatY(e.id, placed) + bottomOffset(e.obj, e.id) + CLEAR[e.id];
          finals.set(e.obj, y); e.obj.position.y = y;
        }
        e.obj.userData.finalY = finals.get(e.obj);
        e.obj.updateMatrixWorld(true);
        placed.push(e.obj);
      });
      if (top) { const y = seatY('top', placed) + CLEAR.top; finals.set(top, y); top.userData.finalY = y; }
    });
    finals.forEach((y, o) => { o.position.y = y; });
  }

  const SAUCE = {
    house: { c: 0xe6a50f, body: 0xe0a51c, cap: 0xd6960f },
    ketchup: { c: 0xb5161a, body: 0xb5121a, cap: 0xc9161e },
    mayo: { c: 0xf6efd6, body: 0xefe6cb, cap: 0x2529b4 }
  };
  const bottles = {};
  const labelC = F.bottleLabel();
  Object.keys(SAUCE).forEach(k => { const b = F.bottle(SAUCE[k].body, SAUCE[k].cap, labelC); b.scale.setScalar(.72); bottles[k] = b; });

  const view = {
    stage: st,
    tubThumb(id) {
      const t = F.clearTub(5, 3.6);
      const n = { bun: 7, patty: 9, chicken: 10, tomato: 10, cheddar: 16, lettuce: 12, pickles: 24, onion: 8 }[id];
      const scale = { tomato: .8, pickles: .75, onion: .75, cheddar: .9, lettuce: 1, bun: 1, patty: 1, chicken: 1 }[id];
      t.add(F.heap(parts.parts[id], n, 3.6, 2.4, { scale, seed: id.length * 3 + 1, h: .35, flat: .5 }));
      return shot(t, { w: 340, h: 260, tilt: 48, fill: .6 });
    },
    bottleThumb(id) { const b = F.bottle(SAUCE[id].body, SAUCE[id].cap, labelC); return shot(b, { w: 170, h: 400, tilt: 80, fill: .5, yaw: .25 }); },
    cupThumb(id) { return shot(F.sideCup(id), { w: 260, h: 340, tilt: 66, fill: .62, yaw: .1 }); },
    addLayer(id) {
      const L = parts.layers[id], obj = L.make();
      const e = { obj, id, h: L.h, kind: 'layer' };
      stack.add(obj);
      const y = withFinal(stack, () => seatY(id, entries.map(x => x.obj)) + bottomOffset(obj, id) + CLEAR[id]);
      entries.push(e);
      dropObject(obj, y, { from: 5.5, ms: 620 });
      return e;
    },
    squeeze(id) {
      const S = SAUCE[id], RAD = 1.3;
      const flat = sauceStroke(Math.random, (x, z) => x * x + z * z < RAD * RAD, { span: RAD });
      const pts = withFinal(stack, () => flat.map(([x, z]) => {
        const w = surfaceY([stack], stack.position.x + x, stack.position.z + z);
        return [x, (w === -Infinity ? heightOf() : w - stack.position.y) + .05, z];
      }));
      const tube = F.sauceTube(pts.length > 3 ? smoothHeights(pts) : [[-.5, heightOf() + .05, 0], [0, heightOf() + .05, .2], [.5, heightOf() + .05, 0], [.6, heightOf() + .05, -.3]], S.c, .07 + Math.random() * .03);
      stack.add(tube);
      const e = { obj: tube, h: .05, kind: 'sauce', lock: true, at: heightOf() };
      entries.push(e);
      tube.position.y = 0;
      // şişe animasyonu
      const b = bottles[id];
      s.add(b);
      const tip = new THREE.Vector3(0, 4.05 * .72, 0), rot = new THREE.Euler(0, 0, 2.55);
      const worldTip = (t) => tube.curve.getPoint(t).add(stack.position).add(new THREE.Vector3(0, .25, 0));
      const place = (t) => { const w = worldTip(t), r = tip.clone().applyEuler(rot); b.position.copy(w).sub(r); };
      const home = new THREE.Vector3(({ house: -3, ketchup: 0, mayo: 3 })[id], 14, -6);
      b.rotation.set(0, 0, 0);
      place(0);
      const target = b.position.clone();
      (async () => {
        await tween(420, t => { b.position.lerpVectors(home, target, t); b.rotation.z = rot.z * t; });
        await tween(1000, t => { place(t); tube.setProgress(t); b.scale.setScalar(.72 * (1 - .03 * Math.sin(t * 40))); }, { ease: ease.linear });
        const p0 = b.position.clone();
        await tween(360, t => { b.position.lerpVectors(p0, home, t); b.rotation.z = rot.z * (1 - t); });
        s.remove(b);
      })();
      return e;
    },
    drinkThumb(id) { return shot(F.drink(id), { w: 200, h: 300, tilt: 70, fill: .62 }); },
    addDrink(id) {
      const d = F.drink(id); d.scale.setScalar(.85);
      bdrinks.add(d);
      bdrinks.children.forEach((c, i) => { c.position.set(1.2 + (i % 5) * 1.25, 0, 4.4 + Math.floor(i / 5) * 1.3); });
      dropObject(d, 0, { from: 4, ms: 520 });
      return { obj: d, kind: 'drink' };
    },
    addCup(id) {
      const c = F.sideCup(id); c.scale.setScalar(.66);
      cups.add(c); relayoutCups();
      const e = { obj: c, kind: 'cup' };
      dropObject(c, 0, { from: 4, ms: 520 });
      return e;
    },
    remove(e) {
      if (e.kind === 'cup') { cups.remove(e.obj); relayoutCups(); return; }
      if (e.kind === 'drink') { bdrinks.remove(e.obj); bdrinks.children.forEach((c, i) => { c.position.set(1.2 + (i % 5) * 1.25, 0, 4.4 + Math.floor(i / 5) * 1.3); }); return; }
      const i = entries.indexOf(e); if (i >= 0) entries.splice(i, 1);
      stack.remove(e.obj);
      restack();
    },
    topOn() { const y = withFinal(stack, () => seatY('top', entries.map(e => e.obj))) + CLEAR.top; top = parts.topBun(); stack.add(top); dropObject(top, y, { from: 6, ms: 700 }); },
    topOff() { if (top) { stack.remove(top); top = null; } },
    clear() { entries.length = 0; stack.clear(); cups.clear(); bdrinks.clear(); top = null; },
    setLid(open, instant) {
      const from = lid.rotation.x, to = open ? openA : 0;
      if (instant) { lid.rotation.x = to; stack.visible = cups.visible = open; return; }
      stack.visible = cups.visible = true;
      return tween(950, t => { lid.rotation.x = from + (to - from) * t; if (!open && t > .55) stack.visible = cups.visible = false; }, { ease: ease.inOut });
    }
  };
  return view;
}
