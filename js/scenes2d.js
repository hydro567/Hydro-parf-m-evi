/* ==========================================================
   Hydro Parfüm — nota kemer sahneleri (yüksek çözünürlüklü 2B)
   12 nota, her biri kendi kompozisyonu, ışığı ve hareketiyle.
   Tüm sahneler canvas'ın gerçek piksel boyutunda çizilir (DPR'ye göre).
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Yardımcılar ---------- */
  function cached(st, key, w, h, draw) {
    st.cache = st.cache || {};
    const old = st.cache[key];
    if (old && old.width === w && old.height === h) return old;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    st.cache[key] = cv;
    return cv;
  }

  function radial(c, x, y, r, stops) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([p, col]) => g.addColorStop(p, col));
    return g;
  }

  function glow(c, x, y, r, rgb, a) {
    c.globalAlpha = a;
    c.drawImage(F.sprite(rgb, 0.3), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1;
  }

  // Film tanesi: görüntüye hafif fotoğraf dokusu verir (bir kez üretilir)
  let GRAIN = null;
  function grain(c, W, H) {
    if (!GRAIN) {
      GRAIN = document.createElement('canvas');
      GRAIN.width = GRAIN.height = 256;
      const x = GRAIN.getContext('2d');
      const d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = Math.random() * 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
    }
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.06;
    c.fillStyle = c.createPattern(GRAIN, 'repeat');
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  // Yumuşak tozlar: yukarı süzülen ışıklı noktalar
  function dust(st, c, W, H, dt, rgb, n, speed) {
    if (!st.dust) st.dust = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: rand(0.4, 1) * speed, r: rand(0.6, 2.2), ph: rand(0, TAU) }));
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const d of st.dust) {
      d.y -= d.v * dt; d.ph += dt;
      d.x += Math.sin(d.ph) * 4 * dt;
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
      c.globalAlpha = 0.25 + 0.25 * Math.sin(d.ph * 1.7);
      const s = d.r * (W / 400) * 2;
      c.drawImage(F.sprite(rgb, 0.4), d.x - s, d.y - s, s * 2, s * 2);
    }
    c.restore();
  }

  // Yaprak şekli (dişli kenarlı): taban (0,0), uç (0,-L)
  function leafPath(c, L, Wd, serr) {
    c.beginPath();
    c.moveTo(0, 0);
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const h = Wd * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.9) * 0.5;
      const tooth = serr ? 1 + serr * (i % 2 ? -0.5 : 0.5) : 1;
      c.lineTo(h * tooth, -u * L);
    }
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      const h = Wd * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.9) * 0.5;
      const tooth = serr ? 1 + serr * (i % 2 ? 0.5 : -0.5) : 1;
      c.lineTo(-h * tooth, -u * L);
    }
    c.closePath();
  }

  /* ==========================================================
     AQUA
     ========================================================== */

  // Üst — bergamot: bütün meyve + yarım kesit; yüzeyde ışık sürünür
  F.SCENES2D = F.SCENES2D || {};
  F.SCENES2D.citrus = function (c, W, H, t, dt, st) {
    const R = W * 0.3, cx = W * 0.42, cy = H * 0.5;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.4, H * 0.8, [[0, '#1f4a20'], [1, '#050f06']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const fruit = cached(st, 'fruit', W, H, (x) => {
      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
      x.fillStyle = radial(x, cx - R * 0.35, cy - R * 0.4, R * 1.4, [[0, '#f6ff9c'], [0.5, '#c4e23a'], [0.85, '#6b9a12'], [1, '#2f4c06']]);
      x.fillRect(cx - R, cy - R, R * 2, R * 2);
      // kabuk gözenekleri (yağ bezleri)
      for (let i = 0; i < 1400; i++) {
        const a = rand(0, TAU), rr = R * Math.sqrt(Math.random());
        x.fillStyle = Math.random() < 0.7 ? 'rgba(255,255,210,' + rand(0.08, 0.22).toFixed(2) + ')' : 'rgba(40,70,8,0.22)';
        x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rand(0.6, 1.8), 0, TAU); x.fill();
      }
      x.restore();
      // kabuğun kenar gölgesi
      x.strokeStyle = 'rgba(20,40,4,0.5)'; x.lineWidth = R * 0.05;
      x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
    });
    const cut = cached(st, 'cut', W, H, (x) => {
      F.sliceWith(x, W * 0.7, H * 0.66, R * 0.62, 0.3, 1, {
        rind: ['#c4e255', '#62a01d', '#2c5a0c'], flesh: ['#f8f6b0', '#dbe95e', '#a7cc31'],
        pith: '#f2f5d6', vesicle: 'rgba(255,255,225,1)', core: '#f6f8de'
      });
    });
    // meyve: çok hafif sallanma
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(t * 0.4) * 0.025);
    c.translate(-cx, -cy);
    c.drawImage(fruit, 0, 0);
    // ışık sürünmesi: kabuğun üstünden geçen parlak bant
    c.save();
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
    const sx = cx - R * 1.4 + ((t * 0.12) % 1) * R * 2.8;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, sx, cy - R * 0.2, R * 0.5, [[0, 'rgba(255,255,220,0.35)'], [1, 'rgba(255,255,220,0)']]);
    c.fillRect(cx - R, cy - R, R * 2, R * 2);
    c.restore();
    c.restore();
    c.drawImage(cut, 0, 0);
    dust(st, c, W, H, dt, '210,255,150', 16, H * 0.03);
    grain(c, W, H);
  };

  // Orta — lotus: su yüzeyinde açan taç yaprakları, halka halka dalgalar
  F.SCENES2D.lotus = function (c, W, H, t, dt, st) {
    const cx = W * 0.5, cy = H * 0.66, L = W * 0.42;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.35, H * 0.9, [[0, '#15606a'], [0.6, '#06262c'], [1, '#010a0c']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    // su yansıması (dikey ayna)
    c.save();
    c.globalAlpha = 0.18;
    c.fillStyle = radial(c, cx, cy + L * 0.15, L * 1.2, [[0, 'rgba(140,240,240,1)'], [1, 'rgba(140,240,240,0)']]);
    c.translate(cx, cy + L * 0.15);
    c.scale(1, 0.22);
    c.beginPath(); c.arc(0, 0, L * 1.2, 0, TAU); c.fill();
    c.restore();
    // yaprakların ardından halkalar
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.18) + i / 3) % 1;
      c.save();
      c.globalAlpha = (1 - u) * 0.35;
      c.strokeStyle = 'rgba(150,245,245,1)';
      c.lineWidth = 2 * (W / 400) * (1 - u) + 0.6;
      c.beginPath();
      c.ellipse(cx, cy + L * 0.22, L * (0.5 + u * 0.9), L * (0.5 + u * 0.9) * 0.2, 0, 0, TAU);
      c.stroke();
      c.restore();
    }
    // taç yaprakları: dıştan içe, her biri farklı açıda ve zamanda açılır
    const rings = [
      { n: 6, l: 1.0, w: 0.26, open: 0.55, sp: 0.2 },
      { n: 5, l: 0.78, w: 0.24, open: 0.4, sp: 0.6 },
      { n: 3, l: 0.5, w: 0.2, open: 0.25, sp: 1.0 }
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const base = -Math.PI / 2 + ((i / (ring.n - 1)) - 0.5) * ring.open * 2.6;
        const bloom = 0.5 + 0.5 * Math.sin(t * 0.35 - ring.sp * 2 + i * 0.4);
        const a = base * (0.96 + 0.04 * bloom);
        c.save();
        c.translate(cx, cy);
        c.rotate(a + Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.015);
        const len = L * ring.l * (0.97 + 0.03 * bloom);
        const w = L * ring.w;
        const g = c.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, ri === 0 ? '#2d7f8b' : '#3f9aa6');
        g.addColorStop(0.5, '#a9e4ea');
        g.addColorStop(0.9, '#eefbfd');
        g.addColorStop(1, '#ffffff');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(-w * 1.15, -len * 0.25, -w * 0.8, -len * 0.9, 0, -len);
        c.bezierCurveTo(w * 0.8, -len * 0.9, w * 1.15, -len * 0.25, 0, 0);
        c.fill();
        // damarlar ve kenar ışığı
        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.lineWidth = Math.max(1, W / 500);
        c.beginPath(); c.moveTo(0, -len * 0.04); c.quadraticCurveTo(w * 0.08, -len * 0.5, 0, -len * 0.86); c.stroke();
        c.strokeStyle = 'rgba(10,60,70,0.25)';
        c.beginPath(); c.moveTo(-w * 0.6, -len * 0.5); c.quadraticCurveTo(-w * 0.2, -len * 0.7, 0, -len * 0.86); c.stroke();
        c.restore();
      }
    });
    dust(st, c, W, H, dt, '180,240,240', 14, H * 0.025);
    grain(c, W, H);
  };

  // Dip — sedir: beyaz misk dumanı arasında, sedir tahtasının dokusu ve ışık
  F.SCENES2D.cedar = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.4, H * 0.85, [[0, '#2c4a4c'], [1, '#050a0b']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const pw = W * 0.7, ph = H * 0.34, px = W * 0.15, py = H * 0.5;
    const plank = cached(st, 'plank', W, H, (x) => {
      // gölge
      x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = H * 0.04; x.shadowOffsetY = H * 0.015;
      x.fillStyle = '#8c6a48';
      x.fillRect(px, py, pw, ph);
      x.restore();
      x.save();
      x.beginPath(); x.rect(px, py, pw, ph); x.clip();
      x.fillStyle = radial(x, px + pw * 0.5, py + ph * 0.3, pw * 0.7, [[0, '#c9a57a'], [1, '#6e4f33']]);
      x.fillRect(px, py, pw, ph);
      // uzun, dalgalı damarlar
      for (let i = 0; i < 90; i++) {
        const y0 = py + Math.random() * ph;
        x.strokeStyle = Math.random() < 0.5 ? 'rgba(60,35,18,' + rand(0.15, 0.4).toFixed(2) + ')' : 'rgba(240,215,180,' + rand(0.06, 0.16).toFixed(2) + ')';
        x.lineWidth = rand(0.8, 3) * (W / 600);
        x.beginPath();
        x.moveTo(px, y0);
        for (let k = 1; k <= 12; k++) x.lineTo(px + (pw * k) / 12, y0 + Math.sin(k * 0.8 + i) * ph * 0.02 + rand(-1, 1));
        x.stroke();
      }
      // düğümler
      for (let k = 0; k < 4; k++) {
        const kx = px + rand(0.1, 0.9) * pw, ky = py + rand(0.2, 0.8) * ph, kr = rand(6, 14) * (W / 600);
        for (let r = kr; r > 1; r -= kr / 4) {
          x.strokeStyle = 'rgba(70,40,18,0.35)';
          x.lineWidth = 1.2;
          x.beginPath(); x.ellipse(kx, ky, r * 2.2, r, 0, 0, TAU); x.stroke();
        }
      }
      x.restore();
    });
    c.drawImage(plank, 0, 0);
    // beyaz misk dumanı: yavaşça süzülen, sıcak ışıklı bulutlar
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.03 + i / 4) % 1;
      const x = W * (-0.2 + u * 1.4), y = H * (0.3 + 0.15 * Math.sin(i * 2.1 + t * 0.2));
      c.globalAlpha = 0.14 * Math.sin(u * Math.PI);
      c.drawImage(F.sprite('240,250,248', 0.35), x - W * 0.35, y - W * 0.2, W * 0.7, W * 0.4);
    }
    c.globalAlpha = 1;
    // tahta üzerinde kayan ışık
    c.save();
    c.beginPath(); c.rect(px, py, pw, ph); c.clip();
    const sx = px - pw * 0.3 + ((t * 0.08) % 1) * pw * 1.6;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, sx, py + ph * 0.4, ph * 0.9, [[0, 'rgba(255,240,220,0.22)'], [1, 'rgba(255,240,220,0)']]);
    c.fillRect(px, py, pw, ph);
    c.restore();
    dust(st, c, W, H, dt, '230,250,245', 12, H * 0.02);
    grain(c, W, H);
  };

  /* ==========================================================
     MARJINAL
     ========================================================== */

  function cherryBody(c, x, y, r) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.filter = 'blur(' + Math.max(1, r * 0.12).toFixed(1) + 'px)';
    c.beginPath(); c.ellipse(x + r * 0.25, y + r * 1.05, r * 0.95, r * 0.25, 0, 0, TAU); c.fill();
    c.filter = 'none';
    c.fillStyle = radial(c, x - r * 0.35, y - r * 0.4, r * 1.3, [[0, '#ff6c7c'], [0.3, '#c01a32'], [0.75, '#5e0816'], [1, '#26030a']]);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    // doğal yüzey lekeleri ve sert parlama
    c.fillStyle = 'rgba(255,220,220,0.14)';
    c.beginPath(); c.arc(x + r * 0.2, y + r * 0.25, r * 0.5, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,245,245,0.85)';
    c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.42, r * 0.2, r * 0.12, -0.7, 0, TAU); c.fill();
    c.restore();
  }

  // Üst — kiraz: üç kiraz, bağlı saplarıyla rüzgârda sallanır, arkada bokeh
  F.SCENES2D.cherry = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.45, H * 0.85, [[0, '#4e0c1e'], [1, '#0c0108']]);
      x.fillRect(0, 0, W, H);
      x.filter = 'blur(' + Math.round(W * 0.012) + 'px)';
      for (let i = 0; i < 14; i++) {
        x.fillStyle = 'rgba(255,' + (120 + Math.floor(Math.random() * 60)) + ',' + (140 + Math.floor(Math.random() * 60)) + ',' + rand(0.05, 0.14).toFixed(2) + ')';
        x.beginPath(); x.arc(rand(0, W), rand(0, H * 0.7), rand(W * 0.02, W * 0.08), 0, TAU); x.fill();
      }
      x.filter = 'none';
    }), 0, 0);
    const node = { x: W * 0.5, y: H * 0.12 };
    const cherries = [
      { x: W * 0.36, y: H * 0.66, r: W * 0.105, ph: 0 },
      { x: W * 0.64, y: H * 0.7, r: W * 0.1, ph: 1.4 },
      { x: W * 0.5, y: H * 0.5, r: W * 0.115, ph: 2.6 }
    ];
    // ortak sap
    c.strokeStyle = '#5b7a2e';
    c.lineCap = 'round';
    c.lineWidth = W * 0.012;
    c.beginPath(); c.moveTo(node.x, node.y); c.quadraticCurveTo(node.x + W * 0.02, node.y + H * 0.06, node.x - W * 0.02, node.y + H * 0.1); c.stroke();
    cherries.forEach((k) => {
      const sway = Math.sin(t * 0.9 + k.ph) * W * 0.012;
      const sx = node.x + (k.x - node.x) * 0.25 + sway * 0.4, sy = node.y + H * 0.05;
      const fx = k.x + sway, fy = k.y + Math.sin(t * 0.7 + k.ph) * H * 0.006;
      c.strokeStyle = '#6f8f3a';
      c.lineWidth = W * 0.007;
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + fx) / 2 + sway, (sy + fy) / 2 - H * 0.04, fx, fy - k.r); c.stroke();
      cherryBody(c, fx, fy, k.r);
    });
    // bir yaprak, rüzgârda
    c.save();
    c.translate(W * 0.68, H * 0.2);
    c.rotate(0.6 + Math.sin(t * 0.8) * 0.06);
    c.fillStyle = radial(c, 0, 0, W * 0.4, [[0, '#2f6a2a'], [1, '#143012']]);
    leafPath(c, W * 0.34, W * 0.16, 0.04);
    c.fill();
    c.restore();
    dust(st, c, W, H, dt, '255,190,200', 10, H * 0.02);
    grain(c, W, H);
  };

  // Orta — şakayık: taç yaprakları dış halkadan içe doğru kıvrılarak açılır
  function petalShape(c, len, w, ruffle) {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(w * 1.1, -len * 0.25, w * (0.95 + ruffle * 0.1), -len * 0.85, w * 0.2 * ruffle, -len);
    c.bezierCurveTo(-w * 0.6, -len * 0.92, -w * 1.1, -len * 0.3, 0, 0);
    c.closePath();
  }
  F.SCENES2D.peony = function (c, W, H, t, dt, st) {
    const cx = W * 0.5, cy = H * 0.52, R = W * 0.44;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, cx, cy, H * 0.8, [[0, '#5a1532'], [1, '#12030b']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const rings = [
      { n: 9, len: R * 0.98, w: R * 0.42, open: 1.25, a: '#8c1f44', b: '#ff9ab8' },
      { n: 9, len: R * 0.82, w: R * 0.38, open: 0.95, a: '#a52a52', b: '#ffb3c8' },
      { n: 8, len: R * 0.6, w: R * 0.3, open: 0.7, a: '#c03a64', b: '#ffc9d8' },
      { n: 6, len: R * 0.36, w: R * 0.2, open: 0.45, a: '#d8557e', b: '#ffe0ea' }
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const base = (i / ring.n) * TAU + ri * 0.35 + t * 0.03 * (ri % 2 ? 1 : -1);
        const curl = 0.5 + 0.5 * Math.sin(t * 0.6 - ri * 0.9 + i * 0.7);
        c.save();
        c.translate(cx, cy);
        c.rotate(base);
        c.scale(1, 1 - ring.open * 0.1 * curl);
        const g = c.createLinearGradient(0, 0, 0, -ring.len);
        g.addColorStop(0, ring.a); g.addColorStop(0.55, ring.a); g.addColorStop(1, ring.b);
        c.fillStyle = g;
        petalShape(c, ring.len, ring.w * (0.92 + 0.08 * curl), 0.7 + 0.3 * Math.sin(i * 1.7));
        c.fill();
        // iç gölge çizgisi: kıvrım
        c.strokeStyle = 'rgba(60,5,25,0.35)';
        c.lineWidth = Math.max(1, W / 450);
        c.beginPath(); c.moveTo(0, -ring.len * 0.1); c.quadraticCurveTo(ring.w * 0.4, -ring.len * 0.5, ring.w * 0.1, -ring.len * 0.9); c.stroke();
        c.restore();
      }
    });
    // merkez
    c.fillStyle = radial(c, cx, cy, R * 0.22, [[0, '#ffe7a8'], [0.5, '#f2b15a'], [1, '#7a3a14']]);
    c.beginPath(); c.arc(cx, cy, R * 0.2, 0, TAU); c.fill();
    // çiy parıltıları
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + 0.4, rr = R * (0.5 + (i % 3) * 0.12);
      const tw = Math.max(0, Math.sin(t * 1.4 + i * 1.9));
      glow(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, W * 0.03 * tw + 1, '255,220,230', 0.8 * tw);
    }
    c.restore();
    grain(c, W, H);
  };

  // Dip — vanilya: kıvrık, kırışık kabuklar; yüzeyde yumuşak ışık ve tohum tozu
  function podPath(c, L, T, bend) {
    c.beginPath();
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const s = -0.5 + i / N, u = 2 * s;
      const w = (T / 2) * Math.pow(Math.max(0.0001, 1 - u * u), 0.4);
      const px = s * L, py = bend * L * s * s - w;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    for (let i = N; i >= 0; i--) {
      const s = -0.5 + i / N, u = 2 * s;
      const w = (T / 2) * Math.pow(Math.max(0.0001, 1 - u * u), 0.4);
      c.lineTo(s * L, bend * L * s * s + w);
    }
    c.closePath();
  }
  function podDraw(c, L, T, bend) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = T * 0.9; c.shadowOffsetY = T * 0.3;
    const g = c.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#7a4c2a'); g.addColorStop(0.45, '#3a1f0e'); g.addColorStop(1, '#140802');
    c.fillStyle = g;
    podPath(c, L, T, bend);
    c.fill();
    c.restore();
    // kırışıklar ve parlaklık
    c.save();
    podPath(c, L, T, bend); c.clip();
    for (let k = -8; k <= 8; k++) {
      c.strokeStyle = k % 2 ? 'rgba(20,8,3,0.4)' : 'rgba(220,165,110,0.14)';
      c.lineWidth = Math.max(1, T * 0.035);
      c.beginPath();
      for (let i = 0; i <= 30; i++) {
        const s = -0.5 + i / 30, u = 2 * s;
        const w = (T / 2) * Math.pow(Math.max(0.0001, 1 - u * u), 0.4);
        const px = s * L, py = bend * L * s * s + w * (k / 9);
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,220,170,0.25)';
    c.lineWidth = T * 0.12; c.lineCap = 'round';
    c.beginPath();
    for (let i = 8; i <= 22; i++) {
      const s = -0.5 + i / 30, u = 2 * s;
      const w = (T / 2) * Math.pow(Math.max(0.0001, 1 - u * u), 0.4);
      const px = s * L, py = bend * L * s * s - w * 0.4;
      i === 8 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke();
    c.restore();
  }
  F.SCENES2D.vanilla = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.35, H * 0.3, H * 0.9, [[0, '#3c2216'], [1, '#080302']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    // yukarıdan gelen sıcak ışık huzmesi
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, W * 0.2, -H * 0.1, H * 0.9, [[0, 'rgba(255,200,140,0.18)'], [1, 'rgba(255,200,140,0)']]);
    c.fillRect(0, 0, W, H);
    c.restore();
    const L = W * 0.78, T = W * 0.085;
    const pods = [
      { x: 0, y: -0.04, a: -0.36, bend: 0.1, k: 1 },
      { x: 0.04, y: 0.08, a: -0.28, bend: -0.07, k: 0.94 },
      { x: -0.03, y: 0.2, a: -0.5, bend: 0.06, k: 0.9 },
      { x: 0.02, y: 0.3, a: -0.4, bend: -0.1, k: 0.82 }
    ];
    pods.forEach((p, i) => {
      c.save();
      c.translate(W * (0.5 + p.x), H * (0.5 + p.y) + Math.sin(t * 0.5 + i) * H * 0.004);
      c.rotate(p.a + Math.sin(t * 0.4 + i * 1.3) * 0.02);
      podDraw(c, L * p.k, T, p.bend);
      c.restore();
    });
    // tohum tozları
    for (let i = 0; i < 14; i++) {
      if (!st.seeds) st.seeds = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), v: rand(0.01, 0.03) }));
      const s = st.seeds[i];
      s.y = (s.y + s.v * dt) % 1;
      c.fillStyle = 'rgba(15,8,3,0.7)';
      c.beginPath(); c.arc(s.x * W, s.y * H, W * 0.005, 0, TAU); c.fill();
    }
    grain(c, W, H);
  };

  /* ==========================================================
     VENTO
     ========================================================== */

  // Üst — nane: dişli yapraklar, rüzgârda her biri ayrı ayrı sallanır
  F.SCENES2D.mint = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.45, H * 0.85, [[0, '#14462a'], [1, '#02100a']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const bx = W * 0.5, by = H * 0.82;
    // ana sap
    c.strokeStyle = '#3f7a3a';
    c.lineWidth = W * 0.012;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.sin(t * 0.6) * W * 0.02, by - H * 0.35, bx + W * 0.03, by - H * 0.6); c.stroke();
    const leaves = [
      { y: 0.7, a: -0.9, L: 0.36 }, { y: 0.6, a: 0.9, L: 0.34 }, { y: 0.5, a: -0.7, L: 0.3 },
      { y: 0.42, a: 0.8, L: 0.28 }, { y: 0.34, a: -0.35, L: 0.24 }
    ];
    leaves.forEach((l, i) => {
      const sway = Math.sin(t * 1.4 + i * 1.1) * 0.08 + Math.sin(t * 0.37 + i) * 0.04;
      c.save();
      c.translate(bx + (i % 2 ? W * 0.01 : -W * 0.01), H * l.y);
      c.rotate(l.a + sway);
      const g = c.createLinearGradient(0, 0, 0, -W * l.L);
      g.addColorStop(0, '#1f5f2a'); g.addColorStop(0.6, '#4fa646'); g.addColorStop(1, '#9ee07a');
      c.fillStyle = g;
      leafPath(c, W * l.L, W * l.L * 0.55, 0.05);
      c.fill();
      c.strokeStyle = 'rgba(220,255,200,0.35)';
      c.lineWidth = Math.max(1, W / 520);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -W * l.L * 0.9); c.stroke();
      c.restore();
    });
    // rüzgâr ışık süzmesi
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.12 + 0.05 * Math.sin(t);
    c.fillStyle = radial(c, W * 0.7, H * 0.2, W * 0.8, [[0, 'rgba(200,255,200,1)'], [1, 'rgba(200,255,200,0)']]);
    c.fillRect(0, 0, W, H);
    c.restore();
    dust(st, c, W, H, dt, '200,255,190', 12, H * 0.03);
    grain(c, W, H);
  };

  // Orta — adaçayı: gri-yeşil, tüylü yapraklar; sabahki çiy damlaları yapraklarda kayar
  F.SCENES2D.sage = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.4, H * 0.9, [[0, '#33412f'], [1, '#080d09']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const bx = W * 0.5, by = H * 0.85;
    const breath = 1 + Math.sin(t * 0.7) * 0.02;
    c.save();
    c.translate(bx, by);
    c.scale(breath, breath);
    const specs = [[-0.7, 0.36, '#55704f'], [0.7, 0.36, '#5f7d58'], [-0.35, 0.44, '#6c8a62'], [0.35, 0.44, '#708f66'], [0, 0.5, '#7d9a72']];
    specs.forEach(([a, L, col], i) => {
      c.save();
      c.rotate(a + Math.sin(t * 0.5 + i) * 0.03);
      c.fillStyle = radial(c, 0, -W * L * 0.5, W * L, [[0, col], [1, '#2a3a26']]);
      c.shadowColor = 'rgba(180,220,160,0.25)'; c.shadowBlur = W * 0.01;
      leafPath(c, W * L, W * L * 0.5, 0);
      c.fill();
      c.shadowBlur = 0;
      // tüy: yaprak kenarında ince açık çizgiler
      c.strokeStyle = 'rgba(230,240,215,0.22)';
      c.lineWidth = Math.max(1, W / 600);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -W * L * 0.92); c.stroke();
      c.restore();
    });
    c.restore();
    // çiy damlaları: yapraklarda yavaşça aşağı kayar
    if (!st.dew) st.dew = Array.from({ length: 9 }, () => ({ x: rand(0.25, 0.75), y: rand(0.2, 0.6), v: rand(0.004, 0.012), r: rand(2.5, 4.5) }));
    st.dew.forEach((d) => {
      d.y += d.v * dt;
      if (d.y > 0.75) { d.y = 0.2; d.x = rand(0.25, 0.75); }
      const x = d.x * W, y = d.y * H, r = d.r * (W / 400);
      c.fillStyle = radial(c, x - r * 0.3, y - r * 0.3, r * 1.2, [[0, 'rgba(255,255,255,0.95)'], [0.4, 'rgba(210,235,225,0.6)'], [1, 'rgba(210,235,225,0)']]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    });
    grain(c, W, H);
  };

  // Dip — ıslak taş: su yüzeyinde, bir damla düşer ve halkalar açılır
  F.SCENES2D.pebble = function (c, W, H, t, dt, st) {
    const cx = W * 0.5, cy = H * 0.58, R = W * 0.33;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.3, H * 0.9, [[0, '#1c3a36'], [1, '#030806']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const stone = cached(st, 'stone', W, H, (x) => {
      const path = () => {
        x.beginPath();
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * TAU;
          const r2 = R * (1 + 0.035 * Math.sin(a * 3 + 1) + 0.02 * Math.sin(a * 5 - 2) + 0.01 * Math.sin(a * 11));
          const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2 * 0.62;
          i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.closePath();
      };
      path();
      x.fillStyle = radial(x, cx - R * 0.3, cy - R * 0.3, R * 1.2, [[0, '#8aa597'], [0.45, '#3f5e52'], [1, '#101d18']]);
      x.fill();
      x.save(); x.clip();
      for (let i = 0; i < 60; i++) {
        x.strokeStyle = 'rgba(10,25,20,' + rand(0.1, 0.3).toFixed(2) + ')';
        x.lineWidth = rand(1, 4) * (W / 600);
        x.beginPath();
        const a = rand(0, TAU);
        x.moveTo(cx + Math.cos(a) * R * 0.1, cy + Math.sin(a) * R * 0.06);
        x.quadraticCurveTo(cx + rand(-0.6, 0.6) * R, cy + rand(-0.5, 0.5) * R, cx + Math.cos(a + 1) * R * 1.1, cy + Math.sin(a + 1) * R * 0.7);
        x.stroke();
      }
      x.restore();
      path();
      x.fillStyle = 'rgba(0,0,0,0)';
      // ıslaklık parlaması
      x.fillStyle = radial(x, cx - R * 0.4, cy - R * 0.34, R * 0.5, [[0, 'rgba(240,255,248,0.6)'], [1, 'rgba(240,255,248,0)']]);
      x.fill();
    });
    // taşın altındaki yansıma ve gölge
    c.save();
    c.translate(cx, cy + R * 0.62);
    c.scale(1, 0.18);
    c.fillStyle = radial(c, 0, 0, R * 1.2, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
    c.beginPath(); c.arc(0, 0, R * 1.2, 0, TAU); c.fill();
    c.restore();
    c.drawImage(stone, 0, 0);
    // damla ve halkalar
    const period = 3.2, u = (t % period) / period;
    const fall = clamp(u / 0.55, 0, 1);
    const dropY = cy - R * 1.6 + fall * fall * (cy - R * 0.5 - (cy - R * 1.6));
    const splash = u > 0.55;
    if (!splash) {
      c.fillStyle = radial(c, cx + W * 0.03, dropY - 4, W * 0.02, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(180,240,220,0.4)']]);
      c.beginPath(); c.ellipse(cx + W * 0.03, dropY, W * 0.012, W * 0.02, 0, 0, TAU); c.fill();
    } else {
      const su = (u - 0.55) / 0.45;
      for (let i = 0; i < 3; i++) {
        const k = clamp(su - i * 0.12, 0, 1);
        c.globalAlpha = (1 - k) * 0.5;
        c.strokeStyle = 'rgba(190,255,235,1)';
        c.lineWidth = Math.max(1, W / 450) * (1 - k) + 0.5;
        c.beginPath(); c.ellipse(cx + W * 0.03, cy + R * 0.4, R * (0.1 + k * 0.9), R * (0.1 + k * 0.9) * 0.18, 0, 0, TAU); c.stroke();
      }
      c.globalAlpha = 1;
    }
    grain(c, W, H);
  };

  /* ==========================================================
     SEYF
     ========================================================== */

  // Üst — greyfurt: yarım kesit (tane torbacıkları), kenarından süzülen damlalar
  F.SCENES2D.grapefruit = function (c, W, H, t, dt, st) {
    const R = W * 0.3, cx = W * 0.5, cy = H * 0.48;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.45, H * 0.85, [[0, '#4a2018'], [1, '#0b0403']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const face = cached(st, 'face', W, H, (x) => {
      F.sliceWith(x, cx, cy, R, 0, 1, {
        rind: ['#f0c6a2', '#c27a52', '#5e3018'], flesh: ['#ffd0bd', '#ff8a74', '#e0503c'],
        pith: '#fbe9df', vesicle: 'rgba(255,236,228,1)', core: '#fff3ee'
      });
    });
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(t * 0.3) * 0.03);
    c.translate(-cx, -cy);
    c.drawImage(face, 0, 0);
    c.restore();
    // kenardan süzülen meyve suyu damlaları
    if (!st.drops) st.drops = [];
    st.dropT = (st.dropT || 0) - dt;
    if (st.dropT <= 0) {
      st.dropT = rand(0.5, 1.1);
      const a = rand(0.2, 0.8) * Math.PI;
      st.drops.push({ x: cx + Math.cos(a) * R * 0.9, y: cy + Math.sin(a) * R * 0.9, v: 0, r: rand(0.012, 0.02) * W, hold: rand(0.2, 0.6) });
    }
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      if (d.hold > 0) d.hold -= dt; else { d.v += H * 1.3 * dt; d.y += d.v * dt; }
      if (d.y > H + 20) { st.drops.splice(i, 1); continue; }
      const stretch = 1 + Math.min(1.6, d.v / (H * 0.9));
      c.fillStyle = radial(c, d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 1.3, [[0, 'rgba(255,245,235,0.95)'], [0.5, 'rgba(255,150,130,0.6)'], [1, 'rgba(255,120,100,0)']]);
      c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * stretch, 0, 0, TAU); c.fill();
    }
    grain(c, W, H);
  };

  // Orta — tarçın: kabuk tabakalarıyla kıvrılmış çubuklar demeti, kenarda toz
  function quillDraw(c, L, T) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = T * 0.8; c.shadowOffsetY = T * 0.3;
    const g = c.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#d9976a'); g.addColorStop(0.35, '#9a5a30'); g.addColorStop(1, '#4a2412');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-L / 2 + T * 0.45, -T / 2);
    c.lineTo(L / 2 - T * 0.45, -T / 2);
    c.quadraticCurveTo(L / 2, -T / 2, L / 2, 0);
    c.quadraticCurveTo(L / 2, T / 2, L / 2 - T * 0.45, T / 2);
    c.lineTo(-L / 2 + T * 0.45, T / 2);
    c.quadraticCurveTo(-L / 2, T / 2, -L / 2, 0);
    c.quadraticCurveTo(-L / 2, -T / 2, -L / 2 + T * 0.45, -T / 2);
    c.fill();
    c.restore();
    c.save();
    c.beginPath(); c.rect(-L / 2, -T / 2, L, T); c.clip();
    for (let k = 1; k < 6; k++) {
      c.strokeStyle = 'rgba(40,18,6,0.5)';
      c.lineWidth = Math.max(1, T * 0.04);
      c.beginPath();
      c.moveTo(-L / 2, -T / 2 + (T * k) / 6);
      c.quadraticCurveTo(0, -T / 2 + (T * k) / 6 + T * 0.04 * Math.sin(k * 1.9), L / 2, -T / 2 + (T * k) / 6);
      c.stroke();
    }
    c.restore();
    // uçlardaki rulo kesiti
    for (const s of [-1, 1]) {
      const ex = s * (L / 2 - T * 0.05);
      c.fillStyle = radial(c, ex, 0, T * 0.5, [[0, '#7a4a2a'], [0.6, '#3a1d0c'], [1, '#1a0c04']]);
      c.beginPath(); c.ellipse(ex, 0, T * 0.22, T * 0.5, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(220,160,110,0.45)';
      c.lineWidth = Math.max(1, T * 0.04);
      for (const q of [0.66, 0.4]) {
        c.beginPath(); c.ellipse(ex, 0, T * 0.22 * q, T * 0.5 * q, 0, 0, TAU); c.stroke();
      }
    }
  }
  F.SCENES2D.cinnamon = function (c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, W * 0.5, H * 0.45, H * 0.85, [[0, '#5a2a14'], [1, '#0a0403']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const specs = [
      { x: -0.12, y: 0.12, a: -0.5, L: 0.9, T: 0.12 },
      { x: 0.1, y: 0.02, a: -0.42, L: 0.92, T: 0.12 },
      { x: 0.0, y: -0.1, a: 0.5, L: 0.8, T: 0.11 },
      { x: -0.05, y: 0.22, a: -0.56, L: 0.82, T: 0.11 }
    ];
    specs.forEach((q, i) => {
      c.save();
      c.translate(W * (0.5 + q.x), H * (0.5 + q.y));
      c.rotate(q.a + Math.sin(t * 0.45 + i * 1.2) * 0.025);
      quillDraw(c, W * q.L, W * q.T);
      c.restore();
    });
    dust(st, c, W, H, dt, '255,190,140', 14, H * 0.025);
    grain(c, W, H);
  };

  // Dip — sandal ağacı: halkalı kesit, kor gibi parlayan kenar ve yükselen kıvılcımlar
  F.SCENES2D.wood = function (c, W, H, t, dt, st) {
    const cx = W * 0.5, cy = H * 0.52, R = W * 0.36;
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      x.fillStyle = radial(x, cx, cy, H * 0.9, [[0, '#2e1408'], [1, '#050201']]);
      x.fillRect(0, 0, W, H);
    }), 0, 0);
    const disc = cached(st, 'disc', W, H, (x) => {
      x.fillStyle = '#1b0c05';
      x.beginPath(); x.arc(cx, cy, R * 1.04, 0, TAU); x.fill();
      x.fillStyle = radial(x, cx, cy, R, [[0, '#7a3a20'], [0.55, '#9a4e2a'], [0.9, '#c48052'], [1, '#7c4a2a']]);
      x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
      for (let i = 1; i < 28; i++) {
        const r0 = R * (i / 28);
        x.strokeStyle = 'rgba(50,18,6,' + (0.1 + (i % 4 === 0 ? 0.16 : 0)).toFixed(3) + ')';
        x.lineWidth = R * (i % 4 === 0 ? 0.008 : 0.004);
        x.beginPath();
        for (let a = 0; a <= TAU + 0.01; a += 0.03) {
          const rr = r0 * (1 + 0.01 * Math.sin(a * 6 + i * 1.3) + 0.005 * Math.sin(a * 13 - i));
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.stroke();
      }
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + 0.2;
        x.strokeStyle = 'rgba(40,15,5,0.22)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * R * 0.1, cy + Math.sin(a) * R * 0.1);
        x.quadraticCurveTo(cx + Math.cos(a + 0.1) * R * 0.55, cy + Math.sin(a + 0.1) * R * 0.55, cx + Math.cos(a - 0.03) * R * 0.98, cy + Math.sin(a - 0.03) * R * 0.98);
        x.stroke();
      }
      x.fillStyle = '#3a1c0c';
      x.beginPath(); x.arc(cx, cy, R * 0.035, 0, TAU); x.fill();
      x.fillStyle = radial(x, cx - R * 0.4, cy - R * 0.4, R * 1.3, [[0, 'rgba(255,225,190,0.2)'], [1, 'rgba(255,225,190,0)']]);
      x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    });
    c.drawImage(disc, 0, 0);
    // kor: kenardan sızan titrek ısı
    const flick = 0.75 + 0.15 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 5.7 + 1.3);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, cx, cy + R * 0.9, R * 1.3, [[0, 'rgba(255,120,50,' + (0.3 * flick).toFixed(3) + ')'], [1, 'rgba(255,120,50,0)']]);
    c.fillRect(0, 0, W, H);
    c.restore();
    // yükselen kıvılcımlar
    if (!st.sparks) st.sparks = Array.from({ length: 26 }, () => ({ x: rand(0.3, 0.7), y: rand(0, 1), v: rand(0.03, 0.09), ph: rand(0, TAU), r: rand(1, 2.6) }));
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const s of st.sparks) {
      s.y -= s.v * dt; s.ph += dt * 3;
      if (s.y < 0) { s.y = 1; s.x = rand(0.3, 0.7); }
      const x = (s.x + Math.sin(s.ph) * 0.01) * W, y = s.y * H;
      c.globalAlpha = (0.4 + 0.4 * Math.sin(s.ph * 2)) * clamp(s.y * 1.5, 0, 1);
      glow(c, x, y, s.r * (W / 300) * 3, '255,170,90', 1);
    }
    c.restore();
    grain(c, W, H);
  };
})();
