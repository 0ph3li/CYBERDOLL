/* =========================================================
   CYBERDOLL — legal pages (terms · privacy · cookies)
   table of contents · scroll spy · reading bar · storage inspector
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- table of contents ---------- */
  const heads = $$("#doc h2");
  $("#toc").innerHTML = heads.map((h, i) => `<li><a href="#${h.id}"><i>${String(i + 1).padStart(2, "0")}</i>${esc(h.textContent)}</a></li>`).join("");
  const links = $$("#toc a");

  // highlight the section you're reading + fill the bar
  const bar = $("#lgBar"), doc = $("#doc");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const r = doc.getBoundingClientRect(), vh = innerHeight;
      const k = Math.min(1, Math.max(0, (vh * .4 - r.top) / (r.height - vh * .4)));
      let cur = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < vh * .35) cur = i; });
      bar.style.transform = `scaleX(${k})`;
      links.forEach((a, i) => a.classList.toggle("is-on", i === cur));
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- storage inspector (cookies page) ---------- */
  const tbody = $("#inspect");
  if (!tbody) return;

  const LABELS = {
    cd_accounts: "Doll IDs saved in this browser",
    cd_session: "who's logged in right now",
    cd_bag_items: "your bag", cd_bag: "bag counter",
    cd_wish: "your wishlist", cd_wish_meta: "wishlist notes + want levels",
    cd_friend: "CYBERDOLL friend request", cd_comments: "comments on the wall",
    cd_recent_search: "recent searches", cd_faq_votes: "FAQ helpful votes",
    cd_promo: "promo code in your bag", cd_budget: "payday planner budget",
    cd_unit: "size guide units", cd_cities: "cities you pinned on the stockists radar", cd_secrets: "secrets you found ♡", cd_radio_vol: "radio volume", cd_zone: "delivery country", cd_cols: "shop grid size"
  };
  const read = box => {
    const out = [];
    try {
      const s = box === "local" ? localStorage : sessionStorage;
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith("cd_")) out.push({ k, box, bytes: (k.length + (s.getItem(k) || "").length) * 2 });
      }
    } catch {}
    return out;
  };
  const size = b => b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;

  const render = () => {
    const rows = [...read("session"), ...read("local")].sort((a, b) => a.k.localeCompare(b.k));
    let extra = "";
    tbody.innerHTML = rows.length ? rows.map(r => {
      let label = LABELS[r.k] || r.k;
      if (r.k === "cd_accounts") {
        try { const n = Object.keys(JSON.parse(localStorage.getItem(r.k)) || {}).length; label += ` (${n})`; } catch {}
      }
      return `<tr><td><b>${esc(label)}</b><small>${esc(r.k)}</small></td><td><span class="lg-box lg-box--${r.box}">${r.box}</span></td><td>${size(r.bytes)}</td></tr>`;
    }).join("") : `<tr><td colspan="3" class="lg-empty">nothing at all. squeaky clean ✦</td></tr>`;
    const total = rows.reduce((s, r) => s + r.bytes, 0);
    $("#inspectSum").innerHTML = rows.length ? `${rows.length} item${rows.length === 1 ? "" : "s"} · ${size(total)} total · cookies: <b>0</b>${extra}` : "cookies: <b>0</b>";
  };

  const wipe = boxes => {
    boxes.forEach(box => {
      try {
        const s = box === "local" ? localStorage : sessionStorage;
        Object.keys(s).filter(k => k.startsWith("cd_")).forEach(k => s.removeItem(k));
      } catch {}
    });
  };

  $("#clearSession").addEventListener("click", () => {
    if (!confirm("Forget this visit? Your guest bag + wishlist go, and you'll be logged out. Your saved Doll ID stays.")) return;
    wipe(["session"]);
    location.reload();
  });
  $("#clearAll").addEventListener("click", () => {
    if (!confirm("Delete EVERYTHING CYBERDOLL saved in this browser — including every Doll ID? This can't be undone.")) return;
    wipe(["session", "local"]);
    location.reload();
  });

  render();
  // re-read when something changes on the page (hearts, bag…)
  document.addEventListener("click", () => setTimeout(render, 60));
  document.addEventListener("cd:user", render);
})();
