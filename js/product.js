/* =========================================================
   CYBERDOLL — product page
   reads ?id= and renders the piece from products.js
   gallery · hover zoom · sizes · bag · wishlist · related
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const { esc, build, url, dropLabel } = window.CDCards;
  const PRODUCTS = window.CD_PRODUCTS || [];
  const CATS = window.CD_CATEGORIES || [];
  const reduced = CD.reduced;

  const id = new URLSearchParams(location.search).get("id");
  const p = PRODUCTS.find(x => x.id === id);

  if (!p) {
    $("#pdpMain").hidden = true;
    $("#pdpMissing").hidden = false;
    $("#crumbCat").textContent = "SHOP";
    $("#crumbName").textContent = "404";
    document.title = "Not found — CYBERDOLL";
    renderRelated(PRODUCTS.slice(0, 4), "shop.html");
    return;
  }

  const catLabel = (CATS.find(c => c.id === p.cat) || { label: p.cat.toUpperCase() }).label;
  document.title = `${p.name} — CYBERDOLL`;
  const metaDesc = $('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", `${p.name} — €${p.price}. ${p.desc || ""}`);

  /* ---------- text ---------- */
  $("#crumbCat").textContent = catLabel;
  $("#crumbCat").href = `shop.html?cat=${p.cat}`;
  $("#crumbName").textContent = p.name.toUpperCase();
  $("#pdpCode").textContent = `CODE ${p.code}`;
  $("#pdpDrop").textContent = dropLabel(p);
  if (p.tag) {
    const t = $("#pdpTag");
    t.hidden = false;
    t.textContent = p.tag;
    t.classList.toggle("is-hot", !!p.hot);
  }
  $("#pdpName").textContent = p.name;
  $("#pdpPrice").textContent = `€${p.price}`;
  $("#pdpColor").textContent = p.color || "—";
  $("#pdpDesc").textContent = p.desc || "";
  $("#pdpDetails").innerHTML = (p.details || []).map(d => `<li>${esc(d)}</li>`).join("");
  $("#barName").textContent = p.name.toUpperCase();
  $("#barPrice").textContent = `€${p.price}`;
  $("#moreLink").href = `shop.html?cat=${p.cat}`;
  $("#moreLink").textContent = `SEE ALL ${catLabel} →`;
  $("#moreLink").dataset.final = $("#moreLink").textContent;

  /* ---------- gallery ----------
     real extra photos (p.gallery) first, then zoomed detail
     crops generated from the main photo around p.focus      */
  const [fx, fy] = p.focus || [50, 50];
  const views = [
    { src: p.img, label: "FIT", z: 1, ox: fx, oy: fy },
    ...(p.gallery || []).map((src, i) => ({ src, label: `VIEW ${i + 2}`, z: 1, ox: 50, oy: 50 })),
    { src: p.img, label: "DETAIL", z: 1.9, ox: fx, oy: fy },
    { src: p.img, label: "CLOSE-UP", z: 2.6, ox: Math.min(95, fx + 6), oy: Math.max(5, fy - 8) }
  ];

  const thumbs = $("#thumbs"), stage = $("#stage"), view = $("#view"), viewImg = $("#viewImg"), viewLabel = $("#viewLabel");
  thumbs.innerHTML = views.map((v, i) => `
    <button type="button" class="pdp-thumb" role="tab" aria-selected="false" aria-label="${esc(v.label)} photo" data-i="${i}">
      <img src="${esc(v.src)}" alt="" style="transform:scale(${v.z});transform-origin:${v.ox}% ${v.oy}%;object-position:${v.z === 1 ? `${v.ox}% ${v.oy}%` : "50% 50%"}" />
      <span>${String(i + 1).padStart(2, "0")} ${esc(v.label)}</span>
    </button>`).join("");
  const thumbEls = $$(".pdp-thumb", thumbs);

  let current = -1;
  const show = i => {
    i = (i + views.length) % views.length;
    if (i === current) return;
    current = i;
    const v = views[i];
    viewImg.src = v.src;
    viewImg.alt = `${p.name} — ${v.label.toLowerCase()}`;
    viewImg.style.objectPosition = v.z === 1 ? `${v.ox}% ${v.oy}%` : "50% 50%";
    setZoom(v.z, v.ox, v.oy);
    viewLabel.textContent = `${String(i + 1).padStart(2, "0")} / ${v.label}`;
    thumbEls.forEach((t, k) => t.setAttribute("aria-selected", k === i));
    if (!reduced) {
      view.classList.remove("is-switching");
      void view.offsetWidth;
      view.classList.add("is-switching");
    }
  };
  const setZoom = (z, ox, oy) => {
    viewImg.style.setProperty("--z", z);
    viewImg.style.setProperty("--ox", `${ox}%`);
    viewImg.style.setProperty("--oy", `${oy}%`);
  };

  thumbEls.forEach(t => t.addEventListener("click", () => show(Number(t.dataset.i))));
  $("#prevView").addEventListener("click", e => { e.stopPropagation(); show(current - 1); });
  $("#nextView").addEventListener("click", e => { e.stopPropagation(); show(current + 1); });
  thumbs.addEventListener("keydown", e => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    show(current + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1));
    thumbEls[current].focus();
  });

  // hover zoom (mouse) — magnifies wherever the cursor is
  const zoomAt = e => {
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    const v = views[current];
    setZoom(Math.max(2.2, v.z * 1.6), x, y);
  };
  if (CD.finePointer) {
    stage.addEventListener("pointerenter", e => { if (e.target.closest(".pdp-stage__nav")) return; stage.classList.add("is-zooming"); zoomAt(e); });
    stage.addEventListener("pointermove", e => {
      if (e.target.closest(".pdp-stage__nav")) { const v = views[current]; stage.classList.remove("is-zooming"); setZoom(v.z, v.ox, v.oy); return; }
      stage.classList.add("is-zooming");
      zoomAt(e);
    });
    stage.addEventListener("pointerleave", () => {
      stage.classList.remove("is-zooming");
      const v = views[current];
      setZoom(v.z, v.ox, v.oy);
    });
  } else {
    // touch: swipe between photos
    let sx = null;
    stage.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }
  show(0);

  /* ---------- sizes ---------- */
  const sizesEl = $("#sizes"), sizeMsg = $("#sizeMsg"), sizesSet = $(".pdp-sizes");
  let size = p.sizes.length === 1 ? p.sizes[0] : null;
  sizesEl.setAttribute("role", "radiogroup");
  sizesEl.setAttribute("aria-label", "Size");
  sizesEl.innerHTML = p.sizes.map(s =>
    `<button type="button" class="pdp-size" role="radio" aria-checked="${s === size}" data-size="${esc(s)}">${esc(s)}</button>`).join("");
  const sizeBtns = $$(".pdp-size", sizesEl);
  sizeBtns.forEach(b => b.addEventListener("click", () => {
    size = b.dataset.size;
    sizeBtns.forEach(x => x.setAttribute("aria-checked", x === b));
    sizeMsg.textContent = `> size ${size} selected ♡`;
    sizeMsg.style.color = "var(--ink)";
  }));

  /* ---------- add to bag ---------- */
  const addBtn = $("#addBtn");
  const add = () => {
    if (!size) {
      sizeMsg.style.color = "";
      sizeMsg.textContent = "> pick a size first, doll";
      sizesSet.classList.remove("is-shaking"); void sizesSet.offsetWidth; sizesSet.classList.add("is-shaking");
      sizesSet.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      return;
    }
    CD.addToBag(`${p.name} / ${size}`, { id: p.id, size });
    addBtn.classList.add("is-added");
    $("span", addBtn).textContent = "✓ ADDED 2 BAG";
    setTimeout(() => { addBtn.classList.remove("is-added"); $("span", addBtn).textContent = "ADD TO BAG"; }, 1800);
  };
  addBtn.addEventListener("click", add);
  $("#barBtn").addEventListener("click", add);

  // sticky mobile bar appears once the main button scrolls away
  const bar = $("#pdpBar");
  new IntersectionObserver(([en]) => {
    const on = !en.isIntersecting && en.boundingClientRect.top < 0;
    bar.classList.toggle("show", on);
    bar.setAttribute("aria-hidden", !on);
    $("#barBtn").tabIndex = on ? 0 : -1;
  }).observe(addBtn);

  /* ---------- wishlist ---------- */
  const wishBtn = $("#wishBtn"), wishKey = url(p);
  wishBtn.setAttribute("aria-pressed", CD.isWished(wishKey));
  wishBtn.addEventListener("click", () => {
    const on = CD.toggleWish(wishKey);
    wishBtn.setAttribute("aria-pressed", on);
    // keep any card of this product on the page in sync
    $$(`.card[data-id="${p.id}"] .card__heart`).forEach(h => h.setAttribute("aria-pressed", on));
  });

  /* ---------- related ---------- */
  const sameCat = PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat);
  const others = PRODUCTS.filter(x => x.id !== p.id && x.cat !== p.cat);
  // shuffle same-category picks a little so every page feels different
  const pick = sameCat.sort((a, b) => ((a.code + p.code).charCodeAt(1) % 3) - ((b.code + p.code).charCodeAt(1) % 3)).slice(0, 4);
  renderRelated(pick.length < 4 ? pick.concat(others.slice(0, 4 - pick.length)) : pick);

  function renderRelated(list) {
    const grid = $("#related");
    list.forEach((item, i) => {
      const el = build(item);
      el.setAttribute("data-reveal", "");
      el.style.transitionDelay = `${i * 90}ms`;
      grid.appendChild(el);
      CD.reveal(el);
    });
  }
})();
