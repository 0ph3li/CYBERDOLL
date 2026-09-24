/* =========================================================
   CYBERDOLL — home interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     STORAGE
     · device prefs (grid size…)       → localStorage
     · "your stuff" (bag, wishlist…)   → per visit while you're a guest (sessionStorage),
                                         saved in your Doll ID once you log in
     So every new visit starts empty, and logging in brings everything back.
     --------------------------------------------------------- */
  const local = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };
  const session = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { sessionStorage.removeItem(k); } catch {} }
  };
  const USER_KEYS = ["cd_bag_items", "cd_bag", "cd_wish", "cd_wish_meta", "cd_friend", "cd_comments", "cd_recent_search", "cd_faq_votes", "cd_cities", "cd_secrets"];
  const accounts = () => local.get("cd_accounts", {});
  const saveAccounts = all => local.set("cd_accounts", all);
  const signedIn = () => { const e = session.get("cd_session", null); return e && accounts()[e] ? e : null; };

  // one-time move from the old single-account format
  (() => {
    const old = local.get("cd_account", null);
    if (old && old.email && !accounts()[old.email.toLowerCase()]) {
      const all = accounts();
      all[old.email.toLowerCase()] = { profile: old, data: {} };
      USER_KEYS.forEach(k => { const v = local.get(k, undefined); if (v !== undefined) all[old.email.toLowerCase()].data[k] = v; });
      saveAccounts(all);
    }
    local.del("cd_account");
    USER_KEYS.forEach(local.del);
  })();

  const store = {
    get(k, d) {
      if (!USER_KEYS.includes(k)) return local.get(k, d);
      const e = signedIn();
      if (!e) return session.get(k, d);
      const data = accounts()[e].data || {};
      return k in data ? data[k] : d;
    },
    set(k, v) {
      if (!USER_KEYS.includes(k)) return local.set(k, v);
      const e = signedIn();
      if (!e) return session.set(k, v);
      const all = accounts();
      all[e].data = all[e].data || {};
      all[e].data[k] = v;
      saveAccounts(all);
    }
  };

  // Doll ID accounts (no passwords: this is a front-end demo)
  const auth = {
    current: () => { const e = signedIn(); return e ? accounts()[e].profile : null; },
    login({ email, name, news }) {
      const key = email.trim().toLowerCase();
      const all = accounts();
      const isNew = !all[key];
      if (isNew) {
        const d = new Date(), pad2 = n => String(n).padStart(2, "0");
        all[key] = {
          profile: {
            name: name.slice(0, 18), email: email.trim(), news: !!news,
            avatar: ["heart", "skull", "star", "bow", "cat", "cherry"][Math.random() * 6 | 0],
            no: `CD-${Math.floor(100000 + Math.random() * 899999)}`,
            since: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`,
            sizeTop: null, sizeShoe: null, cats: []
          },
          data: {}
        };
      } else if (news) all[key].profile.news = true;
      // whatever you did as a guest this visit joins your account
      const data = all[key].data = all[key].data || {};
      const guest = k => session.get(k, undefined);
      const union = (a = [], b = []) => [...new Set([...a, ...b])];
      if (guest("cd_bag_items")) { data.cd_bag_items = [...(data.cd_bag_items || []), ...guest("cd_bag_items")]; data.cd_bag = data.cd_bag_items.length; }
      if (guest("cd_wish")) data.cd_wish = union(data.cd_wish, guest("cd_wish"));
      if (guest("cd_wish_meta")) data.cd_wish_meta = { ...(data.cd_wish_meta || {}), ...guest("cd_wish_meta") };
      if (guest("cd_friend")) data.cd_friend = true;
      if (guest("cd_secrets")) data.cd_secrets = union(data.cd_secrets, guest("cd_secrets"));
      if (guest("cd_comments")) data.cd_comments = [...(data.cd_comments || []), ...guest("cd_comments")].slice(-20);
      if (guest("cd_recent_search")) data.cd_recent_search = union(guest("cd_recent_search"), data.cd_recent_search).slice(0, 6);
      saveAccounts(all);
      USER_KEYS.forEach(session.del);
      session.set("cd_session", key);
      reloadUser();
      return { profile: all[key].profile, isNew };
    },
    update(profile) {
      const e = signedIn();
      if (!e) return;
      const all = accounts();
      all[e].profile = profile;
      saveAccounts(all);
    },
    logout() {
      session.del("cd_session");
      USER_KEYS.forEach(session.del);
      reloadUser();
    },
    remove() {
      const e = signedIn();
      if (e) { const all = accounts(); delete all[e]; saveAccounts(all); }
      auth.logout();
    }
  };

  const mouse = { x: -9999, y: -9999, down: false };
  window.addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  // touch: forget the finger once it lifts so the logo settles back
  const forget = e => { if (e.pointerType !== "mouse") { mouse.x = mouse.y = -9999; } };
  window.addEventListener("pointerup", forget, { passive: true });
  window.addEventListener("pointercancel", forget, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  /* =======================================================
     MEDIA PLACEHOLDERS — your photos go in /img
     ======================================================= */
  const initMedia = m => {
    if (m.dataset.init) return;
    m.dataset.init = "1";
    const img = $("img", m);
    const file = img ? img.getAttribute("src") : "";
    const ph = document.createElement("span");
    ph.className = "ph";
    ph.innerHTML = `<i class="ph__icon"></i><b>${m.dataset.ph || "PHOTO"}</b><span class="ph__file">${file}</span>`;
    m.prepend(ph);
    if (!m.closest(".hero") && !m.closest(".cats__preview")) m.classList.add("glitchable");
    if (!img) { m.classList.add("is-empty"); return; }
    const markEmpty = () => m.classList.add("is-empty");
    if (img.complete && img.naturalWidth === 0) markEmpty();
    img.addEventListener("error", markEmpty);
    img.addEventListener("load", () => m.classList.remove("is-empty"));
  };
  $$(".media").forEach(initMedia);

  /* =======================================================
     PIXEL BITMAPS
     ======================================================= */
  const BMP = {
    heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
    sparkle: ["..X..", "..X..", "XXXXX", "..X..", "..X.."],
    star: ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
    bow: [
      "XXX.......XXX",
      "X..XX...XX..X",
      "X....XXX....X",
      "X....XXX....X",
      "X..XX.X.XX..X",
      "XXX..X...X.XX",
      "....X.....X..",
      "...X.......X."
    ]
  };

  /* =======================================================
     DOT-MATRIX LOGO
     ======================================================= */
  const COLORS = { white: "#f6f3ef", pink: "#ff8fc2", red: "#ff2a2a", ice: "#a9cdf0" };

  class DotLogo {
    constructor(canvas, opts = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.o = Object.assign({
        layout: "stack", cols: 170, minStep: 3.2, maxStep: 8,
        interactive: true, glitch: true, glow: true, color: "white", accentChance: .015
      }, opts);
      this.started = false;
      this.running = false;
      this.visible = true;
      this.glitchUntil = 0;
      this.nextGlitch = performance.now() + 2500;
      this.bands = [];
      this.build();
      if (this.o.interactive) this.bind();
    }

    build() {
      const r = this.c.getBoundingClientRect();
      const w = Math.max(40, r.width), h = Math.max(20, r.height);
      this.w = w; this.h = h;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.c.width = Math.round(w * this.dpr);
      this.c.height = Math.round(h * this.dpr);

      const s = clamp(w / this.o.cols, this.o.minStep, this.o.maxStep);
      this.s = s;
      this.rad = s * .4;
      const cols = Math.floor(w / s), rows = Math.floor(h / s);

      // offscreen text raster
      const off = document.createElement("canvas");
      off.width = Math.ceil(w); off.height = Math.ceil(h);
      const o = off.getContext("2d");
      o.fillStyle = "#fff";
      o.textBaseline = "alphabetic";
      const font = fs => `italic 900 ${fs}px "Playfair Display", "Didot", "Bodoni 72", Georgia, serif`;
      const grid = new Map(); // key -> color
      const key = (x, y) => x + "," + y;
      const stamp = (bmp, gx, gy, col, k = 1) => {
        bmp.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch !== "X") return;
          for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
            const X = gx + x * k + a, Y = gy + y * k + b;
            if (X >= 0 && Y >= 0 && X < cols && Y < rows) grid.set(key(X, Y), col);
          }
        }));
      };

      let deco = [];
      if (this.o.layout === "stack") {
        let fs = h * .5;
        o.font = font(fs);
        const W1 = o.measureText("Cyber").width, W2 = o.measureText("Doll").width;
        const shift = W1 * .44;
        const heartRoom = fs * .42;
        const total = Math.max(W1, shift + W2 + heartRoom);
        const sc = Math.min(1, (w * .93) / total);
        fs *= sc;
        o.font = font(fs);
        const w1 = W1 * sc, w2 = W2 * sc, sh = shift * sc;
        const ox = (w - Math.max(w1, sh + w2 + heartRoom * sc)) / 2;
        const b1 = h * .5, b2 = h * .5 + fs * .86;
        o.fillText("Cyber", ox, b1);
        o.fillText("Doll", ox + sh, b2);

        const k = Math.max(1, Math.round(rows / 55));
        const g = v => Math.round(v / s);
        deco = [
          ["bow", g(ox + w1 * .5) - 6 * k, Math.max(0, g(b1 - fs * .92) - 9 * k), "pink", k],
          ["heart", g(ox + sh + w2) + 2, g(b2 - fs * .55), "pink", k + 1],
          ["sparkle", g(ox + sh + w2) + 2 + 9 * k, g(b2 - fs * .2), "ice", k],
          ["sparkle", g(ox) - 2 - 5 * k, g(b1 - fs * .55), "white", k],
          ["star", g(ox + w1) - 2, g(b1 - fs * .7), "white", 1],
          ["heart", g(ox + sh * .3), g(b2 - fs * .35), "red", k]
        ];
        // tiny dotted trail after the heart
        const tx = g(ox + sh + w2) + 2 + 8 * (k + 1), ty = g(b2 - fs * .4);
        for (let i = 0; i < 4; i++) grid.set(key(tx + i * 2 * k, ty + (i % 2) * k), "pink");
      } else {
        let fs = h * .82;
        o.font = font(fs);
        const W = o.measureText("CyberDoll").width;
        const room = fs * .5;
        const sc = Math.min(1, (w * .96) / (W + room));
        fs *= sc; o.font = font(fs);
        const ww = W * sc;
        const ox = (w - ww - room * sc) / 2;
        const base = h * .5 + fs * .3;
        o.fillText("CyberDoll", ox, base);
        const g = v => Math.round(v / s);
        deco = [["heart", g(ox + ww) + 1, g(base - fs * .62), "pink", 1]];
      }

      const data = o.getImageData(0, 0, off.width, off.height).data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = Math.floor(x * s + s / 2), py = Math.floor(y * s + s / 2);
          if (px >= off.width || py >= off.height) continue;
          if (data[(py * off.width + px) * 4 + 3] > 110) {
            grid.set(key(x, y), Math.random() < this.o.accentChance ? "red" : this.o.color);
          }
        }
      }
      deco.forEach(([name, gx, gy, col, k]) => stamp(BMP[name], gx, gy, col, k));

      // center the grid inside the canvas
      const offX = (w - cols * s) / 2 + s / 2, offY = (h - rows * s) / 2 + s / 2;
      const n = grid.size;
      this.n = n;
      this.hx = new Float32Array(n); this.hy = new Float32Array(n);
      this.x = new Float32Array(n); this.y = new Float32Array(n);
      this.vx = new Float32Array(n); this.vy = new Float32Array(n);
      this.col = new Uint8Array(n);
      this.row = new Uint16Array(n);
      const palette = Object.keys(COLORS);
      let i = 0;
      grid.forEach((col, k) => {
        const [gx, gy] = k.split(",").map(Number);
        this.hx[i] = offX + gx * s; this.hy[i] = offY + gy * s;
        this.row[i] = gy;
        this.col[i] = palette.indexOf(col);
        if (this.started) { this.x[i] = this.hx[i]; this.y[i] = this.hy[i]; }
        else {
          const a = Math.random() * Math.PI * 2, d = (Math.random() * .6 + .5) * Math.max(w, h);
          this.x[i] = w / 2 + Math.cos(a) * d; this.y[i] = h / 2 + Math.sin(a) * d * .6;
        }
        i++;
      });
      this.rows = rows;
      this.makeSprites(palette);
      if (this.started) this.draw();
    }

    makeSprites(palette) {
      const r = this.rad * this.dpr;
      const pad = this.o.glow ? r * 1.6 : 1;
      const size = Math.ceil((r + pad) * 2);
      this.spriteHalf = size / 2 / this.dpr;
      this.sprites = palette.map(name => {
        const sc = document.createElement("canvas");
        sc.width = sc.height = size;
        const g = sc.getContext("2d");
        if (this.o.glow) { g.shadowColor = COLORS[name]; g.shadowBlur = r * 1.4; }
        g.fillStyle = COLORS[name];
        g.beginPath(); g.arc(size / 2, size / 2, r, 0, Math.PI * 2); g.fill();
        return sc;
      });
    }

    bind() {
      // cache the canvas position instead of measuring it on every frame
      this.rect = this.c.getBoundingClientRect();
      const upd = () => { this.rect = this.c.getBoundingClientRect(); };
      window.addEventListener("scroll", upd, { passive: true });
      window.addEventListener("resize", upd);
      // wake up when the pointer comes close
      window.addEventListener("pointermove", () => {
        if (this.running || !this.started || !this.visible) return;
        const r = this.rect, R = this.s * 16;
        if (mouse.x > r.left - R && mouse.x < r.right + R && mouse.y > r.top - R && mouse.y < r.bottom + R) this.loop();
      }, { passive: true });
      this.c.addEventListener("pointerdown", e => this.burst(e));
      this.io = new IntersectionObserver(([en]) => {
        this.visible = en.isIntersecting;
        if (this.visible && this.started) this.loop();
      });
      this.io.observe(this.c);
    }

    start(instant = false) {
      if (this.started) return;
      this.started = true;
      if (instant || reduced) {
        this.x.set(this.hx); this.y.set(this.hy);
        this.draw();
        if (reduced || !this.o.interactive) return;
      }
      this.loop();
    }

    burst(e) {
      const r = this.rect || this.c.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      for (let i = 0; i < this.n; i++) {
        const dx = this.x[i] - mx, dy = this.y[i] - my;
        const d = Math.hypot(dx, dy) || 1;
        const f = Math.max(0, 1 - d / (this.w * .5)) * 38;
        this.vx[i] += dx / d * f * (Math.random() + .4);
        this.vy[i] += dy / d * f * (Math.random() + .4);
      }
      this.glitchUntil = performance.now() + 260;
      this.makeBands();
      this.loop();
    }

    makeBands() {
      this.bands = Array.from({ length: 3 + (Math.random() * 3 | 0) }, () => {
        const a = Math.random() * this.rows | 0;
        return { a, b: a + 1 + (Math.random() * this.rows * .12 | 0), dx: (Math.random() - .5) * this.s * 14 };
      });
    }

    loop() {
      if (this.running) return;
      this.running = true;
      clearTimeout(this.wakeT);
      let still = 0;
      const tick = t => {
        if (!this.visible || reduced) { this.running = false; return; }
        const energy = this.step(t);
        this.draw(t);
        // everything is home and calm: stop burning frames until the next glitch or a nearby pointer
        still = energy < .02 && t > this.glitchUntil ? still + 1 : 0;
        if (still > 20) {
          this.running = false;
          if (this.o.glitch) this.wakeT = setTimeout(() => this.loop(), Math.max(50, this.nextGlitch - performance.now()));
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    step(t) {
      const r = this.rect || (this.rect = this.c.getBoundingClientRect());
      const mx = mouse.x - r.left, my = mouse.y - r.top;
      let energy = 0;
      const R = this.s * 16, R2 = R * R, push = this.s * 1.3;
      const inside = mx > -R && my > -R && mx < this.w + R && my < this.h + R;
      for (let i = 0; i < this.n; i++) {
        let vx = this.vx[i] + (this.hx[i] - this.x[i]) * .055;
        let vy = this.vy[i] + (this.hy[i] - this.y[i]) * .055;
        if (inside) {
          const dx = this.x[i] - mx, dy = this.y[i] - my, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / R) * push;
            vx += dx / d * f; vy += dy / d * f;
          }
        }
        vx *= .8; vy *= .8;
        this.vx[i] = vx; this.vy[i] = vy;
        this.x[i] += vx; this.y[i] += vy;
        energy += Math.abs(vx) + Math.abs(vy);
      }
      if (this.o.glitch && t > this.nextGlitch) {
        this.glitchUntil = t + 120 + Math.random() * 160;
        this.nextGlitch = t + 2200 + Math.random() * 3800;
        this.makeBands();
      }
      return energy / Math.max(1, this.n);
    }

    draw(t = performance.now()) {
      const c = this.ctx, h = this.spriteHalf, sz = h * 2;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      const glitching = t < this.glitchUntil;
      const bands = this.bands;
      // chromatic ghost during glitch
      if (glitching) {
        c.globalAlpha = .55;
        for (let i = 0; i < this.n; i += 2) {
          c.drawImage(this.sprites[2], this.x[i] - h - this.s * 1.2, this.y[i] - h, sz, sz);
          c.drawImage(this.sprites[3], this.x[i] - h + this.s * 1.2, this.y[i] - h, sz, sz);
        }
        c.globalAlpha = 1;
      }
      for (let i = 0; i < this.n; i++) {
        let ox = 0;
        if (glitching) {
          const rw = this.row[i];
          for (let b = 0; b < bands.length; b++) if (rw >= bands[b].a && rw <= bands[b].b) { ox = bands[b].dx; break; }
        }
        c.drawImage(this.sprites[this.col[i]], this.x[i] - h + ox, this.y[i] - h, sz, sz);
      }
    }
  }

  const logos = [];
  const makeLogo = (id, opts) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const l = new DotLogo(el, opts);
    logos.push(l);
    return l;
  };

  let heroLogo, footLogo, navLogo;
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([
        Promise.all([
          document.fonts.load('italic 900 100px "Playfair Display"'),
          document.fonts.load('400 20px "Silkscreen"'),
          document.fonts.load('400 20px "Anton"')
        ]),
        new Promise(r => setTimeout(r, 2500))
      ])
    : Promise.resolve();

  const logosReady = fontsReady.then(() => {
    heroLogo = makeLogo("heroLogo", { cols: 175 });
    footLogo = makeLogo("footLogo", { cols: 200, glitch: true });
    navLogo = makeLogo("navLogo", { layout: "line", cols: 110, minStep: 1.6, maxStep: 2.2, interactive: false, glow: false, glitch: false, accentChance: 0 });
    navLogo && navLogo.start(true);
    if (footLogo) {
      const io = new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { footLogo.start(); io.disconnect(); }
      }, { threshold: .3 });
      io.observe(footLogo.c);
    }
  });

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => logos.forEach(l => { l.build(); if (!l.o.interactive) l.draw(); }), 200);
  });

  /* =======================================================
     LOADER
     ======================================================= */
  const loader = $("#loader");
  const reveal = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    logosReady.then(() => heroLogo && heroLogo.start());
  };

  const runLoader = () => {
    if (!loader) return reveal();
    if (reduced) { loader.remove(); return reveal(); }
    const term = $("#loaderTerm"), bar = $("#loaderBar"), pct = $("#loaderPct");
    const lines = [
      "> booting <b>CYBERDOLL.EXE</b> ...",
      "> loading lace.dll ............ <span class='ok'>OK</span>",
      "> loading chrome_hearts.sys ... <span class='ok'>OK</span>",
      "> decrypting drop #004 ........ <span class='ok'>OK</span>",
      "> installing attitude ......... <span class='ok'>100%</span>",
      "> welcome, doll ♡"
    ];
    let done = false, li = 0;
    const lineTimer = setInterval(() => {
      if (li >= lines.length) return clearInterval(lineTimer);
      const p = document.createElement("p");
      p.innerHTML = lines[li++];
      term.appendChild(p);
    }, 230);
    const t0 = performance.now(), dur = 1700;
    const prog = now => {
      if (done) return;
      const k = clamp((now - t0) / dur, 0, 1);
      const eased = k < .7 ? k * .9 : .63 + (k - .7) / .3 * .37;
      bar.style.width = (eased * 100).toFixed(1) + "%";
      pct.textContent = String(Math.round(eased * 100)).padStart(3, "0") + "%";
      if (k < 1) requestAnimationFrame(prog); else finish();
    };
    requestAnimationFrame(prog);

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(lineTimer);
      logosReady.then(dissolve);
    };
    loader.addEventListener("click", () => { bar.style.width = "100%"; finish(); });

    const dissolve = () => {
      const cv = $("#loaderPix"), ctx = cv.getContext("2d");
      const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.scale(dpr, dpr);
      const cell = Math.max(18, Math.round(W / 48));
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      const cells = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        // bias: clear from center outward with noise
        const d = Math.hypot(x - cols / 2, (y - rows / 2) * 1.4) / Math.hypot(cols / 2, rows / 2 * 1.4);
        cells.push({ x, y, o: d + Math.random() * .55 });
      }
      cells.sort((a, b) => a.o - b.o);
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(0, 0, W, H);
      loader.classList.add("is-dissolving");
      reveal();
      const total = cells.length, d0 = performance.now(), D = 900;
      let cleared = 0;
      const pinkCells = [];
      const frame = now => {
        const k = clamp((now - d0) / D, 0, 1);
        const target = Math.floor(total * (k * k * (3 - 2 * k)));
        // flash some cells pink before they vanish
        ctx.fillStyle = "#0a0a0b";
        pinkCells.forEach(c => ctx.fillRect(c.x * cell, c.y * cell, cell, cell));
        pinkCells.length = 0;
        while (cleared < target) {
          const c = cells[cleared++];
          ctx.clearRect(c.x * cell, c.y * cell, cell, cell);
        }
        for (let i = 0; i < 14 && cleared + i < total; i++) {
          const c = cells[cleared + i + (Math.random() * 30 | 0)] || cells[cleared + i];
          ctx.fillStyle = Math.random() < .5 ? "#ff5ea8" : "#ff2a2a";
          ctx.fillRect(c.x * cell, c.y * cell, cell, cell);
          pinkCells.push(c);
        }
        if (k < 1) requestAnimationFrame(frame);
        else loader.remove();
      };
      requestAnimationFrame(frame);
    };
  };
  runLoader();

  /* =======================================================
     CURSOR + SPARKLE TRAIL
     ======================================================= */
  if (finePointer && !reduced) {
    document.documentElement.classList.add("has-cursor");
    document.body.classList.add("has-cursor");
    const cur = $("#cursor"), label = $("#cursorLabel");
    const trail = $("#trail"), tc = trail.getContext("2d");
    let dpr = Math.min(devicePixelRatio || 1, 2);
    const sizeTrail = () => { trail.width = innerWidth * dpr; trail.height = innerHeight * dpr; tc.setTransform(dpr, 0, 0, dpr, 0, 0); };
    sizeTrail();
    window.addEventListener("resize", sizeTrail);
    const parts = [];
    let lx = 0, ly = 0;
    const cols = ["#ff5ea8", "#ffa9cf", "#f6f3ef", "#a9cdf0", "#ff2a2a"];
    window.addEventListener("pointermove", e => {
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d > 14) {
        lx = e.clientX; ly = e.clientY;
        parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * 1.4, vy: Math.random() * 1.2 + .3, life: 1, s: Math.random() < .35 ? 2 : 1, c: cols[Math.random() * cols.length | 0], plus: Math.random() < .5 });
        if (!trailOn) { trailOn = true; requestAnimationFrame(drawTrail); }
      }
    }, { passive: true });
    window.addEventListener("pointerdown", () => cur.classList.add("is-down"));
    window.addEventListener("pointerup", () => cur.classList.remove("is-down"));
    let trailOn = false;
    const drawTrail = () => {
      tc.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life -= .022;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        tc.globalAlpha = p.life;
        tc.fillStyle = p.c;
        const u = 2 * p.s, x = Math.round(p.x), y = Math.round(p.y);
        if (p.plus) { tc.fillRect(x - u, y, u * 3, u); tc.fillRect(x, y - u, u, u * 3); }
        else tc.fillRect(x, y, u, u);
      }
      tc.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(drawTrail);
      else trailOn = false;
    };

    const hoverSel = "a, button, .win__bar, .dotlogo, input";
    document.addEventListener("pointerover", e => {
      const t = e.target.closest(hoverSel);
      cur.classList.toggle("is-hover", !!t);
      let txt = "";
      if (t) {
        if (t.closest(".card__link, .lb-item")) txt = "VIEW ♡";
        else if (t.closest(".win__bar")) txt = "DRAG";
        else if (t.classList.contains("dotlogo")) txt = "CLICK ME";
        else if (t.closest(".cats__list")) txt = "SHOP";
      }
      label.textContent = txt;
      cur.classList.toggle("has-label", !!txt);
    });
  }

  /* =======================================================
     HEADER: solid on scroll, hide on scroll down
     ======================================================= */
  const header = $("#header");
  let lastY = scrollY;
  const onScrollHeader = () => {
    const y = scrollY;
    header.classList.toggle("is-solid", y > 40);
    if (!document.body.classList.contains("menu-open")) {
      header.classList.toggle("is-hidden", y > lastY && y > innerHeight * .8);
    }
    lastY = y;
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  // mobile menu
  const burger = $("#burger"), menu = $("#menu");
  const setMenu = open => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", !open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$("a", menu).forEach(a => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* =======================================================
     TEXT SCRAMBLE
     ======================================================= */
  const GLYPHS = "!<>-_\\/[]{}=+*^?#01♡✦▓░";
  const scramble = (el, dur = 500) => {
    if (reduced) return;
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    if (el._scr) cancelAnimationFrame(el._scr);
    const t0 = performance.now();
    const tick = now => {
      const k = clamp((now - t0) / dur, 0, 1);
      const reveal = Math.floor(k * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < reveal || ch === " " ? ch : GLYPHS[Math.random() * GLYPHS.length | 0];
      }
      el.textContent = out;
      if (k < 1) el._scr = requestAnimationFrame(tick);
    };
    el._scr = requestAnimationFrame(tick);
  };
  $$("[data-scramble]").forEach(el => el.addEventListener("pointerenter", () => scramble(el)));
  $$("[data-scramble-loop]").forEach(el => setInterval(() => scramble(el, 700), 4200));

  /* =======================================================
     SPLIT HEADINGS + REVEAL
     ======================================================= */
  // letters animate one by one, but words stay together so lines only break between words
  const splitHTML = txt => {
    let i = 0;
    return `<span class="split-line" aria-hidden="true">${txt.split(" ").map(word =>
      `<span class="split-word">${[...word].map(ch => `<span class="split-char" style="--i:${i++}">${ch}</span>`).join("")}</span>`
    ).join(" ")}</span>`;
  };
  $$("[data-split]").forEach(el => {
    const txt = el.textContent.trim();
    el.setAttribute("aria-label", txt);
    el.innerHTML = splitHTML(txt);
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: .15, rootMargin: "0px 0px -5% 0px" });
  $$("[data-reveal], [data-split]").forEach((el, i) => {
    // stagger siblings in grids
    const parent = el.parentElement;
    if (parent && (parent.classList.contains("grid") || parent.classList.contains("ig__grid"))) {
      el.style.transitionDelay = ([...parent.children].indexOf(el) % 4) * 90 + "ms";
    }
    io.observe(el);
  });
  // section-level triggers
  const secIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); secIO.unobserve(en.target); } });
  }, { threshold: .25 });
  $$(".anatomy, .desk").forEach(el => secIO.observe(el));

  /* =======================================================
     MAGNETIC BUTTONS
     ======================================================= */
  if (finePointer && !reduced) {
    $$(".mag").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        b.style.transform = `translate(${x * .28}px, ${y * .4}px)`;
      });
      b.addEventListener("pointerleave", () => {
        b.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1), color .35s, border-color .35s";
        b.style.transform = "";
        setTimeout(() => (b.style.transition = ""), 600);
      });
    });
  }

  /* =======================================================
     MARQUEES (react to scroll speed & direction)
     ======================================================= */
  const marquees = $$(".marquee").map(m => {
    const track = $(".marquee__track", m);
    // duplicate content until it's wide enough to loop
    const base = track.innerHTML;
    let guard = 0;
    while (track.scrollWidth < m.offsetWidth * 2.2 && guard++ < 12) track.innerHTML += base;
    track.innerHTML += track.innerHTML;
    return { m, track, x: 0, speed: parseFloat(m.dataset.speed || 1), half: track.scrollWidth / 2, on: true };
  });
  const mqIO = new IntersectionObserver(es => es.forEach(en => {
    const q = marquees.find(x => x.m === en.target);
    if (q) q.on = en.isIntersecting;
  }));
  marquees.forEach(q => mqIO.observe(q.m));
  window.addEventListener("resize", () => marquees.forEach(q => (q.half = q.track.scrollWidth / 2)));

  let scrollVel = 0, prevScroll = scrollY;
  const tickMarquee = () => {
    const y = scrollY;
    scrollVel = lerp(scrollVel, y - prevScroll, .12);
    prevScroll = y;
    const boost = clamp(Math.abs(scrollVel) * .35, 0, 14);
    const dir = scrollVel < -0.5 ? -1 : 1;
    marquees.forEach(q => {
      if (!q.on) return;
      q.x -= (q.speed + Math.sign(q.speed) * boost) * (reduced ? .3 : 1) * dir;
      if (q.x <= -q.half) q.x += q.half;
      if (q.x > 0) q.x -= q.half;
      q.track.style.transform = `translate3d(${q.x}px,0,0)`;
    });
    requestAnimationFrame(tickMarquee);
  };
  requestAnimationFrame(tickMarquee);

  /* =======================================================
     CARDS: 3D tilt, wishlist, add to bag
     ======================================================= */
  // the bag remembers what's in it (id, name, size) — the count is just its length
  let bagItems = store.get("cd_bag_items", []);
  let bag = bagItems.length;
  let wish = store.get("cd_wish", []);
  const bagEl = $("#bagCount"), wishEl = $("#wishCount"), bagLink = $(".nav__bag");
  bagEl.textContent = bag;
  wishEl.textContent = wish.length;
  // after logging in or out, re-read the bag + wishlist and refresh every heart on the page
  function reloadUser() {
    bagItems = store.get("cd_bag_items", []);
    bag = bagItems.length;
    wish = store.get("cd_wish", []);
    bagEl.textContent = bag;
    wishEl.textContent = wish.length;
    $$(".card").forEach(c => {
      const l = $(".card__link", c), h = $(".card__heart", c);
      if (l && h) h.setAttribute("aria-pressed", wish.includes(l.getAttribute("href")));
    });
    document.dispatchEvent(new CustomEvent("cd:user"));
  }

  const toast = $("#toast");
  let toastT;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  const pushBag = (name, meta = {}) => {
    bagItems.push({ id: meta.id || null, name, size: meta.size || null, at: Date.now(), ...(meta.gift ? { gift: meta.gift } : {}) });
    bag++;
    store.set("cd_bag_items", bagItems);
    store.set("cd_bag", bag);
    bagEl.textContent = bag;
    bagLink.classList.remove("bump"); void bagLink.offsetWidth; bagLink.classList.add("bump");
    showToast(`${name.toUpperCase()} → BAG ♡`);
  };

  const bindCard = card => {
    if (card.dataset.bound) return;
    card.dataset.bound = "1";
    const link = $(".card__link", card);
    const id = link.getAttribute("href");
    const heart = $(".card__heart", card);
    if (wish.includes(id)) heart.setAttribute("aria-pressed", "true");

    heart.addEventListener("click", () => {
      const on = heart.getAttribute("aria-pressed") !== "true";
      heart.setAttribute("aria-pressed", on);
      wish = on ? [...new Set([...wish, id])] : wish.filter(w => w !== id);
      store.set("cd_wish", wish);
      wishEl.textContent = wish.length;
      showToast(on ? "SAVED TO WISHLIST ♡" : "REMOVED FROM WISHLIST");
    });

    const add = $(".card__add", card);
    add.addEventListener("click", () => {
      const pid = new URLSearchParams(id.split("?")[1] || "").get("id");
      pushBag(add.dataset.name, { id: pid });
      add.classList.add("added");
      add.textContent = "✓ ADDED 2 BAG";
      setTimeout(() => { add.classList.remove("added"); add.textContent = "+ ADD TO BAG"; }, 1600);
    });

    if (finePointer && !reduced) {
      const media = $(".media", link);
      link.style.perspective = "900px";
      link.addEventListener("pointermove", e => {
        const r = link.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        media.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
      });
      link.addEventListener("pointerleave", () => {
        media.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1)";
        media.style.transform = "";
        setTimeout(() => (media.style.transition = ""), 700);
      });
    }
  };
  $$(".card").forEach(bindCard);

  /* =======================================================
     ANATOMY: list <-> frames linking
     ======================================================= */
  const stage = $("#anatomyStage");
  if (stage) {
  const aList = $$("#anatomyList li"), frames = $$(".anatomy .frame");
  const colorLayer = $("#anatomyColor"), pop = $("#apop");
  const popImg = $(".apop__img img", pop);
  const pct = (el, v) => parseFloat(el.style.getPropertyValue(v)) || 0;
  let current = null, hideT;

  const placePop = frame => {
    const W = stage.clientWidth, H = stage.clientHeight;
    const fx = pct(frame, "--x") / 100 * W, fy = pct(frame, "--y") / 100 * H;
    const fw = pct(frame, "--w") / 100 * W, fh = pct(frame, "--h") / 100 * H;
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 18;
    const right = W - (fx + fw), left = fx;
    let x = right >= left ? fx + fw + gap : fx - pw - gap;
    x = clamp(x, -Math.min(60, W * .08), W - pw + Math.min(60, W * .08));
    const y = clamp(fy + fh / 2 - ph / 2, 0, H - ph);
    pop.style.left = x + "px";
    pop.style.top = y + "px";
  };

  const setActive = n => {
    clearTimeout(hideT);
    if (n === current) return;
    current = n;
    aList.forEach(li => li.classList.toggle("is-active", li.dataset.frame === n));
    frames.forEach(f => f.classList.toggle("is-active", f.dataset.frame === n));
    stage.classList.toggle("has-active", n !== null);
    const frame = frames.find(f => f.dataset.frame === n);
    const li = aList.find(l => l.dataset.frame === n);
    if (!frame || !li) {
      colorLayer.style.clipPath = "";
      pop.classList.remove("show");
      pop.setAttribute("aria-hidden", "true");
      return;
    }
    // colour spotlight on the hovered piece
    const x = pct(frame, "--x"), y = pct(frame, "--y"), w = pct(frame, "--w"), h = pct(frame, "--h");
    colorLayer.style.clipPath = `inset(${y}% ${100 - x - w}% ${100 - y - h}% ${x}%)`;
    // popup window with the product shot
    $(".apop__code", pop).textContent = `${li.dataset.code}_${li.dataset.tag.toLowerCase().replace(/\s+/g, "_")}.jpg`;
    $(".apop__name", pop).textContent = li.dataset.name;
    $(".apop__price", pop).textContent = li.dataset.price;
    popImg.src = li.dataset.img;
    popImg.alt = li.dataset.name;
    pop.href = frame.getAttribute("href");
    pop.classList.remove("show");
    void pop.offsetWidth; // restart the pop-in animation
    placePop(frame);
    pop.classList.add("show");
    pop.setAttribute("aria-hidden", "false");
  };
  const scheduleHide = () => { clearTimeout(hideT); hideT = setTimeout(() => setActive(null), 160); };

  [...aList, ...frames].forEach(el => {
    el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") setActive(el.dataset.frame); });
    el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") scheduleHide(); });
    el.addEventListener("focusin", () => setActive(el.dataset.frame));
    el.addEventListener("focusout", scheduleHide);
  });
  pop.addEventListener("pointerenter", () => clearTimeout(hideT));
  pop.addEventListener("pointerleave", scheduleHide);
  // touch: first tap on a frame shows the piece, second tap opens it
  frames.forEach(f => f.addEventListener("click", e => {
    if (finePointer) return;
    if (current !== f.dataset.frame) { e.preventDefault(); setActive(f.dataset.frame); }
  }));
  document.addEventListener("click", e => {
    if (!finePointer && current !== null && !e.target.closest("#anatomyStage, #anatomyList")) setActive(null);
  });
  window.addEventListener("resize", () => {
    const f = frames.find(fr => fr.dataset.frame === current);
    if (f) placePop(f);
  });
  }

  /* =======================================================
     CATEGORIES: floating preview following cursor
     ======================================================= */
  const prev = $("#catsPreview"), prevMedia = prev ? $$(".media", prev) : [];
  if (prev && finePointer) {
    let px = 0, py = 0, tx = 0, ty = 0, on = false, raf = null;
    const follow = () => {
      const vx = tx - px;
      px = lerp(px, tx, .16); py = lerp(py, ty, .16);
      prev.style.transform = `translate(${px}px, ${py}px) translate(-50%,-50%) rotate(${clamp(vx * .15, -14, 14)}deg) scale(${on ? 1 : .6})`;
      raf = (on || Math.abs(vx) > .5) ? requestAnimationFrame(follow) : null;
    };
    $$("#catsList a").forEach(a => {
      a.addEventListener("pointerenter", e => {
        if (!on) { px = e.clientX; py = e.clientY; }
        on = true;
        prev.classList.add("is-on");
        prevMedia.forEach((m, i) => m.classList.toggle("is-active", String(i) === a.dataset.cat));
        if (!raf) raf = requestAnimationFrame(follow);
      });
      a.addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; });
    });
    $("#catsList").addEventListener("pointerleave", () => { on = false; prev.classList.remove("is-on"); });
  }

  /* =======================================================
     SCROLL-DRIVEN: lookbook, manifesto, parallax
     ======================================================= */
  const lb = $("#lookbook"), lbTrack = $("#lbTrack"), lbBar = $("#lbBar"), lbIdx = $("#lbIndex");
  const lbItems = lbTrack ? $$(".lb-item", lbTrack) : [];
  const lbScript = $(".lookbook__script");

  const manText = $("#manifestoText");
  // split manifesto into words
  const splitWords = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) return;
          const s = document.createElement("span");
          s.className = "w"; s.textContent = part;
          frag.appendChild(s);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) {
        if (ch.tagName === "EM") { ch.classList.add("w"); }
        else splitWords(ch);
      }
    });
  };
  if (manText) splitWords(manText);
  const words = manText ? $$(".w", manText) : [];
  const manifesto = $("#manifesto");
  const stickers = $$(".sticker");

  const heroMedia = $(".hero__media img"), heroLogoWrap = $(".hero__logo");

  const onScroll = () => {
    const vh = innerHeight;

    // lookbook horizontal
    if (lb) {
      const r = lb.getBoundingClientRect();
      const total = lb.offsetHeight - vh;
      const p = clamp(-r.top / total, 0, 1);
      const dist = lbTrack.scrollWidth - innerWidth;
      lbTrack.style.transform = `translate3d(${-p * dist}px,0,0)`;
      lbBar.style.width = (p * 100) + "%";
      if (lbScript) lbScript.style.transform = `rotate(-6deg) translateX(${(0.5 - p) * 30}vw)`;
      // current look index
      let idx = 1, best = Infinity;
      // the track just moved: work out the item positions from the transform instead of re-measuring each one
      const shift = -p * dist;
      lbItems.forEach((it, i) => {
        const cx = it._cx + shift;
        const d = Math.abs(cx - innerWidth / 2);
        if (d < best) { best = d; idx = i + 1; }
        // subtle parallax inside frame
        if (it._img && !reduced) it._img.style.transform = `scale(1.15) translateX(${(cx - innerWidth / 2) / innerWidth * -30}px)`;
      });
      lbIdx.textContent = String(idx).padStart(2, "0");
    }

    // manifesto word reveal
    if (manifesto) {
      const r = manifesto.getBoundingClientRect();
      const p = clamp((-r.top + vh * .35) / (manifesto.offsetHeight - vh * .6), 0, 1);
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
      if (!reduced) stickers.forEach((s, i) => {
        const dir = i % 2 ? -1 : 1;
        s.style.transform = `translateY(${(p - .5) * 260 * dir}px) rotate(${p * 90 * dir}deg)`;
      });
    }

    // hero parallax
    if (!reduced && scrollY < vh * 1.2) {
      if (heroMedia) heroMedia.style.transform = `scale(1.08) translateY(${scrollY * .25}px)`;
      if (heroLogoWrap) {
        heroLogoWrap.style.transform = `translateY(${scrollY * .35}px) scale(${1 - scrollY / vh * .15})`;
        heroLogoWrap.style.opacity = 1 - scrollY / vh * .9;
      }
    }
  };
  // lookbook items: measure their resting centre once (and on resize)
  const measureLb = () => {
    if (!lbTrack) return;
    const prev = lbTrack.style.transform;
    lbTrack.style.transform = "none";
    lbItems.forEach(it => {
      const r = it.getBoundingClientRect();
      it._cx = r.left + r.width / 2;
      it._img = $("img", it);
    });
    lbTrack.style.transform = prev;
  };
  measureLb();
  let scrollQueued = false;
  const onScrollRaf = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  };
  window.addEventListener("scroll", onScrollRaf, { passive: true });
  window.addEventListener("resize", () => { measureLb(); onScrollRaf(); });
  onScroll();

  /* =======================================================
     DESKTOP WINDOWS: drag, error spawner, clock
     ======================================================= */
  const desk = $("#desk");
  if (desk) {
  let zTop = 10;
  const canDrag = () => innerWidth > 760;

  const makeDraggable = win => {
    const bar = $(".win__bar", win);
    win.addEventListener("pointerdown", () => { win.style.zIndex = ++zTop; });
    bar.addEventListener("pointerdown", e => {
      if (!canDrag() || e.target.closest(".win__btns")) return;
      e.preventDefault();
      const dr = desk.getBoundingClientRect(), wr = win.getBoundingClientRect();
      const offX = e.clientX - wr.left, offY = e.clientY - wr.top;
      win.classList.add("is-dragging");
      bar.setPointerCapture(e.pointerId);
      const move = ev => {
        const x = clamp(ev.clientX - dr.left - offX, -wr.width * .6, dr.width - wr.width * .4);
        const y = clamp(ev.clientY - dr.top - offY, 0, dr.height - 60);
        win.style.left = x + "px"; win.style.top = y + "px";
      };
      const up = () => {
        win.classList.remove("is-dragging");
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
    // close / minimize buttons
    $$(".win__btns i", win).forEach(b => b.addEventListener("click", () => {
      if (b.textContent === "×" && win.classList.contains("win--spawned")) closeWin(win);
      else { win.animate([{ transform: "scale(1)" }, { transform: "scale(.96) rotate(-1deg)" }, { transform: "scale(1)" }], { duration: 250 }); }
    }));
  };
  const closeWin = w => { w.classList.add("is-closing"); setTimeout(() => w.remove(), 260); };
  $$(".win", desk).forEach(makeDraggable);

  const errMsgs = [
    "Warning: you are too cute to continue.",
    "Error 404: bad vibes not found.",
    "Your outfit is causing a system overload.",
    "Too much serve detected. Proceed?",
    "Critical: heart.exe has stopped responding ♡",
    "Are you sure? You look really good today.",
    "Low battery. High standards.",
    "fine. you can stay ♡"
  ];
  let errCount = 0;
  const errBase = $("#errWin");
  const onErrOk = e => {
    const btn = e.target.closest("[data-err-ok]");
    if (!btn) return;
    const src = btn.closest(".win");
    if (errCount >= errMsgs.length - 1) {
      $$(".win--spawned", desk).forEach((w, i) => setTimeout(() => closeWin(w), i * 70));
      errCount = 0;
      showToast("SYSTEM RESTORED ♡");
      return;
    }
    errCount++;
    const w = errBase.cloneNode(true);
    w.removeAttribute("id");
    w.classList.add("win--spawned");
    $("p", w).textContent = errMsgs[errCount];
    const sr = src.getBoundingClientRect(), dr = desk.getBoundingClientRect();
    if (canDrag()) {
      w.style.left = clamp(sr.left - dr.left + 26, 0, dr.width - 300) + "px";
      w.style.top = clamp(sr.top - dr.top + 26, 0, dr.height - 180) + "px";
    }
    w.style.zIndex = ++zTop;
    src.after(w);
    makeDraggable(w);
  };
  desk.addEventListener("click", onErrOk);

  // newsletter (front-end only — connect to your email provider)
  const form = $("#clubForm"), msg = $("#clubMsg"), email = $("#clubEmail");
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!email.value || !email.checkValidity()) {
      msg.textContent = "> invalid email, try again doll";
      form.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 });
      return;
    }
    msg.textContent = "> you're in ♡ check your inbox";
    email.value = "";
    showToast("WELCOME TO THE DOLL CLUB ♡");
  });
  }

  /* =======================================================
     HOME: real category counts from the catalogue
     ======================================================= */
  if (window.CD_PRODUCTS) {
    $$("#catsList a[data-cat-id]").forEach(a => {
      const n = window.CD_PRODUCTS.filter(p => p.cat === a.dataset.catId).length;
      const em = $("em", a);
      if (em) em.textContent = `(${String(n).padStart(2, "0")})`;
    });
  }

  /* =======================================================
     NOW_PLAYING.MP3 — cyberdoll radio: y2k alt, synthesised live
     (the instruments + songs live in radio.js; this is the player)
     ======================================================= */
  const plPlay = $("#plPlay");
  if (plPlay) {
    const player = $(".player"), timeEl = $("#plTime");
    let ctx = null, eng = null, TRACKS = [{ title: "press play ♡" }];
    let playing = false, ti = 0, step = 0, nextTime = 0, timer = null, elapsed = 0, lastTick = 0, clockT = null;

    const initAudio = () => {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !window.CDRadio) { showToast("YOUR BROWSER CAN'T PLAY THIS ♡"); return; }
      ctx = new AC();
      eng = window.CDRadio(ctx);
      TRACKS = eng.tracks;
      eng.volume(vol);
    };
    // volume: remembered on this device
    const volEl = $("#plVol");
    let vol = store.get("cd_radio_vol", .7);
    if (volEl) {
      volEl.value = Math.round(vol * 100);
      const paintVol = () => volEl.style.setProperty("--v", `${volEl.value}%`);
      paintVol();
      volEl.addEventListener("input", () => {
        vol = volEl.value / 100;
        paintVol();
        store.set("cd_radio_vol", vol);
        if (eng) eng.volume(vol);
      });
    }
    const schedule = () => {
      const tr = TRACKS[ti], T = 60 / tr.bpm / 4, loop = tr.bars * 16;
      while (nextTime < ctx.currentTime + .15) {
        // swing pushes every off-beat 16th a little late
        eng.tick(ti, step % loop, nextTime + (step % 2 ? tr.swing * T : 0));
        nextTime += T;
        step++;
      }
    };
    const setSong = () => {
      $$(".player__song").forEach(sp => (sp.textContent = `♫ cyberdoll radio — track 0${ti + 1} — ${TRACKS[ti].title} ♡`));
      marquees.forEach(q => (q.half = q.track.scrollWidth / 2));
    };
    const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
    const play = () => {
      initAudio();
      if (!ctx) return;
      ctx.resume();
      playing = true;
      nextTime = ctx.currentTime + .05;
      timer = setInterval(schedule, 25);
      lastTick = performance.now();
      clockT = setInterval(() => {
        const now = performance.now();
        elapsed += (now - lastTick) / 1000; lastTick = now;
        timeEl.textContent = fmt(elapsed);
      }, 250);
      plPlay.textContent = "❚❚";
      plPlay.setAttribute("aria-label", "Pause");
      plPlay.classList.add("is-on");
      player.classList.add("is-playing");
      setSong();
    };
    const pause = () => {
      playing = false;
      clearInterval(timer); clearInterval(clockT);
      if (ctx) ctx.suspend();
      plPlay.textContent = "▶";
      plPlay.setAttribute("aria-label", "Play");
      plPlay.classList.remove("is-on");
      player.classList.remove("is-playing");
    };
    const skip = dir => {
      initAudio();
      if (!ctx) return;
      if (!playing) ctx.suspend();
      ti = (ti + dir + TRACKS.length) % TRACKS.length;
      step = 0; elapsed = 0;
      timeEl.textContent = "00:00";
      setSong();
      if (playing && ctx) { eng.stat(ctx.currentTime); nextTime = ctx.currentTime + .4; }
    };
    plPlay.addEventListener("click", () => (playing ? pause() : play()));
    $("#plPrev").addEventListener("click", () => skip(-1));
    $("#plNext").addEventListener("click", () => skip(1));
    document.addEventListener("visibilitychange", () => { if (document.hidden && playing) pause(); });
  }

  // clocks
  const clocks = $$("[data-clock]"), clocksSec = $$("[data-clock-sec]");
  const pad = n => String(n).padStart(2, "0");
  const tickClock = () => {
    const d = new Date();
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    clocks.forEach(c => (c.textContent = hm));
    clocksSec.forEach(c => (c.textContent = `${hm}:${pad(d.getSeconds())}`));
  };
  tickClock();
  setInterval(tickClock, 1000);

  // shared helpers for the other pages (shop.js, product.js …)
  /* ---------- profile pictures ----------
     a Doll ID shows either an uploaded photo (profile.photo, a small jpeg data URL)
     or one of the pixel avatars — same picture on account, about wall + friend space */
  const AVATARS = {
    heart: { c: "#ff5ea8", m: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X...", "......."] },
    skull: { c: "#f6f3ef", m: [".XXXXX.", "XXXXXXX", "X..X..X", "XXXXXXX", ".XX.XX.", ".X.X.X.", "......."] },
    star:  { c: "#ffd24a", m: ["...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"] },
    bow:   { c: "#ff2a2a", m: ["XX...XX", "XXX.XXX", "XXXXXXX", "XXX.XXX", "XX.X.XX", "..X.X..", ".X...X."] },
    cat:   { c: "#9fc4e8", m: ["X.....X", "XX...XX", "XXXXXXX", "X.XXX.X", "XXXXXXX", ".XX.XX.", "..XXX.."] },
    cherry:{ c: "#ff5ea8", m: ["....XX.", "...X...", "..X.X..", ".X...X.", "XX...XX", "XX...XX", "......."] },
    ghost: { c: "#eceae6", m: [".XXXXX.", "XXXXXXX", "X.XX.XX", "XXXXXXX", "XXXXXXX", "XXXXXXX", "X.X.X.X"] },
    alien: { c: "#7dff6a", m: ["X.....X", ".XXXXX.", "XXXXXXX", "X..X..X", "XXXXXXX", ".X...X.", "X.....X"] }
  };
  const avatarSVG = key => {
    const a = AVATARS[key] || AVATARS.heart;
    let rects = "";
    a.m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "X") rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    return `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" fill="${a.c}" aria-hidden="true">${rects}</svg>`;
  };
  const avatarHTML = profile => profile && profile.photo && /^data:image\/(jpeg|png|webp);base64,/.test(profile.photo)
    ? `<img class="cd-photo" src="${profile.photo}" alt="" />`
    : avatarSVG(profile ? profile.avatar : "heart");

  window.CD = {
    avatars: Object.keys(AVATARS), avatarSVG, avatarHTML,
    bindCard, initMedia, showToast, scramble, store,
    reveal: el => io.observe(el),
    split: el => {
      const txt = el.textContent.trim();
      el.setAttribute("aria-label", txt);
      el.innerHTML = splitHTML(txt);
      io.observe(el);
    },
    addToBag: (name, meta) => pushBag(name, meta),
    getBag: () => bagItems.slice(),
    removeFromBag(i) {
      bagItems.splice(i, 1);
      bag = bagItems.length;
      store.set("cd_bag_items", bagItems);
      store.set("cd_bag", bag);
      bagEl.textContent = bag;
    },
    setBag(items) {
      bagItems = items.slice();
      bag = bagItems.length;
      store.set("cd_bag_items", bagItems);
      store.set("cd_bag", bag);
      bagEl.textContent = bag;
    },
    auth,
    getWish: () => wish.slice(),
    isWished: id => wish.includes(id),
    toggleWish(id) {
      const on = !wish.includes(id);
      wish = on ? [...wish, id] : wish.filter(w => w !== id);
      store.set("cd_wish", wish);
      wishEl.textContent = wish.length;
      showToast(on ? "SAVED TO WISHLIST ♡" : "REMOVED FROM WISHLIST");
      return on;
    },
    finePointer, reduced
  };

  // smooth anchor for back-to-top
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const t = $(a.getAttribute("href"));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }));
})();
