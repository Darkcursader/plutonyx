/*
 * PROJECT JEZERO — site controller.
 * Reads window.SITE_CONFIG (config.js) for every link and media file.
 */
(() => {
  "use strict";
  const C = window.SITE_CONFIG || {};
  const L = C.links || {};
  const M = C.media || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const smallScreen = matchMedia("(max-width: 900px)").matches;
  // Background video is skipped for reduced-motion and Save-Data visitors (posters are shown instead).
  const allowBgVideo = !reduceMotion && !saveData;
  let motionOn = allowBgVideo && store.get("pj-motion") !== "off";

  /* ───────────────────────── config → text ───────────────────────── */
  $$("[data-cfg]").forEach((el) => { const v = C[el.dataset.cfg]; if (v) el.textContent = v; });
  if (C.title) document.title = document.title.replace("PROJECT JEZERO", C.title);

  /* ───────────────────────── config → links ───────────────────────── */
  $$('[data-link="playWeb"]').forEach((a) => {
    if (L.playWeb) a.href = L.playWeb;
    if (L.openWebInNewTab) { a.target = "_blank"; a.rel = "noopener"; }
  });
  $$('[data-link="source"]').forEach((a) => { if (L.source) a.href = L.source; else a.remove(); });

  const os = (() => {
    const ua = navigator.userAgent || "";
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/iPhone|iPad|iPod|Android/i.test(ua) || (/Mac/i.test(p) && navigator.maxTouchPoints > 1)) return "mobile";
    if (/Win/i.test(p) || /Windows/i.test(ua)) return "windows";
    if (/Mac/i.test(p) || /Mac OS X/i.test(ua)) return "macos";
    return "other";
  })();
  const D = L.download || {};
  const dl = (os === "windows" && D.windows) ? { href: D.windows, file: true }
           : (os === "macos" && D.macos) ? { href: D.macos, file: true }
           : { href: D.page || D.windows || D.macos || "#", file: false };
  $$('[data-link="download"]').forEach((a) => {
    a.href = dl.href;
    if (dl.file) a.setAttribute("download", "");
    a.dataset.os = os;
  });
  const meta = $("#downloadMeta");
  if (meta) {
    const link = (href, text) => `<a href="${href}">${text}</a>`;
    const ver = D.version ? `${D.version} · ` : "";
    let html;
    if (os === "windows") html = `${ver}Windows 10/11 · 64-bit · ${D.windowsSize || ""}` + (D.macos ? ` · Also for ${link(D.macos, "macOS")}` : "");
    else if (os === "macos") html = `${ver}macOS · Apple silicon &amp; Intel · ${D.macosSize || ""}` + (D.windows ? ` · Also for ${link(D.windows, "Windows")}` : "");
    else if (os === "mobile") html = `The desktop app runs on Windows &amp; macOS — on this device, play on web.`;
    else html = `${ver}Windows &amp; macOS` + (D.page ? ` · ${link(D.page, "All downloads")}` : "");
    if (os !== "mobile") html += `<br/>Unsigned build — Windows: More info → Run anyway · macOS: right-click → Open`;
    meta.innerHTML = html;
  }
  const heroNote = $("[data-download-note]");
  if (heroNote && os === "windows") heroNote.textContent = "Free · Plays in any modern browser · Desktop download for Windows";
  if (heroNote && os === "macos") heroNote.textContent = "Free · Plays in any modern browser · Desktop download for macOS";

  /* ───────────────────────── media wiring ───────────────────────── */
  const resolve = (key) => key.split(".").reduce((o, k) => (o ? o[k] : undefined), M);
  const pick = (entry) => (entry ? (smallScreen && entry.small ? entry.small : entry.src) : "");

  $$("video[data-media]").forEach((v) => {
    const entry = resolve(v.dataset.media);
    if (!entry) return;
    if (entry.poster) v.poster = entry.poster;
    v.dataset.src = pick(entry);
  });
  $$("img[data-media-img]").forEach((img) => { const s = M[img.dataset.mediaImg]; if (s) img.src = s; });

  function load(v) {
    if (v.dataset.loaded || !v.dataset.src) return;
    v.dataset.loaded = "1";
    v.src = v.dataset.src;
    v.load();
  }
  function play(v) {
    if (!v) return;
    load(v);
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  function pause(v) { if (v && !v.paused) v.pause(); }

  /* ───────────────────────── opening title ───────────────────────── */
  const heroVideo = $("#heroVideo");
  const body = document.body;
  let ready = false;
  function setReady() {
    if (ready) return;
    ready = true;
    body.classList.add("is-ready");
    body.classList.remove("is-loading");
    session.set("pj-intro", "1");
    setTimeout(() => $("#intro") && $("#intro").remove(), 1800);
  }
  const skipIntro = reduceMotion || session.get("pj-intro") === "1";
  if (motionOn) play(heroVideo);
  if (skipIntro) {
    setReady();
  } else {
    const minTime = new Promise((r) => setTimeout(r, 2500));
    const videoReady = new Promise((r) => {
      if (!motionOn) return r();
      if (heroVideo.readyState >= 3) return r();
      heroVideo.addEventListener("canplay", r, { once: true });
      heroVideo.addEventListener("error", r, { once: true });
    });
    const maxTime = new Promise((r) => setTimeout(r, 4500));
    Promise.race([Promise.all([minTime, videoReady]), maxTime]).then(setReady);
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, () => setTimeout(setReady, 0), { once: true, passive: true }));
  }

  /* ───────────────────────── dust (WebGL) ───────────────────────── */
  const dustOK = !reduceMotion && window.Dust && window.Dust.init($("#dust"));
  let heroVisible = true;

  /* ───────────────────────── manifesto: split words ───────────────────────── */
  const manifesto = $("#manifestoText");
  let words = [];
  if (manifesto && !reduceMotion) {
    const split = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
            else { const s = document.createElement("span"); s.className = "w"; s.textContent = tok; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n);
      });
    };
    split(manifesto);
    words = $$(".w", manifesto);
  }

  /* ───────────────────────── generic reveals ───────────────────────── */
  if (!reduceMotion) {
    const groups = [
      [".manifesto__kicker"], [".crew__image"], [".crew__text .eyebrow, .crew__text .section-title"],
      [".crew__list li", 0.07], [".crew__note"], [".gameplay__head > *", 0.08],
      [".endings__intro > *", 0.08], [".endings__list li", 0.06], [".finale__content .eyebrow, .finale__title"],
      [".access__opt", 0.12], [".numbers dl > div", 0.08], [".scene", 0.05],
    ];
    groups.forEach(([sel, step]) => $$(sel).forEach((el, i) => {
      el.setAttribute("data-reveal", "");
      if (step) el.style.setProperty("--rd", `${(i * step).toFixed(2)}s`);
    }));
  }
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      revealIO.unobserve(e.target);
      $$("[data-count]", e.target).concat(e.target.matches("[data-count]") ? [e.target] : []).forEach(countUp);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  const observeReveals = () => $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ───────────────────────── count-up numerals ───────────────────────── */
  function countUp(el) {
    if (reduceMotion || el.dataset.counted) return;
    el.dataset.counted = "1";
    const to = +el.dataset.count, dur = 1500, t0 = performance.now();
    const step = (now) => {
      const k = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  }

  /* ───────────────────────── experience chapters ───────────────────────── */
  const stageVideos = $$(".stage__video");
  const huds = $$(".hud");
  const idx = $$(".stage__index li");
  const chapters = $$(".chapter");
  const stage = $(".stage");
  let active = 0, stageVisible = false;
  const pauseTimers = new Map();

  function setActive(i) {
    active = i;
    stageVideos.forEach((v, k) => {
      v.classList.toggle("is-active", k === i);
      clearTimeout(pauseTimers.get(v));
      if (k !== i) pauseTimers.set(v, setTimeout(() => pause(v), 1500));
    });
    huds.forEach((h) => {
      const on = +h.dataset.for === i;
      h.classList.toggle("is-active", on);
      if (on) $$("[data-count]", h).forEach((el) => { delete el.dataset.counted; countUp(el); });
    });
    idx.forEach((li, k) => { li.classList.toggle("is-active", k === i); li.classList.toggle("is-done", k < i); });
    syncStage();
  }
  function syncStage() {
    const v = stageVideos[active];
    if (stageVisible && motionOn) {
      play(v);
      // warm the next chapter so the crossfade has frames ready
      if (stageVideos[active + 1]) load(stageVideos[active + 1]);
    } else pause(v);
  }
  // The active chapter is the one whose text block covers the middle of the
  // viewport — computed from scroll position (see onScroll) so fast jumps,
  // anchor links and resizes always land on the right scene.
  function updateChapters(vh) {
    let current = 0;
    chapters.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      if (r.top <= vh * 0.5) current = k;
      c.classList.toggle("is-in", reduceMotion || (r.top < vh * 0.8 && r.bottom > vh * 0.2));
    });
    if (current !== active || !stageVideos[current].classList.contains("is-active")) setActive(current);
  }
  if (reduceMotion) chapters.forEach((c) => c.classList.add("is-in"));

  /* ───────────────────────── film ───────────────────────── */
  const film = $("#film"), filmVideo = $("#filmVideo"), filmPlay = $("#filmPlay");
  const filmScrub = $("#filmScrub"), filmTime = $("#filmTime"), filmLabel = $("#filmLabel");
  let userPaused = false, filmVisible = false;
  filmVideo.loop = true;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const setFilmState = () => {
    const playing = !filmVideo.paused && !filmVideo.ended;
    film.classList.toggle("is-playing", playing);
    film.classList.toggle("is-paused", !playing);
    filmPlay.setAttribute("aria-label", playing ? "Pause gameplay film" : "Play gameplay film");
  };
  filmVideo.addEventListener("play", setFilmState);
  filmVideo.addEventListener("pause", setFilmState);
  filmVideo.addEventListener("timeupdate", () => {
    const d = filmVideo.duration || 1, p = filmVideo.currentTime / d;
    film.style.setProperty("--filmp", p.toFixed(4));
    filmTime.textContent = fmt(filmVideo.currentTime);
    filmScrub.setAttribute("aria-valuenow", Math.round(p * 100));
  });
  setFilmState();
  filmPlay.addEventListener("click", () => {
    if (filmVideo.paused) { userPaused = false; play(filmVideo); }
    else { userPaused = true; pause(filmVideo); }
  });
  filmVideo.addEventListener("click", () => filmPlay.click());
  const seekTo = (clientX) => {
    const r = filmScrub.getBoundingClientRect();
    load(filmVideo);
    if (filmVideo.duration) filmVideo.currentTime = clamp((clientX - r.left) / r.width) * filmVideo.duration;
  };
  filmScrub.addEventListener("pointerdown", (e) => {
    filmScrub.setPointerCapture(e.pointerId); seekTo(e.clientX);
    const mv = (ev) => seekTo(ev.clientX);
    filmScrub.addEventListener("pointermove", mv);
    filmScrub.addEventListener("pointerup", () => filmScrub.removeEventListener("pointermove", mv), { once: true });
  });
  filmScrub.addEventListener("keydown", (e) => {
    if (!filmVideo.duration) return;
    if (e.key === "ArrowRight") { filmVideo.currentTime = Math.min(filmVideo.duration, filmVideo.currentTime + 3); e.preventDefault(); }
    if (e.key === "ArrowLeft") { filmVideo.currentTime = Math.max(0, filmVideo.currentTime - 3); e.preventDefault(); }
  });
  $("#filmFs").addEventListener("click", () => {
    const frame = $(".film__frame");
    load(filmVideo);
    if (document.fullscreenElement) document.exitFullscreen();
    else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
    else if (filmVideo.webkitEnterFullscreen) filmVideo.webkitEnterFullscreen();
  });

  // Scene strip
  const scenesEl = $("#scenes");
  const sceneList = [{ label: "Full gameplay film", src: pick(M.film), poster: M.film && M.film.poster, film: true }]
    .concat(M.scenes || []);
  sceneList.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "scene"; b.setAttribute("role", "listitem");
    if (i === 0) b.setAttribute("aria-current", "true");
    b.innerHTML = `<span class="scene__thumb"><img src="${s.poster}" alt="" loading="lazy" decoding="async" width="320" height="180"></span>
      <span class="scene__label"><b class="tnum">${String(i).padStart(2, "0")}</b>${s.label}</span>`;
    b.addEventListener("click", () => {
      $$(".scene", scenesEl).forEach((x) => x.removeAttribute("aria-current"));
      b.setAttribute("aria-current", "true");
      filmVideo.dataset.src = s.src;
      delete filmVideo.dataset.loaded;
      if (s.poster) filmVideo.poster = s.poster;
      filmLabel.textContent = s.label;
      userPaused = false;
      play(filmVideo);
      film.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
    scenesEl.appendChild(b);
  });

  /* ───────────────────────── finale ───────────────────────── */
  const finaleVideo = $(".finale__video");
  let finaleVisible = false;

  /* ───────────────────────── visibility → playback ───────────────────────── */
  function syncAll() {
    if (heroVisible && motionOn) play(heroVideo); else pause(heroVideo);
    if (dustOK) { if (heroVisible && motionOn) window.Dust.start(); else window.Dust.stop(); }
    syncStage();
    if (filmVisible && motionOn && !userPaused) play(filmVideo);
    else if (!filmVisible) pause(filmVideo);
    if (finaleVisible && motionOn) play(finaleVideo); else pause(finaleVideo);
  }
  const visIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const on = e.isIntersecting;
      if (e.target.classList.contains("hero")) heroVisible = on;
      else if (e.target === stage) stageVisible = on;
      else if (e.target === film) filmVisible = on;
      else if (e.target.classList.contains("finale")) finaleVisible = on;
    });
    syncAll();
  }, { threshold: 0.08 });
  [$(".hero"), stage, film, $(".finale")].forEach((el) => visIO.observe(el));

  // Preload upcoming videos ahead of the viewport (metadata + first frames).
  const preIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting || !motionOn) return;
      if (e.target === stage) load(stageVideos[0]);
      if (e.target.classList.contains("finale")) load(finaleVideo);
      preIO.unobserve(e.target);
    });
  }, { rootMargin: "120% 0px" });
  [stage, $(".finale")].forEach((el) => preIO.observe(el));

  /* ───────────────────────── motion toggle ───────────────────────── */
  const toggle = $("#motionToggle");
  const paintToggle = () => {
    toggle.setAttribute("aria-pressed", String(!motionOn));
    toggle.setAttribute("aria-label", motionOn ? "Pause background motion" : "Play background motion");
    body.classList.toggle("no-motion", !motionOn);
  };
  if (!allowBgVideo) toggle.hidden = true;
  paintToggle();
  toggle.addEventListener("click", () => {
    motionOn = !motionOn;
    store.set("pj-motion", motionOn ? "on" : "off");
    if (!motionOn) { userPaused = true; pause(filmVideo); }
    paintToggle();
    syncAll();
  });

  /* ───────────────────────── scroll-linked scene ───────────────────────── */
  const nav = $("#nav"), hero = $(".hero"), stageFrame = $(".stage__frame");
  const experience = $(".experience"), filmFrame = $(".film__frame"), crewImg = $(".crew__image");
  const finale = $(".finale");
  let lastY = window.scrollY, ticking = false;

  function onScroll() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    // nav
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > vh * 0.9 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
    updateChapters(vh);

    if (reduceMotion) return;
    // hero parallax / fade
    if (y < vh * 1.2) hero.style.setProperty("--hp", clamp(y / vh).toFixed(4));
    // experience frame opens from an inset card to full-bleed
    const er = experience.getBoundingClientRect();
    stageFrame.style.setProperty("--enter", clamp(1 - er.top / vh).toFixed(4));
    // film grows into the frame
    const fr = filmFrame.getBoundingClientRect();
    film.style.setProperty("--fp", clamp((vh - fr.top) / (vh * 0.75)).toFixed(4));
    filmFrame.style.setProperty("--fp", clamp((vh - fr.top) / (vh * 0.75)).toFixed(4));
    // crew image parallax
    const cr = crewImg.getBoundingClientRect();
    if (cr.bottom > 0 && cr.top < vh) crewImg.style.setProperty("--p", (((cr.top + cr.height / 2) - vh / 2) / vh).toFixed(4));
    // finale push-in
    const nr = finale.getBoundingClientRect();
    if (nr.top < vh) finale.style.setProperty("--fn", clamp(1 - nr.top / vh).toFixed(4));
    // manifesto words light up with scroll
    if (words.length) {
      const mr = manifesto.getBoundingClientRect();
      const p = clamp((vh * 0.82 - mr.top) / (mr.height + vh * 0.25));
      const lit = Math.round(p * words.length);
      for (let i = 0; i < words.length; i++) words[i].classList.toggle("on", i < lit);
    }
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(onScroll), { passive: true });

  observeReveals();
  setActive(0);
  onScroll();
  syncAll();
})();
