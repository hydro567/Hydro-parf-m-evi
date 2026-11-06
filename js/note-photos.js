/* ==========================================================
   Hydro Parfüm — nota kemerindeki gerçek fotoğraflar
   Kaynak: Wikimedia Commons. CC BY / CC BY-SA olanlarda eser sahibi ve lisans
   gösterilmek zorunda; bu bilgi nota bölümünde #notesCredit satırına yazılır.
   Fotoğraf yüklenemezse kemer eski çizim sahnesine düşer.
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const C = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
  const thumb = (path, file, w) => C + path + '/' + file + '/' + w + 'px-' + file;

  const LIST = {
    citrus: { path: '3/35', file: 'Bergamot_orange_-_Cross_section.jpg', by: 'Jacopo Werther', lic: 'CC BY-SA 3.0' },
    lotus: { path: 'f/f5', file: 'Lotus_flower_%28978659%29.jpg', by: 'Hong Zhang', lic: 'CC0' },
    cedar: { path: 'd/d8', file: 'Japanese_cedar_planks_diff_8k_%28JPG%29.jpg', by: 'Poly Haven', lic: 'CC0' },
    grapefruit: { path: '3/31', file: 'Grapefruit_cut.jpg', by: 'Jedesto', lic: 'CC BY-SA 4.0' },
    cinnamon: { path: 'c/c4', file: 'Cinnamon_sticks_%281%29.jpg', by: 'Fumikas Sagisavas', lic: 'CC0' },
    wood: { path: '9/99', file: 'Sandal_and_tulsi_wood_cut_pieceU.jpg', by: 'Nistha.aslp', lic: 'CC BY-SA 4.0' },
    cherry: { path: '3/3f', file: 'Raspberries_macro.jpg', by: 'liz west', lic: 'CC BY 2.0' },
    peony: { path: '3/3e', file: 'Pink_peony.jpg', by: 'Martin Ehrensberger', lic: 'CC0' },
    vanilla: { path: '1/1d', file: 'La_vanille_de_Madagasikara_02.jpg', by: 'Mvsoa', lic: 'CC0' },
    mint: { path: '6/69', file: 'Starr-080608-7435-Mentha_spicata-leaves-Water_plant_Sand_Island-Midway_Atoll_%2841264499822%29.jpg', by: 'Forest ve Kim Starr', lic: 'CC BY 3.0 US' },
    sage: { path: '8/83', file: 'Starr-070906-8850-Salvia_officinalis-leaves-Kula_Ace_Hardware_and_Nursery-Maui_%2824865846336%29.jpg', by: 'Forest ve Kim Starr', lic: 'CC BY 3.0 US' },
    pebble: { path: 'c/cf', file: 'Starr-121108-0701-Pogostemon_cablin-flowers_and_leaves-Pali_o_Waipio-Maui_%2825169578556%29.jpg', by: 'Forest ve Kim Starr', lic: 'CC BY 3.0 US' }
  };

  Object.keys(LIST).forEach((k) => {
    const p = LIST[k];
    p.url = thumb(p.path, p.file, 1280);
    p.small = thumb(p.path, p.file, 330);
    p.page = 'https://commons.wikimedia.org/wiki/File:' + p.file;
  });
  F.NOTE_PHOTOS = LIST;

  function load(name) {
    const p = LIST[name];
    if (!p || p.img) return;
    p.img = new Image();
    p.img.decoding = 'async';
    p.img.onload = function () { p.ready = true; };
    p.img.src = p.url;
  }
  F.preloadNotePhotos = function (names) { (names || []).forEach(load); };

  /* Fotoğrafı kemeri dolduracak şekilde çizer: çok yavaş yaklaşma + alt kenarda hafif karartma */
  function draw(c, W, H, t, p) {
    const img = p.img;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const zoom = 1.05 + 0.03 * Math.sin(t * 0.16);
    const s = Math.max(W / iw, H / ih) * zoom;
    const dw = iw * s, dh = ih * s;
    const dx = (W - dw) / 2 + Math.sin(t * 0.11) * W * 0.008;
    const dy = (H - dh) / 2 + Math.cos(t * 0.09) * H * 0.006;
    c.drawImage(img, dx, dy, dw, dh);
    if (!p.shade || p.shade.h !== H) {
      p.shade = c.createLinearGradient(0, 0, 0, H);
      p.shade.h = H;
      p.shade.addColorStop(0, 'rgba(0,0,0,0.1)');
      p.shade.addColorStop(0.55, 'rgba(0,0,0,0)');
      p.shade.addColorStop(1, 'rgba(0,0,0,0.34)');
    }
    c.fillStyle = p.shade;
    c.fillRect(0, 0, W, H);
  }

  /* Fotoğraf hazırsa sahne fonksiyonu döner; değilse null (art.js çizime düşer) */
  F.photoScene = function (name) {
    const p = LIST[name];
    if (!p) return null;
    if (!p.img) load(name);
    if (!p.ready) return null;
    return p.scene || (p.scene = (c, W, H, t) => draw(c, W, H, t, p));
  };
})();
