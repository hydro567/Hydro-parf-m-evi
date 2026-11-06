/* ==========================================================
   Hydro Parfüm — her kokunun kendi şişe formu
   Aqua     : denizde yuvarlanmış damla, dalga kabartması, deniz taşı kapak
   Seyf     : Osmanlı köşkü sekizgeni, soğan kemerli omuz, tombak kubbe kapak
   Marjinal : kalın camlı dik dikdörtgen gövde, geçişli sıvı, mat siyah-metal blok kapak
   Vento    : kalın camlı dik dikdörtgen gövde, gümüş boyun, koyu tok blok kapak
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const TAU = Math.PI * 2;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* [v, değer] noktalarından yumuşak eğri (Hermite) */
  function curve(pts) {
    const n = pts.length;
    const slope = (i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      return (b[1] - a[1]) / (b[0] - a[0]);
    };
    return function (v) {
      if (v <= pts[0][0]) return pts[0][1];
      if (v >= pts[n - 1][0]) return pts[n - 1][1];
      let i = 0;
      while (v > pts[i + 1][0]) i++;
      const a = pts[i], b = pts[i + 1], h = b[0] - a[0], t = (v - a[0]) / h;
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * slope(i) +
        (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * slope(i + 1);
    };
  }

  /* Kesit yardımcıları: açıya göre yarıçap */
  function superXZ(a, w, d, n) {
    const c = Math.cos(a), s = Math.sin(a);
    const r = Math.pow(Math.pow(Math.abs(c / w), n) + Math.pow(Math.abs(s / d), n), -1 / n);
    return [c * r, s * r];
  }
  /* Köşeleri pahlı dikdörtgen = uzatılmış sekizgen; p büyüdükçe kenar keskinleşir */
  function octagonR(a, w, d, k, p) {
    const c = Math.cos(a), s = Math.sin(a);
    const hyp = Math.hypot(d, w);
    const nx = d / hyp, nz = w / hyp, dd = k * 2 * w * d / hyp;
    const acx = Math.abs(c), acz = Math.abs(s);
    const sum = Math.pow(acx / w, p) + Math.pow(acz / d, p) + Math.pow((acx * nx + acz * nz) / dd, p);
    return Math.pow(sum, -1 / p);
  }

  /* ---------- Etiket ---------- */
  function spaced(x, text, cx, y, spacing) {
    if ('letterSpacing' in x) {
      x.letterSpacing = spacing + 'px';
      x.fillText(text, cx + spacing / 2, y);
      x.letterSpacing = '0px';
    } else x.fillText(text, cx, y);
  }

  function logo(x, cx, top, w, h, gold) {
    const img = F.hydroLogoImage;
    if (img && img.complete && img.naturalWidth) x.drawImage(img, cx - w / 2, top, w, h);
    else if (F.drawMonogram) F.drawMonogram(x, cx, top + h * 0.5, w * 0.9, gold);
  }

  function star8(x, cx, cy, r) {
    x.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU - Math.PI / 2;
      const q = i % 2 ? r * 0.62 : r;
      if (i) x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
      else x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
    }
    x.closePath();
  }

  function arch(x, W, H, m, yS) {
    const ax = W / 2, ay = m * 0.72;
    x.beginPath();
    x.moveTo(m, H - m);
    x.lineTo(m, yS);
    x.bezierCurveTo(m, yS - H * 0.13, ax - W * 0.07, ay + H * 0.1, ax, ay);
    x.bezierCurveTo(ax + W * 0.07, ay + H * 0.1, W - m, yS - H * 0.13, W - m, yS);
    x.lineTo(W - m, H - m);
    x.closePath();
  }

  function stack(x, p, W, y) {
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    const ink = '#f6ecdc';
    x.fillStyle = 'rgba(246,236,222,0.92)';
    x.font = '600 ' + y.hydroSize + 'px Inter, sans-serif';
    spaced(x, 'HYDRO', W / 2, y.hydro, y.hydroSize * 0.36);
    x.fillStyle = ink;
    x.font = '400 ' + y.nameSize + 'px Newsreader, Georgia, serif';
    x.fillText(p.name, W / 2, y.name);
    x.fillStyle = 'rgba(246,236,222,0.68)';
    x.font = '500 ' + y.smallSize + 'px Inter, sans-serif';
    spaced(x, 'No. ' + p.no, W / 2, y.no, 4);
    x.fillStyle = 'rgba(246,236,222,0.88)';
    x.font = 'italic 400 ' + (y.smallSize * 1.5) + 'px Newsreader, Georgia, serif';
    x.fillText('Eau de Parfum', W / 2, y.edp);
    x.fillStyle = 'rgba(246,236,222,0.58)';
    x.font = '500 ' + (y.smallSize * 0.82) + 'px Inter, sans-serif';
    spaced(x, '50 ML', W / 2, y.ml, 5);
  }

  const LABELS = {
    /* Soğan kemer çerçeve, kılıç ayırıcı, sekiz köşeli yıldız kuşağı: altın yaldız baskı */
    seyf(x, p, W, H) {
      const gold = x.createLinearGradient(0, 0, W, 0);
      gold.addColorStop(0, '#b4803a'); gold.addColorStop(0.5, '#f7dfa2'); gold.addColorStop(1, '#b4803a');
      x.strokeStyle = gold; x.fillStyle = gold;
      x.lineWidth = 3.4;
      arch(x, W, H, 22, H * 0.33); x.stroke();
      x.lineWidth = 1.2;
      arch(x, W, H, 34, H * 0.34); x.stroke();
      star8(x, W / 2, H * 0.135, 13); x.fill();
      // alt kuşak
      const yb = H - 62;
      x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(34, yb - 18); x.lineTo(W - 34, yb - 18); x.stroke();
      for (let i = 0; i < 11; i++) {
        star8(x, 62 + (i / 10) * (W - 124), yb + 5, 9); x.stroke();
      }
      logo(x, W / 2, H * 0.285, 86, 102, gold);
      const nm = H * 0.645;
      stack(x, p, W, { hydro: H * 0.255, hydroSize: 22, name: nm, nameSize: 88, no: H * 0.755, edp: H * 0.81, ml: H * 0.855, smallSize: 17 });
      // kılıç ayırıcı: ince, hafif kavisli pala
      x.strokeStyle = gold; x.fillStyle = gold;
      const by = H * 0.695, cx = W / 2;
      x.beginPath();
      x.moveTo(cx - 118, by + 5);
      x.quadraticCurveTo(cx - 10, by - 11, cx + 112, by - 6);
      x.quadraticCurveTo(cx - 6, by - 3, cx - 114, by + 8);
      x.closePath(); x.fill();
      x.lineWidth = 3;
      x.beginPath(); x.moveTo(cx - 100, by - 7); x.lineTo(cx - 92, by + 12); x.stroke();
    },
    /* Dalga çizgileri, gümüş baskı */
    aqua(x, p, W, H) {
      const silver = 'rgba(214,246,246,0.85)';
      logo(x, W / 2, H * 0.16, 84, 100, silver);
      stack(x, p, W, { hydro: H * 0.11, hydroSize: 23, name: H * 0.6, nameSize: 92, no: H * 0.8, edp: H * 0.875, ml: H * 0.94, smallSize: 18 });
      x.strokeStyle = silver;
      for (let k = 0; k < 3; k++) {
        x.lineWidth = 1.8 - k * 0.4;
        x.globalAlpha = 0.9 - k * 0.22;
        x.beginPath();
        for (let i = 0; i <= 70; i++) {
          const q = i / 70, px = W * 0.14 + q * W * 0.72;
          const py = H * (0.665 + k * 0.03) + Math.sin(q * TAU * 2.5 + k * 0.8) * 6 * Math.sin(q * Math.PI);
          if (i) x.lineTo(px, py); else x.moveTo(px, py);
        }
        x.stroke();
      }
      x.globalAlpha = 1;
    },
    /* Sert dikdörtgen çerçeve, metalik baskı, süs yok */
    marjinal(x, p, W, H) {
      const steel = 'rgba(232,224,230,0.9)';
      x.strokeStyle = steel; x.fillStyle = steel;
      x.lineWidth = 2.6;
      x.strokeRect(18, 18, W - 36, H - 36);
      x.fillRect(W / 2 - 62, H * 0.648, 124, 3);
      logo(x, W / 2, H * 0.17, 84, 100, steel);
      stack(x, p, W, { hydro: H * 0.125, hydroSize: 21, name: H * 0.61, nameSize: 86, no: H * 0.725, edp: H * 0.8, ml: H * 0.875, smallSize: 18 });
    },
    /* Yalın baskı: çerçevesiz, yazı gövdenin alt yarısında */
    vento(x, p, W, H) {
      logo(x, W / 2, H * 0.44, 66, 78, 'rgba(226,236,226,0.92)');
      stack(x, p, W, { hydro: H * 0.415, hydroSize: 20, name: H * 0.66, nameSize: 104, no: H * 0.735, edp: H * 0.8, ml: H * 0.865, smallSize: 21 });
    }
  };

  F.drawLabel = function (p, aspect) {
    const W = 640, H = Math.round(W / (aspect || 0.83));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    (LABELS[p.id] || LABELS.aqua)(c.getContext('2d'), p, W, H);
    return c;
  };

  /* Seyf omuz kuşağı: sekiz köşeli yıldız zinciri (tekrar eden doku) */
  function beltCanvas() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 64;
    const x = c.getContext('2d');
    x.strokeStyle = '#fff'; x.fillStyle = '#fff';
    x.fillRect(0, 2, 1024, 3); x.fillRect(0, 59, 1024, 3);
    const n = 12, s = 1024 / n;
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * s;
      x.lineWidth = 3;
      star8(x, cx, 32, 21); x.stroke();
      star8(x, cx, 32, 7); x.fill();
      x.beginPath(); x.arc(cx + s / 2, 32, 4.2, 0, TAU); x.fill();
    }
    return c;
  }

  /* ---------- Form tanımları ---------- */
  const FORMS = {
    aqua: (function () {
      const w = curve([[0, 0.5], [0.07, 0.63], [0.28, 0.69], [0.55, 0.56], [0.8, 0.32], [1, 0.175]]);
      return {
        H: 1.66, fill: 0.8, base: 0.1, wall: 0.065, filletB: 0.09, filletT: 0.015,
        neck: 0.18, shadow: [1.08, 1.0], metal: { color: 0xe3edf0, roughness: 0.1 },
        label: { w: 0.66, h: 0.76, cy: 0.43 },
        button: { pts: [[0, 0.145], [0.45, 0.15], [0.8, 0.125], [1, 0.05]], flutes: 0 },
        section(v, a) {
          const W = w(v), d = W * lerp(0.56, 1, smooth(0.78, 1, v));
          const q = superXZ(a, W, d, 2.2);
          // Alttaki dalga kabartması: su halkaları gibi cam yüzeyinde dolaşır
          const band = smooth(0.015, 0.07, v) * (1 - smooth(0.13, 0.22, v)) + 0.55 * smooth(0.67, 0.72, v) * (1 - smooth(0.82, 0.9, v));
          const rip = 1 + 0.018 * band * Math.sin(v * 58 + Math.cos(a) * 3.2);
          return [q[0] * rip + 0.05 * Math.sin(v * TAU) * (1 - v), q[1] * rip];
        }
      };
    })(),
    seyf: (function () {
      const w = curve([[0, 0.585], [0.03, 0.615], [0.055, 0.585], [0.6, 0.615], [0.67, 0.585], [0.78, 0.37], [0.9, 0.2], [1, 0.165]]);
      return {
        H: 1.6, fill: 0.76, base: 0.1, wall: 0.068, filletB: 0.025, filletT: 0.01,
        neck: 0.165, shadow: [1.0, 1.05], metal: { color: 0xcf9f58, roughness: 0.22 },
        label: { w: 0.68, h: 0.76, cy: 0.35 },
        band: { v0: 0.585, v1: 0.625, repeat: 3 },
        button: { pts: [[0, 0.15], [0.6, 0.155], [0.82, 0.14], [1, 0.11]], flutes: 16 },
        section(v, a) {
          const W = w(v), d = W * lerp(0.6, 1, smooth(0.66, 0.93, v));
          const r = octagonR(a, W, d, 0.86, 34);
          const rc = Math.hypot(Math.cos(a) * d, Math.sin(a) * W);
          const circle = (W * d) / Math.max(rc, 1e-4);
          const m = lerp(r, circle, smooth(0.84, 0.97, v));
          return [Math.cos(a) * m, Math.sin(a) * m];
        }
      };
    })(),
    marjinal: (function () {
      // Vento ile aynı kalın camlı dikdörtgen gövde; kapak, metal ve etiket Marjinal'in
      const w = curve([[0, 0.52], [0.9, 0.52], [0.945, 0.49], [0.98, 0.26], [1, 0.15]]);
      return {
        liqGrad: 1,
        H: 1.5, fill: 0.86, base: 0.17, wall: 0.08, filletB: 0.03, filletT: 0.01,
        neck: 0.15, shadow: [0.88, 0.82], metal: { color: 0x77767c, roughness: 0.3 },
        label: { w: 0.62, h: 0.88, cy: 0.47 },
        button: { pts: [[0, 0.14], [0.8, 0.142], [1, 0.125]], flutes: 0 },
        section(v, a) {
          const W = w(v), d = W * lerp(0.54, 1, smooth(0.93, 1, v));
          const r = octagonR(a, W, d, 0.965, 18);
          const rc = Math.hypot(Math.cos(a) * d, Math.sin(a) * W);
          const m = lerp(r, (W * d) / Math.max(rc, 1e-4), smooth(0.95, 1, v));
          return [Math.cos(a) * m, Math.sin(a) * m];
        }
      };
    })(),
    vento: (function () {
      // Dik, sade dikdörtgen: düz yanlar, yumuşak köşeler, kısa ve dolgun omuz
      const w = curve([[0, 0.52], [0.9, 0.52], [0.945, 0.49], [0.98, 0.26], [1, 0.15]]);
      return {
        liqGrad: 1,
        H: 1.5, fill: 0.86, base: 0.17, wall: 0.08, filletB: 0.03, filletT: 0.01,
        neck: 0.15, shadow: [0.88, 0.82], metal: { color: 0xd9dcde, roughness: 0.18 },
        label: { w: 0.62, h: 0.88, cy: 0.47 },
        button: { pts: [[0, 0.14], [0.8, 0.142], [1, 0.125]], flutes: 0 },
        section(v, a) {
          const W = w(v), d = W * lerp(0.54, 1, smooth(0.93, 1, v));
          const r = octagonR(a, W, d, 0.965, 18);
          const rc = Math.hypot(Math.cos(a) * d, Math.sin(a) * W);
          const m = lerp(r, (W * d) / Math.max(rc, 1e-4), smooth(0.95, 1, v));
          return [Math.cos(a) * m, Math.sin(a) * m];
        }
      };
    })()
  };

  /* ---------- Yapıcı ---------- */
  F.buildBottleForms = function (THREE, ctx) {
    /* Kesit fonksiyonundan kapalı (ya da açık kuşak) gövde üretir.
       section(v, a) → [x, z], v = y / H. inset: yüzeyi merkeze doğru içeri alır. */
    function loft(H, section, o) {
      o = o || {};
      const seg = o.seg || 128, y0 = o.y0 || 0, y1 = o.y1 === undefined ? H : o.y1;
      const rb = o.filletB || 0, rt = o.filletT || 0, wall = o.wall || 0;
      let ys = o.ys;
      if (!ys) {
        ys = [];
        const nf = rb > 0 ? 6 : 0, nt = rt > 0 ? 6 : 0;
        for (let i = 0; i < nf; i++) ys.push(y0 + rb * (1 - Math.cos((i / nf) * Math.PI / 2)));
        const n = o.rings || 64;
        for (let i = 0; i <= n; i++) ys.push(lerp(y0 + rb, y1 - rt, i / n));
        for (let i = 1; i <= nt; i++) ys.push(y1 - rt + rt * Math.sin((i / nt) * Math.PI / 2));
      }
      const ring = (y) => {
        let inset = wall;
        if (rb > 0 && y < y0 + rb) { const q = (y0 + rb - y) / rb; inset += rb * (1 - Math.sqrt(Math.max(0, 1 - q * q))); }
        if (rt > 0 && y > y1 - rt) { const q = (y - y1 + rt) / rt; inset += rt * (1 - Math.sqrt(Math.max(0, 1 - q * q))); }
        return inset;
      };
      const open = !!o.open;
      const cols = open ? seg + 1 : seg;
      const pos = [], uvs = [], idx = [];
      const rows = [];
      ys.forEach((y) => rows.push({ y, inset: ring(y), s: 1 }));
      const capN = o.capRings || 0;
      if (!open) for (let k = 1; k <= capN; k++) rows.push({ y: y1, inset: ring(y1), s: 1 - k / (capN + 1) });

      rows.forEach((row, ri) => {
        const v = clamp01(row.y / H);
        const pts = [];
        let cx = 0, cz = 0;
        for (let j = 0; j < seg; j++) {
          const q = section(v, (j / seg) * TAU);
          pts.push(q); cx += q[0]; cz += q[1];
        }
        cx /= seg; cz /= seg;
        let along = 0, per = 0;
        for (let j = 0; j < seg; j++) {
          const a = pts[j], b = pts[(j + 1) % seg];
          per += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        for (let j = 0; j < cols; j++) {
          const q = pts[j % seg];
          const dx = q[0] - cx, dz = q[1] - cz, d = Math.hypot(dx, dz) || 1;
          const f = (Math.max(d - row.inset, 0.004) / d) * row.s;
          pos.push(cx + dx * f, row.y, cz + dz * f);
          uvs.push(along / per, ri / Math.max(1, rows.length - 1));
          const nx = pts[(j + 1) % seg];
          along += Math.hypot(nx[0] - q[0], nx[1] - q[1]);
        }
      });
      const R = rows.length;
      for (let i = 0; i < R - 1; i++) {
        for (let j = 0; j < seg; j++) {
          const j1 = open ? j + 1 : (j + 1) % seg;
          const a = i * cols + j, b = i * cols + j1, c = (i + 1) * cols + j, d = (i + 1) * cols + j1;
          idx.push(a, c, b, b, c, d);
        }
      }
      if (!open) {
        const center = (row, base) => {
          let cx = 0, cz = 0;
          for (let j = 0; j < seg; j++) { cx += pos[(base + j) * 3]; cz += pos[(base + j) * 3 + 2]; }
          pos.push(cx / seg, row.y, cz / seg); uvs.push(0.5, 0.5);
          return pos.length / 3 - 1;
        };
        const cb = center(rows[0], 0);
        for (let j = 0; j < seg; j++) idx.push(cb, j, (j + 1) % seg);
        const base = (R - 1) * cols;
        const ct = center(rows[R - 1], base);
        for (let j = 0; j < seg; j++) idx.push(ct, base + (j + 1) % seg, base + j);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    /* Yuvarlak (dilimli olabilir) profil gövdesi: kapak ve başlıklarda */
    function turned(height, pts, flutes, amp) {
      const r = curve(pts);
      const ys = [];
      const n = 44;
      for (let i = 0; i <= n; i++) ys.push((i / n) * height);
      return loft(height, (v, a) => {
        const f = flutes ? 1 + (amp || 0.04) * (Math.pow(Math.abs(Math.cos(a * flutes / 2)), 0.7) - 0.5) * smooth(0.02, 0.12, v) * (1 - smooth(0.9, 1, v)) : 1;
        const R = r(v) * f;
        return [Math.cos(a) * R, Math.sin(a) * R];
      }, { ys, seg: flutes ? 96 : 64 });
    }

    /* Kesitin ön yüzündeki z değeri: etiketi cama oturtmak için */
    function frontZ(form, x, y) {
      const v = clamp01(y / form.H);
      let prev = form.section(v, 0.001);
      for (let i = 1; i <= 128; i++) {
        const q = form.section(v, (i / 128) * Math.PI);
        if ((prev[0] - x) * (q[0] - x) <= 0) {
          const t = (x - prev[0]) / ((q[0] - prev[0]) || 1e-6);
          return lerp(prev[1], q[1], t);
        }
        prev = q;
      }
      return form.section(v, Math.PI / 2)[1];
    }

    const capMats = {
      aqua: new THREE.MeshStandardMaterial({ color: 0x0c4a55, metalness: 0, roughness: 0.38, envMapIntensity: 1.35 }),
      seyf: new THREE.MeshStandardMaterial({ color: 0x57301a, metalness: 0.92, roughness: 0.34, envMapIntensity: 1.9 }),
      marjinal: new THREE.MeshStandardMaterial({ color: 0x17141a, metalness: 0.55, roughness: 0.42, envMapIntensity: 1.3 }),
      vento: new THREE.MeshStandardMaterial({ color: 0x0c1f18, metalness: 0.6, roughness: 0.34, envMapIntensity: 1.5 })
    };

    const buildCap = {
      /* Denizde aşınmış, tam simetrik olmayan taş */
      aqua(metal) {
        const g = new THREE.Group();
        const H = 0.46, ys = [];
        for (let i = 0; i <= 40; i++) ys.push(((1 - Math.cos((i / 40) * Math.PI)) / 2) * H);
        const peb = new THREE.Mesh(loft(H, (v, a) => {
          const prof = Math.pow(Math.max(0, 1 - Math.pow(2 * v - 1, 2)), 0.52);
          const wob = 1 + 0.05 * Math.sin(a * 2 + 0.7) + 0.022 * Math.sin(a * 3 + v * 4);
          const r = Math.max(prof, 0.012) * wob;
          return [Math.cos(a) * 0.33 * r + 0.015 * (v - 0.5), Math.sin(a) * 0.26 * r];
        }, { ys, seg: 72 }), capMats.aqua);
        g.add(peb);
        return g;
      },
      /* Kurşun kaplı kubbe izi: yivli, koyu tombak; altın halka ve küçük alem */
      seyf(metal) {
        const g = new THREE.Group();
        const dome = new THREE.Mesh(turned(0.56, [
          [0, 0.2], [0.14, 0.205], [0.22, 0.19], [0.36, 0.235], [0.5, 0.265], [0.66, 0.225], [0.82, 0.105], [0.94, 0.03], [1, 0.012]
        ], 16, 0.075), capMats.seyf);
        g.add(dome);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.207, 0.012, 12, 72), metal);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
        g.add(ring);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.193, 0.007, 10, 72), metal);
        ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.122;
        g.add(ring2);
        const finial = new THREE.Mesh(turned(0.115, [[0, 0.016], [0.16, 0.012], [0.34, 0.03], [0.5, 0.012], [0.66, 0.018], [1, 0.002]]), metal);
        finial.position.y = 0.545;
        g.add(finial);
        return g;
      },
      /* Mat siyah blok, altında füme metal taban */
      marjinal(metal) {
        const g = new THREE.Group();
        const block = (W0, W1, D0, D1) => (v, a) => {
          const r = octagonR(a, lerp(W0, W1, v), lerp(D0, D1, v), 0.94, 44);
          return [Math.cos(a) * r, Math.sin(a) * r];
        };
        const plate = new THREE.Mesh(loft(0.05, block(0.235, 0.235, 0.195, 0.195), { seg: 128, rings: 2, filletB: 0.004, filletT: 0.004 }), metal);
        g.add(plate);
        const body = new THREE.Mesh(loft(0.45, block(0.235, 0.255, 0.195, 0.215), { seg: 128, rings: 8, filletT: 0.016 }), capMats.marjinal);
        body.position.y = 0.05;
        g.add(body);
        return g;
      },
      /* Koyu, tok blok kapak; altında gümüş taban */
      vento(metal) {
        const g = new THREE.Group();
        const block = (W, D) => (v, a) => {
          const r = octagonR(a, W, D, 0.96, 20);
          return [Math.cos(a) * r, Math.sin(a) * r];
        };
        g.add(new THREE.Mesh(loft(0.06, block(0.255, 0.2), { seg: 128, rings: 2, filletB: 0.004, filletT: 0.004 }), metal));
        const body = new THREE.Mesh(loft(0.42, block(0.255, 0.2), { seg: 128, rings: 8, filletT: 0.022 }), capMats.vento);
        body.position.y = 0.06;
        g.add(body);
        return g;
      }
    };

    function buildForm(p, idx) {
      const form = Object.assign({ id: p.id }, FORMS[p.id] || FORMS.aqua);
      const H = form.H;
      const group = new THREE.Group();
      group.visible = false;
      form.group = group;

      const metal = new THREE.MeshStandardMaterial(Object.assign({ metalness: 1, envMapIntensity: 1.8 }, form.metal));

      /* Cam */
      const glass = new THREE.Mesh(loft(H, form.section, { seg: 160, rings: 84, filletB: form.filletB, filletT: form.filletT }), ctx.glassMat);
      glass.renderOrder = 3;
      group.add(glass);

      /* Sıvı: cam duvarı kadar içeride, kalın cam tabanın üstünde başlar */
      const fillY = H * form.fill;
      const liqGeo = loft(H, form.section, {
        seg: 112, rings: 48, y0: form.base, y1: fillY, wall: form.wall, filletB: 0.05, filletT: 0.012, capRings: 6
      });
      liqGeo.translate(0, -form.base, 0);
      const liquid = new THREE.Mesh(liqGeo, ctx.liquidMat);
      liquid.position.y = form.base;
      group.add(liquid);
      form.liqTop = fillY - form.base;

      /* Daldırma borusu */
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, H - 0.13, 10), ctx.tubeMat);
      tube.position.set(0, (H - 0.13) / 2 + 0.1, -0.02);
      tube.renderOrder = 1;
      group.add(tube);

      /* Etiket: düz levha yerine camın eğrisine oturan baskı */
      const L = form.label;
      const labGeo = new THREE.PlaneGeometry(L.w, L.h, 28, 34);
      const lp = labGeo.attributes.position;
      for (let i = 0; i < lp.count; i++) {
        const lx = lp.getX(i), ly = lp.getY(i) + L.cy * H;
        lp.setXYZ(i, lx, ly, frontZ(form, lx, ly) - 0.008);
      }
      labGeo.computeVertexNormals();
      const tex = new THREE.CanvasTexture(F.drawLabel(p, L.w / L.h));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
      form.labelTex = tex;
      const label = new THREE.Mesh(labGeo, new THREE.MeshStandardMaterial({
        map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.46,
        roughness: 0.4, metalness: 0.15, transparent: true, depthWrite: false
      }));
      label.renderOrder = 2;
      group.add(label);

      /* Seyf: omuzda ince altın kuşak */
      if (form.band) {
        const bt = new THREE.CanvasTexture(beltCanvas());
        bt.wrapS = THREE.RepeatWrapping;
        bt.repeat.set(form.band.repeat, 1);
        bt.colorSpace = THREE.SRGBColorSpace;
        bt.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
        const bandGeo = loft(H, form.section, {
          open: true, seg: 200, ys: [form.band.v0 * H, lerp(form.band.v0, form.band.v1, 0.5) * H, form.band.v1 * H], wall: -0.0035
        });
        const bandMesh = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({
          color: 0xe6c080, metalness: 0.75, roughness: 0.3, envMapIntensity: 1.8, map: bt,
          alphaMap: bt, transparent: true, depthWrite: false,
          emissive: 0xc9964e, emissiveIntensity: 1.05
        }));
        bandMesh.renderOrder = 4;
        group.add(bandMesh);
      }

      /* Boyun bileziği */
      const n = form.neck;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(n * 0.98, n * 1.08, 0.08, 64), metal);
      collar.position.y = H + 0.04;
      group.add(collar);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(n * 1.08, 0.012, 12, 64), metal);
      ring.rotation.x = Math.PI / 2; ring.position.y = H + 0.004;
      group.add(ring);
      if (form.id === 'seyf') {
        // boncuk dizisi: yakından görülen, sessiz bir el işi detayı
        const nb = 34;
        const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0115, 10, 8), metal, nb);
        const m = new THREE.Matrix4();
        for (let i = 0; i < nb; i++) {
          const a = (i / nb) * TAU;
          m.makeTranslation(Math.cos(a) * n * 1.03, H + 0.05, Math.sin(a) * n * 1.03);
          beads.setMatrixAt(i, m);
        }
        group.add(beads);
      }

      /* Sprey başlığı */
      const actuator = new THREE.Group();
      group.add(actuator);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 24), metal);
      stem.position.y = H + 0.13;
      actuator.add(stem);
      const button = new THREE.Mesh(turned(0.135, form.button.pts, form.button.flutes, 0.05), metal);
      button.position.y = H + 0.175;
      actuator.add(button);
      form.nozX = form.button.pts[0][1] + 0.006;
      form.nozY = H + 0.235;
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.016, 24), ctx.darkMat);
      noz.rotation.z = Math.PI / 2;
      noz.position.set(form.nozX - 0.002, form.nozY, 0);
      actuator.add(noz);
      form.actuator = actuator;

      /* Kapak */
      const capGroup = buildCap[form.id](metal);
      form.capY = H + 0.08;
      capGroup.position.y = form.capY;
      group.add(capGroup);
      form.capGroup = capGroup;

      form.refreshLabel = function () {
        tex.image = F.drawLabel(p, L.w / L.h);
        tex.needsUpdate = true;
      };
      return form;
    }

    return ctx.perfumes.map(buildForm);
  };
})();
