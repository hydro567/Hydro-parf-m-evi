/* ==========================================================
   Hydro Parfüm — canvas sanatları
   Nota arka planları, kemer içindeki görseller (narenciye, gül,
   ateş), deniz feneri ve imleç izi. Hepsi kodla çiziliyor.
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function fit(canvas, maxDpr) {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, maxDpr || 2);
    const w = Math.max(1, Math.round(r.width * d));
    const h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, d };
  }
  F.fitCanvas = fit;

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  F.hexToRgb = hexToRgb;
  F.mixHex = function (a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const m = (i) => Math.round(A[i] + (B[i] - A[i]) * t);
    return 'rgb(' + m(0) + ',' + m(1) + ',' + m(2) + ')';
  };

  /* Yumuşak parçacık sprite'ları (önbellekli) */
  const cache = {};
  function sprite(rgb, core) {
    const key = 's' + rgb + (core || '');
    if (cache[key]) return cache[key];
    const s = 64, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(core || 0.22, 'rgba(' + rgb + ',0.55)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return (cache[key] = c);
  }
  function bokeh(rgb) {
    const key = 'b' + rgb;
    if (cache[key]) return cache[key];
    const s = 128, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',0.35)');
    g.addColorStop(0.72, 'rgba(' + rgb + ',0.5)');
    g.addColorStop(0.86, 'rgba(' + rgb + ',0.7)');
    g.addColorStop(0.94, 'rgba(' + rgb + ',0.25)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return (cache[key] = c);
  }
  F.sprite = sprite;

  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  /* ==========================================================
     NOTA ARKA PLANI — 0: yağmur/bokeh (yeşil) 1: gül yaprakları (kırmızı) 2: kor (siyah)
     ========================================================== */
  const RAIN_A = [0.06, 0.11, 0.17, 0.24];
  const RAIN_W = [0.6, 0.85, 1.1, 1.4];

  // Yağ damlası: üst sol köşede beyaz bir ışık yansımasıyla, yumuşak kenarlı
  function dropSprite(rgb) {
    const key = 'd' + rgb;
    if (cache[key]) return cache[key];
    const s = 32, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s * 0.42, s * 0.4, 0, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.2, 'rgba(' + rgb + ',0.85)');
    g.addColorStop(0.7, 'rgba(' + rgb + ',0.3)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return (cache[key] = c);
  }

  F.NotesBG = function (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 1, H = 1, D = 1;
    let rain = [], bokG = [], dust = [], bokR = [], petals = [], embers = [], smoke = [];
    let sparks = [], glowB = [], beams = [], fogs = [];
    let palette = { top: '190,240,150', topGlow: '170,225,110', topDust: '225,255,170', heart: '255,90,120', heartDust: '255,190,200', heartFill: '#8c0e22', heartStroke: 'rgba(255,130,150,0.35)', base: '255,140,50' };

    const newPetal = (init) => ({
      x: Math.random() * W, y: init ? Math.random() * H : -40 * D,
      s: rand(7, 17) * D, vx: rand(-8, 22) * D, vy: rand(16, 44) * D,
      rot: rand(0, TAU), vr: rand(-1.1, 1.1), ph: rand(0, TAU), a: rand(0.35, 0.75)
    });
    const newEmber = (init) => ({
      x: Math.random() * W, y: init ? Math.random() * H : H + rand(0, 40) * D,
      r: rand(0.8, 2.6) * D, vx: rand(-10, 10) * D, vy: -rand(18, 80) * D,
      ph: rand(0, TAU), a: rand(0.35, 1)
    });

    // Yağ damlası: üstten yavaşça süzülen, ışığı yansıtan küçük damlacıklar
    const newZest = (init) => ({
      x: Math.random() * W, y: init ? Math.random() * H : -rand(0, 40) * D,
      vx: rand(-6, 6) * D, vy: rand(14, 38) * D, r: rand(1.4, 3.4) * D,
      life: init ? rand(0, 6) : 0, max: rand(4, 8), ph: rand(0, TAU), a: rand(0.35, 0.8)
    });

    function seed() {
      const area = clamp((W * H) / (D * D) / (1440 * 900), 0.35, 1.6);
      const n = (k) => Math.round(k * area);
      rain = Array.from({ length: n(110) }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, len: rand(18, 110) * D, v: rand(240, 720) * D, b: i % 4 }));
      bokG = Array.from({ length: n(28) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(8, 54) * D, vx: rand(-6, 6) * D, vy: rand(3, 18) * D, a: rand(0.05, 0.22), ph: rand(0, TAU) }));
      dust = Array.from({ length: n(90) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(0.6, 2.2) * D, vx: rand(-8, 8) * D, vy: rand(-6, 12) * D, a: rand(0.2, 0.8), ph: rand(0, TAU) }));
      bokR = Array.from({ length: n(32) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(10, 70) * D, vx: rand(-5, 5) * D, vy: rand(-14, -3) * D, a: rand(0.05, 0.2), ph: rand(0, TAU) }));
      petals = Array.from({ length: n(16) }, () => newPetal(true));
      embers = Array.from({ length: n(130) }, () => newEmber(true));
      smoke = Array.from({ length: 7 }, () => ({ x: Math.random() * W, y: rand(0.2, 0.9) * H, r: rand(160, 340) * D, vx: rand(4, 14) * D, a: rand(0.03, 0.07) }));
      sparks = Array.from({ length: n(26) }, () => newZest(true));
      fogs = Array.from({ length: n(6) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(220, 480) * D, s: rand(0.05, 0.12), ph: rand(0, TAU), a: rand(0.07, 0.14) }));
      beams = Array.from({ length: 4 }, (_, i) => ({ x: W * (0.1 + i * 0.24) + rand(-40, 40) * D, w: rand(70, 170) * D, slant: rand(0.12, 0.3), a: rand(0.05, 0.1), s: rand(0.05, 0.12), ph: rand(0, TAU) }));
      glowB = Array.from({ length: n(9) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(180, 420) * D, vx: rand(-4, 4) * D, vy: rand(-8, -2) * D, a: rand(0.05, 0.11), ph: rand(0, TAU) }));
    }

    function wrap(p, m) {
      if (p.x < -m) p.x += W + m * 2;
      if (p.x > W + m) p.x -= W + m * 2;
      if (p.y < -m) p.y += H + m * 2;
      if (p.y > H + m) p.y -= H + m * 2;
    }

    function green(dt, t, k) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgb(' + palette.top + ')';
      // yağmur çizgileri 4 saydamlık grubunda tek seferde çiziliyor (110 ayrı çizim yerine 4)
      for (let b = 0; b < 4; b++) {
        ctx.globalAlpha = RAIN_A[b] * k;
        ctx.lineWidth = RAIN_W[b] * D;
        ctx.beginPath();
        for (const p of rain) {
          if (p.b !== b) continue;
          p.y += p.v * dt;
          if (p.y - p.len > H) { p.y = -rand(0, H * 0.3); p.x = Math.random() * W; }
          ctx.moveTo(p.x, p.y - p.len);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      const bs = bokeh(palette.topGlow);
      for (const b of bokG) {
        b.x += b.vx * dt; b.y += b.vy * dt; wrap(b, b.r);
        ctx.globalAlpha = b.a * k * (0.7 + 0.3 * Math.sin(t * 0.8 + b.ph));
        ctx.drawImage(bs, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      const ds = sprite(palette.topDust);
      for (const p of dust) {
        p.x += (p.vx + Math.sin(t + p.ph) * 6 * D) * dt; p.y += p.vy * dt; wrap(p, 10);
        ctx.globalAlpha = p.a * k * (0.5 + 0.5 * Math.sin(t * 2 + p.ph));
        ctx.drawImage(ds, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      }
      ctx.globalAlpha = 1;
    }

    function red(dt, t, k) {
      ctx.globalCompositeOperation = 'lighter';
      const bs = bokeh(palette.heart);
      for (const b of bokR) {
        b.x += b.vx * dt; b.y += b.vy * dt; wrap(b, b.r);
        ctx.globalAlpha = b.a * k * (0.7 + 0.3 * Math.sin(t * 0.7 + b.ph));
        ctx.drawImage(bs, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      const ds = sprite(palette.heartDust);
      for (const p of dust) {
        p.x += (p.vx + Math.sin(t + p.ph) * 6 * D) * dt; p.y -= p.vy * 0.5 * dt; wrap(p, 10);
        ctx.globalAlpha = p.a * k * 0.6 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph));
        ctx.drawImage(ds, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const p of petals) {
        p.ph += dt;
        p.x += (p.vx + Math.sin(p.ph * 1.3) * 22 * D) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 40 * D) Object.assign(p, newPetal(false));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.ph * 1.6)));
        ctx.globalAlpha = p.a * k;
        ctx.fillStyle = palette.heartFill;
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.6, p.s * 0.75, p.s * 0.85, 0, p.s);
        ctx.bezierCurveTo(-p.s * 0.75, p.s * 0.85, -p.s * 0.95, -p.s * 0.6, 0, -p.s);
        ctx.fill();
        ctx.strokeStyle = palette.heartStroke;
        ctx.lineWidth = D;
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function dark(dt, t, k) {
      ctx.globalCompositeOperation = 'source-over';
      const ss = sprite('70,55,48', 0.5);
      for (const s of smoke) {
        s.x += s.vx * dt;
        if (s.x - s.r > W) s.x = -s.r;
        ctx.globalAlpha = s.a * k;
        ctx.drawImage(ss, s.x - s.r, s.y - s.r * 0.5, s.r * 2, s.r);
      }
      ctx.globalCompositeOperation = 'lighter';
      const es = sprite(palette.base);
      for (const p of embers) {
        p.ph += dt * 3;
        p.x += (p.vx + Math.sin(p.ph) * 14 * D) * dt;
        p.y += p.vy * dt;
        if (p.y < -20 * D) Object.assign(p, newEmber(false));
        const fl = 0.55 + 0.45 * Math.sin(p.ph * 2.3);
        const life = clamp(p.y / H, 0, 1);
        ctx.globalAlpha = p.a * k * fl * (0.25 + life * 0.75);
        const r = p.r * 4;
        ctx.drawImage(es, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Yağ damlaları: üstten süzülür, ışığa göre parlar ve söner
    function zest(dt, t, k) {
      ctx.globalCompositeOperation = 'lighter';
      const sp = dropSprite(palette.top);
      for (const d of sparks) {
        d.life += dt;
        if (d.life > d.max || d.y > H + 20 * D) Object.assign(d, newZest(false));
        d.x += (d.vx + Math.sin(t * 0.6 + d.ph) * 8 * D) * dt;
        d.y += d.vy * dt;
        const f = d.life / d.max;
        const fade = Math.min(1, d.life / 1.2) * (1 - Math.max(0, (f - 0.8) / 0.2));
        ctx.globalAlpha = fade * d.a * k * (0.7 + 0.3 * Math.sin(t * 2 + d.ph));
        const s = d.r * 5;
        ctx.drawImage(sp, d.x - s, d.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Işık huzmeleri: üstten eğik süzülen, yavaşça salınan yumuşak ışık sütunları, içinde toz
    function shafts(dt, t, k) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of beams) {
        const x0 = b.x + Math.sin(t * b.s + b.ph) * W * 0.04;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(' + palette.top + ',' + (b.a * k).toFixed(3) + ')');
        g.addColorStop(0.7, 'rgba(' + palette.top + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, -10 * D);
        ctx.lineTo(x0 + b.w, -10 * D);
        ctx.lineTo(x0 + b.w + H * b.slant, H);
        ctx.lineTo(x0 + H * b.slant, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      zest(dt, t, k * 0.7);
    }

    // Yumuşak sis: verilen renkte, zamana bağlı süzülen büyük bulutlar (pozisyon zamandan hesaplanır)
    function fog(t, k, rgb) {
      ctx.globalCompositeOperation = 'lighter';
      const fs = sprite(rgb, 0.4);
      for (const f of fogs) {
        const x = f.x + Math.sin(t * f.s + f.ph) * W * 0.08;
        const y = f.y + Math.cos(t * f.s * 0.7 + f.ph) * H * 0.05;
        ctx.globalAlpha = f.a * k * (0.7 + 0.3 * Math.sin(t * 0.4 + f.ph));
        ctx.drawImage(fs, x - f.r, y - f.r, f.r * 2, f.r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Sıcak sis: kalp notasında yavaşça hareket eden, kenarsız büyük ışık bulutları
    function haze(dt, t, k) {
      ctx.globalCompositeOperation = 'lighter';
      const hs = sprite(palette.heart, 0.45);
      for (const b of glowB) {
        b.x += b.vx * dt; b.y += b.vy * dt; wrap(b, b.r);
        ctx.globalAlpha = b.a * k * (0.6 + 0.4 * Math.sin(t * 0.5 + b.ph));
        ctx.drawImage(hs, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    const MOTIFS = {
      rain: green, petal: red, ember: dark, zest: zest, shafts: shafts, haze: haze,
      fogTop: (dt, t, k) => fog(t, k, palette.top),
      fogHeart: (dt, t, k) => fog(t, k, palette.heart),
      fogBase: (dt, t, k) => fog(t, k, palette.base)
    };
    let motifs = ['rain', 'petal', 'ember'];
    this.setMotifs = function (list) { motifs = list && list.length === 3 ? list : ['rain', 'petal', 'ember']; };

    this.setPalette = function (p) {
      const accent = hexToRgb(p.accent).join(',');
      const heart = hexToRgb(p.cardGlow).join(',');
      const base = hexToRgb(p.glow).join(',');
      palette = {
        top: accent,
        topGlow: accent,
        topDust: accent,
        heart,
        heartDust: heart,
        heartFill: p.liquid,
        heartStroke: 'rgba(' + heart + ',0.35)',
        base
      };
    };

    // arka plan parçacıkları yumuşak olduğu için 1x çözünürlük yeterli
    this.resize = function () { const f = fit(canvas, 1); W = f.w; H = f.h; D = f.d; seed(); };
    this.render = function (dt, t, w) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) {
        if (w[i] > 0.01) MOTIFS[motifs[i]](dt, t, w[i]);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    };
  };

  /* ==========================================================
     KEMER İÇİ SANAT — narenciye / gül / ateş
     ========================================================== */
  // Sabit tohumlu rastgele: dilimdeki meyve keseleri her karede aynı kalsın
  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  const vrand = seeded(42);
  const VESICLES = Array.from({ length: 160 }, () => ({
    seg: Math.floor(vrand() * 11), f: 0.22 + vrand() * 0.7, da: vrand() * 0.8 - 0.4,
    len: 0.05 + vrand() * 0.08, w: 0.012 + vrand() * 0.016, a: 0.2 + vrand() * 0.35
  }));

  function slice(c, x, y, R, rot, light) {
    const n = 11;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    // kabuk
    let g = c.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.2, 0, 0, R);
    g.addColorStop(0, '#c4e255');
    g.addColorStop(0.8, '#62a01d');
    g.addColorStop(1, '#2c5a0c');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    // ak kısım
    c.fillStyle = '#f2f5d6';
    c.beginPath(); c.arc(0, 0, R * 0.91, 0, TAU); c.fill();
    // dilimler
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, mid = (a0 + a1) / 2;
      g = c.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 0.86);
      g.addColorStop(0, '#f8f6b0');
      g.addColorStop(0.55, '#dbe95e');
      g.addColorStop(1, '#a7cc31');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(Math.cos(mid) * R * 0.1, Math.sin(mid) * R * 0.1);
      c.arc(0, 0, R * 0.85, a0 + 0.045, a1 - 0.045);
      c.closePath();
      c.fill();
    }
    // meyve keseleri
    c.fillStyle = 'rgba(255,255,225,1)';
    for (const v of VESICLES) {
      const a = ((v.seg + 0.5 + v.da) / n) * TAU;
      const r = v.f * R * 0.82;
      c.save();
      c.translate(Math.cos(a) * r, Math.sin(a) * r);
      c.rotate(a);
      c.globalAlpha = v.a;
      c.beginPath();
      c.ellipse(0, 0, v.len * R, v.w * R, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#f6f8de';
    c.beginPath(); c.arc(0, 0, R * 0.07, 0, TAU); c.fill();
    // parlama
    c.globalCompositeOperation = 'lighter';
    g = c.createRadialGradient(-R * 0.35, -R * 0.4, 0, -R * 0.35, -R * 0.4, R * 0.7);
    g.addColorStop(0, 'rgba(255,255,230,' + (0.28 * light) + ')');
    g.addColorStop(1, 'rgba(255,255,230,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    if (light < 1) {
      c.fillStyle = 'rgba(5,20,5,' + (1 - light) + ')';
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    }
    c.restore();
  }

  function leaf(c, x, y, L, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    const g = c.createLinearGradient(0, -L * 0.2, L, L * 0.2);
    g.addColorStop(0, '#17460f');
    g.addColorStop(1, '#4f8f22');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(L * 0.3, -L * 0.3, L * 0.75, -L * 0.22, L, 0);
    c.bezierCurveTo(L * 0.75, L * 0.22, L * 0.3, L * 0.3, 0, 0);
    c.fill();
    c.strokeStyle = 'rgba(200,240,150,0.35)';
    c.lineWidth = Math.max(1, L * 0.008);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.02, L, 0); c.stroke();
    for (let i = 1; i < 6; i++) {
      const px = (L * i) / 6.5, s = 1 - i / 7;
      c.beginPath(); c.moveTo(px, 0); c.quadraticCurveTo(px + L * 0.06, -L * 0.08 * s, px + L * 0.12, -L * 0.14 * s); c.stroke();
      c.beginPath(); c.moveTo(px, 0); c.quadraticCurveTo(px + L * 0.06, L * 0.08 * s, px + L * 0.12, L * 0.14 * s); c.stroke();
    }
    c.restore();
  }

  /* Sabit parçaları bir kez çizip saklar (boyut değişince yeniden çizilir) */
  function cached(st, key, w, h, draw) {
    st.cache = st.cache || {};
    const old = st.cache[key];
    if (old && old.width === w && old.height === h) return old;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'));
    st.cache[key] = cv;
    return cv;
  }

  function drawCitrus(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      let g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#173a10');
      g.addColorStop(1, '#061407');
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      g = x.createRadialGradient(W * 0.55, H * 0.42, 0, W * 0.55, H * 0.42, W * 0.75);
      g.addColorStop(0, 'rgba(190,230,90,0.38)');
      g.addColorStop(1, 'rgba(190,230,90,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    }), 0, 0);

    const LW = Math.ceil(W * 0.52), LH = Math.ceil(W * 0.34);
    const leafImg = cached(st, 'leaf', LW, LH, (x) => leaf(x, 2, LH / 2, W * 0.5, 0));
    c.save();
    c.translate(W * 0.12, H * 0.27);
    c.rotate(-0.55 + Math.sin(t * 0.7) * 0.06);
    c.drawImage(leafImg, -2, -LH / 2);
    c.restore();

    const R2 = W * 0.25, S2 = Math.ceil(R2 * 2 + 4);
    const backImg = cached(st, 'back', S2, S2, (x) => slice(x, S2 / 2, S2 / 2, R2, 0, 0.7));
    c.save();
    c.translate(W * 0.33, H * 0.72);
    c.scale(1, 0.6);
    c.rotate(-t * 0.08);
    c.drawImage(backImg, -S2 / 2, -S2 / 2);
    c.restore();

    const R = W * 0.33, cx = W * 0.57, cy = H * 0.45 + Math.sin(t * 0.9) * W * 0.008;
    const S = Math.ceil(R * 2 + 4);
    const sliceImg = cached(st, 'slice', S, S, (x) => slice(x, S / 2, S / 2, R, 0, 1));
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.1);
    c.drawImage(sliceImg, -S / 2, -S / 2);
    c.restore();
    let g;

    // damlalar
    st.dropT = (st.dropT || 0) - dt;
    if (st.dropT <= 0) {
      st.dropT = rand(0.35, 0.9);
      const a = rand(0.3, 0.9) * Math.PI;
      st.drops.push({ x: cx + Math.cos(a) * R * 0.92, y: cy + Math.sin(a) * R * 0.92, vy: 0, r: rand(0.012, 0.022) * W, hold: rand(0.2, 0.7) });
    }
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      if (d.hold > 0) d.hold -= dt; else { d.vy += H * 1.6 * dt; d.y += d.vy * dt; }
      if (d.y > H + 20) { st.drops.splice(i, 1); continue; }
      const stretch = 1 + Math.min(2, d.vy / (H * 0.8));
      g = c.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r * 1.2);
      g.addColorStop(0, 'rgba(255,255,230,0.95)');
      g.addColorStop(0.5, 'rgba(210,235,120,0.55)');
      g.addColorStop(1, 'rgba(160,200,60,0.1)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(d.x, d.y, d.r, d.r * stretch, 0, 0, TAU);
      c.fill();
    }
  }

  function petal(c, a, r, w, depth) {
    c.save();
    c.rotate(a);
    const g = c.createLinearGradient(0, 0, r * 1.02, 0);
    g.addColorStop(0, '#22020a');
    g.addColorStop(0.42, F.mixHex('#6e0a1c', '#9c1229', depth));
    g.addColorStop(0.86, F.mixHex('#b81a32', '#de3a52', depth));
    g.addColorStop(1, '#f07a88');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(r * 0.35, -w, r * 0.92, -w * 0.92, r, -w * 0.16);
    c.quadraticCurveTo(r * 1.05, 0, r, w * 0.16);
    c.bezierCurveTo(r * 0.92, w * 0.92, r * 0.35, w, 0, 0);
    c.fill();
    c.strokeStyle = 'rgba(255,160,175,0.3)';
    c.lineWidth = Math.max(1, r * 0.014);
    c.beginPath();
    c.moveTo(r * 0.78, -w * 0.78);
    c.bezierCurveTo(r * 0.97, -w * 0.5, r * 1.04, 0, r * 0.97, w * 0.32);
    c.stroke();
    c.restore();
  }

  function drawRose(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, H * 0.75);
      g.addColorStop(0, '#5a0a1c');
      g.addColorStop(1, '#14020a');
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    }), 0, 0);

    const cx = W * 0.5, cy = H * 0.46;
    const R0 = W * 0.44;
    const R = R0 * (1 + Math.sin(t * 0.5) * 0.015);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.03);
    c.scale(R / R0, R / R0);
    const L = 8;
    for (let l = 0; l < L; l++) {
      // her yaprak katmanı (gölgesiyle birlikte) bir kez çizilir, sonra döndürülerek kullanılır
      const r = R0 * (0.18 + 0.82 * (1 - l / L));
      const S = Math.ceil(r * 2.4 + 4);
      const img = cached(st, 'layer' + l, S, S, (x) => {
        x.translate(S / 2, S / 2);
        if (l > 0) {
          const g = x.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.18);
          g.addColorStop(0, 'rgba(10,0,3,0.55)');
          g.addColorStop(1, 'rgba(10,0,3,0)');
          x.fillStyle = g;
          x.beginPath(); x.arc(0, 0, r * 1.18, 0, TAU); x.fill();
        }
        const n = l < 3 ? 5 : 4;
        for (let j = 0; j < n; j++) petal(x, (j / n) * TAU, r, r * (0.62 + 0.06 * Math.sin(l * 1.7 + j)), l / L);
      });
      c.save();
      c.rotate(l * 0.95 + t * 0.05 * (l % 2 ? 1 : -1));
      c.drawImage(img, -S / 2, -S / 2);
      c.restore();
    }
    // merkez spiral
    c.strokeStyle = 'rgba(30,0,8,0.8)';
    c.lineWidth = Math.max(1, W * 0.006);
    c.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.15) {
      const rr2 = R0 * 0.012 * a;
      const px = Math.cos(a + t * 0.2) * rr2, py = Math.sin(a + t * 0.2) * rr2;
      a === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke();
    c.restore();

    // çiy parıltıları
    c.globalCompositeOperation = 'lighter';
    const s = sprite('255,210,220');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + 0.5, rr2 = R * (0.3 + (i % 3) * 0.2);
      const tw = Math.max(0, Math.sin(t * 1.5 + i * 1.7));
      const sz = W * 0.035 * tw;
      c.globalAlpha = 0.8 * tw;
      c.drawImage(s, cx + Math.cos(a) * rr2 - sz / 2, cy + Math.sin(a) * rr2 - sz / 2, sz, sz);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  function drawFire(c, W, H, t, dt, st) {
    c.fillStyle = '#060303';
    c.fillRect(0, 0, W, H);
    const fl = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13.3) * 0.05;
    let g = c.createRadialGradient(W * 0.5, H * 0.84, 0, W * 0.5, H * 0.84, W * 0.95);
    g.addColorStop(0, 'rgba(255,110,30,' + 0.42 * fl + ')');
    g.addColorStop(1, 'rgba(255,110,30,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // kütükler
    const logs = [[W * 0.4, -0.22, W * 0.66], [W * 0.62, 0.26, W * 0.6]];
    for (const [x, rot, len] of logs) {
      c.save();
      c.translate(x, H * 0.84);
      c.rotate(rot);
      const th = H * 0.072;
      g = c.createLinearGradient(0, -th / 2, 0, th / 2);
      g.addColorStop(0, '#3e1f10');
      g.addColorStop(0.5, '#1d0d06');
      g.addColorStop(1, '#090403');
      c.fillStyle = g;
      rr(c, -len / 2, -th / 2, len, th, th / 2);
      c.fill();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(255,' + (130 + Math.sin(t * 6 + x) * 40 | 0) + ',40,' + (0.5 + 0.3 * Math.sin(t * 4 + x)) + ')';
      c.lineWidth = Math.max(1, W * 0.007);
      c.beginPath();
      for (let i = 0; i <= 14; i++) {
        const px = -len / 2 + th * 0.4 + (i / 14) * (len - th * 0.8);
        const py = -th * 0.15 + (i % 2 ? 1 : -1) * th * 0.12;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
      c.globalCompositeOperation = 'source-over';
      c.restore();
    }

    // alevler
    const spawn = 140 * dt;
    st.acc = (st.acc || 0) + spawn;
    while (st.acc >= 1 && st.flames.length < 280) {
      st.acc -= 1;
      const off = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      st.flames.push({ x: W * 0.5 + off * W * 0.3, y: H * 0.8, vx: rand(-12, 12) * (W / 300), vy: -rand(0.32, 0.58) * H, life: 0, max: rand(0.5, 1.15), s: rand(0.05, 0.11) * W, seed: rand(0, TAU) });
    }
    c.globalCompositeOperation = 'lighter';
    const cols = [sprite('255,244,205'), sprite('255,175,60'), sprite('255,92,24'), sprite('150,28,8')];
    for (let i = st.flames.length - 1; i >= 0; i--) {
      const p = st.flames[i];
      p.life += dt;
      const f = p.life / p.max;
      if (f >= 1) { st.flames.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(t * 6 + p.seed) * W * 0.05) * dt;
      p.y += p.vy * dt;
      const sz = p.s * (1 - f * 0.65);
      const spr = f < 0.22 ? cols[0] : f < 0.5 ? cols[1] : f < 0.78 ? cols[2] : cols[3];
      c.globalAlpha = (f < 0.12 ? f / 0.12 : 1 - f) * 0.7;
      c.drawImage(spr, p.x - sz, p.y - sz * 1.7, sz * 2, sz * 3.4);
    }
    // kıvılcımlar
    st.sparkT = (st.sparkT || 0) - dt;
    if (st.sparkT <= 0) { st.sparkT = rand(0.05, 0.22); st.sparks.push({ x: W * 0.5 + rand(-0.25, 0.25) * W, y: H * 0.78, vx: rand(-30, 30) * (W / 300), vy: -rand(0.25, 0.7) * H, life: 0, max: rand(1.2, 2.8), ph: rand(0, TAU) }); }
    const sp = sprite('255,210,130', 0.4);
    for (let i = st.sparks.length - 1; i >= 0; i--) {
      const p = st.sparks[i];
      p.life += dt;
      if (p.life > p.max) { st.sparks.splice(i, 1); continue; }
      p.ph += dt * 5;
      p.x += (p.vx + Math.sin(p.ph) * W * 0.06) * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - 0.4 * dt;
      const k = 1 - p.life / p.max;
      const sz = W * 0.012 * (0.6 + 0.4 * Math.sin(p.ph * 3));
      c.globalAlpha = k;
      c.drawImage(sp, p.x - sz, p.y - sz, sz * 2, sz * 2);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  /* Ortak parçacık: sahnenin üzerinde yukarı süzülen küçük ışıklar */
  function motes(c, W, H, dt, st, rgb, count, speed) {
    if (!st.motes) st.motes = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, v: rand(0.5, 1) * speed, ph: rand(0, TAU) }));
    const sp = sprite(rgb, 0.4);
    c.globalCompositeOperation = 'lighter';
    for (const m of st.motes) {
      m.y -= m.v * dt; m.ph += dt;
      m.x += Math.sin(m.ph) * 8 * dt * (W / 300);
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      const r = W * 0.012 * (0.6 + 0.4 * Math.sin(m.ph * 2));
      c.globalAlpha = 0.7 * (0.5 + 0.5 * Math.sin(m.ph * 1.7));
      c.drawImage(sp, m.x - r, m.y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // Greyfurt dilimi: citrus dilimiyle aynı çizim, pembe-kırmızı et ve kalın kabuk paleti
  const GRAPE = {
    rind: ['#f0c6a2', '#c27a52', '#5e3018'],
    flesh: ['#ffd0bd', '#ff8a74', '#e0503c'],
    pith: '#fbe9df',
    vesicle: 'rgba(255,236,228,1)',
    core: '#fff3ee'
  };

  function sliceWith(c, x, y, R, rot, light, pal) {
    const n = 11;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    let g = c.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.2, 0, 0, R);
    g.addColorStop(0, pal.rind[0]); g.addColorStop(0.8, pal.rind[1]); g.addColorStop(1, pal.rind[2]);
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.fillStyle = pal.pith;
    c.beginPath(); c.arc(0, 0, R * 0.91, 0, TAU); c.fill();
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, mid = (a0 + a1) / 2;
      g = c.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 0.86);
      g.addColorStop(0, pal.flesh[0]); g.addColorStop(0.55, pal.flesh[1]); g.addColorStop(1, pal.flesh[2]);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(Math.cos(mid) * R * 0.1, Math.sin(mid) * R * 0.1);
      c.arc(0, 0, R * 0.85, a0 + 0.045, a1 - 0.045);
      c.closePath();
      c.fill();
    }
    c.fillStyle = pal.vesicle;
    for (const v of VESICLES) {
      const a = ((v.seg + 0.5 + v.da) / n) * TAU;
      const r = v.f * R * 0.82;
      c.save();
      c.translate(Math.cos(a) * r, Math.sin(a) * r);
      c.rotate(a);
      c.globalAlpha = v.a;
      c.beginPath();
      c.ellipse(0, 0, v.len * R, v.w * R, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
    c.fillStyle = pal.core;
    c.beginPath(); c.arc(0, 0, R * 0.07, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter';
    g = c.createRadialGradient(-R * 0.35, -R * 0.4, 0, -R * 0.35, -R * 0.4, R * 0.7);
    g.addColorStop(0, 'rgba(255,240,230,' + (0.3 * light) + ')');
    g.addColorStop(1, 'rgba(255,240,230,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    if (light < 1) {
      c.fillStyle = 'rgba(20,8,4,' + (1 - light) + ')';
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    }
    c.restore();
  }

  F.sliceWith = sliceWith; // 3B sahnelerdeki dilim dokusu için aynı çizim

  function drawGrapefruit(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, H * 0.8);
      g.addColorStop(0, '#3c1812'); g.addColorStop(1, '#0a0302');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);

    const cx = W * 0.5, cy = H * 0.46, R = W * 0.3, S = Math.ceil(R * 2 + 8);
    // dilimin altındaki yumuşak yere düşen gölge
    c.save();
    c.translate(cx, cy + R * 1.02);
    c.scale(1, 0.14);
    const sh = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.1);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath(); c.arc(0, 0, R * 1.1, 0, TAU); c.fill();
    c.restore();

    const img = cached(st, 'slice', S, S, (x) => sliceWith(x, S / 2, S / 2, R, 0, 1, GRAPE));
    c.save();
    c.translate(cx, cy + Math.sin(t * 0.7) * W * 0.004);
    c.rotate(Math.sin(t * 0.25) * 0.05);
    c.drawImage(img, -S / 2, -S / 2);
    c.restore();

    // meyve suyu damlaları: kesit kenarından süzülerek düşer
    st.dropT = (st.dropT || 0) - dt;
    if (st.dropT <= 0) {
      st.dropT = rand(0.8, 1.8);
      const a = rand(0.3, 0.9) * Math.PI;
      st.drops.push({ x: cx + Math.cos(a) * R * 0.9, y: cy + Math.sin(a) * R * 0.9, vy: 0, r: rand(0.008, 0.013) * W, hold: rand(0.3, 0.9) });
    }
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      if (d.hold > 0) d.hold -= dt; else { d.vy += H * 1.4 * dt; d.y += d.vy * dt; }
      if (d.y > H + 20) { st.drops.splice(i, 1); continue; }
      const stretch = 1 + Math.min(1.6, d.vy / (H * 0.9));
      const g = c.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r * 1.2);
      g.addColorStop(0, 'rgba(255,240,230,0.9)');
      g.addColorStop(0.5, 'rgba(255,150,130,0.5)');
      g.addColorStop(1, 'rgba(255,120,100,0.05)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(d.x, d.y, d.r, d.r * stretch, 0, 0, TAU);
      c.fill();
    }
    motes(c, W, H, dt, st, '255,200,180', 24, H * 0.04);
  }

  // Tarçın çubukları: kabuğun rulo izleri, uçlarında açık kesit, sıcak ışıkta gölge
  const CINNAMON = { hi: '#d18f5c', mid: '#8e5129', lo: '#3f1f0d' };

  function quill(x, L, T) {
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.65)';
    x.shadowBlur = T * 0.7;
    x.shadowOffsetY = T * 0.3;
    const g = x.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, CINNAMON.hi); g.addColorStop(0.4, CINNAMON.mid); g.addColorStop(1, CINNAMON.lo);
    x.fillStyle = g;
    rr(x, -L / 2, -T / 2, L, T, T * 0.45);
    x.fill();
    x.restore();

    // kabuk tabakalarının ince izleri
    x.strokeStyle = 'rgba(40,18,8,0.55)';
    x.lineWidth = Math.max(1, T * 0.05);
    for (let k = 1; k < 5; k++) {
      const y = -T / 2 + (T * k) / 5;
      x.beginPath();
      x.moveTo(-L / 2 + T * 0.4, y);
      x.quadraticCurveTo(0, y + T * 0.04 * Math.sin(k * 1.7), L / 2 - T * 0.4, y);
      x.stroke();
    }
    // üst kenardaki parlak şerit
    x.strokeStyle = 'rgba(255,222,180,0.28)';
    x.lineWidth = T * 0.07;
    x.beginPath();
    x.moveTo(-L / 2 + T * 0.7, -T * 0.3);
    x.lineTo(L / 2 - T * 0.7, -T * 0.3);
    x.stroke();

    // uçlardaki rulo kesiti
    for (const s of [-1, 1]) {
      const ex = s * (L / 2 - T * 0.02);
      x.fillStyle = '#2a1208';
      x.beginPath(); x.ellipse(ex, 0, T * 0.14, T * 0.48, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(200,130,80,0.5)';
      x.lineWidth = Math.max(1, T * 0.03);
      for (const rr2 of [0.34, 0.22]) {
        x.beginPath(); x.ellipse(ex, 0, T * 0.14 * rr2 * 2.4, T * 0.48 * rr2 * 2, 0, 0, TAU); x.stroke();
      }
    }
  }

  function drawCinnamon(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.8);
      g.addColorStop(0, '#3e1d0d'); g.addColorStop(1, '#070201');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);

    // demet: birbirinin üstüne yerleşmiş çubuklar, hafif açılarla
    const bundle = cached(st, 'sticks', W, H, (x) => {
      const cx = W * 0.5, cy = H * 0.5, L = W * 0.7, T = W * 0.072;
      for (let i = 0; i < 5; i++) {
        x.save();
        x.translate(cx + (i % 2 ? 6 : -6) * (W / 300), cy + (i - 2) * T * 0.92);
        x.rotate(-0.2 + (i - 2) * 0.012);
        quill(x, L, T);
        x.restore();
      }
      x.save();
      x.translate(cx, cy - T * 2.1);
      x.rotate(0.22);
      quill(x, L * 0.86, T * 0.92);
      x.restore();
    });
    c.drawImage(bundle, 0, 0);

    // sıcak ışığın yavaşça nefes alması
    const fl = 0.85 + Math.sin(t * 0.9) * 0.1;
    c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.6);
    glow.addColorStop(0, 'rgba(255,160,90,' + (0.16 * fl) + ')');
    glow.addColorStop(1, 'rgba(255,160,90,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    motes(c, W, H, dt, st, '255,170,110', 22, H * 0.04);
  }

  // Sandal ağacı: yıllık halkaları olan kütük kesiti, halkalar boyunca ısı dalgaları
  function drawLog(c, W, H, t, dt, st, pal) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.8);
      g.addColorStop(0, pal.bg[0]); g.addColorStop(1, pal.bg[1]);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);

    // Kütük: üst yüzeyi yıllık halkalı, yanı kabuklu bir silindir (bir top değil)
    const cx = W * 0.5, cy = H * 0.5, R = W * 0.3;
    const ry = R * 0.4, bodyH = R * 0.95;
    const SW = Math.ceil(R * 2 + 24), SH = Math.ceil(ry * 2 + bodyH + 24);
    const log = cached(st, 'log', SW, SH, (x) => {
      const mx = SW / 2, topY = 12 + ry;
      // gövde (yan yüzey)
      let g = x.createLinearGradient(mx - R, 0, mx + R, 0);
      pal.body.forEach(([p, col]) => g.addColorStop(p, col));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(mx - R, topY);
      x.lineTo(mx - R, topY + bodyH);
      x.ellipse(mx, topY + bodyH, R, ry, 0, Math.PI, 0, true);
      x.lineTo(mx + R, topY);
      x.closePath();
      x.fill();
      // kabuk dokusu: gövde boyunca koyu, düzensiz kabuk çatlakları
      x.save();
      x.clip();
      const rng = seeded(99);
      x.strokeStyle = 'rgba(20,8,3,0.35)';
      for (let i = 0; i < 46; i++) {
        const px = mx - R + rng() * 2 * R;
        const len = bodyH * (0.25 + rng() * 0.5);
        const py = topY + rng() * bodyH * 0.4;
        x.lineWidth = 1 + rng() * 2;
        x.beginPath();
        x.moveTo(px, py);
        x.bezierCurveTo(px + 3, py + len * 0.3, px - 3, py + len * 0.6, px + 1, py + len);
        x.stroke();
      }
      x.restore();
      // üst yüz: yıllık halkalar
      const top = x.createRadialGradient(mx, topY, 0, mx, topY, R);
      top.addColorStop(0, pal.top[0]); top.addColorStop(0.7, pal.top[1]); top.addColorStop(1, pal.top[2]);
      x.fillStyle = top;
      x.beginPath(); x.ellipse(mx, topY, R, ry, 0, 0, TAU); x.fill();
      for (let i = 1; i < 16; i++) {
        const k = i / 16;
        x.strokeStyle = 'rgba(60,24,8,' + (0.14 + (i % 3 === 0 ? 0.12 : 0)).toFixed(3) + ')';
        x.lineWidth = R * (i % 3 === 0 ? 0.012 : 0.006);
        x.beginPath();
        x.ellipse(mx + R * 0.02 * Math.sin(i), topY + ry * 0.02 * i / 16, R * k * 0.98, ry * k * 0.98, 0, 0, TAU);
        x.stroke();
      }
      // kabuk kenarı (üst yüzün dış halkası)
      x.strokeStyle = '#1e0d05';
      x.lineWidth = R * 0.05;
      x.beginPath(); x.ellipse(mx, topY, R * 0.985, ry * 0.985, 0, 0, TAU); x.stroke();
      // öz
      x.fillStyle = '#3a1c0c';
      x.beginPath(); x.ellipse(mx, topY, R * 0.035, ry * 0.035, 0, 0, TAU); x.fill();
      // yukarıdan gelen ışık
      const hl = x.createLinearGradient(0, topY - ry, 0, topY + bodyH);
      hl.addColorStop(0, 'rgba(255,220,180,0.16)'); hl.addColorStop(0.5, 'rgba(255,220,180,0)');
      x.fillStyle = hl;
      x.beginPath(); x.ellipse(mx, topY, R, ry, 0, 0, TAU); x.fill();
    });
    // kütüğün alt kenarında yere düşen gölge
    c.save();
    c.translate(cx, cy + bodyH * 0.6);
    c.scale(1, 0.16);
    const sh = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.2);
    sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath(); c.arc(0, 0, R * 1.2, 0, TAU); c.fill();
    c.restore();
    c.save();
    c.translate(cx, cy + Math.sin(t * 0.3) * W * 0.003);
    c.drawImage(log, -SW / 2, -SH / 2);
    c.restore();

    // sıcak ışığın yavaşça nefes alması
    const fl = 0.85 + Math.sin(t * 0.8) * 0.12;
    c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5);
    glow.addColorStop(0, 'rgba(' + pal.glow + ',' + (0.16 * fl) + ')');
    glow.addColorStop(1, 'rgba(' + pal.glow + ',0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    motes(c, W, H, dt, st, pal.motes, 26, H * 0.04);
  }

  /* ---------- Sandal ağacı ve sedir kütükleri ---------- */
  const WOOD = {
    bg: ['#2a1409', '#060201'],
    body: [[0, '#1c0c05'], [0.28, '#5e3118'], [0.52, '#8a4d2a'], [0.78, '#4a2412'], [1, '#1a0b04']],
    top: ['#7e4224', '#a86238', '#c48a55'], glow: '255,140,70', motes: '255,150,80'
  };
  const CEDAR = {
    bg: ['#17282c', '#050a0b'],
    body: [[0, '#1a2a2c'], [0.28, '#4b6260'], [0.52, '#7d918a'], [0.78, '#3b4d4a'], [1, '#121c1c']],
    top: ['#8fa59c', '#b5c4bb', '#d7e0d6'], glow: '190,235,225', motes: '200,240,232'
  };
  function drawWood(c, W, H, t, dt, st) { drawLog(c, W, H, t, dt, st, WOOD); }
  function drawCedar(c, W, H, t, dt, st) { drawLog(c, W, H, t, dt, st, CEDAR); }

  /* ---------- Lotus (Aqua kalbi): su yüzeyinde açan beyaz-mavi yapraklar ---------- */
  function lotusPetal(c, x, y, a, L, w) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    const g = c.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0, '#3f9ea6'); g.addColorStop(0.45, '#bff0f2'); g.addColorStop(0.85, '#f1fcfd'); g.addColorStop(1, '#ffffff');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-w, -L * 0.3, -w * 0.85, -L * 0.9, 0, -L);
    c.bezierCurveTo(w * 0.85, -L * 0.9, w, -L * 0.3, 0, 0);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = Math.max(1, L * 0.012);
    c.beginPath(); c.moveTo(0, -L * 0.05); c.quadraticCurveTo(w * 0.05, -L * 0.5, 0, -L * 0.85); c.stroke();
    c.restore();
  }

  function drawLotus(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.9);
      g.addColorStop(0, '#0f4a54'); g.addColorStop(1, '#021014');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);

    const cx = W * 0.5, cy = H * 0.62, R = W * 0.4;
    // su yüzeyinde yansıma
    c.save();
    c.translate(cx, cy + R * 0.5);
    c.scale(1, 0.25);
    const refl = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.9);
    refl.addColorStop(0, 'rgba(120,230,235,0.22)'); refl.addColorStop(1, 'rgba(120,230,235,0)');
    c.fillStyle = refl;
    c.beginPath(); c.arc(0, 0, R * 0.9, 0, TAU); c.fill();
    c.restore();

    const sway = Math.sin(t * 0.6) * 0.04;
    const layers = [
      { n: 5, L: R * 0.95, w: R * 0.3, sp: 1.1 },
      { n: 5, L: R * 0.7, w: R * 0.24, sp: 0.8 },
      { n: 3, L: R * 0.42, w: R * 0.18, sp: 0.5 }
    ];
    for (const ly of layers) {
      for (let j = 0; j < ly.n; j++) {
        const a = -ly.sp + (j / (ly.n - 1)) * 2 * ly.sp + sway;
        lotusPetal(c, cx, cy, a, ly.L, ly.w);
      }
    }
  }

  /* ---------- Kiraz (Marjinal üstü) ---------- */
  function cherry(x, px, py, r) {
    x.strokeStyle = '#5a7a33';
    x.lineWidth = r * 0.14;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(px, py - r * 0.8);
    x.quadraticCurveTo(px + r * 0.3, py - r * 2.2, px + r * 0.9, py - r * 3.2);
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath(); x.ellipse(px + r * 0.2, py + r * 1.05, r * 0.95, r * 0.22, 0, 0, TAU); x.fill();
    const g = x.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.05, px, py, r);
    g.addColorStop(0, '#f2606d'); g.addColorStop(0.35, '#b0142a'); g.addColorStop(0.8, '#5a0412'); g.addColorStop(1, '#2a0208');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,230,230,0.75)';
    x.beginPath(); x.ellipse(px - r * 0.38, py - r * 0.42, r * 0.2, r * 0.11, -0.6, 0, TAU); x.fill();
  }

  function drawCherry(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, H * 0.8);
      g.addColorStop(0, '#4a0a18'); g.addColorStop(1, '#0e0205');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);
    const img = cached(st, 'cluster', W, H, (x) => {
      cherry(x, W * 0.36, H * 0.7, W * 0.1);
      cherry(x, W * 0.64, H * 0.72, W * 0.095);
      cherry(x, W * 0.5, H * 0.58, W * 0.11);
    });
    c.save();
    c.translate(W * 0.5, H * 0.6);
    c.rotate(Math.sin(t * 0.5) * 0.015);
    c.translate(-W * 0.5, -H * 0.6);
    c.drawImage(img, 0, 0);
    c.restore();
    motes(c, W, H, dt, st, '255,150,160', 18, H * 0.03);
  }

  /* ---------- Şakayık (Marjinal kalbi): pembe katmanlı taç yaprakları ---------- */
  function petalPink(c, a, r, w, depth) {
    c.save();
    c.rotate(a);
    const g = c.createLinearGradient(0, 0, r * 1.02, 0);
    g.addColorStop(0, '#3a0817');
    g.addColorStop(0.42, F.mixHex('#8c1f44', '#b3305e', depth));
    g.addColorStop(0.86, F.mixHex('#d2507e', '#f08aad', depth));
    g.addColorStop(1, '#ffd6e2');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(r * 0.35, -w, r * 0.92, -w * 0.92, r, -w * 0.16);
    c.quadraticCurveTo(r * 1.05, 0, r, w * 0.16);
    c.bezierCurveTo(r * 0.92, w * 0.92, r * 0.35, w, 0, 0);
    c.fill();
    c.restore();
  }

  function drawPeony(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, H * 0.75);
      g.addColorStop(0, '#4a0e2a'); g.addColorStop(1, '#120308');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);
    const cx = W * 0.5, cy = H * 0.47, R0 = W * 0.44;
    const R = R0 * (1 + Math.sin(t * 0.5) * 0.012);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.02);
    c.scale(R / R0, R / R0);
    const L = 7;
    for (let l = 0; l < L; l++) {
      const r = R0 * (0.2 + 0.8 * (1 - l / L));
      const S = Math.ceil(r * 2.4 + 4);
      const img = cached(st, 'layer' + l, S, S, (x) => {
        x.translate(S / 2, S / 2);
        const n = 6 + (l < 3 ? 1 : 0);
        for (let j = 0; j < n; j++) petalPink(x, (j / n) * TAU + l * 0.37, r, r * (0.58 + 0.07 * Math.sin(l * 1.9 + j * 1.3)), l / L);
      });
      c.save();
      c.rotate(l * 0.8 + t * 0.04 * (l % 2 ? 1 : -1));
      c.drawImage(img, -S / 2, -S / 2);
      c.restore();
    }
    c.restore();
    c.globalCompositeOperation = 'lighter';
    const s = sprite('255,190,210');
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4 + 0.5, rr2 = R * (0.35 + (i % 3) * 0.18);
      const tw = Math.max(0, Math.sin(t * 1.2 + i * 1.7));
      const sz = W * 0.03 * tw;
      c.globalAlpha = 0.6 * tw;
      c.drawImage(s, cx + Math.cos(a) * rr2 - sz / 2, cy + Math.sin(a) * rr2 - sz / 2, sz, sz);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  /* ---------- Vanilya (Marjinal dibi): kuru vanilya kabukları ---------- */
  // Kurutulmuş vanilya kabuğu: hafif kıvrık, uçlara doğru incelen, kırışık yüzeyli
  function vanillaPod(x, L, T, bend) {
    const N = 48;
    const at = (i) => {
      const s = -0.5 + i / N, u = 2 * s;
      return { px: s * L, py: bend * L * s * s, w: (T / 2) * Math.pow(Math.max(0.0001, 1 - u * u), 0.4) };
    };
    // gövde ve gölge
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.6)';
    x.shadowBlur = T * 0.9;
    x.shadowOffsetY = T * 0.35;
    x.beginPath();
    for (let i = 0; i <= N; i++) { const p = at(i); i === 0 ? x.moveTo(p.px, p.py - p.w) : x.lineTo(p.px, p.py - p.w); }
    for (let i = N; i >= 0; i--) { const p = at(i); x.lineTo(p.px, p.py + p.w); }
    x.closePath();
    const g = x.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#6e4727'); g.addColorStop(0.4, '#341c0c'); g.addColorStop(1, '#130802');
    x.fillStyle = g;
    x.fill();
    x.restore();
    // kırışıklar: gövdeyi takip eden koyu ve açık ince çizgiler (uçlara doğru doğal olarak incelir)
    const ridge = (k, col, lw, dy) => {
      x.strokeStyle = col;
      x.lineWidth = lw;
      x.beginPath();
      for (let i = 2; i <= N - 2; i++) {
        const p = at(i), yy = p.py + k * p.w + dy;
        i === 2 ? x.moveTo(p.px, yy) : x.lineTo(p.px, yy);
      }
      x.stroke();
    };
    for (const k of [-0.7, -0.45, -0.2, 0.05, 0.3, 0.55, 0.78]) {
      ridge(k, 'rgba(12,5,2,0.55)', Math.max(1, T * 0.03), 0);
      ridge(k, 'rgba(210,150,95,0.16)', Math.max(1, T * 0.012), -T * 0.02);
    }
    // yağlı parlaklık: üst kenarda yumuşak bir yansıma
    x.strokeStyle = 'rgba(255,215,165,0.22)';
    x.lineWidth = T * 0.1;
    x.lineCap = 'round';
    x.beginPath();
    for (let i = 10; i <= N - 10; i++) {
      const p = at(i), yy = p.py - p.w * 0.45;
      i === 10 ? x.moveTo(p.px, yy) : x.lineTo(p.px, yy);
    }
    x.stroke();
  }

  function drawVanilla(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.8);
      g.addColorStop(0, '#2e1a10'); g.addColorStop(1, '#070302');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);
    const img = cached(st, 'pods', W, H, (x) => {
      const cx = W * 0.5, cy = H * 0.5, L = W * 0.8, T = W * 0.085;
      // demet: birbirine yakın, farklı açı ve kıvrımlarda dört kabuk
      const pods = [
        { a: -0.42, dx: -0.04, dy: -0.12, bend: 0.10, k: 0.96 },
        { a: -0.3, dx: 0.02, dy: 0.06, bend: -0.06, k: 1.0 },
        { a: -0.52, dx: 0.06, dy: 0.2, bend: 0.05, k: 0.9 },
        { a: -0.36, dx: -0.02, dy: 0.26, bend: -0.1, k: 0.86 }
      ];
      for (const p of pods) {
        x.save();
        x.translate(cx + p.dx * W, cy + p.dy * W);
        x.rotate(p.a);
        vanillaPod(x, L * p.k, T, p.bend);
        x.restore();
      }
    });
    c.save();
    c.translate(W * 0.5, H * 0.5);
    c.rotate(Math.sin(t * 0.4) * 0.01);
    c.translate(-W * 0.5, -H * 0.5);
    c.drawImage(img, 0, 0);
    c.restore();
    motes(c, W, H, dt, st, '255,190,140', 18, H * 0.03);
  }

  /* ---------- Nane ve adaçayı (Vento üstü ve kalbi): yaprak demeti ---------- */
  function leafAt(x, px, py, L, rot, p) {
    x.save();
    x.translate(px, py);
    x.rotate(rot);
    const g = x.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, p[0]); g.addColorStop(0.6, p[1]); g.addColorStop(1, p[2]);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 0);
    x.bezierCurveTo(L * 0.2, -L * 0.42, L * 0.7, -L * 0.36, L, 0);
    x.bezierCurveTo(L * 0.7, L * 0.36, L * 0.2, L * 0.42, 0, 0);
    x.fill();
    x.strokeStyle = p[3];
    x.lineWidth = Math.max(1, L * 0.018);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(L * 0.9, 0); x.stroke();
    x.lineWidth = Math.max(1, L * 0.01);
    x.beginPath();
    for (let i = 1; i < 5; i++) {
      const q = (L * i) / 5.5;
      x.moveTo(q, 0); x.lineTo(q + L * 0.12, -L * 0.16);
      x.moveTo(q, 0); x.lineTo(q + L * 0.12, L * 0.16);
    }
    x.stroke();
    x.restore();
  }

  function drawLeaves(c, W, H, t, dt, st, bg, p, motesRgb) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.8);
      g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);
    const cx = W * 0.5, cy = H * 0.74;
    const img = cached(st, 'leaves', W, H, (x) => {
      const L = W * 0.44;
      for (const a of [-2.5, -1.9, -1.3, -0.7, -0.15]) leafAt(x, cx, cy, L * (0.85 + 0.15 * Math.sin(a * 3)), a, p);
    });
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(t * 0.5) * 0.02);
    c.translate(-cx, -cy);
    c.drawImage(img, 0, 0);
    c.restore();
    motes(c, W, H, dt, st, motesRgb, 18, H * 0.03);
  }

  const MINT_LEAF = ['#14501f', '#3f9a3c', '#7fd16a', 'rgba(210,255,190,0.4)'];
  const SAGE_LEAF = ['#3f5a44', '#7f9a7a', '#b8c9a6', 'rgba(230,240,215,0.35)'];
  function drawMint(c, W, H, t, dt, st) { drawLeaves(c, W, H, t, dt, st, ['#0c2e16', '#020c05'], MINT_LEAF, '160,255,190'); }
  function drawSage(c, W, H, t, dt, st) { drawLeaves(c, W, H, t, dt, st, ['#1d2a22', '#060a07'], SAGE_LEAF, '210,230,200'); }

  /* ---------- Islak taş (Vento dibi): ıslaklık parlaması olan düz çakıl ---------- */
  function drawPebble(c, W, H, t, dt, st) {
    c.drawImage(cached(st, 'bg', W, H, (x) => {
      const g = x.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.8);
      g.addColorStop(0, '#1d3a33'); g.addColorStop(1, '#050b09');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }), 0, 0);
    const cx = W * 0.5, cy = H * 0.5, R = W * 0.32;
    c.save();
    c.translate(cx, cy + R * 0.7);
    c.scale(1, 0.2);
    const sh = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
    sh.addColorStop(0, 'rgba(0,0,0,0.65)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath(); c.arc(0, 0, R * 1.3, 0, TAU); c.fill();
    c.restore();

    const stonePath = (x) => {
      x.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const r2 = R * (1 + 0.045 * Math.sin(a * 3 + 1) + 0.025 * Math.sin(a * 5 - 2) + 0.01 * Math.sin(a * 9));
        const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2 * 0.78;
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.closePath();
    };
    const img = cached(st, 'stone', W, H, (x) => {
      stonePath(x);
      const g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R * 1.1);
      g.addColorStop(0, '#7e9b8b'); g.addColorStop(0.45, '#3d5b4d'); g.addColorStop(1, '#0f1b16');
      x.fillStyle = g;
      x.fill();
      x.save();
      x.clip();
      x.strokeStyle = 'rgba(15,28,22,0.35)';
      x.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = i * 1.7;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.15);
        x.quadraticCurveTo(cx + Math.cos(a + 0.4) * R * 0.6, cy + Math.sin(a + 0.4) * R * 0.5, cx + Math.cos(a + 0.9) * R * 1.05, cy + Math.sin(a + 0.9) * R * 0.8);
        x.stroke();
      }
      x.restore();
      stonePath(x);
      const hl = x.createRadialGradient(cx - R * 0.38, cy - R * 0.32, 0, cx - R * 0.38, cy - R * 0.32, R * 0.55);
      hl.addColorStop(0, 'rgba(235,255,245,0.5)'); hl.addColorStop(1, 'rgba(235,255,245,0)');
      x.fillStyle = hl;
      x.fill();
    });
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.25 + 0.1 * Math.sin(t * 0.8);
    c.fillStyle = 'rgba(200,255,230,1)';
    c.beginPath(); c.ellipse(cx - R * 0.42, cy - R * 0.4, R * 0.09, R * 0.04, -0.5, 0, TAU); c.fill();
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  const SCENES = {
    citrus: drawCitrus, rose: drawRose, fire: drawFire,
    grapefruit: drawGrapefruit, cinnamon: drawCinnamon, wood: drawWood,
    lotus: drawLotus, cedar: drawCedar, cherry: drawCherry, peony: drawPeony,
    vanilla: drawVanilla, mint: drawMint, sage: drawSage, pebble: drawPebble
  };

  F.ArchArt = function (canvas) {
    const ctx = canvas.getContext('2d');
    const layer = document.createElement('canvas');
    const lctx = layer.getContext('2d');
    let W = 1, H = 1;
    const states = {};
    const stateOf = (name) => (states[name] = states[name] || { drops: [], flames: [], sparks: [] });
    let scenes = ['citrus', 'rose', 'fire'];

    // w[0]=üst, w[1]=orta, w[2]=dip: her nota için sahne adı (parfüme göre değişir)
    this.setScenes = function (list) {
      scenes = list && list.length === 3 ? list : ['citrus', 'rose', 'fire'];
      if (F.preloadNotePhotos) F.preloadNotePhotos(scenes);
    };
    // Yüksek çözünürlük: sahne, ekranda görünen boyutun 2.5 katında çizilir (keskin, 4K'ya yakın)
    this.resize = function () {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * 2.5)); H = Math.max(1, Math.round(r.height * 2.5));
      canvas.width = W; canvas.height = H;
      layer.width = W; layer.height = H;
    };
    // Öncelik gerçek fotoğraf; yüklenene kadar ya da yüklenemezse çizim sahnesi
    const sceneFn = (name) => (F.photoScene && F.photoScene(name)) || (F.SCENES2D && F.SCENES2D[name]) || SCENES[name];
    this.render = function (dt, t, w) {
      const order = [0, 1, 2].filter((i) => w[i] > 0.002).sort((a, b) => w[b] - w[a]);
      if (!order.length) return;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const first = scenes[order[0]];
      sceneFn(first)(ctx, W, H, t, dt, stateOf(first));
      if (order[1] !== undefined) {
        const second = scenes[order[1]];
        lctx.globalAlpha = 1;
        lctx.globalCompositeOperation = 'source-over';
        sceneFn(second)(lctx, W, H, t, dt, stateOf(second));
        ctx.globalAlpha = w[order[1]];
        ctx.drawImage(layer, 0, 0);
        ctx.globalAlpha = 1;
      }
    };
  };

  /* ==========================================================
     DENİZ FENERİ (Atölye)
     ========================================================== */
  F.Lighthouse = function (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 1, H = 1, D = 1, stars = [];

    const st = {};

    this.resize = function () {
      const f = fit(canvas, 1.5); W = f.w; H = f.h; D = f.d;
      stars = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.6, r: rand(0.3, 1.3) * D, ph: rand(0, TAU), s: rand(0.5, 2.2) }));
    };

    // kule, kayalık, balkon: hareketsiz, bir kez çizilir
    function drawFore(x, hz, lx, ly) {
      x.fillStyle = '#05060a';
      x.beginPath();
      x.moveTo(lx - W * 0.2, hz + H * 0.03);
      x.quadraticCurveTo(lx - W * 0.12, hz - H * 0.035, lx - W * 0.05, hz - H * 0.03);
      x.lineTo(lx + W * 0.06, hz - H * 0.028);
      x.quadraticCurveTo(lx + W * 0.14, hz - H * 0.01, lx + W * 0.22, hz + H * 0.03);
      x.closePath();
      x.fill();
      const base = hz - H * 0.028, top = ly + H * 0.045;
      const bw = W * 0.05, tw = W * 0.034;
      const g = x.createLinearGradient(lx - bw, 0, lx + bw, 0);
      g.addColorStop(0, '#07080c');
      g.addColorStop(0.55, '#1b1d26');
      g.addColorStop(1, '#2b2a30');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(lx - bw, base); x.lineTo(lx - tw, top); x.lineTo(lx + tw, top); x.lineTo(lx + bw, base);
      x.closePath();
      x.fill();
      x.fillStyle = 'rgba(120,40,34,0.45)';
      for (const f of [0.22, 0.58]) {
        const y0 = base + (top - base) * f, y1 = base + (top - base) * (f + 0.12);
        const w0 = bw + (tw - bw) * f, w1 = bw + (tw - bw) * (f + 0.12);
        x.beginPath();
        x.moveTo(lx - w0, y0); x.lineTo(lx - w1, y1); x.lineTo(lx + w1, y1); x.lineTo(lx + w0, y0);
        x.closePath();
        x.fill();
      }
      x.fillStyle = 'rgba(255,200,120,0.55)';
      for (const f of [0.35, 0.75]) x.fillRect(lx - W * 0.004, base + (top - base) * f, W * 0.008, H * 0.018);
      x.fillStyle = '#0c0d12';
      x.fillRect(lx - tw * 1.45, top - H * 0.006, tw * 2.9, H * 0.012);
      x.strokeStyle = 'rgba(160,160,170,0.35)';
      x.lineWidth = D;
      x.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = lx - tw * 1.4 + (i / 8) * tw * 2.8;
        x.moveTo(px, top - H * 0.006); x.lineTo(px, top - H * 0.026);
      }
      x.moveTo(lx - tw * 1.4, top - H * 0.026); x.lineTo(lx + tw * 1.4, top - H * 0.026);
      x.stroke();
      const lampTop = ly - H * 0.03;
      x.fillStyle = '#0c0d12';
      x.beginPath();
      x.moveTo(lx - tw * 1.05, lampTop);
      x.quadraticCurveTo(lx, lampTop - H * 0.05, lx + tw * 1.05, lampTop);
      x.closePath();
      x.fill();
      x.fillRect(lx - D, lampTop - H * 0.05, D * 2, H * 0.016);
    }

    const SEA_STEP = 0.085, SEA_ROWS = 34;

    this.render = function (dt, t) {
      const hz = H * 0.7;
      const lx = W * 0.62, ly = H * 0.31;
      const ang = t * 0.6;
      let g;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(cached(st, 'sky', W, H, (x) => {
        let gg = x.createLinearGradient(0, 0, 0, hz);
        gg.addColorStop(0, '#03050a');
        gg.addColorStop(0.65, '#0a1120');
        gg.addColorStop(1, '#1d1a22');
        x.fillStyle = gg;
        x.fillRect(0, 0, W, hz + 1);
        gg = x.createLinearGradient(0, hz, 0, H);
        gg.addColorStop(0, '#0d1420');
        gg.addColorStop(1, '#020305');
        x.fillStyle = gg;
        x.fillRect(0, hz, W, H - hz);
      }), 0, 0);

      // yıldızlar
      const ss = sprite('230,235,255', 0.35);
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * s.s + s.ph));
        const r = s.r * 3;
        ctx.drawImage(ss, s.x - r, s.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;

      // ışık huzmeleri
      ctx.globalCompositeOperation = 'lighter';
      for (const off of [0, Math.PI]) {
        const a = ang + off;
        const dx = Math.sin(a);
        const toward = Math.cos(a);
        const len = W * 1.4 * Math.max(0.15, Math.abs(dx));
        const spread = 0.07 + (1 - Math.abs(dx)) * 0.3;
        const ex = lx + Math.sign(dx || 1) * len;
        const alpha = (toward > 0 ? 0.3 : 0.16) * (0.4 + 0.6 * Math.abs(dx));
        g = ctx.createLinearGradient(lx, ly, ex, ly);
        g.addColorStop(0, 'rgba(255,226,160,' + alpha + ')');
        g.addColorStop(1, 'rgba(255,226,160,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(lx, ly - H * 0.008);
        ctx.lineTo(ex, ly - len * spread);
        ctx.lineTo(ex, ly + len * spread * 0.6);
        ctx.lineTo(lx, ly + H * 0.008);
        ctx.closePath();
        ctx.fill();
      }

      // denizdeki yakamoz — çizgiler saydamlık/kalınlık gruplarına toplanıp grup başına tek seferde çiziliyor
      const flare = Math.pow(Math.max(0, Math.cos(ang)), 6);
      const beamX = lx + Math.sin(ang) * W * 0.5;
      const buckets = {};
      for (let i = 0; i < SEA_ROWS; i++) {
        const f = i / SEA_ROWS;
        const y = hz + Math.pow(f, 1.6) * (H - hz) + 2 * D;
        const segs = 9 + Math.round(i * 1.3);
        const len = W * (0.01 + f * 0.04);
        const wk = f < 0.5 ? 0 : 1;
        for (let s = 0; s < segs; s++) {
          const x = ((s + 0.5) / segs) * W + Math.sin(t * 0.8 + i * 1.7 + s) * W * 0.02;
          const near = Math.exp(-Math.pow((x - lx) / (W * 0.08 + f * W * 0.12), 2));
          const nearBeam = Math.exp(-Math.pow((x - beamX) / (W * 0.25), 2)) * 0.5;
          const shimmer = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 2.3 + s * 4.1);
          const lvl = Math.round(((0.03 + near * (0.35 + flare * 0.4) + nearBeam * 0.15) * shimmer) / SEA_STEP);
          if (lvl < 1) continue;
          const key = wk * 100 + lvl;
          const p = buckets[key] || (buckets[key] = new Path2D());
          p.moveTo(x - len, y);
          p.lineTo(x + len, y);
        }
      }
      ctx.strokeStyle = 'rgb(255,214,150)';
      for (const key in buckets) {
        ctx.globalAlpha = Math.min(1, (key % 100) * SEA_STEP);
        ctx.lineWidth = Math.max(1, D * (key >= 100 ? 1.6 : 0.9));
        ctx.stroke(buckets[key]);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      ctx.drawImage(cached(st, 'fore', W, H, (x) => drawFore(x, hz, lx, ly)), 0, 0);

      // fener odası ışığı
      const top = ly + H * 0.045, tw = W * 0.034, lampTop = ly - H * 0.03;
      ctx.fillStyle = 'rgba(255,220,150,' + (0.75 + flare * 0.25) + ')';
      ctx.fillRect(lx - tw * 0.85, lampTop, tw * 1.7, top - H * 0.006 - lampTop);
      ctx.strokeStyle = 'rgba(20,20,26,0.9)';
      ctx.lineWidth = D * 1.4;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const px = lx - tw * 0.85 + (i / 4) * tw * 1.7;
        ctx.moveTo(px, lampTop); ctx.lineTo(px, top - H * 0.006);
      }
      ctx.stroke();

      // parlama
      ctx.globalCompositeOperation = 'lighter';
      const fr = W * (0.07 + flare * 0.45);
      g = ctx.createRadialGradient(lx, ly, 0, lx, ly, fr);
      g.addColorStop(0, 'rgba(255,240,200,' + (0.55 + flare * 0.45) + ')');
      g.addColorStop(0.25, 'rgba(255,200,120,' + (0.2 + flare * 0.3) + ')');
      g.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - fr, ly - fr, fr * 2, fr * 2);
      if (flare > 0.05) {
        ctx.fillStyle = 'rgba(255,230,180,' + flare * 0.25 + ')';
        ctx.fillRect(lx - W, ly - D, W * 2, D * 2);
      }
      // sis
      const fs = sprite('150,165,200', 0.5);
      for (let i = 0; i < 5; i++) {
        const x = ((t * 12 * D + i * W * 0.31) % (W * 1.6)) - W * 0.3;
        ctx.globalAlpha = 0.05;
        ctx.drawImage(fs, x - W * 0.3, hz - H * 0.08 + i * 4 * D, W * 0.6, H * 0.14);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
  };

  /* ==========================================================
     İMLEÇ İZİ + SPREY BUĞUSU (ekranın üstünde)
     ========================================================== */
  F.CursorFX = function (canvas, opts) {
    const ctx = canvas.getContext('2d');
    let W = 1, H = 1, D = 1;
    const pts = [], sparks = [], mist = [];
    let rgb = '76,224,232';
    let mistRgb = '250,248,244';
    let dirty = true;
    const enabled = !(opts && opts.reduced) && window.matchMedia('(pointer: fine)').matches;

    // tam ekran, her şeyin üstünde duran katman: 1x çözünürlük yeterli ve birleştirme maliyeti düşük
    this.resize = function () { const f = fit(canvas, 1); W = f.w; H = f.h; D = f.d; dirty = true; };
    this.setColor = function (hex) {
      const c = hexToRgb(hex);
      rgb = Math.round(c[0] * 0.45 + 255 * 0.55) + ',' + Math.round(c[1] * 0.45 + 255 * 0.55) + ',' + Math.round(c[2] * 0.45 + 255 * 0.55);
      mistRgb = Math.round(c[0] * 0.1 + 250 * 0.9) + ',' + Math.round(c[1] * 0.1 + 248 * 0.9) + ',' + Math.round(c[2] * 0.1 + 244 * 0.9);
    };

    if (enabled) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        // Deniz girdabı yalnızca sahne üzerinde görünsün; menü ve seçim
        // kontrollerinin okunabilirliğini kapatmasın.
        if (e.target && e.target.closest && e.target.closest('header, nav, button, a, input, form')) return;
        const x = e.clientX * D, y = e.clientY * D;
        const last = pts[pts.length - 1];
        pts.push({ x, y, t: performance.now() });
        const sp = last ? Math.hypot(x - last.x, y - last.y) : 0;
        const n = Math.min(4, Math.floor(sp / (14 * D)) + (Math.random() < 0.4 ? 1 : 0));
        for (let i = 0; i < n; i++) {
          // Fare hareketi artık yıldız parıltısı değil, suya düşen damlanın halkası.
          sparks.push({ x: x + rand(-4, 4) * D, y: y + rand(-4, 4) * D, life: 0, max: rand(0.7, 1.35), r: rand(2, 7) * D, speed: rand(34, 76) * D, wobble: rand(0, TAU) });
        }
        if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
      }, { passive: true });
    }

    /* Sprey: gerçek bir atomizörün davranışı.
       Nozülden dar bir koni (yaklaşık 25°) halinde çok hızlı çıkar, hava 0,2-0,4 sn içinde
       jeti durdurur; geriye havada asılı, yavaşça sürüklenip incelen ince bir bulut kalır.
       - drops: görülebilen mikro damlacıklar (nokta boyutunda, ışığı yakalar)
       - mist : koninin içinde genişleyen aerosol
       Parlama, kalın çizgi ya da dev duman yok; renk parfümden çok az pay alır. */
    const drops = [];
    let dropAcc = 0, cloudAcc = 0;
    // sahne karardığında sprey onunla birlikte sönsün
    let sprayAlpha = 1;
    this.setSprayAlpha = function (a) { sprayAlpha = a; };
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const sizeK = () => clamp(H / D / 850, 0.6, 1.35);   // ekran boyuna göre ölçek

    // Bulut düşük çözünürlüklü ayrı katmanda çizilir (zaten bulanık)
    const MS = 0.34;
    const mistCanvas = document.createElement('canvas');
    const mctx = mistCanvas.getContext('2d');
    let mistDirty = false;

    this.spray = function (x, y, dirX, dirY, amount, dt) {
      if (amount <= 0) return;
      const k = sizeK();
      const base = Math.atan2(dirY, dirX);
      const dcx = Math.cos(base);

      cloudAcc += amount * 720 * dt;
      while (cloudAcc >= 1) {
        cloudAcc -= 1;
        if (mist.length >= 520) continue;
        const off = gauss();
        const ang = base + off * 0.42;
        const core = 1 - Math.abs(off) * 0.45;      // eksen hızlı, kenarlar yavaş
        const sp = (260 + 2100 * Math.pow(Math.random(), 1.35)) * k * core;
        const ad = Math.random() * dt;               // kare içine yay: topaklanma olmasın
        mist.push({
          x: x + Math.cos(ang) * sp * ad, y: y + Math.sin(ang) * sp * ad,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, drag: rand(6, 8.5),
          life: 0, max: rand(0.8, 2.3), r0: rand(1.4, 4) * k, grow: rand(0.07, 0.2),
          a: rand(0.03, 0.085), seed: rand(0, TAU), dist: 0, dx: dcx
        });
      }

      dropAcc += amount * 3400 * dt;
      while (dropAcc >= 1) {
        dropAcc -= 1;
        if (drops.length >= 2400) continue;
        const off = gauss();
        const ang = base + off * 0.46;
        const core = 1 - Math.abs(off) * 0.4;
        const sp = (380 + 2500 * Math.pow(Math.random(), 1.2)) * k * core;
        const ad = Math.random() * dt;
        drops.push({
          x: x + Math.cos(ang) * sp * ad, y: y + Math.sin(ang) * sp * ad,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, drag: rand(5.5, 9),
          life: 0, max: rand(0.3, 1.25), a: rand(0.12, 0.8), fall: rand(5, 42), seed: rand(0, TAU)
        });
      }
    };

    this.render = function (dt) {
      const now = performance.now();
      while (pts.length && now - pts[0].t > 380) pts.shift();
      const active = pts.length > 1 || sparks.length || mist.length || drops.length;
      if (!active && !dirty) return;
      ctx.clearRect(0, 0, W, H);
      dirty = !!active;
      const k = sizeK();

      // sis bulutu (normal karışım: üst üste binince yoğun, beyaz bir duman oluşur)
      if (mist.length || mistDirty) {
        const mw = Math.max(1, Math.ceil((W / D) * MS)), mh = Math.max(1, Math.ceil((H / D) * MS));
        if (mistCanvas.width !== mw || mistCanvas.height !== mh) { mistCanvas.width = mw; mistCanvas.height = mh; }
        mctx.clearRect(0, 0, mw, mh);
        const ms = sprite(mistRgb, 0.05);
        for (let i = mist.length - 1; i >= 0; i--) {
          const m = mist[i];
          m.life += dt;
          const f = m.life / m.max;
          if (f >= 1) { mist[i] = mist[mist.length - 1]; mist.pop(); continue; }
          // jet hızı havada çabucak söner; kalan bulut havayla sürüklenir
          const drag = Math.exp(-m.drag * dt);
          m.vx *= drag;
          m.vy *= drag;
          const flowX = (Math.sin(m.y * 0.017 + m.life * 0.9 + m.seed) * 20 + Math.sin(m.y * 0.052 - m.life * 1.6) * 11) * k + m.dx * 10 * k;
          const flowY = (Math.cos(m.x * 0.015 - m.life * 0.7 + m.seed * 1.3) * 16 + Math.cos(m.x * 0.047 + m.life * 1.3) * 9) * k + 2.5 * k;
          const sx = (m.vx + flowX) * dt, sy = (m.vy + flowY) * dt;
          m.x += sx;
          m.y += sy;
          m.dist += Math.hypot(sx, sy);
          // türbülanslı jet: genişlik kat edilen yolla orantılı, sonra yavaşça yayılır
          const r = (m.r0 + m.dist * m.grow + m.life * 20 * k) * MS;
          const thin = 1 / (1 + m.dist * 0.0045);
          mctx.globalAlpha = Math.min(1, m.a * thin * Math.min(1, f * 26) * Math.pow(1 - f, 1.5));
          mctx.drawImage(ms, m.x * MS - r, m.y * MS - r, r * 2, r * 2);
        }
        mctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = sprayAlpha;
        ctx.drawImage(mistCanvas, 0, 0, W, H);
        mistDirty = mist.length > 0;
      }

      ctx.globalCompositeOperation = 'lighter';

      // ince damlacıklar: dört parlaklık kümesinde toplu çizilir, binlercesi bile hafif kalır
      if (drops.length) {
        const buckets = [[], [], [], []];
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.life += dt;
          const f = d.life / d.max;
          if (f >= 1) { drops[i] = drops[drops.length - 1]; drops.pop(); continue; }
          const drag = Math.exp(-d.drag * dt);
          d.vx *= drag;
          d.vy = d.vy * drag + d.fall * k * dt;
          d.x += (d.vx + Math.sin(d.y * 0.021 + d.seed + d.life) * 14 * k) * dt;
          d.y += (d.vy + Math.cos(d.x * 0.018 + d.seed) * 10 * k) * dt;
          const tw = 0.62 + 0.38 * Math.sin(d.life * 34 + d.seed);    // ışığı yakalayan damla göz kırpar
          const al = d.a * Math.pow(1 - f, 1.4) * tw;
          const b = al > 0.5 ? 3 : al > 0.28 ? 2 : al > 0.12 ? 1 : 0;
          buckets[b].push(d);
        }
        const levels = [0.09, 0.2, 0.38, 0.62];
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgb(' + mistRgb + ')';
        ctx.lineWidth = Math.max(0.7, 0.85 * D);
        for (let b = 0; b < 4; b++) {
          if (!buckets[b].length) continue;
          ctx.globalAlpha = levels[b] * sprayAlpha;
          ctx.beginPath();
          for (const d of buckets[b]) {
            // deklanşör izi: yalnızca hızlıyken çok kısa uzar, yavaşlayınca nokta olur
            const x1 = d.x * D, y1 = d.y * D;
            ctx.moveTo(x1 - d.vx * 0.0035 * D, y1 - d.vy * 0.0035 * D - 0.01);
            ctx.lineTo(x1, y1);
          }
          ctx.stroke();
        }
      }

      // iz
      if (pts.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const k = 1 - (now - b.t) / 380;
          if (k <= 0) continue;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.32 * k * k).toFixed(3) + ')';
          ctx.lineWidth = (0.8 + 5 * k * k) * D;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        const h = pts[pts.length - 1];
        const hs = sprite(rgb, 0.3);
        ctx.globalAlpha = 0.5 * Math.max(0, 1 - (now - h.t) / 380);
        ctx.drawImage(hs, h.x - 16 * D, h.y - 16 * D, 32 * D, 32 * D);
      }

      // Deniz girdabı: mevcut fıs fıs parçacıklarına dokunmadan, fare izindeki yıldızları su halkasına çevirir.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        const f = s.life / s.max;
        if (f >= 1) { sparks.splice(i, 1); continue; }
        const wave = s.r + s.speed * s.life;
        const pulse = 0.72 + 0.28 * Math.sin(s.life * 15 + s.wobble);
        ctx.globalAlpha = (1 - f) * 0.42 * pulse;
        ctx.strokeStyle = 'rgba(' + rgb + ',1)';
        ctx.lineWidth = Math.max(0.7, (1 - f) * 1.8 * D);
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, wave * 1.65, wave * 0.56, Math.sin(s.wobble) * 0.35, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = (1 - f) * 0.16;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, wave * 0.72, wave * 0.24, Math.sin(s.wobble) * 0.35, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
  };

  /* ==========================================================
     WebGL yoksa yedek şişe (SVG)
     ========================================================== */
  F.bottleSVG = function (p) {
    const id = p.id + Math.random().toString(36).slice(2, 7);
    return '<svg class="card__svg" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<radialGradient id="g' + id + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="' + p.cardGlow + '"/><stop offset="1" stop-color="' + p.cardBg + '"/></radialGradient>' +
      '<linearGradient id="l' + id + '" x1="0" x2="1"><stop offset="0" stop-color="' + p.liquid + '"/><stop offset=".5" stop-color="' + p.liquid + '" stop-opacity=".78"/><stop offset="1" stop-color="' + p.liquid + '"/></linearGradient>' +
      '<linearGradient id="p' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe8"/><stop offset="1" stop-color="#b9b1a6"/></linearGradient>' +
      '</defs>' +
      '<rect width="400" height="520" fill="url(#g' + id + ')"/>' +
      '<rect y="372" width="400" height="148" fill="#000" opacity=".3"/>' +
      '<rect x="80" y="380" width="240" height="26" fill="url(#p' + id + ')"/>' +
      '<ellipse cx="200" cy="406" rx="120" ry="20" fill="#b9b1a6"/>' +
      '<ellipse cx="200" cy="380" rx="120" ry="20" fill="#f6f2ec"/>' +
      '<rect x="122" y="196" width="156" height="186" rx="16" fill="url(#l' + id + ')" stroke="rgba(255,255,255,.35)"/>' +
      '<rect x="144" y="230" width="112" height="122" rx="4" fill="rgba(255,255,255,.06)" stroke="rgba(255,235,210,.25)"/>' +
      '<text x="200" y="280" text-anchor="middle" font-family="Newsreader, Georgia, serif" font-style="italic" font-size="32" fill="#d9b26a">F</text>' +
      '<text x="200" y="310" text-anchor="middle" font-family="Newsreader, Georgia, serif" font-size="14" fill="#f4e9da">' + p.name + '</text>' +
      '<text x="200" y="332" text-anchor="middle" font-family="Inter, sans-serif" font-size="6" letter-spacing="1.5" fill="#f4e9da" opacity=".7">EAU DE PARFUM</text>' +
      '<rect x="176" y="184" width="48" height="12" rx="2" fill="#c9a258"/>' +
      '<rect x="166" y="128" width="68" height="58" rx="8" fill="' + p.cap + '" stroke="rgba(255,255,255,.2)"/>' +
      '</svg>';
  };
})();
