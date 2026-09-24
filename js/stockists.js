/* =========================================================
   CYBERDOLL — stockists
   radar scan · pin your city (saved in this browser)
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const CD = window.CD;
  const reduced = CD.reduced;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "cd_cities";

  // the scan "finds" nothing, honestly
  setTimeout(() => {
    $("#scan").hidden = true;
    $("#result").hidden = false;
  }, reduced ? 0 : 2600);

  // every city gets a stable spot on the radar
  const spot = name => {
    let h = 0;
    for (const c of name.toLowerCase()) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    const a = (h % 360) * Math.PI / 180, r = 18 + (h >> 9) % 26;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, deg: h % 360 };
  };
  const nice = s => s.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());

  const cities = () => CD.store.get(KEY, []);
  const render = (fresh = "") => {
    const list = cities();
    $("#blips").innerHTML = list.map(c => {
      const p = spot(c);
      // the ping flashes when the sweep passes over it
      return `<span class="st-blip${c === fresh ? " is-new" : ""}" style="left:${p.x}%;top:${p.y}%;--delay:${(p.deg / 360) * 4}s"><i></i><b>${esc(c)}</b></span>`;
    }).join("");
    $("#cities").innerHTML = list.map(c => `<li${c === fresh ? ' class="is-new"' : ""}><span>✦ ${esc(c)}</span><button type="button" data-rm="${esc(c)}" aria-label="Remove ${esc(c)}">×</button></li>`).join("");
  };

  $("#cityForm").addEventListener("submit", e => {
    e.preventDefault();
    const inp = $("#city"), v = nice(inp.value);
    const msg = $("#cityMsg");
    if (v.length < 2) { msg.textContent = "type a city first ♡"; inp.focus(); return; }
    const list = cities();
    if (list.includes(v)) { msg.textContent = `${v} is already on the radar`; return; }
    CD.store.set(KEY, [...list, v].slice(-12));
    inp.value = "";
    msg.textContent = `${v} pinned ✦`;
    render(v);
  });
  $("#cities").addEventListener("click", e => {
    const b = e.target.closest("[data-rm]");
    if (!b) return;
    CD.store.set(KEY, cities().filter(c => c !== b.dataset.rm));
    render();
  });

  render();
})();
