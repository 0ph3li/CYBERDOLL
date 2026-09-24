/* =========================================================
   CYBERDOLL — shop page
   filters · search · sort · grid density · FLIP animations
   needs: products.js (data) + main.js (window.CD helpers)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const CATS = window.CD_CATEGORIES || [];
  const LOOKS = window.CD_LOOKS || {};
  const reduced = CD.reduced;

  const grid = $("#grid"), chipsEl = $("#chips"), search = $("#search"), sortEl = $("#sort");
  const statusEl = $("#status"), clearBtn = $("#clearAll"), empty = $("#empty"), emptyMsg = $("#emptyMsg");
  const heroCat = $("#heroCat"), heroCount = $("#heroCount"), crumb = $("#crumb"), heroTitle = $(".shop-hero__title");

  const esc = window.CDCards.esc;
  // "NEW IN" = the latest numbered drop (same pieces as new-in.html)
  const LATEST = PRODUCTS.map(p => p.drop).filter(d => /^\d+$/.test(d)).sort().pop();
  const isNew = p => p.drop === LATEST;
  const dropName = id => { const d = (window.CD_DROPS || []).find(x => x.id === id); return id === "core" ? "CORE COLLECTION" : `DROP #${id}${d ? " " + d.name : ""}`; };
  const catLabel = id => id === "all" ? "ALL DOLLS" : id === "new" ? "NEW IN" : (CATS.find(c => c.id === id) || {}).label || id.toUpperCase();

  /* ---------- state (from URL) ---------- */
  const params = new URLSearchParams(location.search);
  const validCats = ["all", "new", ...CATS.map(c => c.id)];
  const state = {
    cat: validCats.includes(params.get("cat")) ? params.get("cat") : "all",
    look: LOOKS[params.get("look")] ? params.get("look") : null,
    drop: PRODUCTS.some(p => p.drop === params.get("drop")) ? params.get("drop") : null,
    q: params.get("q") || "",
    sort: params.get("sort") || "featured",
    cols: Number(CD.store.get("cd_cols", 4)) || 4
  };
  search.value = state.q;
  if ([...sortEl.options].some(o => o.value === state.sort)) sortEl.value = state.sort; else state.sort = "featured";

  /* ---------- cards (built once, reused) ---------- */
  const cards = new Map();
  PRODUCTS.forEach(p => cards.set(p.id, window.CDCards.build(p)));

  /* ---------- promo tiles ---------- */
  const promoDrop = document.createElement("a");
  promoDrop.href = "new-in.html";
  promoDrop.className = "promo promo--drop";
  promoDrop.innerHTML = `
    <span class="promo__kicker">// OUT NOW</span>
    <svg class="promo__heart" viewBox="0 0 7 6" shape-rendering="crispEdges" aria-hidden="true"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>
    <span class="promo__big">DROP #005<br /><em>midnight mall</em></span>
    <span class="promo__cta">SHOP THE DROP →</span>`;
  const promoClub = document.createElement("a");
  promoClub.href = "index.html#club";
  promoClub.className = "promo promo--club";
  promoClub.innerHTML = `
    <span class="promo__kicker">doll_club.exe</span>
    <span class="promo__big">-10%<br />FOR NEW<br />DOLLS</span>
    <span class="promo__cta">JOIN THE CLUB ♡</span>`;

  /* ---------- chips ---------- */
  const countFor = id => id === "all" ? PRODUCTS.length
    : id === "new" ? PRODUCTS.filter(isNew).length
    : PRODUCTS.filter(p => p.cat === id).length;

  const renderChips = () => {
    const list = [{ id: "all", label: "ALL" }, { id: "new", label: "NEW IN" }, ...CATS].filter(c => countFor(c.id) > 0);
    chipsEl.innerHTML = list.map(c =>
      `<button type="button" class="chip" role="tab" data-cat="${c.id}" aria-selected="${!state.look && !state.drop && state.cat === c.id}">${c.label}<sup>${countFor(c.id)}</sup></button>`
    ).join("") + (state.look ? `<button type="button" class="chip chip--look" role="tab" data-look="${state.look}" aria-selected="true">LOOK: ${state.look.toUpperCase()} ×</button>` : "")
      + (state.drop ? `<button type="button" class="chip chip--look" role="tab" data-drop="${state.drop}" aria-selected="true">${esc(dropName(state.drop))} ×</button>` : "");
    const sel = $('[aria-selected="true"]', chipsEl);
    if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
  };

  chipsEl.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    if (chip.dataset.look || chip.dataset.drop) { state.look = null; state.drop = null; state.cat = "all"; }
    else { state.cat = chip.dataset.cat; state.look = null; state.drop = null; }
    update();
  });

  /* ---------- filtering & sorting ---------- */
  const getList = () => {
    let list = PRODUCTS.slice();
    if (state.drop) list = list.filter(p => p.drop === state.drop);
    else if (state.look) list = list.filter(p => LOOKS[state.look].includes(p.id));
    else if (state.cat === "new") list = list.filter(isNew);
    else if (state.cat !== "all") list = list.filter(p => p.cat === state.cat);
    const q = state.q.trim().toLowerCase();
    if (q) list = list.filter(p => `${p.name} ${p.cat} ${p.code} ${p.tag || ""}`.toLowerCase().includes(q));
    const by = {
      "new": (a, b) => b.added - a.added,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "name": (a, b) => a.name.localeCompare(b.name)
    }[state.sort];
    if (by) list.sort(by);
    return list;
  };

  /* ---------- render with FLIP ---------- */
  let firstRender = true;
  const render = () => {
    const list = getList();
    const before = new Map();
    if (!firstRender && !reduced) [...grid.children].forEach(el => before.set(el, el.getBoundingClientRect()));

    const els = list.map(p => cards.get(p.id));
    const plain = state.cat === "all" && !state.look && !state.drop && !state.q.trim();
    if (plain && els.length > 3) {
      els.splice(3, 0, promoDrop);
      els.splice(Math.min(10, els.length), 0, promoClub);
    }
    grid.replaceChildren(...els);

    if (!reduced) {
      els.forEach((el, i) => {
        const was = before.get(el);
        if (was) {
          const now = el.getBoundingClientRect();
          const dx = was.left - now.left, dy = was.top - now.top;
          if (dx || dy) el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
            { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
        } else {
          el.animate([
            { opacity: 0, transform: "translateY(36px) skewY(3deg)", clipPath: "inset(0 0 100% 0)", filter: "grayscale(1) contrast(1.8)" },
            { opacity: 1, transform: "translateY(-4px)", clipPath: "inset(0 0 0 0)", filter: "grayscale(.5) contrast(1.2)", offset: .6 },
            { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)", filter: "none" }
          ], { duration: 700, delay: Math.min(i, 12) * 55, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
        }
      });
    }
    firstRender = false;

    // empty state
    empty.hidden = list.length > 0;
    if (!list.length) emptyMsg.textContent = state.q.trim()
      ? `Error 404: no dolls match “${state.q.trim()}”.`
      : "Error 404: this rack is empty (for now).";

    // status line
    const filtered = state.cat !== "all" || state.look || state.drop || state.q.trim();
    statusEl.innerHTML = `SHOWING <b>${String(list.length).padStart(2, "0")}</b> / ${String(PRODUCTS.length).padStart(2, "0")} PIECES`
      + (state.drop ? ` — ${esc(dropName(state.drop))}` : state.look ? ` — LOOK: ${esc(state.look.toUpperCase())}` : state.cat !== "all" ? ` — ${esc(catLabel(state.cat))}` : "")
      + (state.q.trim() ? ` — “${esc(state.q.trim())}”` : "");
    clearBtn.hidden = !filtered;

    setHero(list.length);
    syncURL();
  };

  /* ---------- hero title + counter ---------- */
  let countRAF, shownCount = 0;
  const setHero = n => {
    const label = state.q.trim() ? `“${state.q.trim()}”` : state.drop ? dropName(state.drop) : state.look ? `LOOK: ${state.look}` : catLabel(state.cat);
    crumb.textContent = state.drop ? dropName(state.drop) : state.look ? `LOOK: ${state.look.toUpperCase()}` : state.cat === "all" ? "SHOP ALL" : catLabel(state.cat);
    if (heroCat.textContent !== label.toUpperCase()) {
      heroCat.classList.add("is-swapping");
      setTimeout(() => {
        heroCat.textContent = label.toUpperCase();
        heroCat.dataset.glitch = label.toUpperCase();
        heroCat.classList.remove("is-swapping");
        glitch();
      }, reduced ? 0 : 180);
    }
    cancelAnimationFrame(countRAF);
    const from = shownCount, t0 = performance.now(), dur = reduced ? 1 : 600;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      shownCount = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)));
      heroCount.textContent = String(shownCount).padStart(3, "0");
      if (k < 1) countRAF = requestAnimationFrame(tick);
    };
    countRAF = requestAnimationFrame(tick);
  };

  const glitch = () => {
    if (reduced) return;
    heroTitle.classList.remove("is-glitching");
    void heroTitle.offsetWidth;
    heroTitle.classList.add("is-glitching");
    setTimeout(() => heroTitle.classList.remove("is-glitching"), 650);
  };
  setInterval(glitch, 4200);

  /* ---------- URL sync (so filtered views are shareable) ---------- */
  const syncURL = () => {
    const u = new URLSearchParams();
    if (state.drop) u.set("drop", state.drop);
    else if (state.look) u.set("look", state.look);
    else if (state.cat !== "all") u.set("cat", state.cat);
    if (state.q.trim()) u.set("q", state.q.trim());
    if (state.sort !== "featured") u.set("sort", state.sort);
    const qs = u.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  };

  /* ---------- controls ---------- */
  const update = () => { renderChips(); render(); };

  let searchT;
  search.addEventListener("input", () => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { state.q = search.value; render(); }, 180);
  });
  sortEl.addEventListener("change", () => { state.sort = sortEl.value; render(); });

  const reset = () => {
    state.cat = "all"; state.look = null; state.drop = null; state.q = ""; search.value = "";
    update();
  };
  clearBtn.addEventListener("click", reset);
  $("#emptyReset").addEventListener("click", reset);

  const viewBtns = $$(".shop-view button");
  const setCols = (n, animate) => {
    state.cols = n;
    CD.store.set("cd_cols", n);
    viewBtns.forEach(b => b.classList.toggle("is-on", Number(b.dataset.cols) === n));
    if (animate) {
      const before = new Map([...grid.children].map(el => [el, el.getBoundingClientRect()]));
      grid.style.setProperty("--cols", n);
      grid.dataset.cols = n;
      if (!reduced) [...grid.children].forEach(el => {
        const a = before.get(el), b = el.getBoundingClientRect();
        el.animate([
          { transformOrigin: "0 0", transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
          { transformOrigin: "0 0", transform: "none" }
        ], { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
    } else {
      grid.style.setProperty("--cols", n);
      grid.dataset.cols = n;
    }
  };
  viewBtns.forEach(b => b.addEventListener("click", () => setCols(Number(b.dataset.cols), true)));

  /* ---------- go ---------- */
  setCols(state.cols, false);
  update();
})();
