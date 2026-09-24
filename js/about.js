/* =========================================================
   CYBERDOLL — about ("CYBERDOLL's space")
   profile counters · typed blurb · buttons · heart confetti · comments
   needs: products.js + main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const DROPS = window.CD_DROPS || [];
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- details from the catalogue ---------- */
  const released = DROPS.filter(d => !d.locked).length;
  $("#statDrops").textContent = `${released} (+${DROPS.length - released} locked)`;
  $("#statPieces").textContent = `${PRODUCTS.length} and counting`;
  const now = new Date();
  $("#lastLogin").textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  /* ---------- profile views: counts up, then keeps ticking ---------- */
  const viewsEl = $("#views");
  let views = 66613;
  const showViews = v => (viewsEl.textContent = v.toLocaleString("en-US"));
  if (reduced) showViews(views);
  else {
    const t0 = performance.now() + 300, dur = 1600;
    const tick = t => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      showViews(Math.round(views * (1 - Math.pow(1 - k, 4))));
      if (k < 1) requestAnimationFrame(tick);
      else setInterval(() => showViews(views += 1 + (Math.random() * 3 | 0)), 4200);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- title glitch ---------- */
  const title = $(".ab-title");
  if (!reduced) setInterval(() => {
    title.classList.remove("is-glitching"); void title.offsetWidth; title.classList.add("is-glitching");
    setTimeout(() => title.classList.remove("is-glitching"), 650);
  }, 4000);

  /* ---------- "About me" types itself the first time you see it ---------- */
  const typed = $(".ab-typed");
  if (typed && !reduced) {
    const full = typed.textContent;
    typed.setAttribute("aria-label", full);
    typed.style.minHeight = `${typed.offsetHeight}px`;   // keep the box from jumping while it types
    typed.textContent = "";
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      let n = 0;
      const t = setInterval(() => {
        n += 2;
        typed.textContent = full.slice(0, n);
        if (n >= full.length) { clearInterval(t); typed.classList.add("is-done"); }
      }, 18);
    }, { threshold: .6 });
    io.observe(typed);
  } else if (typed) typed.classList.add("is-done");

  /* ---------- the private blog post keeps glitching ---------- */
  const GL = "?!#$%&*@X0/<>";
  $$("[data-glitchtext]").forEach(el => {
    const base = el.textContent;
    if (reduced) return;
    el._glitchLoop = setInterval(() => {
      let n = 0;
      const t = setInterval(() => {
        if (el._stopped) return clearInterval(t);   // unlocked mid-glitch: leave the new text alone
        el.textContent = [...base].map(ch => (ch === " " ? " " : GL[Math.random() * GL.length | 0])).join("");
        if (++n > 7) { clearInterval(t); el.textContent = base; }
      }, 60);
    }, 2800);
  });

  /* ---------- the private post unlocks once you add CYBERDOLL ---------- */
  const post = $("#privatePost"), secret = $("#privateSecret"), friendBtn = $("#friendBtn");
  let unlocked = false;
  // decode text from random glyphs into the real words, left to right
  const decode = (el, to, dur = 900) => new Promise(done => {
    if (reduced) { el.textContent = to; return done(); }
    const t0 = performance.now();
    const t = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur), cut = Math.floor(k * to.length);
      el.textContent = [...to].map((ch, i) => (i < cut || ch === " " ? ch : GL[Math.random() * GL.length | 0])).join("");
      if (k >= 1) { clearInterval(t); el.textContent = to; done(); }
    }, 45);
  });
  const unlockCountdown = () => {
    const out = $("#privateCount"), target = new Date(2026, 10, 13, 18, 0, 0).getTime();
    const tick = () => {
      const d = Math.max(0, target - Date.now());
      out.textContent = d ? `${Math.floor(d / 864e5)}d ${pad(Math.floor(d / 36e5) % 24)}h ${pad(Math.floor(d / 6e4) % 60)}m ${pad(Math.floor(d / 1e3) % 60)}s` : "NOW ♡";
    };
    tick();
    setInterval(tick, 1000);
  };
  // once you're friends, you show up first in the friend space (with your Doll ID pic)
  const joinTop8 = (animate = false) => {
    const top = $("#top8");
    if (!top) return;
    const a = CD.auth.current();
    let li = $(".ab-top8__me", top);
    if (!li) { li = document.createElement("li"); li.className = "ab-top8__me"; top.prepend(li); }
    const frame = (a && a.look && a.look.frame) || "square";
    const mood = a && a.look && a.look.mood;
    li.innerHTML = `<figure><a href="${a ? "account.html#customize" : "account.html"}" class="ab-top8__pic" data-frame="${frame}">${a ? CD.avatarHTML(a) : CD.avatarSVG("heart")}</a><figcaption>${a ? esc(a.name) : "you ♡"}${mood ? `<small>${esc(mood)}</small>` : a ? "" : "<small>log in to add your pic</small>"}</figcaption></figure>`;
    if (animate && !reduced) li.classList.add("is-new");
    const n = $(".ab-top8__count b");
    if (n) n.textContent = "667";
  };
  const unlock = async (instant = false) => {
    if (unlocked || !post) return;
    unlocked = true;
    CD.store.set("cd_friend", true);
    if (friendBtn) friendBtn.textContent = "♡ Friends ✓";
    const glitchy = $$("[data-unlock-to]", post);
    glitchy.forEach(el => { clearInterval(el._glitchLoop); el._stopped = true; });
    $(".ab-post__lock", post).hidden = true;
    if (instant) {
      glitchy.forEach(el => (el.textContent = el.dataset.unlockTo));
    } else {
      post.classList.add("is-unlocking");
      await Promise.all(glitchy.map(el => decode(el, el.dataset.unlockTo)));
      post.classList.remove("is-unlocking");
    }
    post.classList.remove("ab-post--locked");
    post.classList.add("ab-post--unlocked");
    secret.hidden = false;
    joinTop8(!instant);
    if (!instant && !reduced) secret.classList.add("is-opening");
    unlockCountdown();
  };
  if (CD.store.get("cd_friend", false)) unlock(true);

  /* ---------- pixel heart confetti ---------- */
  const cv = $("#burst"), ctx = cv.getContext("2d");
  const parts = [];
  let running = false;
  const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
  const COLS = ["#ff5ea8", "#ffa9cf", "#ff2a2a", "#9fc4e8", "#f6f3ef"];
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size);
  const drawHeart = (x, y, u, c) => {
    ctx.fillStyle = c;
    HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "X") ctx.fillRect(x + i * u, y + j * u, u, u); }));
  };
  const frame = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += .25; p.x += p.vx; p.y += p.vy; p.life -= .012;
      if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 2);
      drawHeart(Math.round(p.x), Math.round(p.y), p.u, p.c);
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(frame); else running = false;
  };
  const burst = (x, y, n = 40) => {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, u: 2 + (Math.random() * 3 | 0), c: COLS[Math.random() * COLS.length | 0], life: 1 + Math.random() * .6 });
    }
    if (!running) { running = true; requestAnimationFrame(frame); }
  };

  /* ---------- contact buttons ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    switch (b.dataset.act) {
      case "friend":
        burst(cx, cy, 60);
        if (unlocked) { CD.showToast("YOU'RE ALREADY FRIENDS ♡"); break; }
        CD.showToast(b.closest("#privatePost") ? "FRIEND REQUEST ACCEPTED ♡ WELCOME, DOLL" : "FRIEND ADDED ♡ A PRIVATE POST JUST UNLOCKED ↓");
        unlock();
        break;
      case "fave":
        burst(cx, cy, 24);
        CD.showToast("ADDED TO FAVORITES ★");
        break;
      case "share": {
        const done = () => CD.showToast("PROFILE LINK COPIED ↗");
        if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => CD.showToast("COPY THE LINK FROM THE ADDRESS BAR ♡"));
        else CD.showToast("COPY THE LINK FROM THE ADDRESS BAR ♡");
        break;
      }
      case "block":
        b.classList.remove("is-shaking"); void b.offsetWidth; b.classList.add("is-shaking");
        setTimeout(() => b.classList.remove("is-shaking"), 450);
        CD.showToast("NICE TRY ♡ YOU CAN'T BLOCK US");
        break;
    }
  });

  /* ---------- comments wall ----------
     the first three are written by the site's own mascots; anything a visitor
     posts is saved only in their own browser (localStorage) */
  const SEED = [
    { who: "angel.exe", img: "img/drop-03.jpg", date: "23 Sep 2026 00:14", text: "thanks for the add!!! ♡ ur corset layout is everything" },
    { who: "error.exe", img: "img/drop-01.jpg", date: "22 Sep 2026 23:58", text: "Warning: this profile is too cute to continue. [OK] [OK ♡]" },
    { who: "midnight.mall", img: "img/tops/top-13.jpg", date: "22 Sep 2026 21:30", text: "see u at closing time ✦ bring the fur hood" }
  ];
  const list = $("#comments"), countEl = $("#commentCount");
  let mine = CD.store.get("cd_comments", []);
  // your own comments always wear your current Doll ID picture + name
  const me = () => CD.auth.current();
  const frameOf = a => (a && a.look && a.look.frame) || "square";
  const commentHTML = (c, isNew) => {
    const a = c.me ? me() : null;
    const pic = a
      ? `<span class="ab-comment__av ab-comment__av--me" data-frame="${frameOf(a)}" aria-hidden="true">${CD.avatarHTML(a)}</span>`
      : c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" />` : `<span class="ab-comment__av" aria-hidden="true">${esc(c.who.charAt(0).toUpperCase() || "♡")}</span>`;
    return `
    <li class="ab-comment${isNew ? " is-new" : ""}${a ? " ab-comment--me" : ""}">
      <div class="ab-comment__who">
        ${pic}
        ${esc(a ? a.name : c.who)}
      </div>
      <div class="ab-comment__body">
        <p class="ab-comment__date">${esc(c.date)}</p>
        <p class="ab-comment__text">${esc(c.text)}</p>
      </div>
    </li>`;
  };
  const render = () => {
    const all = [...mine.slice().reverse(), ...SEED];
    list.innerHTML = all.map(c => commentHTML(c)).join("");
    countEl.textContent = all.length;
  };
  render();

  const form = $("#commentForm"), nameIn = $("#cName"), textIn = $("#cText"), msg = $("#commentMsg");
  // logged in? you post as your Doll ID
  const asMe = () => {
    const a = me();
    let tag = $(".ab-form__me", form);
    if (!a) { if (tag) tag.remove(); nameIn.readOnly = false; nameIn.hidden = false; return; }
    if (!tag) { tag = document.createElement("a"); tag.className = "ab-form__me"; tag.href = "account.html#customize"; nameIn.before(tag); }
    tag.innerHTML = `<span class="ab-comment__av ab-comment__av--me" data-frame="${frameOf(a)}">${CD.avatarHTML(a)}</span><span>posting as <b>${esc(a.name)}</b><small>change pic →</small></span>`;
    nameIn.value = a.name;
    nameIn.hidden = true;
  };
  asMe();
  form.addEventListener("submit", e => {
    e.preventDefault();
    const who = nameIn.value.trim(), text = textIn.value.trim();
    if (!who || !text) {
      msg.textContent = "> name + comment pls ♡";
      form.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
      return;
    }
    const d = new Date();
    const c = { who: who.slice(0, 24), text: text.slice(0, 240), ...(me() ? { me: true } : {}), date: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` };
    mine.push(c);
    mine = mine.slice(-20);
    CD.store.set("cd_comments", mine);
    list.insertAdjacentHTML("afterbegin", commentHTML(c, true));
    countEl.textContent = Number(countEl.textContent) + 1;
    textIn.value = "";
    msg.textContent = "> comment posted ♡ thanks for the love";
    const r = form.getBoundingClientRect();
    burst(r.left + 90, r.top + 20, 30);
  });
})();
