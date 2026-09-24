/* =========================================================
   CYBERDOLL — 404
   broken heart you can fix · guesses from the broken url
   needs: products.js, main.js (window.CD), cards.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const CD = window.CD;
  const { build, url } = window.CDCards;
  const reduced = CD.reduced;
  const PRODUCTS = window.CD_PRODUCTS || [];

  /* ---------- the broken url ---------- */
  const path = decodeURIComponent(location.pathname + location.search).slice(0, 60);
  const isSelf = /\/404(\.html)?$/.test(location.pathname);
  $("#path").textContent = isSelf ? "this page" : path;

  // turn "/leather-corsett" into words and look for pieces that match
  const words = isSelf ? [] : path.toLowerCase().replace(/\.html?|\?.*$/g, "").split(/[^a-z]+/).filter(w => w.length > 2);
  const score = p => words.reduce((s, w) => s + (p.name.toLowerCase().includes(w) ? 3 : 0) + (p.cat.includes(w) || w.includes(p.cat.replace(/s$/, "")) ? 2 : 0), 0);
  let pick = words.length ? PRODUCTS.map(p => [p, score(p)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]) : [];
  if (pick.length) {
    $("#moreTitle").textContent = `were you looking for "${words.join(" ")}"?`;
    $("#nfQ").value = words.join(" ");
  }
  const hot = PRODUCTS.filter(p => (p.hot || p.tag) && !pick.includes(p)).sort(() => Math.random() - .5);
  pick = pick.concat(hot).slice(0, 4);
  $("#moreGrid").replaceChildren(...pick.map(p => build(p)));

  // random piece button
  const rnd = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  if (rnd) $("#random").href = url(rnd);

  /* ---------- fix the heart ---------- */
  const heart = $("#heart");
  let fixed = false;
  heart.addEventListener("click", () => {
    if (fixed) {
      // tap again: it beats
      heart.classList.remove("is-beat"); void heart.offsetWidth; heart.classList.add("is-beat");
      return;
    }
    fixed = true;
    heart.classList.add("is-fixed");
    heart.setAttribute("aria-label", "Heart fixed");
    document.body.classList.add("nf-mended");
    $(".nf-title").textContent = "fixed it ♡";
    $(".nf-lead").innerHTML = "the page is still lost though. but look, cute things ↓";
    if (!reduced) burst();
  });

  // little pixel hearts popping out of the mended heart
  const burst = () => {
    const r = heart.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("i");
      s.className = "nf-spark";
      s.innerHTML = '<svg viewBox="0 0 7 6" shape-rendering="crispEdges"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
      const a = (i / 14) * Math.PI * 2, d = 90 + Math.random() * 70;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty("--x", `${Math.cos(a) * d}px`);
      s.style.setProperty("--y", `${Math.sin(a) * d}px`);
      s.style.setProperty("--c", ["#ff5ea8", "#ffa9cf", "#ff2a2a", "#9fc4e8"][i % 4]);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  };
})();
