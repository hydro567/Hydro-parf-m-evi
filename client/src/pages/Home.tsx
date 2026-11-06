import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Droplets,
  Instagram,
  Menu,
  Minus,
  MoveUpRight,
  Plus,
  ShoppingBag,
  Sparkles,
  Wind,
  X,
} from "lucide-react";

type Product = {
  id: string;
  number: string;
  name: string;
  tagline: string;
  detail: string;
  family: string;
  price: number;
  accent: string;
  softAccent: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  bottleClass: string;
};

type CartLine = { product: Product; quantity: number };

const products: Product[] = [
  {
    id: "aqua",
    number: "01",
    name: "Aqua",
    tagline: "Tuzlu ten, canlı bir iz.",
    detail: "Deniz notaları ile meyvemsi bir açılışın buluştuğu, ışığı yüksek bir yaz kokusu.",
    family: "Denizli · Meyvemsi",
    price: 2190,
    accent: "#73d9e8",
    softAccent: "#dff8f5",
    notes: { top: ["Yeşil elma", "Bergamot"], heart: ["Deniz tuzu", "Lotus"], base: ["Beyaz misk", "Sedir"] },
    bottleClass: "bottle-aqua",
  },
  {
    id: "seyf",
    number: "02",
    name: "Seyf",
    tagline: "Kılıç kadar keskin.",
    detail: "Kararlı, maskülen ve baharatlı. İlk temasta keskin; tende kaldıkça koyulaşan bir imza.",
    family: "Baharatlı · Maskülen",
    price: 2490,
    accent: "#e49a65",
    softAccent: "#fff0df",
    notes: { top: ["Karabiber", "Greyfurt"], heart: ["Tarçın", "Kakule"], base: ["Deri", "Sandal ağacı"] },
    bottleClass: "bottle-seyf",
  },
  {
    id: "marjinal",
    number: "03",
    name: "Marjinal",
    tagline: "Tatlılıkta sınır yok.",
    detail: "Şekerli notaların kadifemsi bir kalple buluştuğu, kalabalıkta kendi yolunu açan koku.",
    family: "Tatlı · Şekerli",
    price: 2290,
    accent: "#e9a5c4",
    softAccent: "#ffeaf2",
    notes: { top: ["Kırmızı meyveler", "Armut"], heart: ["Pamuk şeker", "Şakayık"], base: ["Vanilya", "Tonka"] },
    bottleClass: "bottle-marjinal",
  },
  {
    id: "vento",
    number: "04",
    name: "Vento",
    tagline: "Rüzgârın serin tarafı.",
    detail: "Ferahlığın en saf hali. Temiz hava, narenciye ve yeşil notalarla teni uyandırır.",
    family: "Ferahlık · Yeşil",
    price: 2090,
    accent: "#9bcf92",
    softAccent: "#edf8e6",
    notes: { top: ["Limon", "Nane"], heart: ["Bambu", "Adaçayı"], base: ["Vetiver", "Paçuli"] },
    bottleClass: "bottle-vento",
  },
];

const phases = [
  { label: "İlk nefes", time: "00:00", title: "Üst nota", copy: "Şişeden çıkan ilk canlılık. Meyve, narenciye ve baharat; kokuya ilk bakışı verir.", dots: "Bergamot · Karabiber · Limon" },
  { label: "Karakter", time: "00:15", title: "Kalp nota", copy: "Koku burada kendi sesini bulur. Deniz tuzu, şeker, çiçek ve baharat tende daha uzun bir cümleye dönüşür.", dots: "Deniz tuzu · Pamuk şeker · Kakule" },
  { label: "İz", time: "04:00", title: "Dip nota", copy: "Günün sonunda kalan o ince iz. Misk, sedir, deri ve vetiver; sessiz ama unutulmaz.", dots: "Beyaz misk · Vanilya · Sedir" },
];

const formatPrice = (value: number) => `${new Intl.NumberFormat("tr-TR").format(value)} TL`;

function Bottle({ product, small = false }: { product: Product; small?: boolean }) {
  return (
    <div className={`bottle-stage ${product.bottleClass} ${small ? "bottle-small" : ""}`} style={{ "--accent": product.accent, "--soft-accent": product.softAccent } as React.CSSProperties}>
      <div className="bottle-aura" />
      <div className="bottle-shadow" />
      <div className="bottle-cap"><span /></div>
      <div className="bottle-glass"><div className="bottle-liquid" /><div className="bottle-highlight" /><div className="bottle-label"><span>HYDRO</span><strong>{product.name}</strong><em>{product.number} / 04</em></div></div>
    </div>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}

export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cursor, setCursor] = useState({ x: 50, y: 35 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroMotion, setHeroMotion] = useState({ x: 0, y: 0, rotate: 0 });

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    }, { threshold: 0.14 });
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? Math.min(100, (window.scrollY / maxScroll) * 100) : 0);
      const candidates = ["#notes", "#collection", "#atelier"].map((id) => document.querySelector(id)).filter(Boolean) as Element[];
      const phase = candidates.reduce((current, el, index) => window.scrollY + 220 >= (el as HTMLElement).offsetTop ? index : current, 0);
      setActivePhase(Math.min(phase, 2));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || cartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, cartOpen]);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const addToCart = (product: Product) => {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      if (found) return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const changeQuantity = (id: string, amount: number) => {
    setCart((current) => current.map((item) => item.product.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item).filter((item) => item.quantity > 0));
  };

  const orderHref = `mailto:merhaba@hydroparfum.com?subject=${encodeURIComponent("Hydro sipariş talebi")}&body=${encodeURIComponent(`Merhaba Hydro,\n\nŞu ürünleri sipariş etmek istiyorum:\n${cart.map((item) => `- ${item.product.name} / ${item.quantity} adet / ${formatPrice(item.product.price * item.quantity)}`).join("\n")}\n\nToplam: ${formatPrice(totalPrice)}\n\nAd soyad:\nTelefon:\nTeslimat adresi:`)}`;

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;
    setCursor({ x, y });
    setHeroMotion({ x: (event.clientX / window.innerWidth - 0.5) * 10, y: (event.clientY / window.innerHeight - 0.5) * -12, rotate: (event.clientX / window.innerWidth - 0.5) * 4 });
  };

  return (
    <div className="hydro-site" onMouseMove={handlePointerMove} onMouseLeave={() => setHeroMotion({ x: 0, y: 0, rotate: 0 })} style={{ "--cursor-x": `${cursor.x}%`, "--cursor-y": `${cursor.y}%`, "--scroll-progress": `${scrollProgress}%`, "--hero-x": `${heroMotion.x}px`, "--hero-y": `${heroMotion.y}px`, "--hero-rotate": `${heroMotion.rotate}deg` } as React.CSSProperties}>
      <div className="grain" aria-hidden="true" />
      <div className={`intro-loader ${introDone ? "done" : ""}`} aria-hidden="true"><div className="loader-wordmark"><span className="wordmark-mark"><i className="trident-prong left" /><i className="trident-prong center" /><i className="trident-prong right" /><b className="trident-shaft" /></span><strong>HYDRO</strong></div><div className="loader-count"><span>00</span><i /><span>04</span></div><div className="loader-water" /></div>
      <div className="scroll-progress"><i /></div>
      <header className="topbar">
        <button className="wordmark" onClick={() => scrollTo("#home")} aria-label="Hydro ana sayfa"><span className="wordmark-mark"><i className="trident-prong left" /><i className="trident-prong center" /><i className="trident-prong right" /><b className="trident-shaft" /></span><span>HYDRO</span></button>
        <nav className={menuOpen ? "nav-open" : ""}>
          <button onClick={() => scrollTo("#home")}>Ana sayfa</button>
          <button onClick={() => scrollTo("#notes")}>Notalar</button>
          <button onClick={() => scrollTo("#collection")}>Koleksiyon</button>
          <button onClick={() => scrollTo("#products")}>Ürünler</button>
          <button onClick={() => scrollTo("#atelier")}>Atölye</button>
          <button onClick={() => scrollTo("#contact")}>İletişim</button>
        </nav>
        <div className="topbar-actions"><span className="edition">04 / 04</span><button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label="Sepeti aç"><ShoppingBag size={17} /><span>{totalItems}</span></button><button className="menu-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label="Menüyü aç">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
      </header>

      <main>
        <section id="home" className="hero-section">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> Niş parfüm evi <span className="eyebrow-index">00 / 04</span></p>
            <h1><span>Teninde</span><em>kalan</em><span>hareket.</span></h1>
            <p className="hero-description">Her kokudan yalnızca 100 şişe üretiyoruz. Dört karakteri küçük atölyemizde harmanlıyor, her şişeyi elle doldurup numaralandırıyoruz.</p>
            <button className="text-link" onClick={() => scrollTo("#collection")}>Koleksiyonu keşfet <ArrowRight size={16} /></button>
          </div>
          <div className="hero-bottle-wrap" style={{ transform: "translateY(calc(-46% + var(--hero-y))) translateX(var(--hero-x)) rotate(var(--hero-rotate))" }}><div className="hero-ring" /><Bottle product={products[0]} /><span className="hero-label">AQUA / 01</span></div>
          <div className="hero-foot"><span className="scroll-hint"><ArrowDown size={14} /> Aşağı akıt</span><span className="hero-spec">Eau de parfum <i /> 50 ML</span><span className="hero-time">00:00 <small>ilk nefes</small></span></div>
          <div className="hero-side-copy">KOKU<br />BİR<br /><strong>AKIŞTIR</strong></div>
        </section>

        <section id="notes" className="notes-section">
          <div className="section-intro"><Reveal><p className="eyebrow">01 / Notalar <span className="eyebrow-line" /></p><h2>Bir koku,<br /><em>üç hareket.</em></h2></Reveal><Reveal className="intro-note"><p>Parfümü tek bir anda değil, tende açıldığı bütün zaman boyunca dinliyoruz. İlk temas, karakter ve kalan iz.</p><span className="note-mark">HYDRO / <strong>FLOW</strong></span></Reveal></div>
          <div className="phase-layout">
            <div className="phase-rail"><div className="phase-line"><span style={{ height: `${((activePhase + 1) / phases.length) * 100}%` }} /></div>{phases.map((phase, index) => <button key={phase.title} className={activePhase === index ? "phase-dot active" : "phase-dot"} onClick={() => setActivePhase(index)}><span>0{index + 1}</span><i /><b>{phase.label}</b></button>)}</div>
            <div className="phase-visual"><div className={`phase-disc phase-disc-${activePhase}`}><span className="disc-orbit orbit-a" /><span className="disc-orbit orbit-b" /><div className="disc-core"><Droplets size={24} /><small>{phases[activePhase].time}</small></div></div><div className="phase-visual-caption">{phases[activePhase].dots.split(" · ").map((dot) => <span key={dot}>{dot}</span>)}</div></div>
            <div className="phase-content"><p className="phase-kicker">{phases[activePhase].time} <span /> {phases[activePhase].label}</p><h3>{phases[activePhase].title}</h3><p className="phase-copy">{phases[activePhase].copy}</p><div className="note-list">{phases[activePhase].dots.split(" · ").map((dot, index) => <span key={dot}><i>0{index + 1}</i>{dot}</span>)}</div><div className="phase-switcher"><button onClick={() => setActivePhase((activePhase + phases.length - 1) % phases.length)} aria-label="Önceki nota"><ChevronLeft size={17} /></button><span>0{activePhase + 1} <i>/</i> 03</span><button onClick={() => setActivePhase((activePhase + 1) % phases.length)} aria-label="Sonraki nota"><ChevronRight size={17} /></button></div></div>
          </div>
        </section>

        <section id="collection" className="collection-section">
          <div className="collection-heading"><Reveal><p className="eyebrow">02 / Koleksiyon <span className="eyebrow-line" /></p><h2>Dört koku.<br /><em>Dört yön.</em></h2></Reveal><Reveal className="collection-side"><p>Her biri farklı bir ruh hali için. Hangisi bugün seninle hareket ediyor?</p><div className="drag-note"><MoveUpRight size={15} /> kartları sürükle</div></Reveal></div>
          <div className="product-rail">
            {products.map((product, index) => <article key={product.id} className={`product-card ${activeProduct === index ? "selected" : ""}`} onMouseEnter={() => setActiveProduct(index)} onClick={() => setActiveProduct(index)} style={{ "--card-accent": product.accent, "--card-soft": product.softAccent } as React.CSSProperties}><div className="product-card-top"><span>{product.number} / 04</span><span>{product.family}</span></div><Bottle product={product} small /><div className="product-card-copy"><p>{product.tagline}</p><h3>{product.name}</h3><span className="product-price">50 ml / {formatPrice(product.price)}</span></div><button className="add-button" onClick={(event) => { event.stopPropagation(); addToCart(product); }}><Plus size={18} /><span>Sepete ekle</span></button><div className="card-arrow"><ArrowRight size={16} /></div></article>)}
          </div>
          <div className="collection-bottom"><span>Hydro / parfum collection</span><div className="collection-progress"><i style={{ width: `${((activeProduct + 1) / products.length) * 100}%` }} /></div><span>0{activeProduct + 1} / 04</span></div>
        </section>

        <section id="products" className="product-detail-section">
          <div className="product-detail-index"><span>Koleksiyon</span><strong>0{activeProduct + 1}</strong><i>/ 04</i></div>
          <div className="product-detail-visual"><div className="detail-orbit detail-orbit-one" /><div className="detail-orbit detail-orbit-two" /><Bottle product={products[activeProduct]} /><span className="detail-vertical">{products[activeProduct].name} / eau de parfum</span></div>
          <div className="product-detail-copy"><Reveal><p className="eyebrow">Seçili koku <span className="eyebrow-line" /></p><p className="detail-number">{products[activeProduct].number} <span>/ 04</span></p><h2>{products[activeProduct].name}</h2><p className="detail-tagline">{products[activeProduct].tagline}</p><p className="detail-description">{products[activeProduct].detail}</p><div className="note-columns"><div><span>Üst nota</span>{products[activeProduct].notes.top.map((note) => <b key={note}>{note}</b>)}</div><div><span>Kalp nota</span>{products[activeProduct].notes.heart.map((note) => <b key={note}>{note}</b>)}</div><div><span>Dip nota</span>{products[activeProduct].notes.base.map((note) => <b key={note}>{note}</b>)}</div></div><div className="detail-buy"><strong>{formatPrice(products[activeProduct].price)}</strong><button onClick={() => addToCart(products[activeProduct])}>Sepete ekle <Plus size={16} /></button></div></Reveal></div>
        </section>

        <section className="feature-section"><div className="feature-water" /><div className="feature-content"><Reveal><p className="eyebrow">Hydro notu <span className="eyebrow-line" /></p><h2>Her tene<br /><em>başka akar.</em></h2><p>Parfümü bir aksesuar değil, günün ritmini değiştiren görünmez bir katman olarak görüyoruz. Temiz, cesur, sana ait.</p><button className="circle-link" onClick={() => scrollTo("#atelier")}><ArrowDown size={19} /></button></Reveal></div><div className="feature-stamp"><Sparkles size={18} /><span>Su gibi<br />özgür.</span></div></section>

        <section id="atelier" className="atelier-section"><div className="atelier-heading"><Reveal><p className="eyebrow">03 / Atölye <span className="eyebrow-line" /></p><h2>Suyun izinden,<br /><em>elle harman.</em></h2></Reveal><Reveal className="atelier-intro"><p>Hydro'da her koku, notaların birbirine alan açtığı küçük bir stüdyoda doğar. Acele etmiyoruz; çünkü iyi bir iz zaman ister.</p><a href="#contact" onClick={(event) => { event.preventDefault(); scrollTo("#contact"); }}>Bizi tanı <ArrowRight size={15} /></a></Reveal></div><div className="atelier-steps">{[{ num: "01", title: "Seç", text: "Kaynağını, saflığını ve ten üzerindeki davranışını dinliyoruz.", icon: <Wind size={22} /> }, { num: "02", title: "Harmanla", text: "Formülü küçük ölçekte, gram gram ve sabırla kuruyoruz.", icon: <Droplets size={22} /> }, { num: "03", title: "Dinlendir", text: "Kokunun kendi ritmini bulması için karanlıkta bekletiyoruz.", icon: <Sparkles size={22} /> }, { num: "04", title: "Akıt", text: "Son dokunuşu yapıp senin gününe bırakıyoruz.", icon: <ArrowRight size={22} /> }].map((step) => <Reveal key={step.num} className="atelier-step"><div className="step-icon">{step.icon}</div><span>{step.num}</span><h3>{step.title}</h3><p>{step.text}</p><div className="step-arrow"><ArrowDown size={14} /></div></Reveal>)}</div><div className="atelier-stats"><span><strong>4</strong> karakter</span><span><strong>%22</strong> esans oranı</span><span><strong>50</strong> ml / şişe</span><span><strong>∞</strong> sende kalan</span></div></section>

        <div className="scent-ticker" aria-label="Koku notaları"><div className="ticker-track">{[...Array(2)].flatMap((_, repeat) => ["Deniz tuzu", "Kakule", "Pamuk şeker", "Beyaz misk", "Sedir", "Vetiver", "Bergamot", "Vanilya"].map((note, index) => <span key={`${repeat}-${index}`}>{note} <i>✦</i></span>))}</div></div>

        <section id="contact" className="contact-section"><div className="contact-glow" /><Reveal><p className="eyebrow">04 / İletişim <span className="eyebrow-line" /></p><h2>Akışına<br /><em>bir koku kat.</em></h2><p className="contact-copy">Soruların, özel siparişlerin veya sadece merhaba demek için bize yaz.</p><div className="contact-links"><a href="mailto:merhaba@hydroparfum.com">merhaba@hydroparfum.com <ArrowRight size={15} /></a><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram @hydroparfum <Instagram size={15} /></a></div></Reveal><div className="contact-meta"><span>İstanbul, Türkiye</span><span>Salı — Cumartesi / 11:00 — 19:00</span></div></section>
      </main>

      <footer><button className="wordmark" onClick={() => scrollTo("#home")}><span className="wordmark-mark"><i className="trident-prong left" /><i className="trident-prong center" /><i className="trident-prong right" /><b className="trident-shaft" /></span><span>HYDRO</span></button><span>© 2026 Hydro Parfüm</span><span>Su gibi. Özgürce.</span></footer>

      <div className={`overlay ${cartOpen ? "visible" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-label="Sepet"><div className="cart-head"><div><p className="eyebrow">Hydro / sepet</p><h2>Sepetin <sup>{totalItems}</sup></h2></div><button onClick={() => setCartOpen(false)} aria-label="Sepeti kapat"><X size={21} /></button></div>{cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={28} /><p>Henüz bir koku seçmedin.</p><button className="text-link" onClick={() => { setCartOpen(false); scrollTo("#collection"); }}>Kokulara göz at <ArrowRight size={15} /></button></div> : <><div className="cart-lines">{cart.map(({ product, quantity }) => <div className="cart-line" key={product.id}><Bottle product={product} small /><div className="cart-line-copy"><p>{product.number} / {product.family}</p><h3>{product.name}</h3><span>{formatPrice(product.price)}</span><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)}><Minus size={13} /></button><b>{quantity}</b><button onClick={() => changeQuantity(product.id, 1)}><Plus size={13} /></button></div></div><button className="remove" onClick={() => setCart((current) => current.filter((item) => item.product.id !== product.id))}><X size={14} /></button></div>)}</div><div className="cart-foot"><div><span>Ara toplam</span><strong>{formatPrice(totalPrice)}</strong></div><div><span>Kargo</span><strong>Ücretsiz</strong></div><a className="checkout" href={orderHref}>Siparişi tamamla <ArrowRight size={16} /></a><small>Siparişin için e-posta istemcin açılacak.<br />Ödeme bilgisi istenmez.</small></div></>}</aside>
    </div>
  );
}
