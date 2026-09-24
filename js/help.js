/* =========================================================
   CYBERDOLL — help center
   faq · size guide · shipping · returns · contact
   one file, each block only runs if its page is open
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const reduced = CD.reduced;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");

  /* =======================================================
     FAQ
     ======================================================= */
  if ($("#faqList")) {
    const TOPICS = [
      { id: "orders", label: "ORDERS" },
      { id: "shipping", label: "SHIPPING" },
      { id: "returns", label: "RETURNS" },
      { id: "sizing", label: "SIZING" },
      { id: "drops", label: "DROPS" },
      { id: "club", label: "DOLL CLUB" }
    ];
    const FAQ = [
      { t: "orders", q: "Is CYBERDOLL a real shop?", a: "Not yet! CYBERDOLL is a concept store — the pieces, drops and prices are real-looking but checkout isn't connected, so <b>nothing is ever charged</b>. Consider this the preview." },
      { t: "orders", q: "Can I change or cancel my order?", a: "Message us within 2 hours of ordering and we'll catch it before it's packed. After that it's already wrapped in tissue — but you can always <a href=\"returns.html\">return it for free</a>." },
      { t: "orders", q: "Which payment methods do you take?", a: "Cards, PayPal and Apple Pay — once checkout goes live. Right now the checkout button just says hi." },
      { t: "shipping", q: "How much is shipping?", a: "From €6 in Italy + the EU, and <b>free on every order over €90</b>, worldwide. All rates are on the <a href=\"shipping.html\">shipping page</a>." },
      { t: "shipping", q: "How long does delivery take?", a: "Orders placed before 14:00 (Italian time) on a working day ship the same day. Then 1–3 days in Italy, 2–5 in the EU, up to 14 for the rest of the world." },
      { t: "shipping", q: "Will I pay customs?", a: "Inside the EU: never. Outside the EU your country may charge import taxes on delivery — that's set by them, not by us." },
      { t: "returns", q: "What's your return policy?", a: "30 days from delivery, <b>free</b>. Tags on, unworn, unwashed. Earrings, body jewellery and gift cards can't go back." },
      { t: "returns", q: "Can I swap for another size?", a: "Yes, and it's free. Tell us the size you want and we'll ship it the moment your return is scanned." },
      { t: "returns", q: "When do I get my money back?", a: "Within 10 days of your parcel landing at doll HQ, to your original payment method." },
      { t: "sizing", q: "How do CYBERDOLL pieces fit?", a: "True to size, except: corsets are cut close (between sizes? size up), knits are oversized on purpose. Our <a href=\"size-guide.html\">size calculator</a> does the maths." },
      { t: "sizing", q: "What if a piece says ONE SIZE?", a: "Rings are adjustable, belts fit 64–96 cm waists, chokers come with an extender chain." },
      { t: "drops", q: "Will you restock sold-out pieces?", a: "No restocks, no regrets. Every drop is a limited run — when it's gone, it's gone. The CORE collection is the exception: those stay." },
      { t: "drops", q: "When is the next drop?", a: "Drop #006 unlocks on <b>13.11.2026 at 18:00</b>. Countdown and notify-me list live on the <a href=\"drops.html\">drops page</a>." },
      { t: "club", q: "What's the Doll Club?", a: "Our newsletter + loyalty club. Join and get <b>DOLLCLUB10</b> for 10% off your first bag, early drop access and points on everything you do." },
      { t: "club", q: "How do Doll Points work?", a: "Log in to get a Doll ID. You earn points for wishlisting, bagging, making friends on the about page, leaving comments… Hit 300 for CYBER DOLL, 800 for ANGEL.EXE. Check yours in <a href=\"account.html\">your account</a>." },
      { t: "club", q: "Why did my bag disappear?", a: "If you're not logged in, your bag and wishlist only last for this visit. <a href=\"account.html\">Log in</a> with the same email and everything you saved comes back." }
    ];

    // synonyms so "delivery" finds shipping, "refund" finds returns…
    const SYN = { delivery: "shipping", ship: "shipping", post: "shipping", refund: "returns", return: "returns", exchange: "swap", size: "sizing", fit: "sizing", restock: "drops", drop: "drops", points: "club", newsletter: "club", discount: "club", code: "club", pay: "payment", cancel: "cancel" };
    const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const strip = s => s.replace(/<[^>]+>/g, "");

    let topic = "all";
    const list = $("#faqList"), q = $("#faqQ");
    const likes = CD.store.get("cd_faq_votes", {});

    $("#faqCats").innerHTML = [{ id: "all", label: "ALL" }, ...TOPICS].map(t =>
      `<button type="button" class="chip" role="tab" data-t="${t.id}" aria-selected="${t.id === "all"}">${t.label}<sup>${t.id === "all" ? FAQ.length : FAQ.filter(f => f.t === t.id).length}</sup></button>`).join("");

    list.innerHTML = FAQ.map((f, i) => `
      <details class="faq-item" data-t="${f.t}" data-i="${i}" style="--d:${i}">
        <summary><span class="faq-item__n">${pad(i + 1)}</span><span class="faq-item__q">${esc(f.q)}</span><i class="faq-item__x" aria-hidden="true"></i></summary>
        <div class="faq-item__a">
          <p>${f.a}</p>
          <p class="faq-item__vote">helpful? <button type="button" data-v="1" aria-pressed="${likes[i] === 1}">♡ yes</button><button type="button" data-v="-1" aria-pressed="${likes[i] === -1}">✕ no</button></p>
        </div>
      </details>`).join("");

    const items = $$(".faq-item", list);
    const highlight = (el, words) => {
      const base = el.dataset.raw || (el.dataset.raw = el.innerHTML);
      if (!words.length) { el.innerHTML = base; return; }
      const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
      // only mark text, never inside tags
      el.innerHTML = base.split(/(<[^>]+>)/).map(part => part.startsWith("<") ? part : part.replace(re, "<mark>$1</mark>")).join("");
    };

    const run = () => {
      const words = norm(q.value).split(/\s+/).filter(w => w.length > 1);
      let n = 0;
      items.forEach(it => {
        const f = FAQ[it.dataset.i];
        const hay = norm(`${f.q} ${strip(f.a)} ${f.t}`);
        const hit = words.every(w => hay.includes(w) || (SYN[w] && hay.includes(SYN[w])) || f.t === SYN[w]);
        const show = (topic === "all" || f.t === topic) && hit;
        it.hidden = !show;
        if (show) n++;
        highlight($(".faq-item__q", it), words);
        highlight($(".faq-item__a > p", it), words);
        if (words.length && show && n <= 2) it.open = true;
      });
      $("#faqCount").textContent = `${n} found`;
      $("#faqNone").hidden = n > 0;
    };

    q.addEventListener("input", run);
    $("#faqCats").addEventListener("click", e => {
      const b = e.target.closest(".chip");
      if (!b) return;
      topic = b.dataset.t;
      $$(".chip", $("#faqCats")).forEach(c => c.setAttribute("aria-selected", c === b));
      run();
    });
    // one open at a time
    list.addEventListener("toggle", e => {
      if (!e.target.open) return;
      items.forEach(it => { if (it !== e.target && !q.value) it.open = false; });
    }, true);
    list.addEventListener("click", e => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      const i = b.closest(".faq-item").dataset.i, v = +b.dataset.v;
      likes[i] = likes[i] === v ? 0 : v;
      CD.store.set("cd_faq_votes", likes);
      $$("[data-v]", b.parentNode).forEach(x => x.setAttribute("aria-pressed", +x.dataset.v === likes[i]));
      if (likes[i] === 1) CD.showToast("YAY ♡ GLAD IT HELPED");
      if (likes[i] === -1) CD.showToast("SORRY! ASK US ON THE CONTACT PAGE");
    });

    // deep link: faq.html#shipping
    const h = location.hash.slice(1);
    if (TOPICS.some(t => t.id === h)) { topic = h; $$(".chip", $("#faqCats")).forEach(c => c.setAttribute("aria-selected", c.dataset.t === h)); }
    run();
  }

  /* =======================================================
     SIZE GUIDE
     ======================================================= */
  if ($("#szForm")) {
    const SIZES = [
      { s: "XS", it: "38 / 34", bust: [78, 82], waist: [60, 64], hips: [84, 88] },
      { s: "S", it: "40 / 36", bust: [83, 87], waist: [65, 69], hips: [89, 93] },
      { s: "M", it: "42 / 38", bust: [88, 92], waist: [70, 74], hips: [94, 98] },
      { s: "L", it: "44 / 40", bust: [93, 98], waist: [75, 80], hips: [99, 104] }
    ];
    const SHOES = [
      { eu: "36", uk: "3", us: "5.5", cm: 23.0 },
      { eu: "37", uk: "4", us: "6.5", cm: 23.7 },
      { eu: "38", uk: "5", us: "7.5", cm: 24.3 },
      { eu: "39", uk: "6", us: "8.5", cm: 25.0 },
      { eu: "40", uk: "6.5", us: "9", cm: 25.6 }
    ];
    const IN = 2.54;
    let unit = CD.store.get("cd_unit", "cm");
    const fmt = cm => unit === "cm" ? `${Math.round(cm)}` : `${(cm / IN).toFixed(1).replace(/\.0$/, "")}`;
    const range = r => `${fmt(r[0])}–${fmt(r[1])}`;
    const fields = { bust: $("#mBust"), waist: $("#mWaist"), hips: $("#mHips") };

    const renderTables = () => {
      $("#tClothes tbody").innerHTML = SIZES.map(z => `
        <tr data-s="${z.s}"><th>${z.s}</th><td data-m="bust">${range(z.bust)}</td><td data-m="waist">${range(z.waist)}</td><td data-m="hips">${range(z.hips)}</td><td>${z.it}</td></tr>`).join("");
      $("#tShoes tbody").innerHTML = SHOES.map(z => `
        <tr data-s="${z.eu}"><th>${z.eu}</th><td>${z.uk}</td><td>${z.us}</td><td>${unit === "cm" ? z.cm.toFixed(1) : (z.cm / IN).toFixed(2)} ${unit}</td></tr>`).join("");
      $$(".u").forEach(u => (u.textContent = unit));
      $$("th[data-m]").forEach(th => (th.dataset.unit = unit));
    };

    // cm ⇄ inch: convert what's typed too
    $$(".sz-unit button").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.unit === unit) return;
      const to = b.dataset.unit;
      Object.values(fields).concat($("#mFoot")).forEach(f => {
        if (f.value === "") return;
        const v = +f.value;
        f.value = to === "in" ? (v / IN).toFixed(1) : Math.round(v * IN * (f.id === "mFoot" ? 10 : 1)) / (f.id === "mFoot" ? 10 : 1);
      });
      unit = to;
      CD.store.set("cd_unit", unit);
      $$(".sz-unit button").forEach(x => x.setAttribute("aria-checked", x === b));
      $(".sz-unit").dataset.unit = unit;
      renderTables(); calc(); foot();
    }));

    // highlight the body line for whatever you're touching
    const light = m => {
      $$(".sz-line").forEach(l => l.classList.toggle("is-on", l.dataset.m === m));
      $$(".sz-field").forEach(f => f.classList.toggle("is-on", f.dataset.m === m));
      $$(".sz-table [data-m]").forEach(c => c.classList.toggle("is-on", c.dataset.m === m));
      const tips = { bust: "tape around the fullest part of your chest, arms relaxed", waist: "find your natural waist — bend sideways, it's the crease", hips: "feet together, round the widest part of your bum" };
      $("#tip").textContent = tips[m] || "measure over your underwear, tape snug but not tight ♡";
    };
    $$(".sz-field").forEach(f => {
      f.addEventListener("focusin", () => light(f.dataset.m));
      f.addEventListener("pointerenter", () => light(f.dataset.m));
    });
    $(".sz-form").addEventListener("focusout", () => setTimeout(() => { if (!$(".sz-form").contains(document.activeElement)) light(null); }, 0));
    $("#tClothes").addEventListener("pointerover", e => { const c = e.target.closest("[data-m]"); light(c ? c.dataset.m : null); });
    $("#tClothes").addEventListener("pointerleave", () => light(null));

    // steppers
    $$(".sz-num button").forEach(b => b.addEventListener("click", () => {
      const inp = $("input", b.parentNode);
      const start = inp.value === "" ? (unit === "cm" ? { mBust: 84, mWaist: 66, mHips: 90 }[inp.id] : { mBust: 33, mWaist: 26, mHips: 35.5 }[inp.id]) : +inp.value;
      inp.value = Math.max(0, +(start + +b.dataset.step * (unit === "cm" ? 1 : 0.5)).toFixed(1));
      calc();
    }));

    let best = null, lastKey = "";
    const calc = () => {
      const cm = {};
      Object.entries(fields).forEach(([k, f]) => { if (f.value !== "" && +f.value > 0) cm[k] = unit === "cm" ? +f.value : +f.value * IN; });
      const keys = Object.keys(cm);
      const res = $("#szResult");
      if (!keys.length) {
        best = null;
        $("#szSize").textContent = "?";
        $("#szNote").textContent = "fill in at least one number";
        res.className = "sz-result";
        $("#szSave").hidden = true;
        $$("#tClothes tbody tr").forEach(r => r.classList.remove("is-you"));
        return;
      }
      // score each size: how far outside its range each measurement is
      const score = z => keys.reduce((s, k) => s + Math.max(0, z[k][0] - cm[k], cm[k] - z[k][1]), 0);
      const perKey = keys.map(k => {
        let i = SIZES.findIndex(z => cm[k] <= z[k][1]);
        return i === -1 ? SIZES.length : i;
      });
      const hi = Math.max(...perKey), lo = Math.min(...perKey);
      let pick = SIZES.slice().sort((a, b) => score(a) - score(b))[0];
      // take the bigger size when measurements disagree — comfort wins
      if (hi < SIZES.length) pick = SIZES[hi];
      best = pick.s;
      let note = "";
      const small = keys.every(k => cm[k] < SIZES[0][k][0] - 4), big = hi >= SIZES.length;
      if (big) { best = "L"; note = "you're above our size range for now — L is the roomiest. message us, we're working on more sizes ♡"; }
      else if (small) note = "XS will be a little loose — go for adjustable pieces or ask us for a fit check.";
      else if (hi !== lo) note = `your numbers sit between ${SIZES[lo].s} and ${SIZES[hi].s} — we picked the bigger one. for knits take ${SIZES[lo].s}.`;
      else note = `a perfect ${best}. corsets: stay ${best} ♡`;
      $("#szSize").textContent = best;
      $("#szNote").textContent = note;
      const key = best + keys.join();
      if (key !== lastKey && !reduced) { res.classList.remove("is-scan"); void res.offsetWidth; res.classList.add("is-scan"); }
      lastKey = key;
      res.classList.add("has-size");
      $$("#tClothes tbody tr").forEach(r => r.classList.toggle("is-you", r.dataset.s === best));
      const acc = CD.auth.current();
      const saveBtn = $("#szSave");
      saveBtn.hidden = false;
      saveBtn.textContent = acc ? (acc.sizeTop === best ? `✓ ${best} IS YOUR SAVED SIZE` : `SAVE ${best} TO MY DOLL ID ♡`) : "LOG IN TO SAVE YOUR SIZE →";
    };
    Object.values(fields).forEach(f => f.addEventListener("input", calc));
    $("#szForm").addEventListener("submit", e => e.preventDefault());

    $("#szSave").addEventListener("click", () => {
      const acc = CD.auth.current();
      if (!acc) { location.href = "account.html"; return; }
      if (!best) return;
      acc.sizeTop = best;
      CD.auth.update(acc);
      CD.showToast(`SIZE ${best} SAVED TO YOUR DOLL ID ♡`);
      calc();
    });

    // shoes
    const foot = () => {
      const v = $("#mFoot").value;
      const out = $("#footOut");
      $$("#tShoes tbody tr").forEach(r => r.classList.remove("is-you"));
      if (v === "" || +v <= 0) { out.textContent = "stand on paper, mark heel + longest toe, measure the gap."; return; }
      const cm = unit === "cm" ? +v : +v * IN;
      const z = SHOES.find(s => cm <= s.cm + 0.15);
      if (!z) { out.innerHTML = "that's past our EU 40 — message us, bigger sizes are on the list."; return; }
      const acc = CD.auth.current();
      out.innerHTML = `you're an <b>EU ${z.eu}</b> (UK ${z.uk} · US ${z.us}).` + (acc && acc.sizeShoe !== z.eu ? ` <button type="button" class="sz-shoe-save" data-eu="${z.eu}">save it ♡</button>` : "");
      $(`#tShoes tbody tr[data-s="${z.eu}"]`).classList.add("is-you");
    };
    $("#mFoot").addEventListener("input", foot);
    $("#footOut").addEventListener("click", e => {
      const b = e.target.closest(".sz-shoe-save");
      if (!b) return;
      const acc = CD.auth.current();
      acc.sizeShoe = b.dataset.eu;
      CD.auth.update(acc);
      CD.showToast(`SHOE SIZE ${b.dataset.eu} SAVED ♡`);
      foot();
    });

    // chart tabs
    $$(".sz-tabs [role=tab]").forEach(t => t.addEventListener("click", () => {
      $$(".sz-tabs [role=tab]").forEach(x => x.setAttribute("aria-selected", x === t));
      $$(".sz-panel").forEach(p => (p.hidden = p.dataset.panel !== t.dataset.tab));
    }));

    // start with the saved unit, and the saved size highlighted
    $$(".sz-unit button").forEach(x => x.setAttribute("aria-checked", x.dataset.unit === unit));
    $(".sz-unit").dataset.unit = unit;
    renderTables();
    const acc = CD.auth.current();
    if (acc && acc.sizeTop) {
      $("#szNote").textContent = `your Doll ID says ${acc.sizeTop} — measure again to double-check ♡`;
      $("#szSize").textContent = acc.sizeTop;
    }
  }

  /* =======================================================
     SHIPPING
     ======================================================= */
  if ($("#zones")) {
    const ZONES = [
      { id: "it", flag: "IT", name: "Italy", cost: 6, days: [1, 3] },
      { id: "eu", flag: "EU", name: "European Union", cost: 6, days: [2, 5] },
      { id: "uk", flag: "UK", name: "UK + Switzerland", cost: 9, days: [3, 6] },
      { id: "na", flag: "US", name: "USA + Canada", cost: 14, days: [5, 9] },
      { id: "ww", flag: "✦", name: "Rest of the world", cost: 18, days: [7, 14] }
    ];
    const FREE = 90, CUTOFF = 14;
    const bagTotal = () => CD.getBag().reduce((s, it) => {
      const p = (window.CD_PRODUCTS || []).find(x => x.id === it.id);
      return s + (p ? p.price : it.gift ? it.gift.amount : 0);
    }, 0);

    $("#zoneRows").innerHTML = ZONES.map(z => `<tr><th>${z.flag} · ${z.name}</th><td>€${z.cost}</td><td>€${FREE}</td><td>${z.days[0]}–${z.days[1]} days</td></tr>`).join("");
    let zone = CD.store.get("cd_zone", "it");
    $("#zones").innerHTML = ZONES.map(z => `<button type="button" role="radio" data-z="${z.id}" aria-checked="${z.id === zone}"><b>${z.flag}</b><span>${z.name}</span></button>`).join("");

    // time in Italy, whatever timezone you're in
    const italyNow = () => {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
      const g = t => +parts.find(p => p.type === t).value;
      return new Date(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
    };
    const isWork = d => d.getDay() !== 0 && d.getDay() !== 6;
    const addWork = (d, n) => { const x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (isWork(x)) n--; } return x; };
    const dispatchDay = now => {
      if (isWork(now) && now.getHours() < CUTOFF) return new Date(now);
      return addWork(now, 1);
    };
    const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const nice = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

    const renderCalc = () => {
      const z = ZONES.find(x => x.id === zone);
      const now = italyNow(), disp = dispatchDay(now);
      const a = addWork(disp, z.days[0]), b = addWork(disp, z.days[1]);
      const bag = bagTotal();
      const free = bag >= FREE;
      const cost = $("#outCost");
      cost.textContent = free ? "FREE ♡" : `€${z.cost}`;
      $("#outDate").textContent = `${nice(a)} – ${nice(b)}`;
      $("#outBag").textContent = `€${bag}`;
      $("#outNote").innerHTML = !bag
        ? "your bag is empty — <a href=\"shop.html\">fill it up</a> and come back to see your delivery."
        : free ? "your bag already ships free ♡" : `add <b>€${FREE - bag}</b> more and shipping is on us.`;
      $$(".sh-out b").forEach(el => { el.classList.remove("is-flip"); void el.offsetWidth; el.classList.add("is-flip"); });
    };
    $("#zones").addEventListener("click", e => {
      const b = e.target.closest("[data-z]");
      if (!b) return;
      zone = b.dataset.z;
      CD.store.set("cd_zone", zone);
      $$("#zones [data-z]").forEach(x => x.setAttribute("aria-checked", x === b));
      renderCalc();
    });

    // same-day cutoff countdown
    const cut = () => {
      const now = italyNow();
      const el = $("#cutText"), box = $("#cutoff");
      if (isWork(now) && now.getHours() < CUTOFF) {
        const end = new Date(now); end.setHours(CUTOFF, 0, 0, 0);
        const s = Math.floor((end - now) / 1000);
        el.innerHTML = `order in the next <b>${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}</b> and it ships <b>today</b>`;
        box.classList.add("is-live");
      } else {
        el.innerHTML = `order now and it ships <b>${nice(dispatchDay(now))}</b>`;
        box.classList.remove("is-live");
      }
    };
    cut();
    setInterval(cut, 1000);
    renderCalc();

    // light the steps one by one as the plane flies
    const steps = $$("#steps li");
    if (!reduced) {
      let i = 0;
      setInterval(() => {
        steps.forEach((s, k) => s.classList.toggle("is-on", k <= i));
        i = (i + 1) % (steps.length + 1);
      }, 1100);
    } else steps.forEach(s => s.classList.add("is-on"));
  }

  /* =======================================================
     RETURNS
     ======================================================= */
  if ($("#verdict")) {
    const days = $("#days"), st = { tags: true, unworn: true, earrings: false, gift: false };
    $("#rtNo").textContent = String(Math.floor(1000 + Math.random() * 8999));
    let last = null;
    const judge = () => {
      const d = +days.value;
      $("#daysOut").textContent = d === 1 ? "1 day" : `${d} days`;
      days.style.setProperty("--f", `${(d / 60) * 100}%`);
      days.classList.toggle("is-late", d > 30);
      let ok = true, why = `${30 - d} days left to send it back. label's on us ♡`;
      if (st.gift) { ok = false; why = "gift cards can't be returned — but they never expire, so treat yourself."; }
      else if (st.earrings) { ok = false; why = "earrings + body jewellery can't come back, for hygiene reasons. unless they arrived faulty — then message us."; }
      else if (d > 30) { ok = false; why = `that's ${d - 30} day${d - 30 === 1 ? "" : "s"} past the 30-day window. faulty? message us anyway.`; }
      else if (!st.tags || !st.unworn) { ok = false; why = "it needs to be unworn with the tags on so the next doll gets it fresh."; }
      else if (d === 30) why = "last day! send it today ♡";
      const v = $("#verdict"), stamp = $("#stamp");
      stamp.textContent = ok ? "APPROVED ♡" : "DENIED";
      $("#why").textContent = why;
      v.classList.toggle("is-ok", ok);
      v.classList.toggle("is-no", !ok);
      if (ok !== last && !reduced) { stamp.classList.remove("is-stamp"); void stamp.offsetWidth; stamp.classList.add("is-stamp"); }
      last = ok;
    };
    days.addEventListener("input", judge);
    $("#toggles").addEventListener("click", e => {
      const b = e.target.closest(".rt-tog");
      if (!b) return;
      st[b.dataset.k] = !st[b.dataset.k];
      b.setAttribute("aria-pressed", st[b.dataset.k]);
      judge();
    });
    judge();

    // the wizard
    const steps = $$("#wizSteps li"), back = $("#wizBack"), next = $("#wizNext");
    let at = 0;
    const show = () => {
      steps.forEach((s, i) => { s.hidden = i !== at; });
      $("#wizBar").style.width = `${(at / (steps.length - 1)) * 100}%`;
      back.disabled = at === 0;
      next.textContent = at === steps.length - 1 ? "FINISH ♡" : "NEXT >";
    };
    back.addEventListener("click", () => { if (at > 0) { at--; show(); } });
    next.addEventListener("click", () => {
      if (at < steps.length - 1) { at++; show(); }
      else { CD.showToast("THAT'S IT! NOW MESSAGE US ♡"); at = 0; show(); }
    });
    show();
  }

  /* =======================================================
     CONTACT
     ======================================================= */
  if ($("#ctForm")) {
    const BUDDIES = {
      angel: { name: "angel.exe", hi: "hiii ♡ angel here — orders, shipping, returns, all me. what's up?" },
      glitter: { name: "glitter.grl", hi: "heyy it's glitter ✦ tell me your measurements + the piece you want and I'll tell you your size." },
      hazard: { name: "hazard.doll", hi: "yo, hazard. press, collabs, shops that want to stock us — hit me." }
    };
    let buddy = "angel";
    const log = $("#log");
    const time = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const say = (who, text, me = false) => {
      const p = document.createElement("p");
      p.className = `ct-msg${me ? " ct-msg--me" : ""}`;
      p.innerHTML = `<b>${esc(who)}</b> <small>(${time()})</small>: <span>${text}</span>`;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return p;
    };
    const typing = who => {
      const p = document.createElement("p");
      p.className = "ct-typing";
      p.innerHTML = `${esc(who)} is typing<i>.</i><i>.</i><i>.</i>`;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return p;
    };
    const open = id => {
      buddy = id;
      const b = BUDDIES[id];
      $$("#buddies li").forEach(li => { const on = li.dataset.buddy === id; li.setAttribute("aria-selected", on); li.tabIndex = on ? 0 : -1; });
      $("#chatWith").textContent = b.name;
      log.innerHTML = `<p class="ct-sys">— ${esc(b.name)} has signed on —</p>`;
      const t = typing(b.name);
      setTimeout(() => { t.remove(); say(b.name, esc(b.hi)); }, reduced ? 0 : 700);
    };
    $("#buddies").addEventListener("click", e => { const li = e.target.closest("li"); if (li) open(li.dataset.buddy); });
    $("#buddies").addEventListener("keydown", e => {
      const lis = $$("#buddies li"), i = lis.findIndex(l => l.dataset.buddy === buddy);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = lis[(i + (e.key === "ArrowDown" ? 1 : -1) + lis.length) % lis.length];
        open(n.dataset.buddy); n.focus();
      }
    });

    // online status from Italian office hours
    const status = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
      const on = now.getDay() > 0 && now.getDay() < 6 && now.getHours() >= 10 && now.getHours() < 18;
      const el = $("#status");
      el.classList.toggle("is-on", on);
      $("#onlineN").textContent = on ? 3 : 0;
      $("span", el).textContent = on ? "online now — we'll reply today" : "away — we'll reply next working day";
    };
    status();
    setInterval(status, 60000);

    // prefill from the Doll ID
    const acc = CD.auth.current();
    if (acc) { $("#cName").value = acc.name; $("#cEmail").value = acc.email; }

    // topic from the URL: contact.html?topic=size
    const topic = new URLSearchParams(location.search).get("topic");
    open({ size: "glitter", fit: "glitter", press: "hazard", stockist: "hazard", collab: "hazard" }[topic] || "angel");

    $("#ctForm").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#cName").value.trim(), email = $("#cEmail").value.trim(), msg = $("#cMsg").value.trim(), order = $("#cOrder").value.trim();
      const err = $("#cErr");
      const bad = !name ? $("#cName") : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? $("#cEmail") : !msg ? $("#cMsg") : null;
      if (bad) {
        err.textContent = bad === $("#cName") ? "who's asking? add your name ♡" : bad === $("#cEmail") ? "we need a real email to reply to" : "you forgot the message lol";
        bad.focus();
        bad.classList.remove("shake"); void bad.offsetWidth; bad.classList.add("shake");
        return;
      }
      err.textContent = "";
      say(name, esc(msg).replace(/\n/g, "<br>") + (order ? ` <em>[order ${esc(order)}]</em>` : ""), true);
      $("#cMsg").value = "";
      const b = BUDDIES[buddy];
      const t = typing(b.name);
      setTimeout(() => {
        t.remove();
        say(b.name, `got it, ${esc(name.split(" ")[0])} ♡`);
        setTimeout(() => say("DollMessenger", "<i>heads up: CYBERDOLL isn't open yet, so this message wasn't actually sent to anyone. once the shop goes live, it lands straight in our inbox.</i>"), reduced ? 0 : 500);
      }, reduced ? 0 : 1300);
    });
    // enter sends, shift+enter = new line
    $("#cMsg").addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#ctForm").requestSubmit(); }
    });
  }
})();
