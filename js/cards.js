/* =========================================================
   CYBERDOLL — product card builder (shared by shop + product)
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const HEART = '<svg viewBox="0 0 7 6" shape-rendering="crispEdges"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = p => `product.html?id=${encodeURIComponent(p.id)}`;
  const focusPos = p => p.focus ? `${p.focus[0]}% ${p.focus[1]}%` : "50% 50%";
  // numbered drops read "DROP #005", the permanent collection reads "CORE ✦"
  const dropLabel = p => /^\d+$/.test(p.drop) ? `DROP #${p.drop}` : "CORE ✦";

  const build = p => {
    const CD = window.CD;
    const el = document.createElement("article");
    el.className = "card";
    el.dataset.id = p.id;
    const tag = p.tag ? `<span class="card__tag${p.hot ? " card__tag--red" : ""}">${esc(p.tag)}</span>` : "";
    el.innerHTML = `
      <div class="card__top">
        <a href="${url(p)}" class="card__link">
          <div class="media" data-ph="${esc(p.code)} · 4:5"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" style="object-position:${focusPos(p)}" /></div>
          ${tag}
          <span class="card__code">${esc(p.code)}</span>
          <span class="card__drop">${esc(dropLabel(p))}</span>
        </a>
        <div class="card__quick" aria-label="Quick add ${esc(p.name)}">
          <span>QUICK ADD — PICK YOUR SIZE</span>
          ${p.sizes.map(s => `<button type="button" data-size="${esc(s)}">${esc(s)}</button>`).join("")}
        </div>
      </div>
      <button class="card__heart" aria-label="Add ${esc(p.name)} to wishlist" aria-pressed="false">${HEART}</button>
      <div class="card__info">
        <h3><a href="${url(p)}">${esc(p.name)}</a></h3>
        <span class="card__price">€${p.price}</span>
      </div>
      <button class="card__add" data-name="${esc(p.name)}">+ ADD TO BAG</button>`;
    CD.initMedia($(".media", el));
    CD.bindCard(el);
    $$(".card__quick button", el).forEach(b => b.addEventListener("click", () => {
      CD.addToBag(`${p.name} / ${b.dataset.size}`, { id: p.id, size: b.dataset.size });
      b.textContent = "✓";
      setTimeout(() => (b.textContent = b.dataset.size), 1200);
    }));
    return el;
  };

  window.CDCards = { build, esc, url, focusPos, dropLabel, HEART };
})();
