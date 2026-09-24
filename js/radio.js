/* =========================================================
   CYBERDOLL RADIO — y2k alt, synthesised live with Web Audio
   (no audio files: guitars, drums, keys and pads are all built
   from oscillators + noise, then distorted, filtered and reverbed)

   window.CDRadio(ctx) → engine
     engine.tracks            list of { title, bpm, swing, bars }
     engine.tick(ti, s, t)    play step s (16th notes) of track ti at time t
     engine.stat(t)           a burst of radio static (used when skipping)
   ========================================================= */
(() => {
  "use strict";

  window.CDRadio = (ctx, opts = {}) => {
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const rnd = (a, b) => a + Math.random() * (b - a);

    /* ---------- master chain ---------- */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 10; comp.ratio.value = 2.5;
    comp.attack.value = .004; comp.release.value = .22;
    if (opts.raw) comp.ratio.value = 1; // for level checks
    const out = ctx.createGain();
    out.gain.value = .38 * .49;
    // brick-wall safety limiter so nothing ever clips
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    if (opts.raw) lim.ratio.value = 1;
    comp.connect(out).connect(lim).connect(ctx.destination);

    const bus = ctx.createGain();
    bus.connect(comp);

    // reverb: a generated "room" impulse
    const impulse = (sec, decay) => {
      const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return b;
    };
    const verbIn = ctx.createGain(), verb = ctx.createConvolver(), verbOut = ctx.createGain();
    verb.buffer = impulse(3.2, 2.6);
    verbOut.gain.value = .8;
    verbIn.connect(verb).connect(verbOut).connect(comp);

    // tape-ish delay (time set per track)
    const dlyIn = ctx.createGain(), dly = ctx.createDelay(2), fb = ctx.createGain(), dlyTone = ctx.createBiquadFilter(), dlyOut = ctx.createGain();
    fb.gain.value = .38; dlyTone.type = "lowpass"; dlyTone.frequency.value = 2600; dlyOut.gain.value = .55;
    dlyIn.connect(dly).connect(dlyTone).connect(fb).connect(dly);
    dlyTone.connect(dlyOut).connect(comp);
    dlyOut.connect(verbIn);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

    const shape = k => {
      const n = 2049, c = new Float32Array(n), norm = Math.tanh(k);
      for (let i = 0; i < n; i++) { const x = i * 2 / (n - 1) - 1; c[i] = Math.tanh(k * x) / norm; }
      return c;
    };

    // send a node to the dry bus / reverb / delay, optionally panned
    const route = (node, { dry = 1, wet = 0, echo = 0, pan = 0 } = {}) => {
      let n = node;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
      if (dry) { const g = ctx.createGain(); g.gain.value = dry; n.connect(g).connect(bus); }
      if (wet) { const g = ctx.createGain(); g.gain.value = wet; n.connect(g).connect(verbIn); }
      if (echo) { const g = ctx.createGain(); g.gain.value = echo; n.connect(g).connect(dlyIn); }
    };
    const osc = (type, f, t, end, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
      o.start(t); o.stop(end);
      return o;
    };
    const filt = (type, f, q = .7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    // attack / decay-to-sustain / release envelope on a gain node
    const adsr = (g, t, { a = .005, peak = 1, d = .1, s = .5, dur = .2, r = .1 }) => {
      const p = g.gain;
      p.setValueAtTime(.0001, t);
      p.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a);
      p.exponentialRampToValueAtTime(Math.max(.0002, peak * s), t + a + d);
      p.setValueAtTime(Math.max(.0002, peak * s), t + Math.max(a + d, dur));
      p.exponentialRampToValueAtTime(.0001, t + Math.max(a + d, dur) + r);
      return t + Math.max(a + d, dur) + r + .05;
    };

    /* ---------- drums ---------- */
    const hit = (t, dur, vol, type, f, opts = {}, q = .8) => {
      const src = ctx.createBufferSource(), b = filt(type, f, q), g = ctx.createGain();
      src.buffer = noise;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(b).connect(g);
      route(g, opts);
      src.start(t, Math.random() * .7, dur + .05);
    };
    const kick = (t, v = 1) => {
      const o = osc("sine", 140, t, t + .5), g = ctx.createGain();
      o.frequency.exponentialRampToValueAtTime(44, t + .12);
      g.gain.setValueAtTime(v * .95, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .42);
      o.connect(g).connect(bus);
      hit(t, .015, v * .35, "highpass", 2500);
    };
    const snare = (t, v = 1, wet = .3) => {
      hit(t, .24, v * .55, "bandpass", 1900, { wet }, .9);
      hit(t, .1, v * .3, "highpass", 6000, { wet: wet * .5 });
      const o = osc("triangle", 200, t, t + .15), g = ctx.createGain();
      o.frequency.exponentialRampToValueAtTime(150, t + .08);
      g.gain.setValueAtTime(v * .5, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .12);
      o.connect(g); route(g, { wet: wet * .5 });
    };
    const clap = (t, v = 1) => {
      [0, .011, .023].forEach(o => hit(t + o, .03, v * .5, "bandpass", 1300, {}, 1.5));
      hit(t + .03, .2, v * .45, "bandpass", 1300, { wet: .35 }, 1.2);
    };
    const hat = (t, v = 1, open = false) => hit(t, open ? .28 : .04, v * (open ? .16 : .2), "highpass", open ? 7000 : 8500, { pan: open ? -.2 : .25 });
    const crash = (t, v = 1) => { hit(t, 1.8, v * .22, "highpass", 5000, { wet: .3, pan: -.3 }); hit(t, 1.2, v * .12, "bandpass", 7500, { pan: .3 }); };

    /* ---------- bass ---------- */
    const bass = (m, t, dur, v = 1, cut = 650, q = 1.5) => {
      const end = t + dur + .2, f = mtof(m);
      const o1 = osc("sawtooth", f, t, end), o2 = osc("sine", f, t, end);
      const lp = filt("lowpass", cut, q), g = ctx.createGain(), sub = ctx.createGain();
      sub.gain.value = .9;
      o1.connect(lp); o2.connect(sub).connect(lp);
      lp.connect(g);
      adsr(g, t, { a: .006, peak: v * .32, d: .12, s: .7, dur, r: .06 });
      route(g);
    };

    /* ---------- guitars ---------- */
    // two amps, panned hard left/right = double-tracked wall of guitar
    const amp = pan => {
      const inp = ctx.createGain(), sh = ctx.createWaveShaper(), hp = filt("highpass", 110), scoop = ctx.createBiquadFilter(), lp = filt("lowpass", 4800), g = ctx.createGain();
      sh.curve = shape(28); sh.oversample = "4x";
      scoop.type = "peaking"; scoop.frequency.value = 750; scoop.gain.value = -6; scoop.Q.value = 1;
      g.gain.value = .15;
      inp.connect(sh).connect(hp).connect(scoop).connect(lp).connect(g);
      route(g, { wet: .12, pan });
      return inp;
    };
    const amps = [amp(-.75), amp(.75)];
    const power = (root, t, dur, { mute = false, v = 1, iv = [0, 7, 12] } = {}) => {
      amps.forEach((a, side) => {
        const pre = filt("lowpass", mute ? 850 : 3800), g = ctx.createGain(), end = t + dur + .15;
        iv.forEach(i => osc("sawtooth", mtof(root + i), t + side * .006, end, (side ? 5 : -5) + rnd(-3, 3)).connect(pre));
        pre.connect(g);
        adsr(g, t, mute ? { a: .003, peak: v * .6, d: .06, s: .15, dur: .07, r: .05 } : { a: .004, peak: v * .6, d: .3, s: .6, dur, r: .12 });
        g.connect(a);
      });
    };
    // clean "twinkly" guitar for the emo track
    const pluck = (m, t, v = 1, pan = 0) => {
      const f = mtof(m), end = t + 1.6;
      const o1 = osc("triangle", f, t, end), o2 = osc("sawtooth", f * 2, t, end, 4);
      const lp = filt("lowpass", 3200), g = ctx.createGain(), g2 = ctx.createGain();
      g2.gain.value = .12;
      o1.connect(lp); o2.connect(g2).connect(lp);
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(1200, t + .6);
      lp.connect(g);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(v * .16, t + .003);
      g.gain.exponentialRampToValueAtTime(.0001, t + 1.5);
      route(g, { wet: .2, echo: .3, pan });
    };

    /* ---------- keys, pads, voices ---------- */
    // electric piano (FM tine)
    const rhodes = (notes, t, dur, v = 1) => notes.forEach((m, k) => {
      const f = mtof(m), end = t + dur + .8;
      const car = osc("sine", f, t, end), mod = osc("sine", f, t, end), idx = ctx.createGain(), g = ctx.createGain();
      idx.gain.setValueAtTime(f * 1.4, t);
      idx.gain.exponentialRampToValueAtTime(f * .08, t + .9);
      mod.connect(idx).connect(car.frequency);
      car.connect(g);
      adsr(g, t + k * .012, { a: .006, peak: v * .085, d: .6, s: .45, dur, r: .6 });
      route(g, { wet: .45, pan: (k % 2 ? .3 : -.3) });
    });
    // big detuned pad (shoegaze / dream)
    const padShaper = ctx.createWaveShaper();
    padShaper.curve = shape(3);
    const padIn = ctx.createGain();
    padIn.gain.value = .5;
    padIn.connect(padShaper);
    route(padShaper, { dry: .5, wet: .9 });
    const pad = (notes, t, dur, v = 1) => notes.forEach(m => {
      const f = mtof(m), end = t + dur + 1.6, lp = filt("lowpass", 2000), g = ctx.createGain();
      [-14, 0, 13].forEach(d => osc("sawtooth", f, t, end, d).connect(lp));
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.linearRampToValueAtTime(2400, t + dur * .6);
      lp.connect(g);
      adsr(g, t, { a: .45, peak: v * .07, d: .3, s: .85, dur, r: 1.2 });
      g.connect(padIn);
    });
    // breathy "ooh" voice: sawtooth through vowel formants, with vibrato
    const vox = (m, t, dur, v = 1, glideFrom = null) => {
      const f = mtof(m), end = t + dur + 1;
      const o1 = osc("sawtooth", glideFrom ? mtof(glideFrom) : f, t, end), o2 = osc("sawtooth", f, t, end, 9);
      if (glideFrom) o1.frequency.exponentialRampToValueAtTime(f, t + .18);
      const vib = osc("sine", 5.2, t, end), vd = ctx.createGain();
      vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(14, t + .6);
      vib.connect(vd); vd.connect(o1.detune); vd.connect(o2.detune);
      const f1 = filt("bandpass", 650, 7), f2 = filt("bandpass", 1080, 9), f3 = filt("bandpass", 2600, 12), g = ctx.createGain(), mix = ctx.createGain();
      mix.gain.value = 1;
      [f1, f2, f3].forEach(b => { o1.connect(b); o2.connect(b); b.connect(mix); });
      mix.connect(g);
      adsr(g, t, { a: .22, peak: v * .55, d: .3, s: .8, dur, r: .5 });
      route(g, { dry: .7, wet: .8, echo: .25 });
      hit(t, .12, v * .03, "bandpass", 5000, { wet: .4 }); // breath
    };
    // dreamy lead guitar (shoegaze) — fuzzy, bent, drenched
    const lead = (m, t, dur, v = 1, from = null) => {
      const f = mtof(m), end = t + dur + .8;
      const o = osc("sawtooth", from ? mtof(from) : f, t, end);
      if (from) o.frequency.exponentialRampToValueAtTime(f, t + .12);
      const vib = osc("sine", 5.5, t, end), vd = ctx.createGain();
      vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(18, t + .5);
      vib.connect(vd).connect(o.detune);
      const sh = ctx.createWaveShaper(); sh.curve = shape(12);
      const lp = filt("lowpass", 2600), g = ctx.createGain(), pre = ctx.createGain();
      pre.gain.value = .6;
      o.connect(pre).connect(sh).connect(lp).connect(g);
      adsr(g, t, { a: .02, peak: v * .06, d: .2, s: .8, dur, r: .4 });
      route(g, { dry: .7, wet: 1, echo: .4, pan: .15 });
    };
    // electroclash stab: crunchy detuned square/saw with a snappy filter
    const stabAmp = ctx.createWaveShaper();
    stabAmp.curve = shape(6);
    route(stabAmp, { dry: .5, wet: .25, echo: .15 });
    const stab = (notes, t, v = 1) => notes.forEach(m => {
      const f = mtof(m), end = t + .4, lp = filt("lowpass", 3800, 4), g = ctx.createGain();
      osc("square", f, t, end, -8).connect(lp);
      osc("sawtooth", f, t, end, 8).connect(lp);
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + .16);
      lp.connect(g);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(v * .09, t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      g.connect(stabAmp);
    });
    // vinyl crackle + hiss
    const crackle = (t, T) => {
      hit(t, T, .008, "bandpass", 3200, {}, .5);
      if (Math.random() < .5) hit(t + Math.random() * T, .003, rnd(.02, .07), "highpass", 2500);
    };
    // radio static between tracks
    const stat = t => {
      const src = ctx.createBufferSource(), b = filt("bandpass", 400, 3), g = ctx.createGain();
      src.buffer = noise;
      b.frequency.setValueAtTime(300, t);
      b.frequency.exponentialRampToValueAtTime(5000, t + .35);
      g.gain.setValueAtTime(.35, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .45);
      src.connect(b).connect(g).connect(bus);
      src.start(t, 0, .5);
    };

    /* =======================================================
       THE TRACKS  (s = 16th-note step inside the loop, T = one 16th)
       ======================================================= */
    const TRACKS = [
      {
        // emo / pop-punk: twinkly verse, then the wall of guitars
        title: "angel.exe (sad girl remix)", bpm: 146, swing: 0, bars: 16, echo: 3,
        play(s, t, T) {
          const bar = s >> 4, i = s & 15, c = bar % 4;
          const ROOT = [38, 34, 41, 36];
          const ARP = [[62, 69, 74, 76, 77, 76, 74, 69], [58, 65, 70, 72, 74, 72, 70, 65], [65, 72, 77, 79, 81, 79, 77, 72], [60, 67, 72, 74, 76, 74, 72, 67]];
          const chorus = bar >= 8;
          if (i % 2 === 0) pluck(ARP[c][(i / 2) % 8], t, chorus ? .55 : 1, (i % 4 ? .35 : -.35));
          // bass
          if (bar < 4) { if (i === 0) bass(ROOT[c], t, T * 15, .8); }
          else if (i % 2 === 0) bass(ROOT[c] + (i === 14 && chorus ? 12 : 0), t, T * 1.7, .9);
          // guitars
          if (chorus) {
            if (i === 0 || i === 8) power(ROOT[c] + 12, t, T * 3.6, { v: 1 });
            if (i === 4 || i === 6 || i === 12 || i === 14) power(ROOT[c] + 12, t, T, { mute: true, v: .9 });
          }
          // drums
          if (bar < 4) {
            if (i === 0 && bar === 0) crash(t, .5);
            if (i % 4 === 0) hat(t, .5);
          } else {
            if (i === 0 && (bar === 4 || bar === 8 || bar === 12)) crash(t, 1);
            if (chorus) {
              if (i === 0 || i === 8 || i === 10) kick(t, 1);
              if (i === 4 || i === 12) snare(t, 1);
              if (i % 2 === 0) hat(t, i % 4 ? .5 : .8, i === 14);
            } else {
              if (i === 0 || i === 10) kick(t, .9);
              if (i === 8) snare(t, .9, .45);
              if (i % 2 === 0) hat(t, .6);
            }
            // fills into the chorus / back to the top
            if ((bar === 7 || bar === 15) && i >= 12) snare(t, .45 + (i - 12) * .15, .2);
          }
        }
      },
      {
        // trip-hop / y2k R&B at 3am: swung breakbeat, rhodes, sub, vinyl, a voice
        title: "midnight mall (slowed + reverb)", bpm: 84, swing: .2, bars: 8, echo: 3,
        play(s, t, T) {
          const bar = s >> 4, i = s & 15, c = bar % 4;
          const CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [50, 53, 57, 60, 64], [52, 56, 59, 62, 67]];
          const SUB = [33, 29, 38, 28];
          crackle(t, T);
          if (i === 0) rhodes(CH[c], t, T * 9, 1);
          if (i === 10) rhodes(CH[c].slice(1), t, T * 5, .6);
          if (i === 0) bass(SUB[c], t, T * 9, 1, 320, .7);
          if (i === 10) bass(SUB[c] + (c === 3 ? 0 : 12), t, T * 5, .7, 320, .7);
          const drums = bar >= 2;
          if (drums) {
            if (i === 0 || i === 7 || i === 10) kick(t, i === 7 ? .6 : .95);
            if (i === 4 || i === 12) snare(t, .85, .55);
            if (i === 15 && bar % 2) snare(t, .2, .2);
          }
          hat(t, [.5, .15, .32, .18][i % 4] * (drums ? 1 : .6));
          // the voice comes in for the second half
          if (bar >= 4) {
            const LINE = { "0:0": [76, 11], "1:8": [74, 8], "2:0": [72, 9], "2:10": [71, 5], "3:0": [68, 14] };
            const n = LINE[`${c}:${i}`];
            if (n) vox(n[0], t, T * n[1], 1, i === 0 ? n[0] - 2 : null);
          }
        }
      },
      {
        // electroclash: four to the floor, dirty stabs, a bassline that opens up
        title: "glitch in heels (club mix)", bpm: 128, swing: 0, bars: 8, echo: 3,
        play(s, t, T) {
          const bar = s >> 4, i = s & 15, c = bar % 4, loop = this.bars * 16;
          const ROOT = [41, 37, 44, 39];
          const CH = [[65, 68, 72], [61, 65, 68], [63, 68, 72], [63, 67, 70]];
          const PAT = [0, null, 12, 0, null, 0, 12, null, 0, null, 12, 0, 15, null, 12, null];
          if (i % 4 === 0) kick(t, 1);
          if (i === 4 || i === 12) clap(t, 1);
          hat(t, i % 4 === 2 ? .9 : .35, i % 4 === 2);
          const sweep = .5 - .5 * Math.cos(2 * Math.PI * s / loop);
          if (PAT[i] !== null) bass(ROOT[c] + PAT[i], t, T * .9, .85, 260 + 2200 * sweep, 9);
          if (i === 3 || i === 6 || i === 11) stab(CH[c], t, bar >= 4 ? 1 : .6);
          // glitch: the clap stutters at the end of the loop
          if (bar === 7 && i >= 12) for (let k = 1; k < 4; k++) clap(t + k * T / 4, .25 + k * .12);
          if (bar === 0 && i === 0) crash(t, .6);
        }
      },
      {
        // shoegaze: a wall of fuzz and reverb, drums far away, a guitar that sings
        title: "velvet static (4am demo)", bpm: 106, swing: 0, bars: 8, echo: 4,
        play(s, t, T) {
          const bar = s >> 4, i = s & 15, c = bar % 4;
          const ROOT = [40, 37, 33, 35];
          const PAD = [[64, 68, 71, 75], [61, 64, 68, 71], [64, 69, 73, 76], [63, 66, 71, 75]];
          if (i === 0) pad(PAD[c], t, T * 16, 1);
          if (i % 2 === 0) power(ROOT[c] + 12, t, T * 2, { v: .45, iv: [0, 7, 12, 16] });
          if (i % 2 === 0) bass(ROOT[c], t, T * 1.8, .8, 500);
          if (i === 0 || i === 6 || i === 8) kick(t, .85);
          if (i === 4 || i === 12) snare(t, .8, .9);
          if (i % 2 === 0) hat(t, .45, i === 6 || i === 14);
          if (i === 0 && bar % 4 === 0) crash(t, .8);
          if (bar >= 4) {
            const LINE = { "4:0": [80, 6, 78], "4:6": [78, 2], "4:8": [76, 8], "5:0": [75, 12, 73], "6:0": [73, 6], "6:6": [75, 2], "6:8": [76, 8, 75], "7:0": [71, 14, 69] };
            const n = LINE[`${bar}:${i}`];
            if (n) lead(n[0], t, T * n[1], 1, n[2] || null);
          }
        }
      }
    ];

    let lastTrack = -1;
    const BASE = .38;
    return {
      // v from 0 to 1; squared so the slider feels even to the ear
      volume(v) { out.gain.setTargetAtTime(BASE * v * v, ctx.currentTime, .04); },
      tracks: TRACKS.map(({ title, bpm, swing, bars }) => ({ title, bpm, swing, bars })),
      stat,
      tick(ti, s, t) {
        const tr = TRACKS[ti], T = 60 / tr.bpm / 4;
        if (ti !== lastTrack) {
          lastTrack = ti;
          dly.delayTime.setValueAtTime(T * tr.echo, t);
        }
        tr.play(s, t, T);
      }
    };
  };
})();
