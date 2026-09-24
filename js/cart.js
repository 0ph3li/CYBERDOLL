/* =========================================================
   CYBERDOLL — bag
   grouped items · qty · size swap · shredder remove
   free-shipping truck · receipt printer · promo code
   needs: products.js, main.js (window.CD), cards.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const { build, esc, focusPos, dropLabel } = window.CDCards;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const byId = id => PRODUCTS.find(p => p.id === id);
  const pad = n => String(n).padStart(2, "0");

  const FREE_SHIP = 90, SHIPPING = 6;
  const CODES = { DOLLCLUB10: { pct: 10, label: "DOLL CLUB −10%" } };   // the Doll Club welcome code
  const promoKey = "cd_promo";
  const getPromo = () => { try { return sessionStorage.getItem(promoKey); } catch { return null; } };
  const setPromo = v => { try { v ? sessionStorage.setItem(promoKey, v) : sessionStorage.removeItem(promoKey); } catch {} };

  /* ---------- bag → grouped lines ---------- */
  // gift cards aren't products: build a stand-in from what's stored on the bag entry
  const GIFT_NAMES = { holo: "Holo", midnight: "Midnight", bubblegum: "Bubblegum", chrome: "Chrome" };
  const giftProduct = g => ({
    id: `gift-${g.design}-${g.amount}-${(g.to || "").toLowerCase()}`, code: "GIFT", name: `Gift Card €${g.amount}`, price: g.amount,
    img: `img/gift/${g.design}.svg`, sizes: ["ONE SIZE"], drop: "core", cat: "gift", href: "gift-cards.html",
    color: `${GIFT_NAMES[g.design] || "Holo"} design${g.to ? ` · for ${g.to}` : ""}`, gift: g
  });
  const productOf = it => it.gift ? giftProduct(it.gift) : (it.id && byId(it.id)) || PRODUCTS.find(p => it.name.startsWith(p.name));
  const sizeOf = it => it.size || (it.name.includes(" / ") ? it.name.split(" / ").pop() : null);
  const lines = () => {
    const map = new Map();
    CD.getBag().forEach((it, i) => {
      const p = productOf(it);
      if (!p) return;
      const size = sizeOf(it) || (p.sizes.length === 1 ? p.sizes[0] : null);
      const key = `${p.id}|${size || "-"}`;
      if (!map.has(key)) map.set(key, { key, p, size, qty: 0, idx: [] });
      const l = map.get(key);
      l.qty++; l.idx.push(i);
    });
    return [...map.values()];
  };
  const bagEntry = (p, size) => p.gift
    ? { id: null, name: p.name, size: null, gift: p.gift, at: Date.now() }
    : { id: p.id, name: size ? `${p.name} / ${size}` : p.name, size: size || null, at: Date.now() };
  const linkOf = p => p.href || `product.html?id=${encodeURIComponent(p.id)}`;

  // rebuild the stored bag from edited lines
  const writeLines = ls => CD.setBag(ls.flatMap(l => Array.from({ length: l.qty }, () => bagEntry(l.p, l.size))));

  /* ---------- totals ---------- */
  const totals = ls => {
    const sub = ls.reduce((s, l) => s + l.p.price * l.qty, 0);
    const code = getPromo(), promo = code && CODES[code];
    const disc = promo ? Math.round(sub * promo.pct) / 100 : 0;
    const after = sub - disc;
    const ship = !ls.length || after >= FREE_SHIP ? 0 : SHIPPING;
    return { sub, disc, ship, total: after + ship, promo, code, items: ls.reduce((s, l) => s + l.qty, 0) };
  };
  const eur = n => `€${Number.isInteger(n) ? n : n.toFixed(2)}`;

  /* ---------- render ---------- */
  const itemsEl = $("#items"), cols = $("#cols"), empty = $("#empty"), free = $("#free");

  const renderItems = ls => {
    itemsEl.innerHTML = ls.map(l => `
      <li class="bg-item" data-key="${esc(l.key)}">
        <a href="${linkOf(l.p)}" class="bg-item__img">
          <img src="${esc(l.p.img)}" alt="${esc(l.p.name)}" style="object-position:${focusPos(l.p)}" />
        </a>
        <div class="bg-item__info">
          <p class="bg-item__code">${esc(l.p.code)} · ${esc(dropLabel(l.p))}</p>
          <a href="${linkOf(l.p)}" class="bg-item__name">${esc(l.p.name)}</a>
          <p class="bg-item__color">${esc(l.p.color || "")}</p>
          <div class="bg-item__row">
            ${l.p.sizes.length > 1 ? `
              <label class="bg-size">
                <span>SIZE</span>
                <select data-size aria-label="Size for ${esc(l.p.name)}">
                  ${!l.size ? '<option value="" selected>pick…</option>' : ""}
                  ${l.p.sizes.map(s => `<option value="${esc(s)}" ${s === l.size ? "selected" : ""}>${esc(s)}</option>`).join("")}
                </select>
              </label>` : `<span class="bg-size bg-size--one">ONE SIZE</span>`}
            <div class="bg-qty" role="group" aria-label="Quantity">
              <button type="button" data-qty="-1" aria-label="One less">−</button>
              <output>${l.qty}</output>
              <button type="button" data-qty="1" aria-label="One more">+</button>
            </div>
          </div>
        </div>
        <div class="bg-item__end">
          <b class="bg-item__price">${eur(l.p.price * l.qty)}</b>
          ${l.qty > 1 ? `<small>${eur(l.p.price)} each</small>` : ""}
          <button type="button" class="bg-item__rm" data-rm aria-label="Remove ${esc(l.p.name)}">REMOVE ×</button>
        </div>
      </li>`).join("");
  };

  const renderFree = t => {
    const left = Math.max(0, FREE_SHIP - (t.sub - t.disc));
    const pct = Math.min(100, ((t.sub - t.disc) / FREE_SHIP) * 100);
    $("#freeFill").style.width = `${pct}%`;
    $("#truck").style.left = `${pct}%`;
    free.classList.toggle("is-free", left === 0);
    $("#freeText").innerHTML = left === 0
      ? "✦ <b>FREE SHIPPING UNLOCKED</b> — the truck is on its way ♡"
      : `you're <b>${eur(left)}</b> away from <b>free shipping</b>`;
  };

  // the receipt: a long thermal print that re-prints whenever the bag changes
  let lastTotal = 0;
  const renderReceipt = (ls, t, animate) => {
    const d = new Date();
    const acc = CD.auth.current();
    const row = (l, r, cls = "") => `<p class="rc-row ${cls}"><span>${l}</span><i></i><span>${r}</span></p>`;
    $("#receipt").innerHTML = `
      <p class="rc-logo">CYBERDOLL</p>
      <p class="rc-center">★ STORE #005 · MIDNIGHT MALL ★</p>
      <p class="rc-center">${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} · REG 04</p>
      <p class="rc-center">CASHIER: ANGEL.EXE${acc ? ` · DOLL ${esc(acc.no)}` : ""}</p>
      <p class="rc-cut"></p>
      ${ls.map(l => row(`${l.qty}× ${esc(l.p.name.toUpperCase())}${l.size ? ` <em>${esc(l.size)}</em>` : ""}`, eur(l.p.price * l.qty))).join("")}
      <p class="rc-cut"></p>
      ${row("SUBTOTAL", eur(t.sub))}
      ${t.promo ? row(esc(t.promo.label), `−${eur(t.disc)}`, "rc-row--disc") : ""}
      ${row("SHIPPING", t.ship ? eur(t.ship) : "FREE ♡")}
      <p class="rc-row rc-row--total"><span>TOTAL</span><i></i><span id="rcTotal">${eur(lastTotal)}</span></p>
      <p class="rc-cut"></p>
      <p class="rc-center">ITEMS: ${t.items}${acc ? ` · DOLL POINTS +${t.items * 25}` : ""}</p>
      <p class="rc-barcode" aria-hidden="true"></p>
      <p class="rc-center rc-thanks">thank u, doll ♡</p>
      <p class="rc-center">no restocks, no regrets</p>`;
    const rc = $("#receipt");
    if (animate && !reduced) { rc.classList.remove("is-printing"); void rc.offsetWidth; rc.classList.add("is-printing"); }
    rollTotal(t.total);
  };
  // the total rolls like a cash register
  const rollTotal = to => {
    const el = $("#rcTotal"), from = lastTotal;
    lastTotal = to;
    if (reduced || from === to) { el.textContent = eur(to); return; }
    const t0 = performance.now(), dur = 700;
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      el.textContent = eur(k < 1 ? Math.round(v) : to);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const renderMore = ls => {
    const inBag = new Set(ls.map(l => l.p.id));
    const cats = new Set(ls.map(l => l.p.cat));
    const pool = PRODUCTS.filter(p => !inBag.has(p.id));
    // pieces from other categories than what's in the bag = "complete the look"
    let pick = pool.filter(p => ls.length && !cats.has(p.cat) && (p.hot || p.tag === "BESTSELLER"));
    if (pick.length < 4) pick = pick.concat(pool.filter(p => !pick.includes(p) && (p.hot || p.tag)));
    pick = pick.slice(0, 4);
    $("#moreTitle").textContent = ls.length ? "COMPLETE THE LOOK" : "PEOPLE ARE OBSESSED WITH";
    const grid = $("#moreGrid");
    grid.replaceChildren(...pick.map(p => build(p)));
  };

  const renderWho = () => {
    const acc = CD.auth.current();
    $("#who").innerHTML = acc
      ? `♡ saved to your Doll ID — <b>${esc(acc.name.toUpperCase())}</b>`
      : `not logged in — your bag resets when you leave. <a href="account.html">log in to keep it →</a>`;
    $("#emptyLogin").hidden = !!acc;
    $("#emptySub").textContent = acc
      ? "nothing in here yet. the good stuff sells out fast."
      : "nothing in here yet. if you saved a bag before, log in to get it back ♡";
  };

  const render = (animate = true) => {
    const ls = lines(), t = totals(ls);
    $("#headCount").textContent = t.items;
    cols.hidden = !ls.length;
    free.hidden = !ls.length;
    empty.hidden = !!ls.length;
    renderWho();
    if (ls.length) { renderItems(ls); renderFree(t); renderReceipt(ls, t, animate); }
    renderMore(ls);
    const code = getPromo();
    $("#code").value = code || "";
  };

  /* ---------- interactions ---------- */
  const findLine = el => { const li = el.closest(".bg-item"); return li && lines().find(l => l.key === li.dataset.key); };

  itemsEl.addEventListener("click", e => {
    const q = e.target.closest("[data-qty]");
    if (q) {
      const ls = lines(), l = ls.find(x => x.key === q.closest(".bg-item").dataset.key);
      if (!l) return;
      l.qty += Number(q.dataset.qty);
      if (l.qty <= 0) return shred(q.closest(".bg-item"), () => { writeLines(ls.filter(x => x !== l)); render(); });
      writeLines(ls);
      render();
      const out = $(`.bg-item[data-key="${CSS.escape(l.key)}"] output`);
      if (out && !reduced) out.animate([{ transform: "scale(1.6)", color: "#ff2a2a" }, { transform: "none" }], { duration: 350 });
      return;
    }
    const rm = e.target.closest("[data-rm]");
    if (rm) {
      const li = rm.closest(".bg-item");
      const l = findLine(rm);
      shred(li, () => { writeLines(lines().filter(x => x.key !== l.key)); render(); CD.showToast("REMOVED FROM BAG"); });
    }
  });

  itemsEl.addEventListener("change", e => {
    const sel = e.target.closest("[data-size]");
    if (!sel || !sel.value) return;
    const ls = lines(), l = ls.find(x => x.key === sel.closest(".bg-item").dataset.key);
    const twin = ls.find(x => x !== l && x.p.id === l.p.id && x.size === sel.value);
    if (twin) { twin.qty += l.qty; ls.splice(ls.indexOf(l), 1); }   // same piece, same size → merge the lines
    else l.size = sel.value;
    writeLines(ls);
    render(false);
    CD.showToast(`SIZE ${sel.value} ♡`);
  });

  // paper shredder: the row slices into strips and falls away
  const shred = (li, done) => {
    if (reduced) return done();
    li.classList.add("is-shredding");
    setTimeout(done, 650);
  };

  $("#promo").addEventListener("submit", e => {
    e.preventDefault();
    const code = $("#code").value.trim().toUpperCase().replace(/\s+/g, "");
    const msg = $("#promoMsg");
    if (!code) { setPromo(null); msg.textContent = ""; render(); return; }
    if (CODES[code]) {
      setPromo(code);
      msg.textContent = `> ${code} applied ♡`;
      render();
    } else {
      msg.textContent = "> code not found — join the Doll Club for yours";
      e.target.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }], { duration: 300 });
    }
  });

  // checkout: payments aren't wired up, so say so
  const modal = $("#modal");
  const closeModal = () => { modal.hidden = true; $("#checkout").focus(); };
  $("#checkout").addEventListener("click", () => {
    const ls = lines();
    const missing = ls.find(l => l.p.sizes.length > 1 && !l.size);
    if (missing) {
      CD.showToast(`PICK A SIZE FOR ${missing.p.name.toUpperCase()}`);
      const sel = $(`.bg-item[data-key="${CSS.escape(missing.key)}"] select`);
      if (sel) { sel.focus(); sel.closest(".bg-item").animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 320 }); }
      return;
    }
    modal.hidden = false;
    $("#modalOk").focus();
  });
  $("#modalOk").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // quick-adds from the suggestions grid update the bag live
  $("#moreGrid").addEventListener("click", e => {
    if (e.target.closest(".card__add, .card__quick button")) setTimeout(() => render(), 30);
  });
  document.addEventListener("cd:user", () => render());

  render();
})();
