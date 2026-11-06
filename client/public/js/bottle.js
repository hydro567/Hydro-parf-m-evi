/* ==========================================================
   Hydro Parfüm — kodla çizilmiş 3D parfüm şişesi (Three.js)
   Fotoğraf ya da hazır model yok: cam, sıvı, etiket, kapak ve
   kaide tamamen burada üretiliyor.
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const TAU = Math.PI * 2;
  const hydroLogoImage = new Image();
  hydroLogoImage.src = 'hydro-trident.png';
  F.hydroLogoImage = hydroLogoImage;

  /* Şişe ölçüleri (dünya birimi) */
  const BW = 1.34, BH = 1.62, BD = 0.66;      // gövde
  const PR = 1.2, PH = 0.3;                   // kaide
  const LABEL_W = BW * 0.64, LABEL_H = BH * 0.64;
  F.BOTTLE = { BW, BH, BD, PR, PH };

  /* ---------- Etiket (canvas) ---------- */
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function drawMonogram(x, cx, cy, s, gold) {
    x.save();
    x.translate(cx, cy);
    x.strokeStyle = gold;
    x.lineWidth = s * 0.055;
    x.lineCap = 'round';
    x.beginPath(); x.moveTo(-s * 0.42, s * 0.28); x.lineTo(-s * 0.25, -s * 0.3); x.moveTo(0, s * 0.3); x.lineTo(0, -s * 0.48); x.moveTo(s * 0.42, s * 0.28); x.lineTo(s * 0.25, -s * 0.3); x.stroke();
    x.beginPath(); x.moveTo(-s * 0.38, s * 0.28); x.lineTo(s * 0.38, s * 0.28); x.moveTo(s * 0.38, s * 0.28); x.lineTo(s * 0.27, s * 0.52); x.stroke();
    x.restore();
  }
  F.drawMonogram = drawMonogram;

  /* ---------- Sahne ---------- */
  F.createStage = function (THREE, canvas, perfumes) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Yüksek yoğunluklu ekranlarda (1.5x ve üstü) pikseller zaten küçük; ayrıca kenar yumuşatma (MSAA) gereksiz yük
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' });
    // çözünürlük: başta en fazla 1.5x; kare süresi uzarsa main.js setQuality ile düşürür
    let DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(DPR);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
    const size = { w: 1, h: 1 };

    /* Stüdyo ortam ışığı — yansımalar için sanal softbox'lar */
    (function buildEnvironment() {
      const env = new THREE.Scene();
      env.add(new THREE.Mesh(
        new THREE.BoxGeometry(24, 14, 24),
        new THREE.MeshBasicMaterial({ color: 0x0b0908, side: THREE.BackSide })
      ));
      const panel = (w, h, pos, rot, intensity, tint) => {
        const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        env.add(mesh);
      };
      panel(1.6, 9, [-6.5, 1, 1.5], [0, Math.PI / 2, 0], 7, 0xffffff);   // sol şerit
      panel(1.1, 9, [6.5, 1, -0.5], [0, -Math.PI / 2, 0], 4.5, 0xfff0dd); // sağ şerit
      panel(9, 5, [0, 6.9, 0.5], [Math.PI / 2, 0, 0], 2.6, 0xffffff);     // tavan
      panel(7, 4, [0, 1.5, -11.5], [0, 0, 0], 1.4, 0xffb27a);             // sıcak arka
      panel(5, 2.5, [1.5, 0.5, 11.5], [0, Math.PI, 0], 1.6, 0xffffff);    // ön dolgu
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(env, 0.03).texture;
      pmrem.dispose();
    })();

    /* Arka plan (shader) — cam içinde kırılsın diye WebGL'de çiziliyor */
    const bgU = {
      uBg: { value: new THREE.Color(F.hero.bg) },
      uGlow: { value: new THREE.Color(F.hero.glow) },
      uGlowPos: { value: new THREE.Vector2(0.7, 0.6) },
      uFloorPos: { value: new THREE.Vector2(0.7, 0.2) },
      uBeamPos: { value: new THREE.Vector2(0.7, 0.75) },
      uHorizon: { value: 0.3 },
      uAspect: { value: 1.6 },
      uTime: { value: 0 },
      uBeam: { value: 1 },
      uDim: { value: 1 }
    };
    const bgMat = new THREE.ShaderMaterial({
      uniforms: bgU,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uBg; uniform vec3 uGlow;
        uniform vec2 uGlowPos; uniform vec2 uFloorPos; uniform vec2 uBeamPos;
        uniform float uHorizon; uniform float uAspect; uniform float uTime; uniform float uBeam; uniform float uDim;
        varying vec2 vUv;
        float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        void main() {
          vec2 uv = vUv;
          vec2 asp = vec2(uAspect, 1.0);
          vec3 col = uBg * (0.45 + 0.7 * smoothstep(-0.1, 1.1, uv.y));

          vec2 d = (uv - uGlowPos) * asp;
          col += uGlow * exp(-dot(d, d) * 1.45) * 0.95;
          vec2 d2 = (uv - vec2(0.12, 0.98)) * asp;
          col += uGlow * 0.14 * exp(-dot(d2, d2) * 1.1);

          // zemin
          float fm = smoothstep(uHorizon + 0.015, uHorizon - 0.04, uv.y);
          vec2 fd = (uv - uFloorPos) * vec2(uAspect * 0.5, 3.0);
          float pool = exp(-dot(fd, fd) * 2.0);
          vec3 floorCol = uBg * (0.28 + 0.3 * smoothstep(0.0, uHorizon, uv.y)) + uGlow * pool * 0.8;
          col = mix(col, floorCol, fm);
          col += uGlow * 0.12 * exp(-pow((uv.y - uHorizon) * 50.0, 2.0)) * exp(-pow((uv.x - uFloorPos.x) * 1.4, 2.0));

          // deniz feneri huzmesi
          if (uBeam > 0.001) {
            vec2 b = (uv - uBeamPos) * asp;
            float r = length(b);
            float ang = atan(b.y, b.x);
            float a0 = 1.5708 + sin(uTime * 0.3) * 1.15;
            float da = mod(ang - a0 + 3.14159, 6.28318) - 3.14159;
            float beam = exp(-da * da * 16.0) * smoothstep(0.03, 0.3, r) * exp(-r * 0.7);
            col += mix(uGlow, vec3(1.0, 0.85, 0.62), 0.6) * beam * 0.26 * uBeam * step(uHorizon, uv.y);
          }

          vec2 q = (uv - 0.5) * vec2(1.0, 1.1);
          col *= 1.0 - dot(q, q) * 0.9;
          col *= uDim;
          gl_FragColor = vec4(max(col, 0.0), 1.0);
          #include <colorspace_fragment>
          gl_FragColor.rgb += (hash(uv * vec2(1931.0, 1087.0) + fract(uTime * 7.13)) - 0.5) * 0.022;
        }
      `
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -100;
    scene.add(bg);

    /* ---------- Geometri yardımcıları ---------- */
    function radialTexture(stops, sx, sy) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.save();
      x.translate(128, 128);
      x.scale(sx || 1, sy || 1);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 128);
      stops.forEach((s) => g.addColorStop(s[0], s[1]));
      x.fillStyle = g;
      x.fillRect(-128 / (sx || 1), -128 / (sy || 1), 256 / (sx || 1), 256 / (sy || 1));
      x.restore();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    /* ---------- Malzemeler ---------- */
    const p0 = perfumes[0];

    // Not: Physical + clearcoat yerine Standard malzeme — piksel başına neredeyse yarı maliyet,
    // yansımalar ortam ışığı yoğunluğu artırılarak telafi ediliyor.
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0,
      roughness: 0.03,
      envMapIntensity: 4.2,
      transparent: true,
      depthWrite: false
    });
    glassMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float fres = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.4);
        float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
        gl_FragColor.a = clamp(0.04 + fres * 0.6 + lum * 0.9, 0.0, 0.96);`);
    };

    /* Sıvı: gerçek ışık geçirgenliği (transmission) sahneyi her karede iki kez çizdiriyordu.
       Yerine tek geçişte "arkadan aydınlanan sıvı" görünümü veren hafif bir shader kullanıyoruz:
       ortası ve üstü parlak, kenarları koyu, yüzeyi parlak. */
    const liqU = { uWave: { value: 0.12 }, uTime: { value: 0 }, uTop: { value: 1 }, uGrad: { value: 0 } };
    const liqCur = new THREE.Color(p0.liquid);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: liqCur.clone().multiplyScalar(0.55),
      metalness: 0,
      roughness: 0.1,
      emissive: liqCur.clone(),
      emissiveIntensity: 0.62,
      envMapIntensity: 1.25,
      transparent: true,
      opacity: 0.94
    });
    const WHITE = new THREE.Color(1, 1, 1);
    function applyLiquid() {
      liquidMat.color.copy(liqCur).multiplyScalar(0.55);
      liquidMat.emissive.copy(liqCur);
    }
    liquidMat.onBeforeCompile = (sh) => {
      sh.uniforms.uWave = liqU.uWave;
      sh.uniforms.uTime = liqU.uTime;
      sh.uniforms.uTop = liqU.uTop;
      sh.uniforms.uGrad = liqU.uGrad;
      sh.vertexShader = 'uniform float uWave;\nuniform float uTime;\nuniform float uTop;\nvarying float vLiqY;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float wTop = smoothstep(uTop - 0.24, uTop, position.y);
          transformed.y += wTop * uWave * (
            sin(position.x * 4.2 + uTime * 3.1) * 0.07 +
            sin(position.z * 6.0 - uTime * 2.3) * 0.035 +
            sin(position.x * 9.5 - uTime * 5.4) * 0.016);
          vLiqY = position.y / uTop;`);
      sh.fragmentShader = 'uniform float uGrad;\nvarying float vLiqY;\n' +
        sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
          float body = mix(0.22, 1.0, pow(facing, 1.3)) * mix(0.5, 1.3, smoothstep(0.0, 0.95, vLiqY));
          float band = exp(-pow((vLiqY - 0.8) * 7.0, 2.0)) * facing * 0.35;
          totalEmissiveRadiance *= body + band;
          // uGrad: dipte koyu, yukarı doğru açılıp saydamlaşan sıvı (form başına)
          float gradK = smoothstep(0.02, 0.98, vLiqY);
          totalEmissiveRadiance *= mix(1.0, mix(0.2, 1.9, gradK), uGrad);
          diffuseColor.rgb *= mix(1.0, mix(0.35, 1.0, gradK), uGrad);`)
          .replace('#include <opaque_fragment>', `#include <opaque_fragment>
          gl_FragColor.a *= mix(1.0, mix(1.0, 0.38, smoothstep(0.45, 1.0, vLiqY)), uGrad);`);
    };
    liquidMat.customProgramCacheKey = () => 'hydro-liquid';

    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0807, metalness: 0.3, roughness: 0.4 });
    // sıvının içinden görünsün diye derinlik testi kapalı, sıvıdan sonra çizilir
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf2e6dc, transparent: true, opacity: 0.2, depthTest: false, depthWrite: false });
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0xefe9e1,
      roughness: 0.4,
      envMapIntensity: 1.05,
      side: THREE.DoubleSide
    });

    /* ---------- Model ---------- */
    const root = new THREE.Group();
    scene.add(root);

    // kaide
    const pts = [];
    const e = 0.04;
    pts.push(new THREE.Vector2(0, -PH));
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(PR - e + Math.cos(a) * e, -PH + e + Math.sin(a) * e));
    }
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(PR - e + Math.cos(a) * e, -e + Math.sin(a) * e));
    }
    pts.push(new THREE.Vector2(0, 0));
    const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pts, 120), pedMat);
    root.add(pedestal);

    // gölge + renkli ışık yansıması (kaide üstü)
    const shadowTex = (function () {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.filter = 'blur(18px)';
      x.fillStyle = 'rgba(0,0,0,0.9)';
      rr(x, 56, 74, 144, 108, 20);
      x.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(BW * 1.85, BD * 2.7),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.75, toneMapped: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    root.add(shadow);

    const causticMat = new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']], 1, 1),
      color: new THREE.Color(p0.accent),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.55
    });
    const caustic = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), causticMat);
    caustic.rotation.x = -Math.PI / 2;
    caustic.position.set(0.05, 0.004, BD / 2 + 0.42);
    root.add(caustic);

    // şişe: her koku kendi formunda (bottle-forms.js)
    const bottle = new THREE.Group();
    root.add(bottle);
    const forms = F.buildBottleForms(THREE, { glassMat, liquidMat, tubeMat, darkMat, perfumes, renderer });
    forms.forEach((f) => bottle.add(f.group));
    let form = forms[0];
    function showForm(i) {
      form.group.visible = false;
      form = forms[i];
      form.group.visible = true;
      liqU.uTop.value = form.liqTop;
      liqU.uGrad.value = form.liqGrad || 0;
      shadow.scale.set(form.shadow[0], form.shadow[1], 1);
    }
    showForm(0);

    // logo ve yazı tipleri geç yüklenirse etiketleri yeniden bas
    const refreshLabels = () => forms.forEach((f) => f.refreshLabel());
    if (!hydroLogoImage.complete) hydroLogoImage.onload = refreshLabels;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshLabels);

    const PRESS_DEPTH = 0.085;
    let press = 0;
    let capOpenTarget = 0;
    let capOpenAmount = 0;

    /* ---------- Işıklar ---------- */
    scene.add(new THREE.HemisphereLight(0xfff3e6, 0x1a0d08, 0.4));
    // ayrı tepe spot ışığı kaldırıldı (bir ışık daha = her pikselde bir hesap daha); anahtar ışık güçlendirildi
    const key = new THREE.DirectionalLight(0xfff6ec, 2.3);
    key.position.set(-2.5, 7, 4.5);
    scene.add(key);
    const rimL = new THREE.PointLight(0xffffff, 14, 14, 2);
    rimL.position.set(-2.8, 2.6, -2.4);
    scene.add(rimL);
    const rimR = new THREE.PointLight(0xffffff, 18, 14, 2);
    rimR.position.set(2.9, 2.1, -2.2);
    scene.add(rimR);

    /* ---------- Durum ---------- */
    const target = { shiftX: 0.2, shiftY: 0, camZ: 9.6, camY: 1.75, lookY: 1.08, rotY: -0.42, cap: 0, beam: 1, intro: 0 };
    const cur = Object.assign({}, target);
    let scrollShift = 0;

    const colT = { bg: new THREE.Color(F.hero.bg), glow: new THREE.Color(F.hero.glow) };
    const liqTarget = new THREE.Color(p0.liquid);
    const accTarget = new THREE.Color(p0.accent);
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };

    let perfIdx = 0, desired = 0, spinT = 1, spinAngle = 0, swapped = true;

    function applyPerfumeInstant(i) {
      const p = perfumes[i];
      perfIdx = desired = i;
      spinT = 1; spinAngle = 0; swapped = true;
      showForm(i);
      liqTarget.set(p.liquid); liqCur.copy(liqTarget); applyLiquid();
      accTarget.set(p.accent); causticMat.color.copy(accTarget);
    }

    function startSpin() {
      spinT = 0;
      swapped = false;
      const p = perfumes[desired];
      liqTarget.set(p.liquid);
      accTarget.set(p.accent);
    }

    function setPerfume(i, instant) {
      capOpenTarget = 0;
      if (instant) capOpenAmount = 0;
      if (instant) { applyPerfumeInstant(i); return; }
      if (i === desired) return;
      desired = i;
      if (spinT >= 1) startSpin();
      else if (!swapped) {
        const p = perfumes[desired];
        liqTarget.set(p.liquid); accTarget.set(p.accent);
      }
    }

    function setColors(bgHex, glowHex, instant) {
      colT.bg.set(bgHex);
      colT.glow.set(glowHex);
      if (instant) { bgU.uBg.value.copy(colT.bg); bgU.uGlow.value.copy(colT.glow); }
    }

    function setTarget(o) { Object.assign(target, o); }
    function snap() { Object.assign(cur, target); }

    /* ---------- Projeksiyon yardımcıları ---------- */
    const v3 = new THREE.Vector3();
    function toUv(x, y, z, out) {
      v3.set(x, y, z);
      root.localToWorld(v3);
      v3.project(camera);
      out.set((v3.x + 1) / 2, (v3.y + 1) / 2);
      return out;
    }
    const tmp2 = new THREE.Vector2();
    function updateBgProjection(aspect) {
      bgU.uAspect.value = aspect;
      toUv(0, 1.15, -1.6, bgU.uGlowPos.value);
      toUv(0, -PH, 0.15, bgU.uFloorPos.value);
      toUv(0, BH + 0.55, -1.4, bgU.uBeamPos.value);
      bgU.uHorizon.value = toUv(0, -PH, -2.4, tmp2).y;
    }

    function resize() {
      size.w = window.innerWidth;
      size.h = window.innerHeight;
      renderer.setPixelRatio(DPR);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
    }
    resize();

    /* ---------- Kare güncelleme ---------- */
    function update(dt, time) {
      for (const k in target) cur[k] = damp(cur[k], target[k], k === 'intro' ? 1.4 : 4.5, dt);
      mouse.sx = damp(mouse.sx, mouse.x, 2.5, dt);
      mouse.sy = damp(mouse.sy, mouse.y, 2.5, dt);

      const kc = 1 - Math.exp(-3 * dt);
      bgU.uBg.value.lerp(colT.bg, kc);
      bgU.uGlow.value.lerp(colT.glow, kc);
      rimL.color.copy(bgU.uGlow.value).lerp(WHITE, 0.35);
      rimR.color.copy(rimL.color);

      const kl = 1 - Math.exp(-2.4 * dt);
      liqCur.lerp(liqTarget, kl);
      applyLiquid();
      causticMat.color.lerp(accTarget, kl);

      // dönüş + etiket değişimi
      let wavePulse = 0, spinDip = 0;
      if (spinT < 1) {
        spinT = Math.min(1, spinT + dt / 1.25);
        spinAngle = easeInOut(spinT) * TAU;
        wavePulse = Math.sin(spinT * Math.PI) * 0.9;
        spinDip = Math.pow(Math.sin(spinT * Math.PI), 8) * 0.42;   // form değişimi dönüşün en hızlı anında, küçülerek gizlenir
        if (!swapped && spinT >= 0.5) {
          showForm(desired);
          perfIdx = desired;
          swapped = true;
        }
        if (spinT >= 1) {
          spinAngle = 0;
          if (desired !== perfIdx) startSpin();
        }
      }
      liqU.uTime.value = time;
      liqU.uWave.value = 0.1 + wavePulse + press * 0.24;

      root.position.y = (1 - cur.intro) * -0.4;
      bottle.rotation.y = cur.rotY + Math.sin(time * 0.45) * 0.06 + mouse.sx * 0.2 + spinAngle;
      capOpenAmount = damp(capOpenAmount, capOpenTarget, 5.5, dt);
      form.capGroup.position.set(-cur.cap * 0.4 + capOpenAmount * 0.32, form.capY + cur.cap * 2.0 + capOpenAmount * 0.72, cur.cap * 0.1);
      form.capGroup.rotation.set(cur.cap * 0.15, cur.cap * 0.7, -cur.cap * 0.35 - capOpenAmount * 0.22);
      form.actuator.position.y = -press * PRESS_DEPTH;
      // basınca şişe hafifçe kaideye çöker
      bottle.position.y = -press * 0.012;
      const sc = 1 - spinDip;
      bottle.scale.set(sc * (1 + press * 0.004), sc * (1 - press * 0.006), sc * (1 + press * 0.004));

      camera.position.set(mouse.sx * 0.28, cur.camY - mouse.sy * 0.16, cur.camZ);
      camera.lookAt(0, cur.lookY, 0);
      camera.setViewOffset(size.w, size.h, -cur.shiftX * size.w, (cur.shiftY + scrollShift) * size.h, size.w, size.h);
      camera.updateMatrixWorld();
      root.updateMatrixWorld();

      renderer.toneMappingExposure = 0.25 + 0.8 * cur.intro;
      bgU.uDim.value = 0.2 + 0.8 * cur.intro;
      bgU.uBeam.value = cur.beam;
      bgU.uTime.value = time;
      updateBgProjection(size.w / size.h);
    }

    function render() { renderer.render(scene, camera); }

    /* Sprey ağzının ekran konumu (CSS px): gerçek nozülden */
    function nozzleScreen() {
      v3.set(form.nozX, form.nozY - press * PRESS_DEPTH, 0);
      bottle.localToWorld(v3);
      v3.project(camera);
      return { x: (v3.x + 1) / 2 * size.w, y: (1 - v3.y) / 2 * size.h };
    }

    /* Nozülün baktığı yön (ekranda birim vektör): şişe dönerse jet de döner */
    function nozzleDir() {
      const a = nozzleScreen();
      v3.set(form.nozX + 0.5, form.nozY - press * PRESS_DEPTH, 0);
      bottle.localToWorld(v3);
      v3.project(camera);
      const dx = (v3.x + 1) / 2 * size.w - a.x, dy = (1 - v3.y) / 2 * size.h - a.y;
      const l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }

    /* Ürün kartları için tek kare görüntü */
    function snapshot(i, w, h) {
      const keepIdx = perfIdx;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();

      applyPerfumeInstant(i);
      const p = perfumes[i];
      root.position.y = 0;
      bottle.rotation.y = -0.34;
      bottle.position.y = 0;
      bottle.scale.set(1, 1, 1);
      form.actuator.position.y = 0;
      form.capGroup.position.set(0, form.capY, 0);
      form.capGroup.rotation.set(0, 0, 0);
      liqU.uWave.value = 0.08;
      camera.position.set(0, 1.45, 8.9);
      camera.lookAt(0, 0.9, 0);
      camera.updateMatrixWorld();
      root.updateMatrixWorld(true);

      bgU.uBg.value.set(p.cardBg);
      bgU.uGlow.value.set(p.cardGlow);
      bgU.uBeam.value = 0;
      bgU.uDim.value = 1;
      rimL.color.copy(bgU.uGlow.value).lerp(new THREE.Color(1, 1, 1), 0.35);
      rimR.color.copy(rimL.color);
      renderer.toneMappingExposure = 1.05;
      updateBgProjection(w / h);

      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/jpeg', 0.9);

      applyPerfumeInstant(keepIdx);
      bgU.uBg.value.copy(colT.bg);
      bgU.uGlow.value.copy(colT.glow);
      resize();
      return url;
    }

    return {
      renderer,
      update,
      render,
      resize,
      snapshot,
      setTarget,
      setColors,
      setPerfume,
      snap,
      nozzleScreen,
      nozzleDir,
      get neckY() { return form.H; },
      setScrollShift(v) { scrollShift = v; },
      setPress(v) { press = v; },
      setCapOpen(v) { capOpenTarget = v ? 1 : 0; },
      get capOpen() { return capOpenTarget > 0.5; },
      setQuality(pr) {
        const next = Math.min(pr, window.devicePixelRatio || 1);
        if (Math.abs(next - DPR) < 0.01) return;
        DPR = next;
        resize();
      },
      get quality() { return DPR; },
      pointer(x, y) { mouse.x = x; mouse.y = y; },
      get perfume() { return perfIdx; }
    };
  };
})();
