/* Hydro — dört koku verisi */
window.FARO = window.FARO || {};

FARO.perfumes = [
  {
    id: 'aqua', name: 'Aqua', no: '101', family: 'Denizli, meyvemsi',
    desc: 'Deniz notaları ve meyvemsi açılış. Tuzlu ten, canlı bir iz.',
    top: 'Yeşil elma, bergamot', heart: 'Deniz tuzu, lotus', base: 'Beyaz misk, sedir',
    hours: 6, price: 2190, stock: 100, accent: '#55d9e5', liquid: '#0b8298', cap: '#0a353d',
    bg: '#052f37', glow: '#1a9eaa', cardBg: '#0b7180', cardGlow: '#5de4e5',
    noteTheme: {
      colors: [
        { c1: '#1f4f45', c2: '#06191a', accent: '#dfe88f' },   // üst: bergamot fotoğrafı
        { c1: '#16455a', c2: '#051a24', accent: '#f5a9c6' },   // orta: lotus fotoğrafı
        { c1: '#4a3220', c2: '#170e08', accent: '#e8b27a' }    // dip: sedir fotoğrafı
      ],
      motifs: ['fogTop', 'haze', 'fogBase'],
      arch: ['citrus', 'lotus', 'cedar']
    }
  },
  {
    id: 'seyf', name: 'Seyf', no: '202', family: 'Baharatlı, maskülen',
    desc: 'Kılıç kadar keskin. Baharatlı, kararlı ve tende koyulaşan bir imza.',
    top: 'Karabiber, greyfurt', heart: 'Tarçın, kakule', base: 'Deri, sandal ağacı',
    hours: 8, price: 2490, stock: 100, accent: '#ef9b5e', liquid: '#8f321b', cap: '#22100b',
    bg: '#39150c', glow: '#bc5623', cardBg: '#9f3a19', cardGlow: '#ef8a4e',
    // Nota sahnesi: turuncu tema, her nota için kendi renk, arka plan animasyonu ve kemer sahnesi
    noteTheme: {
      colors: [
        { c1: '#6a2418', c2: '#200a06', accent: '#ff9d80' },   // üst: greyfurt fotoğrafı
        { c1: '#6a3412', c2: '#211005', accent: '#e8a05f' },   // orta: tarçın fotoğrafı
        { c1: '#45301c', c2: '#140d07', accent: '#d9b27c' }    // dip: sandal ağacı fotoğrafı
      ],
      motifs: ['shafts', 'haze', 'ember'],        // üst, orta, dip arka plan animasyonları
      arch: ['grapefruit', 'cinnamon', 'wood']    // üst, orta, dip kemer sahneleri
    }
  },
  {
    id: 'marjinal', name: 'Marjinal', no: '303', family: 'Tatlı, şekerli',
    desc: 'Tatlılıkta sınır yok. Şekerli notalar, kadifemsi bir kalple buluşuyor.',
    top: 'Kırmızı meyveler, armut', heart: 'Pamuk şeker, şakayık', base: 'Vanilya, tonka',
    hours: 7, price: 2290, stock: 100, accent: '#ee6f8c', liquid: '#8c0f33', cap: '#300914',
    bg: '#34081a', glow: '#a81f46', cardBg: '#7d1231', cardGlow: '#d94a6c',
    noteTheme: {
      colors: [
        { c1: '#6a0f2c', c2: '#22050f', accent: '#ff7f9c' },   // üst: ahududu fotoğrafı
        { c1: '#7a2048', c2: '#260a18', accent: '#ffa6c8' },   // orta: şakayık fotoğrafı
        { c1: '#3c2418', c2: '#120a06', accent: '#e6c68f' }    // dip: vanilya fotoğrafı
      ],
      motifs: ['zest', 'haze', 'fogBase'],
      arch: ['cherry', 'peony', 'vanilla']
    }
  },
  {
    id: 'vento', name: 'Vento', no: '404', family: 'Ferahlık, yeşil',
    desc: 'Rüzgârın serin tarafı. Temiz hava, narenciye ve yeşil notalar.',
    top: 'Limon, nane', heart: 'Bambu, adaçayı', base: 'Vetiver, paçuli',
    hours: 5, price: 2090, stock: 100, accent: '#a7da8b', liquid: '#1c704b', cap: '#0a2419',
    bg: '#0a3025', glow: '#3d966d', cardBg: '#287656', cardGlow: '#aee596',
    noteTheme: {
      colors: [
        { c1: '#1b5a32', c2: '#07190e', accent: '#b8ee96' },   // üst: nane fotoğrafı
        { c1: '#3c5a42', c2: '#111c14', accent: '#cfe3b4' },   // orta: adaçayı fotoğrafı
        { c1: '#234a2c', c2: '#0a170d', accent: '#a6d48c' }    // dip: paçuli fotoğrafı
      ],
      motifs: ['shafts', 'fogHeart', 'fogBase'],
      arch: ['mint', 'sage', 'pebble']
    }
  }
];

FARO.formatPrice = function (n) { return n.toLocaleString('tr-TR') + ' TL'; };
FARO.hero = { bg: '#062f37', glow: '#1a9eaa' };
FARO.notes = [
  { c1: '#164d50', c2: '#041d22', accent: '#a4eff0', minutes: 15 },
  { c1: '#6d173e', c2: '#250718', accent: '#ff91b4', minutes: 240 },
  { c1: '#102c20', c2: '#040b08', accent: '#b5e88a', minutes: 480 }
];
