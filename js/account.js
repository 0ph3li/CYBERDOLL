/* =========================================================
   CYBERDOLL — account ("DOLL HQ")
   A front-end demo: the account lives in this browser only
   (localStorage). No passwords are asked for or stored.
   needs: products.js, main.js (window.CD), cards.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const { build, esc, focusPos } = window.CDCards;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const CATS = window.CD_CATEGORIES || [];
  const byId = id => PRODUCTS.find(p => p.id === id);
  const pad = (n, l = 2) => String(n).padStart(l, "0");

  // avatars + uploaded photos are shared with the rest of the site (main.js)
  const avatarSVG = CD.avatarSVG;

  /* ---------- tiers ---------- */
  const TIERS = [
    { id: "baby", name: "BABY DOLL", min: 0, perk: "Welcome gift: early access to every drop." },
    { id: "cyber", name: "CYBER DOLL", min: 300, perk: "Free shipping on everything + secret sale invites." },
    { id: "angel", name: "ANGEL.EXE", min: 800, perk: "First pick of every drop + a birthday surprise ♡" }
  ];
  const tierFor = pts => [...TIERS].reverse().find(t => pts >= t.min);

  /* ---------- state ---------- */
  let acc = CD.auth.current();
  const save = () => CD.auth.update(acc);

  // points come from things you've actually done on the site
  const earnings = () => {
    const wish = CD.getWish().length, bag = CD.getBag().length;
    const comments = CD.store.get("cd_comments", []).length;
    const friend = CD.store.get("cd_friend", false);
    const sized = !!(acc && acc.sizeTop && acc.sizeShoe);
    const secrets = CD.store.get("cd_secrets", []).length;
    return [
      { label: "Print your Doll ID", pts: 100, done: true },
      { label: `Save pieces to your wishlist (${wish} × 10)`, pts: wish * 10, done: wish > 0, go: "wishlist" },
      { label: `Add pieces to your bag (${bag} × 25)`, pts: bag * 25, done: bag > 0, go: "bag" },
      { label: "Add CYBERDOLL as a friend on the About page", pts: friend ? 50 : 0, max: 50, done: friend, href: "about.html" },
      { label: `Leave comments on our wall (${comments} × 15)`, pts: comments * 15, done: comments > 0, href: "about.html" },
      { label: "Join the newsletter", pts: acc && acc.news ? 50 : 0, max: 50, done: !!(acc && acc.news), go: "settings" },
      { label: "Save your sizes", pts: sized ? 25 : 0, max: 25, done: sized, go: "settings" },
      { label: `Find the secrets hidden around the site (${secrets}/3)${secrets < 3 ? " — hint: a very old cheat code" : " ♡"}`, pts: secrets * 50, max: 150, done: secrets >= 3 }
    ];
  };
  const points = () => earnings().reduce((s, e) => s + e.pts, 0);

  /* =========================================================
     LOGIN
     ========================================================= */
  const login = $("#login"), hq = $("#hq");

  const boot = () => {
    const box = $("#boot");
    const lines = ["CYBERDOLL OS v2.6 ♡", "checking doll status ......", "nobody is logged in.", "starting login.exe"];
    box.innerHTML = "";
    if (reduced) { box.innerHTML = lines.map(l => `<p>${l}</p>`).join(""); login.classList.add("is-on"); return; }
    let i = 0;
    const next = () => {
      if (i >= lines.length) { login.classList.add("is-on"); return; }
      const p = document.createElement("p");
      p.textContent = lines[i++];
      box.appendChild(p);
      setTimeout(next, 260);
    };
    setTimeout(next, 500);
  };

  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#lgName").value.trim(), email = $("#lgEmail");
    const msg = $("#lgMsg");
    if (!name) { msg.textContent = "> pick a nickname, doll"; $("#lgName").focus(); return shake(e.target); }
    if (!email.value || !email.checkValidity()) { msg.textContent = "> that email looks glitched"; email.focus(); return shake(e.target); }
    // same email = same Doll ID: your bag, wishlist and the rest come back
    const res = CD.auth.login({ email: email.value, name, news: $("#lgNews").checked });
    acc = res.profile;
    CD.showToast(res.isNew ? "PRINTING YOUR DOLL ID…" : `WELCOME BACK, ${acc.name.toUpperCase()} ♡ YOUR STUFF IS BACK`);
    showHQ(true);
  });
  const shake = el => el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 });

  /* =========================================================
     HQ
     ========================================================= */
  const showLogin = () => {
    hq.hidden = true;
    login.hidden = false;
    login.classList.remove("is-on");
    clearLook();
    boot();
  };

  const showHQ = (printing = false) => {
    login.hidden = true;
    hq.hidden = false;
    const d = new Date();
    $("#hqDate").textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    renderCard();
    renderStats();
    renderPanels();
    fillSettings();
    fillCustomize();
    applyLook();
    const card = $("#card");
    card.classList.remove("is-printing");
    if (printing && !reduced) { void card.offsetWidth; card.classList.add("is-printing"); }
    scrollTo({ top: 0, behavior: "auto" });
  };

  const renderCard = () => {
    const pts = points(), tier = tierFor(pts);
    $("#hqName").textContent = acc.name.toUpperCase();
    $("#cardName").textContent = acc.name.toUpperCase();
    $("#cardNo").textContent = acc.no;
    $("#cardSince").textContent = acc.since;
    $("#cardTier").textContent = tier.name;
    paintPfp();
    $("#card").dataset.tier = tier.id;
  };

  const countUp = (el, to) => {
    if (reduced) { el.textContent = to; return; }
    const from = Number(el.textContent) || 0, t0 = performance.now(), dur = 900;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const renderStats = () => {
    const pts = points(), tier = tierFor(pts);
    const next = TIERS[TIERS.indexOf(tier) + 1];
    countUp($("#statPoints"), pts);
    countUp($("#statWish"), CD.getWish().length);
    countUp($("#statBag"), CD.getBag().length);
    const pct = next ? (pts - tier.min) / (next.min - tier.min) * 100 : 100;
    requestAnimationFrame(() => ($("#tierBar").style.width = `${Math.min(100, pct)}%`));
    $("#tierNext").textContent = next ? `${next.min - pts} pts to ${next.name}` : "max level — you ARE the drop ♡";
  };

  /* ---------- panels ---------- */
  const renderWishlist = () => {
    const ids = CD.getWish().map(u => new URLSearchParams(u.split("?")[1] || "").get("id")).filter(Boolean);
    const items = ids.map(byId).filter(Boolean);
    const grid = $("#wishGrid");
    grid.replaceChildren(...items.map(p => build(p)));
    $("#wishEmpty").hidden = items.length > 0;
    grid.hidden = !items.length;
  };

  const renderBag = () => {
    const bag = CD.getBag();
    const list = $("#bagList");
    let total = 0;
    list.innerHTML = bag.map((it, i) => {
      const p = it.gift ? { id: null, name: it.name, price: it.gift.amount, img: `img/gift/${it.gift.design}.svg`, gift: true } : it.id ? byId(it.id) : PRODUCTS.find(x => it.name.startsWith(x.name));
      if (p) total += p.price;
      const size = it.size || (it.name.includes(" / ") ? it.name.split(" / ").pop() : "");
      return `
        <li class="ac-bag__item">
          <span class="ac-bag__thumb">${p ? `<img src="${esc(p.img)}" alt="" style="object-position:${focusPos(p)}" />` : ""}</span>
          <span class="ac-bag__info">
            ${p ? `<a href="${p.gift ? "gift-cards.html" : `product.html?id=${encodeURIComponent(p.id)}`}">${esc(p.name)}</a>` : `<b>${esc(it.name)}</b>`}
            <small>${size ? `SIZE ${esc(size)}` : "ONE SIZE"}</small>
          </span>
          <b class="ac-bag__price">${p ? `€${p.price}` : "—"}</b>
          <button type="button" class="ac-bag__rm" data-rm="${i}" aria-label="Remove from bag">×</button>
        </li>`;
    }).join("");
    $("#bagTotal").textContent = `€${total}`;
    $("#bagEmpty").hidden = bag.length > 0;
    $("#bagFoot").hidden = !bag.length;
    list.hidden = !bag.length;
  };

  const renderPoints = () => {
    const pts = points(), tier = tierFor(pts);
    $("#tiers").innerHTML = TIERS.map(t => `
      <li class="ac-tier${t === tier ? " is-current" : ""}${pts >= t.min ? " is-reached" : ""}" data-tier="${t.id}">
        <span class="ac-tier__name">${t.name}</span>
        <span class="ac-tier__min">${t.min}+ pts</span>
        <span class="ac-tier__perk">${esc(t.perk)}</span>
        ${t === tier ? '<span class="ac-tier__you">YOU ARE HERE ♡</span>' : ""}
      </li>`).join("");
    $("#earn").innerHTML = earnings().map(e => `
      <li class="${e.done ? "is-done" : ""}">
        <span class="ac-earn__box" aria-hidden="true">${e.done ? "✓" : ""}</span>
        <span class="ac-earn__label">${esc(e.label)}</span>
        <b>+${e.pts || e.max || 0}</b>
        ${!e.done && e.href ? `<a href="${e.href}">go →</a>` : !e.done && e.go ? `<button type="button" data-go="${e.go}">go →</button>` : ""}
      </li>`).join("");
  };

  const renderPanels = () => { renderWishlist(); renderBag(); renderPoints(); };

  /* ---------- tabs ---------- */
  const tabs = $$(".ac-tabs [data-tab]");
  const openTab = name => {
    tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.tab === name));
    $$(".ac-panel").forEach(p => {
      const on = p.dataset.panel === name;
      p.hidden = !on;
      if (on && !reduced) p.animate([{ opacity: 0, transform: "translateY(16px)", clipPath: "inset(0 0 100% 0)" }, { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    history.replaceState(null, "", `#${name}`);
  };
  tabs.forEach(t => t.addEventListener("click", () => openTab(t.dataset.tab)));
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) { openTab(go.dataset.go); $(".ac-tabs").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }
    const rm = e.target.closest("[data-rm]");
    if (rm) { CD.removeFromBag(Number(rm.dataset.rm)); renderBag(); renderStats(); renderCard(); renderPoints(); CD.showToast("REMOVED FROM BAG"); }
    // hearts toggled inside the wishlist panel: refresh the numbers
    if (e.target.closest("#wishGrid .card__heart")) setTimeout(() => { renderStats(); renderCard(); renderPoints(); }, 50);
    if (e.target.closest("#wishGrid .card__add, #wishGrid .card__quick button")) setTimeout(() => { renderBag(); renderStats(); renderCard(); renderPoints(); }, 50);
  });

  /* ---------- settings ---------- */
  const pills = (el, values, name, current, multi = false) => {
    el.innerHTML = values.map(v => `
      <label class="ac-pill">
        <input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${esc(v.id)}" ${(multi ? current.includes(v.id) : current === v.id) ? "checked" : ""} />
        <span>${esc(v.label)}</span>
      </label>`).join("");
  };
  const fillSettings = () => {
    $("#stName").value = acc.name;
    $("#stEmail").value = acc.email;
    $("#stNews").checked = !!acc.news;
    pills($("#sizeTop"), ["XS", "S", "M", "L"].map(s => ({ id: s, label: s })), "sizeTop", acc.sizeTop);
    pills($("#sizeShoe"), ["36", "37", "38", "39", "40"].map(s => ({ id: s, label: s })), "sizeShoe", acc.sizeShoe);
    pills($("#favCats"), CATS.map(c => ({ id: c.id, label: c.label })), "cats", acc.cats || [], true);
  };

  $("#settings").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const name = $("#stName").value.trim(), email = $("#stEmail");
    if (!name) { shake(f); CD.showToast("NICKNAME CAN'T BE EMPTY"); return; }
    if (!email.value || !email.checkValidity()) { shake(f); CD.showToast("THAT EMAIL LOOKS GLITCHED"); return; }
    acc.name = name.slice(0, 18);
    acc.email = email.value.trim();
    acc.news = $("#stNews").checked;
    acc.sizeTop = (f.querySelector('input[name="sizeTop"]:checked') || {}).value || null;
    acc.sizeShoe = (f.querySelector('input[name="sizeShoe"]:checked') || {}).value || null;
    acc.cats = [...f.querySelectorAll('input[name="cats"]:checked')].map(i => i.value);
    save();
    renderCard(); renderStats(); renderPoints();
    CD.showToast("SAVED ♡");
  });

  $("#deleteAcc").addEventListener("click", () => {
    if (!confirm("Delete your Doll ID from this browser? Everything saved in it (bag, wishlist, points) goes too.")) return;
    CD.auth.remove();
    acc = null;
    CD.showToast("DOLL ID DELETED");
    showLogin();
  });
  $("#signOut").addEventListener("click", () => {
    // your stuff stays saved in your Doll ID — log in with the same email to get it back
    CD.auth.logout();
    acc = null;
    CD.showToast("SIGNED OUT — YOUR STUFF IS SAVED ♡");
    showLogin();
  });

  /* =========================================================
     CUSTOMIZE — profile pic, frame, background, animation, accent, mood
     everything is saved on the Doll ID (this browser only)
     ========================================================= */
  const FRAMES = [
    { id: "square", label: "▢ square" }, { id: "circle", label: "◯ circle" },
    { id: "heart", label: "♡ heart" }, { id: "star", label: "✦ star" }, { id: "blob", label: "✿ flower" }
  ];
  const THEMES = [
    { id: "void", label: "VOID" }, { id: "stars", label: "STARRY" }, { id: "hearts", label: "LOVESICK" },
    { id: "checker", label: "CHECKER" }, { id: "chrome", label: "CHROME" }, { id: "matrix", label: "MATRIX" },
    { id: "hazard", label: "HAZARD" }, { id: "photo", label: "MY PIC" },
    { id: "angel", label: "ANGEL", secret: "cyberdoll" }, { id: "glitchcore", label: "GLITCHCORE", secret: "konami" }
  ];
  const EFFECTS = [
    { id: "none", label: "✕ off" }, { id: "hearts", label: "♡ falling hearts" }, { id: "stars", label: "✦ twinkle" },
    { id: "sparkle", label: "✧ glitter rise" }, { id: "bubbles", label: "○ bubbles" }, { id: "glitch", label: "▚ glitch" },
    { id: "kawaii", label: "✿ kawaii", secret: "logo" }
  ];
  const ACCENTS = [
    { id: "#ff5ea8", label: "hot pink" }, { id: "#ffa9cf", label: "baby pink" }, { id: "#ff2a2a", label: "red" },
    { id: "#9fc4e8", label: "ice" }, { id: "#b388ff", label: "lilac" }, { id: "#7dff6a", label: "toxic" }, { id: "#ffd24a", label: "gold" }
  ];
  const MOODS = ["✦ glitchy", "♡ in love", "☠ feral", "☾ sleepy", "★ iconic", "⚡ chaotic", "☂ sad girl hours", "♛ main character"];

  const main = $("#main"), fxLayer = $("#fx");
  const look = () => ({ frame: "square", theme: "void", fx: "none", accent: "#ff5ea8", mood: "", ...(acc && acc.look) });
  const setLook = patch => {
    acc.look = { ...look(), ...patch };
    save();
    applyLook();
    const s = $("#czSaved");
    s.textContent = "saved ✓";
    s.classList.remove("is-flash"); void s.offsetWidth; s.classList.add("is-flash");
  };

  // the same picture in every spot on the page
  const paintPfp = () => {
    const l = look(), html = CD.avatarHTML(acc);
    [$("#cardAvatar"), $("#hqPfp"), $("#pfpBig")].forEach(el => {
      el.innerHTML = html;
      el.dataset.frame = l.frame;
      el.classList.toggle("has-photo", !!acc.photo);
    });
    $("#pfpRemove").hidden = !acc.photo;
    $("#pfpEdit").hidden = !acc.photoSrc;
  };

  // secret unlocks (see secrets.js) stay locked until you find them
  const locked = o => o.secret && !CD.store.get("cd_secrets", []).includes(o.secret);
  const opts = (el, list, current) => {
    el.innerHTML = list.map(o => locked(o)
      ? `<button type="button" role="radio" class="is-locked" data-v="${esc(o.id)}" aria-checked="false" disabled title="find a secret to unlock ♡">🔒 ???</button>`
      : `<button type="button" role="radio" data-v="${esc(o.id)}" aria-checked="${o.id === current}">${esc(o.label)}</button>`).join("");
  };

  const fillCustomize = () => {
    const l = look();
    $("#avatars").innerHTML = CD.avatars.map(k => `
      <button type="button" role="radio" class="ac-avatar" data-v="${k}" aria-checked="${!acc.photo && acc.avatar === k}" aria-label="${k}"><span>${avatarSVG(k)}</span></button>`).join("");
    opts($("#frames"), FRAMES, l.frame);
    $("#themes").innerHTML = THEMES.map(t => locked(t) ? `
      <button type="button" role="radio" class="ac-theme ac-theme--locked" data-v="${t.id}" aria-checked="false" disabled title="find a secret to unlock ♡">
        <span class="ac-theme__sw"></span>🔒 SECRET</button>` : `
      <button type="button" role="radio" class="ac-theme ac-theme--${t.id}" data-v="${t.id}" aria-checked="${t.id === l.theme}"${t.id === "photo" && !acc.photo ? " disabled title=\"upload a photo first\"" : ""}>
        <span class="ac-theme__sw"${t.id === "photo" && acc.photo ? ` style="background-image:url(${acc.photo})"` : ""}></span>${t.label}</button>`).join("");
    opts($("#effects"), EFFECTS, l.fx);
    $("#accents").innerHTML = ACCENTS.map(a => `<button type="button" role="radio" data-v="${a.id}" aria-checked="${a.id === l.accent}" aria-label="${a.label}" style="--c:${a.id}"></button>`).join("");
    opts($("#moods"), MOODS.map(m => ({ id: m, label: m })), l.mood);
    $("#moodText").value = MOODS.includes(l.mood) ? "" : l.mood;
    paintPfp();
  };

  const pick = (el, v) => $$("[role=radio]", el).forEach(b => b.setAttribute("aria-checked", b.dataset.v === v));
  const onPick = (sel, fn) => $(sel).addEventListener("click", e => {
    const b = e.target.closest("[data-v]");
    if (!b || b.disabled) return;
    pick($(sel), b.dataset.v);
    fn(b.dataset.v, b);
  });
  onPick("#avatars", v => {
    acc.avatar = v;
    acc.photo = null; acc.photoSrc = null;
    if (look().theme === "photo") acc.look = { ...look(), theme: "void" };
    setLook({});
    fillCustomize(); renderCard();
  });
  onPick("#frames", v => { setLook({ frame: v }); paintPfp(); });
  onPick("#themes", v => setLook({ theme: v }));
  onPick("#effects", v => setLook({ fx: v }));
  onPick("#accents", v => setLook({ accent: v }));
  onPick("#moods", v => { $("#moodText").value = ""; setLook({ mood: v }); });
  let moodT;
  $("#moodText").addEventListener("input", e => {
    clearTimeout(moodT);
    moodT = setTimeout(() => { pick($("#moods"), null); setLook({ mood: e.target.value.trim() }); }, 350);
  });
  $("#pfpRemove").addEventListener("click", () => {
    acc.photo = null; acc.photoSrc = null;
    setLook(look().theme === "photo" ? { theme: "void" } : {});
    fillCustomize(); renderCard();
    CD.showToast("PHOTO REMOVED");
  });

  /* ---------- look: background, animation, accent, mood ---------- */
  const FX_CHARS = { kawaii: ["✿", "♡", "☆", "✧", "❀"], hearts: ["♡", "♥", "❤"], stars: ["✦", "✧", "⋆", "★"], sparkle: ["✧", "·", "✦", "˚"], bubbles: [""] };
  let fxOn = "";
  const buildFx = fx => {
    if (fx === fxOn) return;
    fxOn = fx;
    fxLayer.innerHTML = "";
    fxLayer.dataset.fx = fx;
    if (reduced || !FX_CHARS[fx]) return;
    const n = fx === "stars" ? 34 : 22;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      const chars = FX_CHARS[fx];
      s.textContent = chars[i % chars.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = fx === "stars" ? `${Math.random() * 100}%` : "";
      s.style.setProperty("--s", (0.6 + Math.random() * 1.4).toFixed(2));
      s.style.setProperty("--dur", `${(fx === "stars" ? 2 : 7) + Math.random() * 7}s`);
      s.style.setProperty("--delay", `${-Math.random() * 12}s`);
      s.style.setProperty("--sway", `${(Math.random() * 60 - 30).toFixed(0)}px`);
      fxLayer.appendChild(s);
    }
  };
  const applyLook = () => {
    if (!acc) return clearLook();
    const l = look();
    main.dataset.theme = l.theme;
    main.style.setProperty("--acc", l.accent);
    main.style.setProperty("--me-photo", acc.photo && l.theme === "photo" ? `url(${acc.photo})` : "none");
    main.classList.toggle("is-glitch", l.fx === "glitch" && !reduced);
    buildFx(l.fx);
    const mood = $("#hqMood");
    mood.hidden = !l.mood;
    mood.textContent = l.mood ? `mood: ${l.mood}` : "";
  };
  const clearLook = () => {
    delete main.dataset.theme;
    main.style.removeProperty("--acc");
    main.style.removeProperty("--me-photo");
    main.classList.remove("is-glitch");
    buildFx("none");
  };

  /* ---------- photo upload + crop + filters ---------- */
  const FILTERS = [
    { id: "none", label: "original" }, { id: "doll", label: "doll pink" }, { id: "bw", label: "b&w film" },
    { id: "cyber", label: "cyber duo" }, { id: "pixel", label: "8-bit" }, { id: "glitter", label: "glitter" }, { id: "vhs", label: "vhs" }
  ];
  const crop = $("#crop"), cv = $("#cropCanvas"), ctx = cv.getContext("2d", { willReadFrequently: true });
  const cz = { img: null, src: "", zoom: 1, x: 0, y: 0, filter: "none", seed: 1 };
  opts($("#filters"), FILTERS, "none");

  // paint the photo into any square canvas
  const paint = (c, g, size) => {
    const img = cz.img;
    const base = Math.max(size / img.naturalWidth, size / img.naturalHeight) * cz.zoom;
    const w = img.naturalWidth * base, h = img.naturalHeight * base;
    // keep the photo covering the frame
    const maxX = (w - size) / 2, maxY = (h - size) / 2;
    cz.x = Math.max(-maxX, Math.min(maxX, cz.x));
    cz.y = Math.max(-maxY, Math.min(maxY, cz.y));
    const k = size / cv.width;
    const dx = (size - w) / 2 + cz.x * k, dy = (size - h) / 2 + cz.y * k;
    g.save();
    g.fillStyle = "#0a0a0b";
    g.fillRect(0, 0, size, size);
    g.filter = { bw: "grayscale(1) contrast(1.25) brightness(1.05)", doll: "saturate(1.25) contrast(1.05)", vhs: "saturate(1.4) contrast(1.1)", glitter: "brightness(1.05) saturate(1.2)" }[cz.filter] || "none";
    if (cz.filter === "pixel") {
      const t = document.createElement("canvas"), px = 44;
      t.width = t.height = px;
      const tg = t.getContext("2d");
      tg.drawImage(img, dx * px / size, dy * px / size, w * px / size, h * px / size);
      g.imageSmoothingEnabled = false;
      g.drawImage(t, 0, 0, size, size);
    } else g.drawImage(img, dx, dy, w, h);
    g.restore();
    const fx = cz.filter;
    if (fx === "doll") {
      g.save(); g.globalCompositeOperation = "soft-light"; g.fillStyle = "#ff5ea8"; g.fillRect(0, 0, size, size); g.restore();
    }
    if (fx === "cyber") {
      // duotone: shadows ink-purple, highlights ice-pink
      const d = g.getImageData(0, 0, size, size), p = d.data;
      const lo = [26, 8, 40], mid = [255, 94, 168], hi = [220, 240, 255];
      for (let i = 0; i < p.length; i += 4) {
        const l = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255;
        const [a, b, t] = l < .5 ? [lo, mid, l * 2] : [mid, hi, (l - .5) * 2];
        p[i] = a[0] + (b[0] - a[0]) * t; p[i + 1] = a[1] + (b[1] - a[1]) * t; p[i + 2] = a[2] + (b[2] - a[2]) * t;
      }
      g.putImageData(d, 0, 0);
    }
    if (fx === "vhs") {
      const d = g.getImageData(0, 0, size, size), p = d.data, sh = Math.round(size / 90) * 4;
      const copy = new Uint8ClampedArray(p);
      for (let i = 0; i < p.length; i += 4) { p[i] = copy[Math.min(p.length - 4, i + sh)]; p[i + 2] = copy[Math.max(0, i - sh) + 2]; }
      g.putImageData(d, 0, 0);
      g.fillStyle = "rgba(0,0,0,.18)";
      for (let y = 0; y < size; y += Math.max(2, size / 140)) g.fillRect(0, y, size, Math.max(1, size / 280));
    }
    if (fx === "glitter") {
      let r = cz.seed;
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      g.save();
      for (let i = 0; i < 70; i++) {
        const x = rnd() * size, y = rnd() * size, s = (rnd() * 3 + 1) * size / 280;
        g.fillStyle = rnd() > .5 ? "rgba(255,255,255,.95)" : "rgba(255,169,207,.95)";
        g.fillRect(x - s * 2, y - s / 3, s * 4, s * .66);
        g.fillRect(x - s / 3, y - s * 2, s * .66, s * 4);
      }
      g.restore();
    }
  };
  const draw = () => { if (cz.img) paint(cv, ctx, cv.width); };

  const openCrop = (src, keep = false) => {
    const img = new Image();
    img.onload = () => {
      cz.img = img; cz.src = src;
      if (!keep) { cz.zoom = 1; cz.x = 0; cz.y = 0; cz.filter = "none"; }
      cz.seed = 1 + Math.floor(Math.random() * 1e6);
      $("#cropZoom").value = cz.zoom;
      pick($("#filters"), cz.filter);
      crop.hidden = false;
      draw();
      $("#cropSave").focus();
    };
    img.onerror = () => CD.showToast("COULDN'T READ THAT IMAGE");
    img.src = src;
  };

  $("#pfpFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) return CD.showToast("THAT'S NOT A PICTURE, DOLL");
    if (f.size > 15 * 1024 * 1024) return CD.showToast("TOO BIG — UNDER 15MB PLS");
    // keep a smaller copy of the original so you can re-crop later
    const reader = new FileReader();
    reader.onload = () => {
      const tmp = new Image();
      tmp.onload = () => {
        const max = 900, k = Math.min(1, max / Math.max(tmp.naturalWidth, tmp.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(tmp.naturalWidth * k); c.height = Math.round(tmp.naturalHeight * k);
        c.getContext("2d").drawImage(tmp, 0, 0, c.width, c.height);
        openCrop(c.toDataURL("image/jpeg", .85));
      };
      tmp.onerror = () => CD.showToast("COULDN'T READ THAT IMAGE");
      tmp.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  $("#pfpEdit").addEventListener("click", () => {
    if (!acc.photoSrc) return;
    Object.assign(cz, acc.photoCrop || {});
    openCrop(acc.photoSrc, true);
  });

  $("#cropZoom").addEventListener("input", e => { cz.zoom = +e.target.value; draw(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    cz.filter = b.dataset.v;
    pick($("#filters"), cz.filter);
    draw();
  });
  // drag to move (mouse + touch)
  let drag = null;
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, ox: cz.x, oy: cz.y }; cv.setPointerCapture(e.pointerId); cv.classList.add("is-grabbing"); });
  cv.addEventListener("pointermove", e => {
    if (!drag) return;
    const k = cv.width / cv.getBoundingClientRect().width;
    cz.x = drag.ox + (e.clientX - drag.x) * k;
    cz.y = drag.oy + (e.clientY - drag.y) * k;
    draw();
  });
  const endDrag = () => { drag = null; cv.classList.remove("is-grabbing"); };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    cz.zoom = Math.max(1, Math.min(3, cz.zoom - e.deltaY * .002));
    $("#cropZoom").value = cz.zoom;
    draw();
  }, { passive: false });

  const closeCrop = () => { crop.hidden = true; $("#pfpBig").focus?.(); };
  $("#cropCancel").addEventListener("click", closeCrop);
  crop.addEventListener("click", e => { if (e.target === crop) closeCrop(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !crop.hidden) closeCrop(); });
  $("#cropSave").addEventListener("click", () => {
    const out = document.createElement("canvas");
    out.width = out.height = 320;
    paint(out, out.getContext("2d"), 320);
    acc.photo = out.toDataURL("image/jpeg", .86);
    acc.photoSrc = cz.src;
    acc.photoCrop = { zoom: cz.zoom, x: cz.x, y: cz.y, filter: cz.filter };
    setLook({});
    // make sure it actually fit in the browser's storage
    if (!CD.auth.current() || CD.auth.current().photo !== acc.photo) {
      acc.photoSrc = null;
      save();
      if (!CD.auth.current() || CD.auth.current().photo !== acc.photo) { acc.photo = null; CD.showToast("NO SPACE LEFT IN THIS BROWSER FOR THE PHOTO"); closeCrop(); return; }
    }
    crop.hidden = true;
    fillCustomize(); renderCard();
    const big = $("#pfpBig");
    big.classList.remove("is-new"); void big.offsetWidth; big.classList.add("is-new");
    CD.showToast("NEW PROFILE PIC ♡");
  });

  document.addEventListener("cd:secret", () => {
    if (!acc) return;
    fillCustomize(); renderCard(); renderStats(); renderPoints();
  });

  /* ---------- holographic card follows the pointer ---------- */
  const card = $("#card");
  if (CD.finePointer && !reduced) {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.style.transform = `rotateY(${(x - .5) * 18}deg) rotateX(${(.5 - y) * 14}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  }

  /* ---------- go ---------- */
  if (acc) {
    showHQ();
    const hash = location.hash.slice(1);
    if (["wishlist", "bag", "orders", "points", "customize", "settings"].includes(hash)) openTab(hash);
  } else showLogin();
})();
