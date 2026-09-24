/* =========================================================
   CYBERDOLL — gift cards
   live card preview · holo tilt · flip · design / amount / note → bag
   needs: main.js (window.CD)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CD = window.CD;
  const reduced = CD.reduced;

  const card = $("#card"), stage = $("#stage");
  const st = { design: "holo", amount: 50, to: "", from: "", msg: "" };

  /* ---------- live preview ---------- */
  const bump = el => { el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); };
  const render = () => {
    card.dataset.design = st.design;
    $("#cAmount").textContent = `€${st.amount}`;
    $("#total").textContent = `€${st.amount}`;
    $("#customOut").textContent = `€${st.amount}`;
    $("#cTo").textContent = st.to ? `for: ${st.to} ♡` : "for: you ♡";
    $("#cMsg").textContent = st.msg || "write them something cute…";
    $("#cMsg").classList.toggle("is-empty", !st.msg);
    $("#cFrom").textContent = `xoxo, ${st.from || "—"}`;
    $("#msgCount").textContent = `${st.msg.length} / 120`;
    const c = $("#custom");
    c.style.setProperty("--f", `${((st.amount - c.min) / (c.max - c.min)) * 100}%`);
  };

  const flip = on => card.classList.toggle("is-flipped", on === undefined ? !card.classList.contains("is-flipped") : on);
  card.addEventListener("click", () => flip());
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });

  // holo tilt: the card leans toward the pointer and the shine follows
  if (CD.finePointer && !reduced) {
    let raf = 0, tx = 0, ty = 0;
    stage.addEventListener("pointermove", e => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5;
      ty = (e.clientY - r.top) / r.height - .5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        card.style.setProperty("--rx", `${-ty * 18}deg`);
        card.style.setProperty("--ry", `${tx * 24}deg`);
        card.style.setProperty("--mx", `${(tx + .5) * 100}%`);
        card.style.setProperty("--my", `${(ty + .5) * 100}%`);
      });
    });
    stage.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  }

  /* ---------- controls ---------- */
  const radio = (group, attr, key, parse = v => v) => {
    $(group).addEventListener("click", e => {
      const b = e.target.closest(`[data-${attr}]`);
      if (!b) return;
      st[key] = parse(b.dataset[attr]);
      $$(`${group} [role=radio]`).forEach(x => x.setAttribute("aria-checked", x === b));
      if (key === "amount") $("#custom").value = st.amount;
      flip(false);
      bump(card);
      render();
    });
  };
  radio("#designs", "d", "design");
  radio("#amounts", "a", "amount", Number);

  $("#custom").addEventListener("input", e => {
    st.amount = +e.target.value;
    $$("#amounts [role=radio]").forEach(x => x.setAttribute("aria-checked", +x.dataset.a === st.amount));
    flip(false);
    render();
  });

  const text = (id, key, back) => {
    const el = $(id);
    el.addEventListener("input", () => { st[key] = el.value.trim(); render(); });
    el.addEventListener("focus", () => flip(back));
  };
  text("#fTo", "to", false);
  text("#fFrom", "from", true);
  text("#fMsg", "msg", true);

  /* ---------- to the bag ---------- */
  $("#gcForm").addEventListener("submit", e => {
    e.preventDefault();
    CD.addToBag(`Gift Card €${st.amount}`, { gift: { design: st.design, amount: st.amount, to: st.to, from: st.from, msg: st.msg } });
    // the card flies off toward the bag
    if (!reduced) {
      card.classList.remove("is-sent"); void card.offsetWidth; card.classList.add("is-sent");
      setTimeout(() => card.classList.remove("is-sent"), 900);
    }
    const b = $(".gc-add span");
    b.textContent = "✓ IN YOUR BAG";
    setTimeout(() => (b.textContent = "ADD TO BAG"), 1600);
  });

  render();
})();
