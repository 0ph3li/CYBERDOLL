/* =========================================================
   CYBERDOLL — search ("CyberSearch")
   instant results · synonyms · did-you-mean · site results
   recent searches · "I'm feeling glitchy"
   needs: products.js, main.js (window.CD), cards.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const { build, esc } = window.CDCards;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const CATS = window.CD_CATEGORIES || [];
  const DROPS = window.CD_DROPS || [];
  const BOOK = (window.CD_LOOKBOOK || { looks: [] }).looks;

  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9#\s-]/g, " ").replace(/\s+/g, " ").trim();
  const catLabel = id => (CATS.find(c => c.id === id) || { label: id.toUpperCase() }).label;

  /* ---------- synonyms: a query word also matches these ---------- */
  const SYN = {
    jeans: ["denim", "jeans"], denim: ["denim", "jeans"], pants: ["pants", "trousers", "jeans", "flare", "cargo"], trousers: ["pants", "trousers"],
    jacket: ["jacket", "outerwear", "coat", "bomber", "biker", "parka"], coat: ["coat", "outerwear", "jacket", "parka"],
    shoes: ["shoes", "boots", "heels", "booties"], boots: ["boots", "booties"], heels: ["heels", "stiletto", "platform"],
    tee: ["tee", "t shirt", "tank"], shirt: ["shirt", "tee", "top"], top: ["top", "tops", "tee", "tank", "cami", "halter", "tube"],
    jewelry: ["earrings", "necklace", "ring", "cuff", "hoop", "stack"], jewellery: ["earrings", "necklace", "ring", "cuff", "hoop"],
    bag: ["bag", "bags", "messenger"], hat: ["hat", "cap", "headband"], cap: ["cap", "hat"],
    animal: ["leopard", "snake", "tiger", "snow leopard"], cheetah: ["leopard"], spikes: ["spike", "spiked", "studs", "studded"],
    studs: ["stud", "studs", "studded", "pyramid"], sparkly: ["rhinestone", "crystal", "glitter", "silver"], glitter: ["glitter", "rhinestone", "crystal", "sparkle"],
    furry: ["fur", "shag", "fluff"], goth: ["cross", "skull", "black", "lace", "crucifix"], y2k: ["low rise", "rhinestone", "halter", "tube"]
  };
  const alts = tok => {
    const set = new Set([tok, ...(SYN[tok] || [])]);
    if (tok.length > 3 && tok.endsWith("s")) set.add(tok.slice(0, -1));   // plurals: "corsets" → "corset"
    return [...set];
  };

  /* ---------- index ---------- */
  const dropName = id => { const d = DROPS.find(x => x.id === id); return d && !d.locked ? d.name : ""; };
  const IDX = PRODUCTS.map(p => ({
    p,
    name: norm(p.name),
    meta: norm(`${p.cat} ${catLabel(p.cat)} ${p.tag || ""} ${p.code} drop ${p.drop} ${dropName(p.drop)}`),
    color: norm(p.color),
    body: norm(`${p.desc || ""} ${(p.details || []).join(" ")}`)
  }));

  const WEB = [
    ...BOOK.map((l, i) => ({ title: `Look ${String(i + 1).padStart(2, "0")} — ${l.title}`, url: `lookbook.html#${l.id}`, crumb: "cyberdoll.net › lookbook", snippet: `${l.note} “${l.quote}” — ${l.time}, ${l.place}.` })),
    ...DROPS.map(d => ({ title: d.locked ? `Drop #${d.id} — locked 🔒` : `Drop #${d.id} — ${d.name}`, url: `drops.html#drop-${d.id}`, crumb: "cyberdoll.net › drops", snippet: `${d.tagline}. ${d.desc}`, extra: d.locked ? "next drop secret friday 13" : "" })),
    ...CATS.map(c => ({ title: `Shop ${c.label} (${PRODUCTS.filter(p => p.cat === c.id).length})`, url: `shop.html?cat=${c.id}`, crumb: "cyberdoll.net › shop", snippet: `Every ${c.label.toLowerCase()} piece, all drops, filter and sort.`, extra: SYN[c.id] ? SYN[c.id].join(" ") : "" })),
    { title: "New In — Drop #005 Midnight Mall", url: "new-in.html", crumb: "cyberdoll.net › new-in", snippet: "The latest drop: tops, corsets and low-rise bottoms in five moods — glitter, studs, wild things, laced and low-rise.", extra: "new latest" },
    { title: "Lookbook — Midnight Fiction", url: "lookbook.html", crumb: "cyberdoll.net › lookbook", snippet: "Six looks shot after midnight. Flash on, feelings off.", extra: "editorial photos magazine" },
    { title: "About — CYBERDOLL's space", url: "about.html", crumb: "cyberdoll.net › about", snippet: "Who we are, the blog, our top 8 and the comments wall. Thanks for the add ♡", extra: "story brand team founder contact" },
    { title: "Join the Doll Club — 10% off", url: "index.html#club", crumb: "cyberdoll.net › club", snippet: "Early access to drops, secret restocks and 10% off your first order.", extra: "newsletter discount email" }
  ].map(w => ({ ...w, hay: norm(`${w.title} ${w.snippet} ${w.extra || ""}`) }));

  // every word we know, for "did you mean"
  const VOCAB = [...new Set(IDX.flatMap(d => `${d.name} ${d.meta} ${d.color}`.split(" ")).filter(w => w.length > 2 && !/^\d+$/.test(w)))];
  const lev = (a, b) => {
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  };

  /* ---------- search ---------- */
  const searchProducts = tokens => IDX.map(d => {
    let score = 0;
    for (const t of tokens) {
      let best = 0;
      for (const a of alts(t)) {
        if (d.name.includes(a)) best = Math.max(best, d.name.split(" ").includes(a) ? 12 : 9);
        else if (d.meta.includes(a)) best = Math.max(best, 6);
        else if (d.color.includes(a)) best = Math.max(best, 5);
        else if (d.body.includes(a)) best = Math.max(best, 2);
      }
      if (!best) return null;           // every word has to match somewhere
      score += best;
    }
    if (d.p.hot) score += .5;
    return { p: d.p, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.p.added - a.p.added);

  const searchWeb = tokens => WEB.filter(w => tokens.every(t => alts(t).some(a => w.hay.includes(a))));

  const suggest = tokens => {
    let changed = false;
    const fixed = tokens.map(t => {
      if (IDX.some(d => alts(t).some(a => `${d.name} ${d.meta} ${d.color}`.includes(a)))) return t;
      let best = null, bd = 3;
      VOCAB.forEach(w => { const dist = lev(t, w); if (dist < bd) { bd = dist; best = w; } });
      if (best && bd <= (t.length > 5 ? 2 : 1)) { changed = true; return best; }
      return t;
    });
    return changed ? fixed.join(" ") : null;
  };

  /* ---------- UI ---------- */
  const input = $("#q"), grid = $("#grid"), statusEl = $("#status"), didYou = $("#didYou");
  const filtersEl = $("#filters"), empty = $("#empty"), emptyMsg = $("#emptyMsg"), webWrap = $("#webWrap"), web = $("#web");
  const productsTitle = $("#productsTitle"), scan = $(".sr-scan");
  const cards = new Map();
  const cardFor = p => cards.get(p.id) || (cards.set(p.id, build(p)), cards.get(p.id));
  let activeCat = "all", lastTokens = [];

  const highlight = (text, tokens) => {
    let out = esc(text);
    const words = [...new Set(tokens.flatMap(alts))].filter(w => w.length > 1).sort((a, b) => b.length - a.length);
    if (!words.length) return out;
    const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return out.replace(re, "<mark>$1</mark>");
  };

  const showCards = (list, tokens) => {
    const els = list.map(p => {
      const el = cardFor(p);
      const a = $(".card__info h3 a", el);
      a.innerHTML = highlight(p.name, tokens);
      return el;
    });
    grid.replaceChildren(...els);
    if (!reduced) els.forEach((el, i) => el.animate([
      { opacity: 0, transform: "translateY(24px)", clipPath: "inset(0 0 100% 0)", filter: "grayscale(1) contrast(1.6)" },
      { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)", filter: "none" }
    ], { duration: 520, delay: Math.min(i, 12) * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  };

  const renderFilters = results => {
    if (!results.length) { filtersEl.innerHTML = ""; return; }
    const counts = {};
    results.forEach(r => (counts[r.p.cat] = (counts[r.p.cat] || 0) + 1));
    const chips = [{ id: "all", label: "ALL", n: results.length }, ...CATS.filter(c => counts[c.id]).map(c => ({ id: c.id, label: c.label, n: counts[c.id] }))];
    if (!chips.some(c => c.id === activeCat)) activeCat = "all";
    filtersEl.innerHTML = chips.map(c => `<button type="button" class="chip" role="tab" data-cat="${c.id}" aria-selected="${c.id === activeCat}">${c.label}<sup>${c.n}</sup></button>`).join("");
  };

  const trendingList = () => PRODUCTS.filter(p => p.hot || p.tag === "BESTSELLER").sort((a, b) => b.added - a.added).slice(0, 8);

  const run = (raw, { save = false } = {}) => {
    const t0 = performance.now();
    const q = norm(raw), tokens = q ? q.split(" ").filter(Boolean) : [];
    lastTokens = tokens;
    history.replaceState(null, "", q ? `?q=${encodeURIComponent(raw.trim())}` : location.pathname);
    didYou.hidden = true;

    if (!tokens.length) {
      productsTitle.textContent = "TRENDING NOW";
      filtersEl.innerHTML = "";
      empty.hidden = true;
      webWrap.hidden = true;
      statusEl.innerHTML = `<b>${PRODUCTS.length}</b> pieces indexed — type something ♡`;
      showCards(trendingList(), []);
      return;
    }

    if (!reduced) { scan.classList.remove("is-scanning"); void scan.offsetWidth; scan.classList.add("is-scanning"); }
    let results = searchProducts(tokens);
    // typo? search the closest known words instead, like a real engine would
    let corrected = null;
    if (!results.length) {
      const s = suggest(tokens);
      if (s) {
        const fixed = searchProducts(s.split(" "));
        if (fixed.length) { corrected = s; results = fixed; tokens.splice(0, tokens.length, ...s.split(" ")); lastTokens = tokens; }
      }
    }
    renderFilters(results);
    const shown = activeCat === "all" ? results : results.filter(r => r.p.cat === activeCat);
    const webHits = searchWeb(tokens);
    const secs = ((performance.now() - t0) / 1000).toFixed(4);

    productsTitle.textContent = `PIECES (${shown.length})`;
    productsTitle.hidden = !results.length;
    statusEl.innerHTML = `About <b>${results.length + webHits.length}</b> results for “${esc(corrected || raw.trim())}” <span>(${secs} seconds)</span>`;
    if (corrected) {
      didYou.hidden = false;
      didYou.innerHTML = `Showing results for <b>${esc(corrected)}</b> — no dolls found for “${esc(raw.trim())}”`;
    }
    showCards(shown.map(r => r.p), tokens);

    empty.hidden = results.length > 0;
    if (!results.length) {
      const s = suggest(tokens);
      emptyMsg.textContent = `No dolls found for “${raw.trim()}”. Try fewer words, or one of the trending searches.`;
      if (s) {
        didYou.hidden = false;
        didYou.innerHTML = `Did you mean: <button type="button" data-q="${esc(s)}">${esc(s)}</button> ?`;
      }
    }

    webWrap.hidden = !webHits.length;
    web.innerHTML = webHits.map(w => `
      <li class="sr-web__item">
        <a href="${esc(w.url)}" class="sr-web__title">${highlight(w.title, tokens)}</a>
        <p class="sr-web__crumb">${esc(w.crumb)}</p>
        <p class="sr-web__snip">${highlight(w.snippet, tokens)}</p>
      </li>`).join("");

    if (save && results.length) remember(raw.trim());
  };

  /* ---------- recent searches (this browser only) ---------- */
  let recent = CD.store.get("cd_recent_search", []);
  const recentRow = $("#recentRow"), recentEl = $("#recent");
  const drawRecent = () => {
    recentRow.hidden = !recent.length;
    recentEl.innerHTML = recent.map(r => `<button type="button" class="sr-chip" data-q="${esc(r)}">${esc(r)}</button>`).join("");
  };
  const remember = q => {
    recent = [q, ...recent.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    CD.store.set("cd_recent_search", recent);
    drawRecent();
  };
  $("#clearRecent").addEventListener("click", () => { recent = []; CD.store.set("cd_recent_search", recent); drawRecent(); });
  drawRecent();

  /* ---------- trending ---------- */
  const TRENDING = ["leopard", "corset", "fur", "low rise", "boots", "rhinestone", "studs", "lace", "skull", "cross"];
  $("#trending").innerHTML = TRENDING.map(t => `<button type="button" class="sr-chip" data-q="${t}">${t}</button>`).join("");

  /* ---------- events ---------- */
  let typeT, saveT;
  const logoLetters = $$(".sr-logo span");
  input.addEventListener("input", () => {
    ghostStop();
    activeCat = "all";
    clearTimeout(typeT); clearTimeout(saveT);
    typeT = setTimeout(() => run(input.value), 140);
    saveT = setTimeout(() => { if (norm(input.value).length > 2) run(input.value, { save: true }); }, 1400);
    if (!reduced) {   // a random logo letter hops on every keystroke
      const l = logoLetters[Math.random() * logoLetters.length | 0];
      l.classList.remove("hop"); void l.offsetWidth; l.classList.add("hop");
    }
  });
  $("#searchForm").addEventListener("submit", e => { e.preventDefault(); clearTimeout(saveT); run(input.value, { save: true }); input.blur(); });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-q]");
    if (b) { input.value = b.dataset.q; ghostStop(); activeCat = "all"; run(b.dataset.q, { save: true }); input.focus(); return; }
    const f = e.target.closest("#filters .chip");
    if (f) { activeCat = f.dataset.cat; run(input.value); }
  });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === "Escape" && document.activeElement === input && input.value) { input.value = ""; run(""); ghostStart(); }
  });

  /* ---------- ghost placeholder that types itself ---------- */
  const ghost = $("#ghost");
  const IDEAS = ["leopard corset", "fur boots", "low rise jeans", "rhinestone earrings", "lace cami", "studded bag", "skull knit", "halter top"];
  let ghostTimer = null;
  const ghostStop = () => { clearTimeout(ghostTimer); ghost.textContent = ""; ghost.hidden = true; };
  const ghostStart = () => {
    if (reduced) { ghost.hidden = false; ghost.textContent = "search for dolls…"; return; }
    ghost.hidden = false;
    let idea = 0, i = 0, dir = 1;
    const tick = () => {
      if (input.value) return ghostStop();
      const w = `search “${IDEAS[idea]}”`;
      i += dir;
      ghost.textContent = w.slice(0, i);
      if (i >= w.length) { dir = -1; ghostTimer = setTimeout(tick, 1400); return; }
      if (i <= 0) { dir = 1; idea = (idea + 1) % IDEAS.length; }
      ghostTimer = setTimeout(tick, dir > 0 ? 70 : 30);
    };
    tick();
  };
  input.addEventListener("blur", () => { if (!input.value) ghostStart(); });
  input.addEventListener("focus", () => { if (!input.value) { ghostStop(); ghost.hidden = false; ghost.textContent = "type to search ♡"; } });

  /* ---------- I'm feeling glitchy: slot machine, then go ---------- */
  const slot = $("#slot"), slotImg = $("#slotImg"), slotName = $("#slotName");
  $("#lucky").addEventListener("click", () => {
    const pool = lastTokens.length ? searchProducts(lastTokens).map(r => r.p) : PRODUCTS;
    const list = pool.length ? pool : PRODUCTS;
    const pick = list[Math.random() * list.length | 0];
    if (reduced) { location.href = `product.html?id=${encodeURIComponent(pick.id)}`; return; }
    slot.hidden = false;
    requestAnimationFrame(() => slot.classList.add("is-open"));
    let n = 0, delay = 50;
    const spin = () => {
      const p = n < 18 ? PRODUCTS[Math.random() * PRODUCTS.length | 0] : pick;
      slotImg.src = p.img;
      slotName.textContent = p.name;
      if (n++ < 18) { delay *= 1.12; setTimeout(spin, delay); }
      else {
        slot.classList.add("is-done");
        setTimeout(() => { location.href = `product.html?id=${encodeURIComponent(pick.id)}`; }, 900);
      }
    };
    spin();
  });

  /* ---------- go ---------- */
  const start = new URLSearchParams(location.search).get("q") || "";
  input.value = start;
  if (start) { ghostStop(); run(start); } else { run(""); ghostStart(); }
})();
