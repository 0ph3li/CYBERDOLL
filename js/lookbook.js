/* =========================================================
   CYBERDOLL — lookbook (digital magazine)
   Loaded BEFORE main.js: the markup is built first so main.js
   picks up reveals, split titles, placeholders and magnets.
   Interactions are wired on DOMContentLoaded, once window.CD exists.
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = window.CDCards.esc;
  const BOOK = window.CD_LOOKBOOK || { looks: [] };
  const LOOKS = BOOK.looks;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const byId = id => PRODUCTS.find(p => p.id === id);
  const pad = n => String(n).padStart(2, "0");

  /* ---------- cover ---------- */
  $("#issueNo").textContent = BOOK.issue || "05";
  $("#issueSeason").textContent = BOOK.season || "";
  $("#issueTitle").textContent = (BOOK.title || "").toLowerCase();
  const cover = LOOKS[2] || LOOKS[0];
  if (cover) { $("#coverImg").src = cover.img; $("#coverImg").alt = `${cover.title} — cover look`; }

  /* ---------- film strip (contact sheet) ---------- */
  $("#filmTrack").innerHTML = LOOKS.map((l, i) => `
    <button type="button" class="lb-frame" data-i="${i}" aria-label="Open look ${pad(i + 1)}">
      <img src="${esc(l.img)}" alt="" loading="lazy" />
      <span class="lb-frame__no">${pad(i + 1)}A ▸</span>
      <span class="lb-frame__mark" aria-hidden="true"></span>
    </button>`).join("");

  /* ---------- the looks ---------- */
  // three spreads that rotate: polaroid on paper, dark full-bleed, tabloid
  const LAYOUTS = ["a", "b", "c"];
  const SCRIBBLE = '<svg class="scribble" viewBox="0 0 220 140" aria-hidden="true"><path d="M26 74C18 30 120 6 184 34c42 18 30 74-22 90-58 18-150 4-142-52 6-40 80-54 132-46"/></svg>';
  const XMARK = '<svg class="xmark" viewBox="0 0 60 60" aria-hidden="true"><path d="M8 10C22 24 38 40 52 52"/><path d="M50 8C36 24 22 38 10 54"/></svg>';
  const ARROW = '<svg class="arrow" viewBox="0 0 160 90" aria-hidden="true"><path d="M6 20C40 70 90 86 138 58"/><path d="M122 46l18 12-20 10"/></svg>';

  $("#looks").innerHTML = LOOKS.map((l, i) => {
    const pieces = (l.pieces || []).map(byId).filter(Boolean);
    const layout = LAYOUTS[i % LAYOUTS.length];
    return `
    <section class="lb-look lb-look--${layout}" id="${esc(l.id)}" data-i="${i}">
      <div class="lb-look__photo">
        <button type="button" class="lb-look__frame" data-i="${i}" aria-label="Open ${esc(l.title)} fullscreen">
          <span class="lb-look__develop"><img src="${esc(l.img)}" alt="Look ${pad(i + 1)}: ${esc(l.title)}" loading="lazy" /></span>
          <span class="lb-look__caption">LOOK ${pad(i + 1)} · ${esc(l.time)}</span>
          <i class="tape tape--1" aria-hidden="true"></i><i class="tape tape--2" aria-hidden="true"></i>
        </button>
        ${layout === "c" ? ARROW : ""}
      </div>
      <div class="lb-look__text">
        <div class="lb-look__num" aria-hidden="true"><span>${pad(i + 1)}</span>${SCRIBBLE}</div>
        <p class="kicker lb-look__meta" data-reveal>// LOOK ${pad(i + 1)} — ${esc(l.time)} — ${esc(l.place)}</p>
        <h2 class="lb-look__title" data-split>${esc(l.title)}</h2>
        <p class="lb-look__quote" data-reveal>“${esc(l.quote)}”</p>
        <p class="lb-look__note" data-reveal>${esc(l.note)}</p>
        ${pieces.length ? `
        <div class="lb-look__shop" data-reveal>
          <p class="kicker">SHOP SIMILAR ↓</p>
          <ul>
            ${pieces.map(p => `
            <li><a href="product.html?id=${encodeURIComponent(p.id)}">
              <span class="lb-look__thumb"><img src="${esc(p.img)}" alt="" loading="lazy" style="object-position:${window.CDCards.focusPos(p)}" /></span>
              <span class="lb-look__pname">${esc(p.name)}</span>
              <b>€${p.price}</b>
            </a></li>`).join("")}
          </ul>
        </div>` : ""}
      </div>
      ${layout === "b" ? XMARK : ""}
      <span class="lb-look__folio" aria-hidden="true">P. ${pad(i + 3)}</span>
    </section>`;
  }).join("");

  /* =========================================================
     interactions — need window.CD from main.js
     ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    const CD = window.CD;
    const reduced = CD ? CD.reduced : false;

    // cover entrance: flash, then the blurred title comes into focus
    requestAnimationFrame(() => document.body.classList.add("lb-ready"));

    // looks develop like polaroids when they enter
    const looks = $$(".lb-look");
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: .3 });
    looks.forEach(l => io.observe(l));

    /* ---------- lightbox ---------- */
    const box = $("#lightbox"), boxImg = $("#boxImg"), boxCap = $("#boxCap");
    let current = 0, lastFocus = null;
    const show = i => {
      current = (i + LOOKS.length) % LOOKS.length;
      const l = LOOKS[current];
      boxImg.src = l.img;
      boxImg.alt = `Look ${pad(current + 1)}: ${l.title}`;
      boxCap.innerHTML = `<b>LOOK ${pad(current + 1)} — ${esc(l.title)}</b><span>${esc(l.time)} · ${esc(l.place)}</span><a href="#${esc(l.id)}" data-jump>SHOP THIS LOOK ↓</a>`;
      if (!reduced) { box.classList.remove("is-flash"); void box.offsetWidth; box.classList.add("is-flash"); }
    };
    const open = i => {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => box.classList.add("is-open"));
      $("#boxClose").focus();
    };
    const close = () => {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { box.hidden = true; }, reduced ? 0 : 300);
      if (lastFocus) lastFocus.focus();
    };
    document.addEventListener("click", e => {
      const f = e.target.closest(".lb-frame, .lb-look__frame");
      if (f) open(Number(f.dataset.i));
    });
    $("#boxClose").addEventListener("click", close);
    $("#boxPrev").addEventListener("click", () => show(current - 1));
    $("#boxNext").addEventListener("click", () => show(current + 1));
    box.addEventListener("click", e => {
      if (e.target === box) close();
      if (e.target.closest("[data-jump]")) close();
    });
    document.addEventListener("keydown", e => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(current + 1);
      if (e.key === "ArrowLeft") show(current - 1);
    });
    // swipe on touch screens
    let sx = null;
    box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    });

    /* ---------- folio: magazine page number follows the scroll ---------- */
    const folio = $("#folio"), folioPage = $("#folioPage");
    const pages = [$(".lb-cover"), $(".lb-film"), ...looks, $(".lb-end")];
    let tops = [];
    const measure = () => { tops = pages.map(p => p.getBoundingClientRect().top + scrollY); };
    let last = -1, queued = false;
    const onScroll = () => {
      const y = scrollY + innerHeight * .5;
      let idx = 0;
      tops.forEach((t, i) => { if (t < y) idx = i; });
      if (idx !== last) {
        last = idx;
        folioPage.textContent = `P. ${pad(idx + 1)}`;
        if (!reduced) { folioPage.classList.remove("flip"); void folioPage.offsetWidth; folioPage.classList.add("flip"); }
      }
      folio.classList.toggle("is-on", scrollY > innerHeight * .6);
    };
    const onScrollRaf = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; onScroll(); });
    };
    measure();
    addEventListener("scroll", onScrollRaf, { passive: true });
    addEventListener("resize", () => { measure(); onScrollRaf(); });
    addEventListener("load", () => { measure(); onScrollRaf(); });
    onScroll();

    // links like lookbook.html#look-03 (from the home) arrive before the looks exist
    if (location.hash) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) requestAnimationFrame(() => scrollTo({ top: t.getBoundingClientRect().top + scrollY - 90, behavior: "auto" }));
    }
  });
})();
