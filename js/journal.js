/* =========================================================
   CYBERDOLL — journal ("doll diary")
   tag filter · featured post · diary-page reader · shop the post
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

  const POSTS = [
    {
      id: "midnight-mall", tag: "DROPS", date: "12.09.2026", img: "img/corset/corset-06.jpg", focus: "50% 35%",
      title: "Midnight Mall: how drop #005 happened",
      dek: "a closed-down mall, a broken escalator and way too many chains.",
      body: [
        "Drop #005 started with one photo: an empty shopping mall at 3am, every shutter down, one vending machine still glowing. That lonely neon hum became the whole mood board.",
        "We wanted pieces that look like they were found in that mall after closing — a studded tube top someone left in a changing room, a corset with a chain belt that clinks when you walk, micro shorts cut from denim that's been through a lot.",
        "Five moods came out of it: glitter, studs, wild, laced and low-rise. Mix them, clash them, wear three at once. The mall is closed, nobody's checking."
      ],
      shop: ["chain-reaction-corset", "bad-angel-tube", "chain-fur-shorts"]
    },
    {
      id: "corset-over-everything", tag: "STYLING", date: "28.08.2026", img: "img/drop-01.jpg", focus: "50% 40%",
      title: "How to wear a corset over literally anything",
      dek: "tees, hoodies, slip dresses, your ex's band shirt. yes, all of them.",
      body: [
        "Rule one: the corset is the main character. Everything underneath is just set design. An oversized tee knotted at the back, a long-sleeve mesh top, even a hoodie with the hood out — cinch it and suddenly it's an outfit.",
        "Rule two: play with length. A cropped corset over a long slip dress gives you a waist; a longline one over low-rise jeans gives you that 2003 red-carpet chaos.",
        "Rule three: size up if you're in between. You should be able to breathe, sit down and eat a whole pizza. Fashion is pain, but it doesn't have to be that much pain."
      ],
      shop: ["leather-error-corset", "buckle-collar-corset", "angel-wing-tee"]
    },
    {
      id: "anatomy-of-a-doll", tag: "STYLING", date: "14.08.2026", img: "img/anatomy.jpg", focus: "50% 30%",
      title: "Anatomy of a doll: one outfit, five pieces",
      dek: "the fit on our homepage, broken down piece by piece.",
      body: [
        "Every outfit has a skeleton. This one is five pieces: studded top, buckle shorts, a leather jacket that's seen things, stompy boots and earrings that catch the light.",
        "The trick is contrast. Soft next to hard, shiny next to matte, tiny next to huge. The shorts are tiny, the boots are huge. The top is tight, the jacket is boxy. Your eye bounces around and never gets bored.",
        "Swap one piece and it becomes a different outfit. Swap two and it's a different person. That's the point."
      ],
      shop: ["holy-studs-top", "buckle-up-shorts", "stomp-buckle-boots"]
    },
    {
      id: "no-restocks", tag: "BEHIND THE SCENES", date: "30.07.2026", img: "img/drop-04.jpg", focus: "50% 45%",
      title: "Why we don't do restocks",
      dek: "no restocks, no regrets — and no piles of leftovers either.",
      body: [
        "Every drop is made in small runs. When a piece sells out, it's gone, and we don't make more. People ask us why all the time, so here's the honest answer.",
        "Small runs mean nothing ends up in a warehouse waiting for a sale that never comes. It also means the doll next to you at the party probably isn't wearing the same top.",
        "The CORE collection is the exception: the basics you keep coming back to stay in the shop. Everything else? Wishlist it fast."
      ],
      shop: ["skull-kiss-knit", "angel-fluff-knit", "chainmail-cross-knit"]
    },
    {
      id: "getting-ready", tag: "MUSIC", date: "16.07.2026", img: "img/club.jpg", focus: "50% 50%",
      title: "The getting-ready playlist (no skips)",
      dek: "our soundtrack for eyeliner, outfit changes and running late.",
      body: [
        "Track 01 is always something with a bass line loud enough to shake the mirror. Track 02 is the one you scream into the hairbrush. After that, rules are optional.",
        "Our studio playlist lives on the Doll Club radio on the homepage: press play on the little player, skip with the arrows. Emo guitars, trip-hop keys, club stabs and shoegaze fuzz, all made for this site — no ads, no algorithm.",
        "Pro tip: plan the outfit before the playlist ends. If you hit the last track and you're still in a towel, you're officially late."
      ],
      shop: ["glitch-platform-boots", "bow-exe-warmers", "midnight-fiction-slip"]
    },
    {
      id: "faux-fur-care", tag: "CARE", date: "02.07.2026", img: "img/outwear/outwear-03.jpg", focus: "50% 40%",
      title: "Faux fur + pleather: a care guide for the lazy",
      dek: "keep it fluffy and shiny with almost zero effort.",
      body: [
        "Faux fur: never the washing machine. Spot clean, shake it out, and brush gently with a wide comb when it gets matted. Hang it — folding crushes the pile.",
        "Pleather and vinyl: wipe with a damp cloth, dry straight away, keep them away from radiators and direct sun. Heat is the enemy; it makes the finish crack.",
        "Everything else: wash cold, inside out, air dry. Your pieces last longer, your bills stay lower, and the planet says thanks."
      ],
      shop: ["leopard-faux-fur-coat", "fur-real-jacket", "afghan-shag-coat"]
    }
  ];

  const readTime = p => Math.max(1, Math.round(p.body.join(" ").split(/\s+/).length / 180));
  const byId = id => PRODUCTS.find(p => p.id === id);
  let tag = "ALL";

  /* ---------- lock ---------- */
  if (!reduced) setTimeout(() => $("#lock").classList.add("is-open"), 700);
  else $("#lock").classList.add("is-open");

  /* ---------- list ---------- */
  const tags = ["ALL", ...new Set(POSTS.map(p => p.tag))];
  $("#tags").innerHTML = tags.map(t => `<button type="button" class="chip" role="tab" data-tag="${esc(t)}" aria-selected="${t === tag}">${esc(t)}</button>`).join("");

  const meta = p => `${p.date} · ${esc(p.tag)} · ${readTime(p)} min read`;
  const render = () => {
    const list = POSTS.filter(p => tag === "ALL" || p.tag === tag);
    const [first, ...rest] = list;
    $("#count").textContent = `${list.length} ${list.length === 1 ? "entry" : "entries"}`;
    $("#feature").innerHTML = first ? `
      <a href="#${first.id}" class="jr-feat" data-open="${first.id}">
        <span class="jr-feat__img"><img src="${esc(first.img)}" alt="" style="object-position:${first.focus}" /></span>
        <span class="jr-feat__txt">
          <span class="jr-feat__new">LATEST ENTRY</span>
          <span class="jr-meta">${meta(first)}</span>
          <span class="jr-feat__title">${esc(first.title)}</span>
          <span class="jr-feat__dek">${esc(first.dek)}</span>
          <span class="link-arrow">READ IT →</span>
        </span>
      </a>` : "";
    $("#grid").innerHTML = rest.map((p, i) => `
      <a href="#${p.id}" class="jr-card" data-open="${p.id}" style="--r:${[-2, 1.5, -1, 2, -1.5][i % 5]}deg;--d:${i}">
        <span class="jr-card__tape" aria-hidden="true"></span>
        <span class="jr-card__img"><img src="${esc(p.img)}" alt="" loading="lazy" style="object-position:${p.focus}" /></span>
        <span class="jr-meta">${meta(p)}</span>
        <span class="jr-card__title">${esc(p.title)}</span>
        <span class="jr-card__dek">${esc(p.dek)}</span>
      </a>`).join("");
  };

  $("#tags").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    tag = b.dataset.tag;
    $$(".chip", $("#tags")).forEach(c => c.setAttribute("aria-selected", c === b));
    render();
  });

  /* ---------- reader ---------- */
  const reader = $("#reader"), page = $("#page");
  let current = -1, lastFocus = null;

  const open = (id, push = true) => {
    const i = POSTS.findIndex(p => p.id === id);
    if (i < 0) return;
    current = i;
    const p = POSTS[i];
    $("#rImg").src = p.img;
    $("#rImg").style.objectPosition = p.focus;
    $("#rMeta").innerHTML = meta(p);
    $("#rTitle").textContent = p.title;
    $("#rBody").innerHTML = `<p class="jr-page__dek">${esc(p.dek)}</p>` + p.body.map(t => `<p>${esc(t)}</p>`).join("") + `<p class="jr-page__sign">xoxo, the dolls ♡</p>`;
    const items = p.shop.map(byId).filter(Boolean);
    $("#rShopWrap").hidden = !items.length;
    $("#rShop").replaceChildren(...items.map(x => build(x)));
    const prev = POSTS[(i - 1 + POSTS.length) % POSTS.length], next = POSTS[(i + 1) % POSTS.length];
    $("#rPrev span").textContent = prev.title;
    $("#rNext span").textContent = next.title;
    if (reader.hidden) { lastFocus = document.activeElement; }
    reader.hidden = false;
    document.body.style.overflow = "hidden";
    reader.scrollTop = 0;
    page.classList.remove("is-in"); void page.offsetWidth; page.classList.add("is-in");
    $("#rClose").focus({ preventScroll: true });
    if (push) history.replaceState(null, "", `#${p.id}`);
  };
  const close = () => {
    reader.hidden = true;
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener("click", e => {
    const a = e.target.closest("[data-open]");
    if (!a) return;
    e.preventDefault();
    open(a.dataset.open);
  });
  $("#rClose").addEventListener("click", close);
  $("#rPrev").addEventListener("click", () => open(POSTS[(current - 1 + POSTS.length) % POSTS.length].id));
  $("#rNext").addEventListener("click", () => open(POSTS[(current + 1) % POSTS.length].id));
  document.addEventListener("keydown", e => {
    if (reader.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" && !e.target.closest("input, textarea")) $("#rNext").click();
    if (e.key === "ArrowLeft" && !e.target.closest("input, textarea")) $("#rPrev").click();
  });
  // reading progress
  reader.addEventListener("scroll", () => {
    const k = reader.scrollTop / Math.max(1, reader.scrollHeight - reader.clientHeight);
    $("#rBar").style.transform = `scaleX(${k})`;
  }, { passive: true });

  render();
  // deep link: journal.html#no-restocks
  const h = location.hash.slice(1);
  if (h && POSTS.some(p => p.id === h)) open(h, false);
})();
