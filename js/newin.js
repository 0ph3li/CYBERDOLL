/* =========================================================
   CYBERDOLL — new in · DROP #005 MIDNIGHT MALL
   slot-machine hero · terminal · story reveal · moods
   drop grid with mood tabs · countdown to #006
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const CD = window.CD;
  const { build, esc, url, focusPos } = window.CDCards;
  const reduced = CD.reduced;
  const LOOKS = window.CD_LOOKS || {};
  const DROP = (window.CD_PRODUCTS || []).filter(p => p.drop === "005").sort((a, b) => b.added - a.added);
  const byId = id => DROP.find(p => p.id === id);

  /* ---------- hero: three columns of photos rolling like a slot machine ---------- */
  const slots = [$("#slotA"), $("#slotB"), $("#slotC")];
  slots.forEach((col, i) => {
    const pics = DROP.filter((_, k) => k % 3 === i);
    const html = pics.map(p => `<img src="${esc(p.img)}" alt="" loading="lazy" style="object-position:${focusPos(p)}" />`).join("");
    col.innerHTML = html + html; // doubled so the loop is seamless
  });

  /* ---------- hero: terminal ---------- */
  const term = $("#term");
  const lines = [
    "> mounting <b>DROP_005/MIDNIGHT_MALL</b> ...",
    `> ${DROP.length} files found: rhinestones.png  studs.zip  leopard.exe  corsets.dll  lowrise.jpg`,
    "> status: <b>OUT NOW</b> — no restocks ♡"
  ];
  if (reduced) term.innerHTML = lines.map(l => `<p>${l}</p>`).join("");
  else {
    let li = 0;
    const typeLine = () => {
      if (li >= lines.length) { term.insertAdjacentHTML("beforeend", '<span class="cur"></span>'); return; }
      const p = document.createElement("p");
      term.appendChild(p);
      const html = lines[li++];
      const plain = html.replace(/<[^>]+>/g, "");
      let n = 0;
      const t = setInterval(() => {
        n += 2;
        p.textContent = plain.slice(0, n);
        if (n >= plain.length) { clearInterval(t); p.innerHTML = html; setTimeout(typeLine, 220); }
      }, 22);
    };
    setTimeout(typeLine, 700);
  }

  /* ---------- counts come from the catalogue so they never go stale ---------- */
  const MOODS = $$(".mood").map(m => m.dataset.mood);
  $('[data-stat="pieces"]').dataset.count = DROP.length;
  $('[data-stat="moods"]').dataset.count = MOODS.length;
  $$(".mood").forEach(m => {
    const c = $("[data-mood-count]", m);
    if (c) c.textContent = String((LOOKS[m.dataset.mood] || []).length).padStart(2, "0");
  });

  /* ---------- hero: stats count-up ---------- */
  $$(".ni-stats b").forEach(b => {
    const to = Number(b.dataset.count), pad = b.textContent.length;
    const t0 = performance.now() + 900, dur = reduced ? 1 : 1200;
    const tick = now => {
      const k = clamp((now - t0) / dur, 0, 1);
      b.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))).padStart(pad, "0");
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ---------- hero: title glitch ---------- */
  const title = $(".ni-title");
  if (!reduced) setInterval(() => {
    title.classList.remove("is-glitching"); void title.offsetWidth; title.classList.add("is-glitching");
    setTimeout(() => title.classList.remove("is-glitching"), 650);
  }, 3800);

  /* ---------- story: words light up while you scroll ---------- */
  const story = $("#story"), storyText = $("#storyText");
  const splitWords = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/\s+/).forEach(part => {
          if (!part) return;
          const s = document.createElement("span");
          s.className = "w"; s.textContent = part;
          frag.appendChild(s);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) {
        if (ch.tagName === "EM") ch.classList.add("w"); else splitWords(ch);
      }
    });
  };
  splitWords(storyText);
  const words = $$(".w", storyText);

  /* ---------- moods: fill collages with pieces from each mood ---------- */
  const moods = $$(".mood");
  moods.forEach(m => {
    const ids = LOOKS[m.dataset.mood] || [];
    const picks = [ids[0], ids[2], ids[1]].map(byId).filter(Boolean);
    $$(".mood__pic", m).forEach((a, i) => {
      const p = picks[i];
      if (!p) { a.remove(); return; }
      a.href = url(p);
      a.setAttribute("aria-label", `${p.name} — €${p.price}`);
      const img = $("img", a);
      img.style.objectPosition = focusPos(p);
      img.src = p.img;
      a.insertAdjacentHTML("beforeend", `<span>${esc(p.code)} · €${p.price}</span>`);
    });
  });
  const moodIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); moodIO.unobserve(en.target); }
  }), { threshold: .25 });
  moods.forEach(m => moodIO.observe(m));
  const pics = $$(".mood__pic[data-speed]");

  /* ---------- scroll-driven bits ---------- */
  const onScroll = () => {
    const vh = innerHeight;
    // story words
    const r = story.getBoundingClientRect();
    const p = clamp((-r.top + vh * .3) / (story.offsetHeight - vh * .7), 0, 1);
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < n));
    // collage parallax — read every position first, then write, so the browser lays out once
    if (!reduced) {
      const offs = pics.map(el => {
        const box = el.parentElement.getBoundingClientRect();
        return (box.top + box.height / 2 - vh / 2) * Number(el.dataset.speed);
      });
      pics.forEach((el, i) => { el.style.transform = `translateY(${offs[i]}px)`; });
    }
  };
  let queued = false;
  const onScrollRaf = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; onScroll(); });
  };
  addEventListener("scroll", onScrollRaf, { passive: true });
  addEventListener("resize", onScrollRaf);
  onScroll();

  /* ---------- full drop grid + mood tabs ---------- */
  const grid = $("#dropGrid");
  const cards = DROP.map(p => {
    const el = build(p);
    el.setAttribute("data-reveal", "");
    grid.appendChild(el);
    CD.reveal(el);
    return { p, el };
  });
  cards.forEach(({ el }, i) => (el.style.transitionDelay = `${(i % 4) * 80}ms`));

  const tabs = $$(".ni-tabs .chip");
  tabs.forEach(t => t.addEventListener("click", () => {
    const mood = t.dataset.mood;
    tabs.forEach(x => x.setAttribute("aria-selected", x === t));
    const keep = mood === "all" ? null : new Set(LOOKS[mood] || []);
    const before = new Map(cards.filter(c => !c.el.classList.contains("is-out")).map(c => [c.el, c.el.getBoundingClientRect()]));
    cards.forEach(({ p, el }) => el.classList.toggle("is-out", !!keep && !keep.has(p.id)));
    if (reduced) return;
    let k = 0;
    cards.forEach(({ el }) => {
      if (el.classList.contains("is-out")) return;
      el.style.transitionDelay = "0ms";
      const was = before.get(el);
      if (was) {
        const now = el.getBoundingClientRect();
        el.animate([{ transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` }, { transform: "none" }],
          { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)" });
      } else {
        el.animate([
          { opacity: 0, transform: "translateY(30px) scale(.96)", clipPath: "inset(0 0 100% 0)" },
          { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }
        ], { duration: 650, delay: k++ * 50, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      }
    });
  }));

  /* ---------- countdown to DROP #006 (Friday 13 November, 18:00) ---------- */
  const target = new Date(2026, 10, 13, 18, 0, 0).getTime();
  const units = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') };
  const pad = v => String(v).padStart(2, "0");
  const tickCount = () => {
    let diff = Math.max(0, target - Date.now());
    const vals = {
      d: Math.floor(diff / 864e5),
      h: Math.floor(diff / 36e5) % 24,
      m: Math.floor(diff / 6e4) % 60,
      s: Math.floor(diff / 1e3) % 60
    };
    Object.entries(vals).forEach(([u, v]) => {
      const txt = pad(v);
      if (units[u].textContent !== txt) {
        units[u].textContent = txt;
        if (!reduced) { units[u].classList.remove("tick"); void units[u].offsetWidth; units[u].classList.add("tick"); }
      }
    });
    if (diff === 0) $(".ni-next__count .kicker").textContent = "DROP #006 IS LIVE ♡";
  };
  tickCount();
  setInterval(tickCount, 1000);

  // the locked drop name keeps glitching, never quite readable
  const secret = $("[data-secret]");
  const GL = "?!#$%&*@X0/<>";
  if (!reduced) setInterval(() => {
    const base = secret.textContent;
    let n = 0;
    const t = setInterval(() => {
      secret.textContent = [...base].map(() => (Math.random() < .5 ? GL[Math.random() * GL.length | 0] : "?")).join("");
      if (++n > 8) { clearInterval(t); secret.textContent = base; }
    }, 60);
  }, 2600);

  /* ---------- notify form (front-end only — connect to your email tool) ---------- */
  const form = $("#notifyForm"), email = $("#notifyEmail"), msg = $("#notifyMsg");
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
})();
