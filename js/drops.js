/* =========================================================
   CYBERDOLL — drops archive
   every drop is rendered from CD_DROPS + CD_PRODUCTS, so a new
   drop only needs a line in js/products.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const CD = window.CD;
  const { build, esc, url, focusPos } = window.CDCards;
  const reduced = CD.reduced;
  const DROPS = window.CD_DROPS || [];
  const PRODUCTS = window.CD_PRODUCTS || [];
  const CATS = window.CD_CATEGORIES || [];
  const piecesOf = id => PRODUCTS.filter(p => p.drop === id).sort((a, b) => b.added - a.added);
  const pad = (n, l = 2) => String(n).padStart(l, "0");

  /* ---------- hero stats ---------- */
  const released = DROPS.filter(d => !d.locked);
  const countUp = (el, to, len) => {
    const t0 = performance.now() + 400, dur = reduced ? 1 : 1300;
    const tick = now => {
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = pad(Math.round(to * (1 - Math.pow(1 - k, 3))), len);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  countUp($("#statDrops"), released.length, 2);
  countUp($("#statPieces"), PRODUCTS.filter(p => /^\d+$/.test(p.drop)).length, 3);

  const title = $(".dr-title");
  if (!reduced) setInterval(() => {
    title.classList.remove("is-glitching"); void title.offsetWidth; title.classList.add("is-glitching");
    setTimeout(() => title.classList.remove("is-glitching"), 650);
  }, 3600);

  /* ---------- build each drop ---------- */
  const list = $("#dropList");
  const PAD_LOCK = '<svg viewBox="0 0 7 8" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 0h3v1h1v2h1v5H0V3h1V1h1zm0 3h3V1H2z"/></svg>';

  DROPS.forEach((d, i) => {
    const sec = document.createElement("section");
    const pieces = piecesOf(d.id);
    const dark = i % 2 === 0;
    sec.className = `drop-sec${dark ? " drop-sec--dark" : ""}${d.locked ? " drop-sec--locked" : ""}`;
    sec.id = `drop-${d.id}`;
    sec.dataset.drop = d.id;
    if (d.color) sec.style.setProperty("--dc", d.color);

    // cover: 3 photos from the drop (or blurred core pieces for the locked one)
    const coverPics = d.locked
      ? PRODUCTS.filter(p => p.drop === "core").filter((_, k) => k % 11 === 3).slice(0, 3)
      : [pieces[0], pieces[Math.floor(pieces.length / 2)], pieces[pieces.length - 1]].filter(Boolean);
    const hot = pieces.filter(p => p.hot).length;
    const shopUrl = `shop.html?drop=${d.id}`;

    sec.innerHTML = `
      <div class="drop-sec__head">
        <span class="drop-sec__num" aria-hidden="true">#${esc(d.id)}</span>
        <div class="drop-sec__meta">
          <p class="kicker">// DROP #${esc(d.id)} — ${esc(d.date)}</p>
          <h2 class="drop-sec__name" ${d.locked ? "data-secret" : ""}>${esc(d.name)}</h2>
          <p class="drop-sec__tag">${esc(d.tagline)}</p>
          <p class="drop-sec__desc">${esc(d.desc)}</p>
          <div class="drop-sec__facts">
            <span class="stamp">${d.locked ? PAD_LOCK : ""}${esc(d.status)}</span>
            ${d.locked ? "" : `<span class="drop-sec__fact"><b>${pad(pieces.length)}</b> PIECES</span>`}
            ${hot ? `<span class="drop-sec__fact drop-sec__fact--hot"><b>${pad(hot)}</b> ALMOST GONE</span>` : ""}
          </div>
          ${d.locked ? `
            <div class="dr-count" data-unlock="${esc(d.unlock)}">
              <div><b data-u="d">00</b><span>DAYS</span></div>
              <div><b data-u="h">00</b><span>HRS</span></div>
              <div><b data-u="m">00</b><span>MIN</span></div>
              <div><b data-u="s">00</b><span>SEC</span></div>
            </div>
            <form class="dr-notify" novalidate>
              <label for="notify-${d.id}">Get the secret link 1 hour early ♡</label>
              <div class="dr-notify__row">
                <input id="notify-${d.id}" type="email" placeholder="your@email.com" autocomplete="email" required />
                <button type="submit" class="winbtn">NOTIFY ME</button>
              </div>
              <p class="dr-notify__msg" role="status"></p>
            </form>` : `
            <div class="drop-sec__ctas">
              <a href="${shopUrl}" class="btn ${dark ? "btn--light" : "btn--dark"} mag"><span>SHOP DROP #${esc(d.id)}</span><i>→</i></a>
              ${d.link ? `<a href="${esc(d.link)}" class="link-arrow${dark ? " link-arrow--light" : ""}">THE STORY →</a>` : ""}
            </div>`}
        </div>
        <div class="drop-sec__cover">
          ${coverPics.map((p, k) => `
            <a class="drop-sec__pic drop-sec__pic--${k + 1}" ${d.locked ? 'tabindex="-1" aria-hidden="true"' : `href="${url(p)}" aria-label="${esc(p.name)}"`}>
              <img src="${esc(p.img)}" alt="" loading="lazy" style="object-position:${focusPos(p)}" />
            </a>`).join("")}
          ${d.locked ? '<span class="drop-sec__lock">??? LOADING ???</span>' : ""}
        </div>
      </div>
      ${d.locked || !pieces.length ? "" : `
      <div class="rail">
        <div class="rail__head">
          <p class="kicker">// ${pad(pieces.length)} PIECES — DRAG OR SCROLL →</p>
          <div class="rail__btns">
            <button type="button" class="rail__btn" data-dir="-1" aria-label="Scroll left">◀</button>
            <button type="button" class="rail__btn" data-dir="1" aria-label="Scroll right">▶</button>
          </div>
        </div>
        <div class="rail__track" tabindex="0" aria-label="Pieces in drop #${esc(d.id)}"></div>
        <div class="rail__progress"><span></span></div>
      </div>`}`;
    list.appendChild(sec);

    const track = $(".rail__track", sec);
    if (track) pieces.forEach(p => track.appendChild(build(p)));
  });

  /* ---------- rails: arrows, drag to scroll, progress ---------- */
  $$(".rail").forEach(rail => {
    const track = $(".rail__track", rail), bar = $(".rail__progress span", rail);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 1;
      bar.style.width = `${Math.max(8, (track.clientWidth / track.scrollWidth) * 100)}%`;
      bar.style.transform = `translateX(${p * (100 / Math.max(8, (track.clientWidth / track.scrollWidth) * 100) * 100 - 100)}%)`;
    };
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    $$(".rail__btn", rail).forEach(b => b.addEventListener("click", () => {
      track.scrollBy({ left: Number(b.dataset.dir) * track.clientWidth * .8, behavior: reduced ? "auto" : "smooth" });
    }));

    // drag with the mouse (touch already scrolls natively)
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse" || e.target.closest("button")) return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add("is-grabbing"); }
      if (!moved) return;
      track.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => { down = false; track.classList.remove("is-grabbing"); });
    // a drag shouldn't count as a click on a card
    track.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- sections: reveal + parallax number ---------- */
  const secs = $$(".drop-sec");
  const secIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); secIO.unobserve(en.target); }
  }), { threshold: .2 });
  secs.forEach(s => secIO.observe(s));

  /* ---------- timeline nav ---------- */
  const tl = $("#timelineTrack"), tlBar = $("#timelineBar");
  const stops = [...DROPS.map(d => ({ id: `drop-${d.id}`, label: `#${d.id}`, sub: d.locked ? "LOCKED" : d.name, locked: d.locked })),
    { id: "drop-core", label: "CORE", sub: "ALWAYS" }];
  tl.innerHTML = stops.map(s => `
    <a href="#${s.id}" class="dr-stop${s.locked ? " dr-stop--locked" : ""}" data-target="${s.id}">
      <i></i><b>${esc(s.label)}</b><span>${esc(s.sub)}</span>
    </a>`).join("");
  const stopEls = $$(".dr-stop", tl);
  stopEls.forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.target);
    const y = t.getBoundingClientRect().top + scrollY - 120;
    scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }));

  const targets = stops.map(s => document.getElementById(s.id));
  // section positions are measured once (and on resize) — scrolling only does maths
  let tops = [], secTops = [];
  const nums = secs.map(sec => $(".drop-sec__num", sec));
  const measure = () => {
    tops = targets.map(t => t.getBoundingClientRect().top + scrollY);
    secTops = secs.map(sec => { const r = sec.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  };
  let lastActive = -1;
  const onScroll = () => {
    const mid = innerHeight * .4, y = scrollY;
    let active = 0;
    tops.forEach((t, i) => { if (t - y < mid) active = i; });
    if (active !== lastActive) {
      stopEls.forEach((a, i) => a.classList.toggle("is-active", i === active));
      lastActive = active;
    }
    tlBar.style.width = `${clamp((y + mid - tops[0]) / (tops[tops.length - 1] - tops[0]), 0, 1) * 100}%`;
    if (!reduced) nums.forEach((n, i) => {
      const off = secTops[i] - y - innerHeight / 2;
      if (Math.abs(off) < innerHeight * 1.5) n.style.transform = `translateY(${off * -.12}px)`;
    });
  };
  let queued = false;
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

  /* ---------- locked drop: countdown, glitching name, notify ---------- */
  $$(".dr-count").forEach(box => {
    const target = new Date(box.dataset.unlock).getTime();
    const u = k => $(`[data-u="${k}"]`, box);
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const vals = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
      Object.entries(vals).forEach(([k, v]) => {
        const el = u(k), txt = pad(v);
        if (el.textContent !== txt) {
          el.textContent = txt;
          if (!reduced) { el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); }
        }
      });
    };
    tick();
    setInterval(tick, 1000);
  });

  const GL = "?!#$%&*@X0/<>";
  $$("[data-secret]").forEach(el => {
    const base = el.textContent;
    if (!reduced) setInterval(() => {
      let n = 0;
      const t = setInterval(() => {
        el.textContent = [...base].map(() => GL[Math.random() * GL.length | 0]).join("");
        if (++n > 8) { clearInterval(t); el.textContent = base; }
      }, 60);
    }, 2400);
  });

  $$(".dr-notify").forEach(form => {
    const email = $("input", form), msg = $(".dr-notify__msg", form);
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!email.value || !email.checkValidity()) {
        msg.textContent = "> invalid email, try again doll";
        form.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 });
        return;
      }
      msg.textContent = "> you're on the list. see you on the 13th ♡";
      email.value = "";
      CD.showToast("DROP #006 — YOU'RE ON THE LIST ♡");
    });
  });

  /* ---------- core collection: one tile per category ---------- */
  const core = PRODUCTS.filter(p => p.drop === "core");
  $("#coreCats").innerHTML = CATS.map(c => {
    const inCat = PRODUCTS.filter(p => p.cat === c.id);
    const pick = core.find(p => p.cat === c.id) || inCat[0];
    if (!pick) return "";
    return `
      <li>
        <a href="shop.html?cat=${c.id}" class="core-tile">
          <span class="core-tile__img"><img src="${esc(pick.img)}" alt="" loading="lazy" style="object-position:${focusPos(pick)}" /></span>
          <span class="core-tile__label"><b>${esc(c.label)}</b><em>${pad(inCat.length)}</em></span>
        </a>
      </li>`;
  }).join("");

  // links like drops.html#drop-004 arrive before the sections exist — jump once they're built
  if (location.hash) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) requestAnimationFrame(() => scrollTo({ top: t.getBoundingClientRect().top + scrollY - 120, behavior: "auto" }));
  }
})();
