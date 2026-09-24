/* =========================================================
   CYBERDOLL — wishlist
   night-sky board · want level · notes · size → bag
   love-o-meter · payday planner · share link / friend's list
   needs: products.js, main.js (window.CD), cards.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const { build, esc, url, focusPos, dropLabel, HEART } = window.CDCards;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const byId = id => PRODUCTS.find(p => p.id === id);
  const idOf = key => new URLSearchParams(String(key).split("?")[1] || "").get("id");
  const eur = n => `€${Math.round(n)}`;

  const WANT = ["", "want", "need", "OBSESSED"];
  const CATS = window.CD_CATEGORIES || [];

  // a friend's list arrives as ?w=id,id,id
  const sharedIds = (new URLSearchParams(location.search).get("w") || "")
    .split(",").map(s => s.trim()).filter(id => byId(id));
  const SHARED = sharedIds.length > 0;

  /* ---------- data ---------- */
  const getMeta = () => CD.store.get("cd_wish_meta", {});
  const setMeta = (id, patch) => {
    const all = getMeta();
    all[id] = { ...(all[id] || {}), ...patch };
    CD.store.set("cd_wish_meta", all);
  };
  const metaOf = id => SHARED ? {} : (getMeta()[id] || {});
  const wantOf = id => metaOf(id).want || 1;

  // newest pin first
  const wishes = () => {
    if (SHARED) return [...new Set(sharedIds)].map(byId);
    const seen = new Set();
    return CD.getWish().map(idOf).reverse()
      .filter(id => id && !seen.has(id) && seen.add(id))
      .map(byId).filter(Boolean);
  };

  // every pin leans its own way, but always the same way
  const tilt = id => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
    return ((Math.abs(h) % 9) - 4) * 0.9;
  };

  /* ---------- state ---------- */
  let cat = "all";
  let sort = "pinned";
  const sortSel = $("#sort");

  const sorted = list => {
    const l = list.slice();
    if (sort === "want") l.sort((a, b) => wantOf(b.id) - wantOf(a.id));
    if (sort === "low") l.sort((a, b) => a.price - b.price);
    if (sort === "high") l.sort((a, b) => b.price - a.price);
    return l;
  };

  /* ---------- pins ---------- */
  const pinsEl = $("#pins");

  const pinHTML = (p, i) => {
    const m = metaOf(p.id);
    const want = m.want || 1;
    const one = p.sizes.length === 1;
    const size = one ? p.sizes[0] : (m.size || "");
    const sizeCtl = one
      ? `<span class="wl-size wl-size--one">${esc(p.sizes[0])}</span>`
      : `<label class="wl-size"><span class="sr-only">Size</span><select data-act="size">
           <option value="">size?</option>
           ${p.sizes.map(s => `<option${s === size ? " selected" : ""}>${esc(s)}</option>`).join("")}
         </select></label>`;
    const saved = CD.isWished(url(p));
    const mine = SHARED
      ? `<button type="button" class="wl-pin__save" data-act="save" aria-pressed="${saved}">${HEART}<span>${saved ? "SAVED" : "SAVE"}</span></button>`
      : `<div class="wl-want" role="group" aria-label="How much do you want it?">
           ${[1, 2, 3].map(n => `<button type="button" data-act="want" data-n="${n}" aria-pressed="${n <= want}" aria-label="${WANT[n]}">${HEART}</button>`).join("")}
           <span class="wl-want__word">${WANT[want]}</span>
         </div>
         <input class="wl-pin__note" data-act="note" type="text" maxlength="38" placeholder="why i need it…" value="${esc(m.note || "")}" aria-label="Note for ${esc(p.name)}" />`;
    return `
      <li class="wl-pin${want === 3 && !SHARED ? " is-obsessed" : ""}" data-id="${esc(p.id)}" data-cat="${esc(p.cat)}" style="--r:${tilt(p.id)}deg;--d:${Math.min(i, 12)}">
        <span class="wl-pin__tack" aria-hidden="true"></span>
        <a class="wl-pin__img" href="${url(p)}"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" style="object-position:${focusPos(p)}" /></a>
        <div class="wl-pin__body">
          <p class="wl-pin__code">${esc(p.code)} · ${esc(dropLabel(p))}</p>
          <h3 class="wl-pin__name"><a href="${url(p)}">${esc(p.name)}</a></h3>
          <p class="wl-pin__price">€${p.price}</p>
          ${mine}
          <div class="wl-pin__row">
            ${sizeCtl}
            <button type="button" class="wl-pin__bag" data-act="bag">→ BAG</button>
          </div>
          ${SHARED ? "" : `<button type="button" class="wl-pin__rm" data-act="rm">UNPIN ×</button>`}
        </div>
      </li>`;
  };

  const renderPins = (animate = true) => {
    const list = sorted(wishes());
    pinsEl.classList.toggle("is-still", !animate || reduced);
    pinsEl.innerHTML = list.map(pinHTML).join("");
    applyFilter();
  };

  const applyFilter = () => {
    $$(".wl-pin", pinsEl).forEach(li => { li.hidden = cat !== "all" && li.dataset.cat !== cat; });
  };

  /* ---------- chips ---------- */
  const renderChips = () => {
    const list = wishes();
    const counts = {};
    list.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    if (cat !== "all" && !counts[cat]) cat = "all";
    const chip = (id, label, n) => `<button type="button" class="chip" role="tab" data-cat="${id}" aria-selected="${cat === id}">${label}<sup>${n}</sup></button>`;
    $("#chips").innerHTML = chip("all", "ALL", list.length) +
      CATS.filter(c => counts[c.id]).map(c => chip(c.id, c.label, counts[c.id])).join("");
  };

  $("#chips").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    cat = b.dataset.cat;
    $$(".chip", $("#chips")).forEach(c => c.setAttribute("aria-selected", c === b));
    pinsEl.classList.remove("is-still");
    $$(".wl-pin", pinsEl).forEach((li, i) => { li.style.animation = "none"; void li.offsetWidth; li.style.animation = ""; li.style.setProperty("--d", Math.min(i, 12)); });
    applyFilter();
  });

  sortSel.addEventListener("change", () => { sort = sortSel.value; renderPins(); });

  /* ---------- love-o-meter ---------- */
  const countUp = (el, to, fmt = n => n) => {
    const from = parseFloat(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 700;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const renderMeter = () => {
    const list = wishes();
    const total = list.reduce((s, p) => s + p.price, 0);
    countUp($("#stCount"), list.length);
    countUp($("#stTotal"), total, eur);
    const top = list.slice().sort((a, b) => wantOf(b.id) - wantOf(a.id) || b.price - a.price)[0];
    $("#stTop").textContent = top ? top.name : "—";
    // the heart fills up: 12 wishes = full
    const f = Math.min(1, list.length / 12);
    $("#heartFill").style.transform = `translateY(${-6 * f}px)`;
    $(".wl-meter").classList.toggle("is-full", f >= 1);
  };

  /* ---------- who ---------- */
  const renderWho = () => {
    const acc = CD.auth.current();
    const who = $("#who");
    if (SHARED) {
      who.innerHTML = `a friend's list · <a href="wishlist.html">see yours →</a>`;
    } else {
      who.innerHTML = acc
        ? `♡ pinned to your Doll ID — <b>${esc(acc.name.toUpperCase())}</b>`
        : `not logged in — your wishes vanish when you leave. <a href="account.html">log in to keep them →</a>`;
    }
    $("#emptyLogin").hidden = !!acc;
    $("#emptySub").textContent = acc
      ? "tap the ♡ on anything you love and it lands up here, under the stars."
      : "tap the ♡ on anything you love. made wishes before? log in and they come back ♡";
  };

  /* ---------- payday planner ---------- */
  const budget = $("#budget"), budgetOut = $("#budgetOut");
  const PREF = "cd_budget";
  const plan = () => {
    const b = +budget.value;
    const list = wishes().slice().sort((a, x) => wantOf(x.id) - wantOf(a.id) || a.price - x.price);
    let left = b;
    const picks = [];
    list.forEach(p => { if (p.price <= left) { picks.push(p); left -= p.price; } });
    return { b, picks, left, list };
  };

  const renderPlan = () => {
    const list = wishes();
    const total = list.reduce((s, p) => s + p.price, 0);
    const max = Math.max(100, Math.ceil(total / 10) * 10);
    budget.max = max;
    $("#budgetMax").textContent = eur(max);
    if (+budget.value > max) budget.value = max;
    budget.style.setProperty("--f", `${(budget.value / max) * 100}%`);
    budgetOut.textContent = eur(budget.value);

    const { b, picks, left } = plan();
    $("#picks").innerHTML = picks.map((p, i) => `
      <li style="--d:${i}"><img src="${esc(p.img)}" alt="" style="object-position:${focusPos(p)}" /><span>${esc(p.name)}</span><b>€${p.price}</b></li>`).join("");
    const cheapest = list.length ? Math.min(...list.map(p => p.price)) : 0;
    $("#planSum").innerHTML = picks.length
      ? `<b>${picks.length}</b> of ${list.length} wishes · <b>€${b - left}</b> spent · €${left} left over${picks.length === list.length ? " · <em>ALL OF THEM. go off ♡</em>" : ""}`
      : list.length ? `not quite… your cheapest wish is <b>€${cheapest}</b>. save a little more ♡` : "—";
    $("#planBag").hidden = !picks.length;
  };

  budget.addEventListener("input", () => {
    try { localStorage.setItem(PREF, budget.value); } catch {}
    renderPlan();
  });
  try { const v = localStorage.getItem(PREF); if (v !== null) budget.value = v; } catch {}

  if (SHARED) {
    $(".wl-plan__title").innerHTML = "gift<br /><em>planner</em>";
    $(".wl-plan__sub").textContent = "how much do you wanna spend on them? we pick what they want most.";
  }

  /* ---------- bag ---------- */
  const sizeFor = (p, li) => {
    if (p.sizes.length === 1) return p.sizes[0];
    const sel = li && $("select", li);
    return (sel && sel.value) || metaOf(p.id).size || null;
  };
  const shake = el => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
  const toBag = (p, size) => CD.addToBag(`${p.name} / ${size}`, { id: p.id, size });
  const pinOf = id => $(`.wl-pin[data-id="${CSS.escape(id)}"]`, pinsEl);

  const addMany = list => {
    let added = 0, missing = 0;
    list.forEach(p => {
      const li = pinOf(p.id);
      const size = sizeFor(p, li);
      if (!size) { missing++; if (li) shake($(".wl-size", li)); return; }
      toBag(p, size); added++;
      if (li) flashBag(li);
    });
    if (missing) setTimeout(() => CD.showToast(added ? `${added} → BAG · ${missing} NEED A SIZE` : "PICK SIZES FIRST ♡"), 60);
  };

  const flashBag = li => {
    const b = $(".wl-pin__bag", li);
    b.textContent = "✓ IN BAG";
    b.classList.add("is-done");
    setTimeout(() => { b.textContent = "→ BAG"; b.classList.remove("is-done"); }, 1500);
  };

  $("#allBag").addEventListener("click", () => {
    const list = sorted(wishes()).filter(p => cat === "all" || p.cat === cat);
    if (!list.length) return CD.showToast("NOTHING TO ADD");
    addMany(list);
  });
  $("#planBag").addEventListener("click", () => addMany(plan().picks));

  /* ---------- board actions ---------- */
  let noteT;
  pinsEl.addEventListener("click", e => {
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.tagName === "SELECT" || btn.tagName === "INPUT") return;
    const li = btn.closest(".wl-pin");
    const p = byId(li.dataset.id);
    const act = btn.dataset.act;

    if (act === "want") {
      const n = +btn.dataset.n;
      setMeta(p.id, { want: n });
      $$('[data-act="want"]', li).forEach(b => b.setAttribute("aria-pressed", +b.dataset.n <= n));
      $(".wl-want__word", li).textContent = WANT[n];
      li.classList.toggle("is-obsessed", n === 3);
      if (n === 3 && !reduced) sparkle(btn);
      renderMeter(); renderPlan();
    }

    if (act === "bag") {
      const size = sizeFor(p, li);
      if (!size) { shake($(".wl-size", li)); CD.showToast("PICK A SIZE FIRST ♡"); return; }
      toBag(p, size);
      flashBag(li);
    }

    if (act === "rm") {
      li.classList.add("is-falling");
      setTimeout(() => {
        CD.toggleWish(url(p));
        refresh(false);
      }, reduced ? 0 : 620);
    }

    if (act === "save") {
      const on = CD.toggleWish(url(p));
      btn.setAttribute("aria-pressed", on);
      $("span", btn).textContent = on ? "SAVED" : "SAVE";
    }
  });

  pinsEl.addEventListener("change", e => {
    if (e.target.dataset.act !== "size" || SHARED) return;
    setMeta(e.target.closest(".wl-pin").dataset.id, { size: e.target.value || null });
  });
  pinsEl.addEventListener("input", e => {
    if (e.target.dataset.act !== "note") return;
    const id = e.target.closest(".wl-pin").dataset.id, v = e.target.value;
    clearTimeout(noteT);
    noteT = setTimeout(() => setMeta(id, { note: v }), 250);
  });

  // little burst of pixel hearts when something hits OBSESSED
  const sparkle = el => {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("i");
      s.className = "wl-spark";
      s.innerHTML = HEART;
      const a = (i / 8) * Math.PI * 2;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty("--x", `${Math.cos(a) * 46}px`);
      s.style.setProperty("--y", `${Math.sin(a) * 46}px`);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  };

  /* ---------- share ---------- */
  const modal = $("#modal"), linkEl = $("#shareLink");
  let lastFocus = null;
  const closeModal = () => { modal.hidden = true; if (lastFocus) lastFocus.focus(); };

  $("#shareBtn").addEventListener("click", async () => {
    const ids = wishes().map(p => p.id);
    if (!ids.length) return CD.showToast("MAKE A WISH FIRST ♡");
    const link = `${location.origin}${location.pathname}?w=${ids.map(encodeURIComponent).join(",")}`;
    linkEl.value = link;
    let copied = false;
    try { await navigator.clipboard.writeText(link); copied = true; } catch {}
    $("#modalTxt").textContent = copied
      ? "link copied ♡ send it to your bestie (or drop it in the group chat 3 days before your birthday)."
      : "here's your link ♡ copy it and send it to your bestie (or the group chat, 3 days before your birthday).";
    lastFocus = document.activeElement;
    modal.hidden = false;
    linkEl.focus(); linkEl.select();
  });
  $("#modalOk").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // friend's list
  if (SHARED) {
    $("#shared").hidden = false;
    $("#sharedCount").textContent = new Set(sharedIds).size;
    $("#shareBtn").hidden = true;
    $("#saveAll").addEventListener("click", () => {
      let n = 0;
      wishes().forEach(p => { if (!CD.isWished(url(p))) { CD.toggleWish(url(p)); n++; } });
      CD.showToast(n ? `${n} WISHES SAVED TO YOURS ♡` : "YOU ALREADY HAVE THEM ALL ♡");
      renderPins(false);
    });
  }

  /* ---------- suggestions ---------- */
  const renderMore = () => {
    const list = wishes();
    const have = new Set(list.map(p => p.id));
    const cats = new Set(list.map(p => p.cat));
    const pool = PRODUCTS.filter(p => !have.has(p.id) && !CD.isWished(url(p)));
    // same vibe as what's pinned first, then whatever's hot
    let pick = pool.filter(p => cats.has(p.cat) && (p.hot || p.tag));
    if (pick.length < 4) pick = pick.concat(pool.filter(p => !pick.includes(p) && (p.hot || p.tag)));
    if (pick.length < 4) pick = pick.concat(pool.filter(p => !pick.includes(p)));
    pick = pick.slice(0, 4);
    $("#moreTitle").textContent = list.length ? "MORE TO WISH FOR" : "WISH-WORTHY RIGHT NOW";
    $("#moreGrid").replaceChildren(...pick.map(p => build(p)));
  };
  // hearts in the suggestions pin straight onto the board
  $("#moreGrid").addEventListener("click", e => {
    if (!SHARED && e.target.closest(".card__heart")) setTimeout(() => refresh(true, false), 30);
  });

  /* ---------- render ---------- */
  const refresh = (animate = true, more = true) => {
    const has = wishes().length > 0;
    $("#empty").hidden = has;
    $("#tools").hidden = !has;
    $("#plan").hidden = !has;
    $(".wl-board").hidden = !has;
    renderWho();
    renderChips();
    renderPins(animate);
    renderMeter();
    renderPlan();
    if (more) renderMore();
  };

  document.addEventListener("cd:user", () => refresh());
  refresh();
})();
