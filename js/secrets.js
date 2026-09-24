/* =========================================================
   CYBERDOLL — secrets ♡ (don't tell anyone)
   1. the classic cheat code  ↑ ↑ ↓ ↓ ← → ← → B A   → glitch mode
   2. type "cyberdoll" anywhere                     → heart rain
   3. poke the big footer logo 7 times              → it gets shy
   each secret found = +50 doll points + an unlock in account → customize
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const CD = window.CD;
  if (!CD) return;
  const reduced = CD.reduced;
  const HEART = '<svg viewBox="0 0 7 6" shape-rendering="crispEdges"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const ALL = ["konami", "cyberdoll", "logo"];
  const UNLOCK = { konami: "the GLITCHCORE background", cyberdoll: "the ANGEL background", logo: "the ✿ KAWAII animation" };

  const found = () => CD.store.get("cd_secrets", []);
  const discover = id => {
    const list = found();
    const isNew = !list.includes(id);
    if (isNew) CD.store.set("cd_secrets", [...list, id]);
    const n = found().length;
    setTimeout(() => CD.showToast(isNew
      ? `SECRET ${n}/${ALL.length} FOUND ♡ +50 PTS · UNLOCKED ${UNLOCK[id]}`
      : `YOU ALREADY FOUND THIS ONE ♡ (${n}/${ALL.length})`), 400);
    document.dispatchEvent(new CustomEvent("cd:secret", { detail: { id, isNew } }));
  };

  // don't listen while someone's typing in a field
  const typing = e => e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");

  /* ---------- 1. cheat code → glitch mode ---------- */
  const CODE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let at = 0;
  const glitchMode = () => {
    const root = document.documentElement;
    if (root.classList.contains("cd-glitch")) return;
    const layer = document.createElement("div");
    layer.className = "cd-glitch-layer";
    layer.innerHTML = `<p>CHEAT CODE ACCEPTED</p><p>GLITCH_MODE.EXE</p>`;
    document.body.appendChild(layer);
    root.classList.add("cd-glitch");
    setTimeout(() => { root.classList.remove("cd-glitch"); layer.remove(); }, reduced ? 1500 : 4200);
    discover("konami");
  };

  /* ---------- 2. type "cyberdoll" → heart rain ---------- */
  const WORD = "cyberdoll";
  let typed = "";
  const heartRain = () => {
    const n = reduced ? 0 : 60;
    const colors = ["#ff5ea8", "#ffa9cf", "#ff2a2a", "#9fc4e8", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const h = document.createElement("i");
      h.className = "cd-rain";
      h.innerHTML = HEART;
      h.style.left = `${Math.random() * 100}vw`;
      h.style.setProperty("--s", (.5 + Math.random() * 1.6).toFixed(2));
      h.style.setProperty("--c", colors[i % colors.length]);
      h.style.setProperty("--dur", `${2 + Math.random() * 2.2}s`);
      h.style.setProperty("--delay", `${Math.random() * 1.4}s`);
      h.style.setProperty("--sway", `${Math.round(Math.random() * 120 - 60)}px`);
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 5000);
    }
    const big = document.createElement("div");
    big.className = "cd-rain-word";
    big.textContent = "cyberdoll ♡";
    document.body.appendChild(big);
    setTimeout(() => big.remove(), 2600);
    discover("cyberdoll");
  };

  document.addEventListener("keydown", e => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    at = k === CODE[at] ? at + 1 : (k === CODE[0] ? 1 : 0);
    if (at === CODE.length) { at = 0; glitchMode(); }
    if (k.length === 1) {
      typed = (typed + k).slice(-WORD.length);
      if (typed === WORD) { typed = ""; heartRain(); }
    }
  });

  /* ---------- 3. poke the footer logo ---------- */
  const logo = document.querySelector(".footer__logo");
  if (logo) {
    let pokes = 0, pokeT;
    const LINES = ["hey", "hey!!", "stop that", "i'm serious", "ok you're kinda cute", "fine."];
    logo.addEventListener("click", e => {
      pokes++;
      clearTimeout(pokeT);
      pokeT = setTimeout(() => (pokes = 0), 1400);
      logo.classList.remove("is-poked"); void logo.offsetWidth; logo.classList.add("is-poked");
      if (pokes < 7) {
        const b = document.createElement("span");
        b.className = "cd-poke";
        b.textContent = LINES[Math.min(pokes - 1, LINES.length - 1)];
        const r = logo.getBoundingClientRect();
        b.style.left = `${e.clientX - r.left}px`;
        b.style.top = `${e.clientY - r.top}px`;
        logo.appendChild(b);
        setTimeout(() => b.remove(), 900);
        return;
      }
      pokes = 0;
      logo.classList.add("is-shy");
      setTimeout(() => logo.classList.remove("is-shy"), 2400);
      discover("logo");
    });
  }

  /* ---------- for the curious who open devtools ---------- */
  try {
    console.log("%c♡ CYBERDOLL ♡", "font: 900 italic 28px Georgia, serif; color: #ff5ea8; text-shadow: 3px 3px 0 #0a0a0b;");
    console.log("%chi dev doll. there are 3 secrets on this site. one of them is a very old cheat code ↑↑↓↓", "font: 12px monospace; color: #9fc4e8;");
  } catch {}

  CD.secrets = { all: ALL, found };
})();
