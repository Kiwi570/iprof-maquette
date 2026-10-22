/* iProf — comportements et animations */
(function () {
  "use strict";
  var d = document, html = d.documentElement;
  var site = d.querySelector(".site");
  var page = site ? site.dataset.page : "";
  var hasGsap = !!window.gsap;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var calm = html.classList.contains("calm");
  var noWebGL = /nowebgl/.test(location.search);

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  var sess = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };
  var headerH = function () { var h = d.querySelector(".site-header"); return h ? h.offsetHeight : 72; };

  if (hasGsap) {
    var plugins = [window.ScrollTrigger, window.SplitText, window.DrawSVGPlugin, window.Flip].filter(Boolean);
    gsap.registerPlugin.apply(gsap, plugins);
  }

  /* ——— Encre WebGL : file d'attente pour le module ink.js ——— */
  window.__inkQueue = window.__inkQueue || [];
  function requestInk(fig, delay) {
    if (noWebGL) { fig.classList.add("ink-done"); fig.querySelector(".ph__frame").classList.add("ink-fallback"); return; }
    if (window.iprofInk) window.iprofInk(fig, delay); else window.__inkQueue.push([fig, delay]);
  }
  var inkFigs = d.querySelectorAll("[data-ink]");
  if (!hasGsap || calm) inkFigs.forEach(function (f) { f.classList.add("ink-done"); });
  setTimeout(function () { inkFigs.forEach(function (f) { f.classList.add("ink-done"); }); }, 3500);

  /* ——— Photos qui se développent comme un tirage ——— */
  var photos = d.querySelectorAll(".ph--photo:not([data-ink])");
  if (calm || !("IntersectionObserver" in window)) photos.forEach(function (p) { p.classList.add("is-developed"); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-developed"); io.unobserve(en.target); } });
    }, { threshold: 0.25 });
    photos.forEach(function (p) { io.observe(p); });
  }

  /* ——— Annotations entourées : tracé ajusté à la taille du texte ——— */
  var NS = "http://www.w3.org/2000/svg";
  function circlePath(w, h) {
    var pts = [], n = 22, a0 = -2.5, sweep = Math.PI * 2 + 0.55, cx = w / 2, cy = h / 2;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (sweep * i) / n, k = 1 + Math.sin(i * 1.7) * 0.025 + (i / n) * 0.04;
      pts.push([cx + Math.cos(a) * (w / 2 - 3) * k, cy + Math.sin(a) * (h / 2 - 3) * (k * 0.98)]);
    }
    var dd = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var j = 1; j < pts.length - 1; j++) {
      var mx = (pts[j][0] + pts[j + 1][0]) / 2, my = (pts[j][1] + pts[j + 1][1]) / 2;
      dd += " Q" + pts[j][0].toFixed(1) + " " + pts[j][1].toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1);
    }
    return dd;
  }
  var circles = [];
  d.querySelectorAll('.annot[data-annot="circle"]').forEach(function (a) {
    var svg = d.createElementNS(NS, "svg");
    svg.setAttribute("class", "annot__svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");
    var p = d.createElementNS(NS, "path");
    p.setAttribute("pathLength", "1");
    svg.appendChild(p);
    a.appendChild(svg);
    circles.push({ el: a, svg: svg, path: p });
  });
  function sizeCircles() {
    circles.forEach(function (c) {
      var w = c.svg.clientWidth || c.el.offsetWidth * 1.18, h = c.svg.clientHeight || c.el.offsetHeight * 1.52;
      c.svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      c.path.setAttribute("d", circlePath(w, h));
    });
  }
  sizeCircles();

  /* ——— Confort de lecture ——— */
  var calmBtn = d.getElementById("calm-toggle"), bigBtn = d.getElementById("big-toggle");
  if (calmBtn) calmBtn.setAttribute("aria-pressed", String(calm));
  if (bigBtn) bigBtn.setAttribute("aria-pressed", String(html.classList.contains("big")));
  if (calmBtn) calmBtn.addEventListener("click", function () { setCalm(!calm); });
  if (bigBtn) bigBtn.addEventListener("click", function () {
    var on = !html.classList.contains("big");
    html.classList.toggle("big", on);
    store.set("iprof-big", on ? "1" : "0");
    bigBtn.setAttribute("aria-pressed", String(on));
    sizeCircles();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  function setCalm(on) {
    calm = on;
    html.classList.toggle("calm", on);
    store.set("iprof-calm", on ? "1" : "0");
    calmBtn.setAttribute("aria-pressed", String(on));
    if (on) {
      teardown();
      stopLenis();
      html.classList.remove("has-pen");
      inkFigs.forEach(function (f) { f.classList.add("ink-done"); });
      photos.forEach(function (p) { p.classList.add("is-developed"); });
      circles.forEach(function (c) { c.path.style.strokeDasharray = ""; c.path.style.strokeDashoffset = ""; });
    } else {
      startLenis();
      initPen();
      animate(false);
    }
  }

  /* ——— Défilement fluide ——— */
  var lenis = null;
  function rafLenis(t) { if (lenis) lenis.raf(t * 1000); }
  function startLenis() {
    if (lenis || !window.Lenis || !hasGsap || calm) return;
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -headerH() - 16 } });
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(rafLenis);
    gsap.ticker.lagSmoothing(0);
  }
  function stopLenis() {
    if (!lenis) return;
    gsap.ticker.remove(rafLenis);
    lenis.destroy();
    lenis = null;
  }

  /* ——— En-tête et menu ——— */
  var header = d.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = d.querySelector(".menu-btn"), menu = d.getElementById("menu");
  function setMenu(open) {
    if (!menu) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.querySelector(".menu-btn__t").textContent = open ? "Fermer" : "Menu";
    var rest = d.querySelectorAll("main, .site-footer, .skip");
    rest.forEach(function (el) { el.inert = open; });
    if (open) {
      menu.hidden = false;
      if (lenis) lenis.stop();
      d.body.style.overflow = "hidden";
      if (hasGsap && !calm) gsap.from(menu.querySelectorAll(".menu__list li, .menu__contact"), { y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: "power3.out" });
      var first = menu.querySelector("a");
      if (first) first.focus();
    } else {
      menu.hidden = true;
      if (lenis) lenis.start();
      d.body.style.overflow = "";
    }
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ——— Transitions de page : une feuille qui glisse ——— */
  var sheet = d.querySelector(".sheet"), sheetLabel = d.querySelector(".sheet__label");
  var arriving = html.classList.contains("arriving");
  sess.del("iprof-sheet");
  if (arriving && hasGsap && !calm && sheet) {
    gsap.fromTo(sheet, { yPercent: 0 }, { yPercent: -105, duration: 0.75, delay: 0.08, ease: "power3.inOut", onComplete: function () { html.classList.remove("arriving"); gsap.set(sheet, { clearProps: "transform" }); } });
  } else {
    html.classList.remove("arriving");
  }
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && sheet) { html.classList.remove("arriving"); if (hasGsap) gsap.set(sheet, { clearProps: "all" }); }
  });
  d.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!/^[a-z0-9-]+\.html(#[\w-]+)?$/i.test(href)) return;
    var url = new URL(href, location.href);
    if (url.pathname === location.pathname) return;
    if (a.dataset.topic) sess.set("iprof-topic", a.dataset.topic);
    if (calm || !hasGsap || !sheet) return;
    e.preventDefault();
    if (menu && !menu.hidden) setMenu(false);
    var NAMES = { "index.html": "Accueil", "cours-individuels.html": "Cours individuels", "conseils.html": "Conseils", "tarifs.html": "Tarifs", "a-propos.html": "À propos", "contact.html": "Contact", "mentions-legales.html": "Mentions légales" };
    sheetLabel.textContent = NAMES[href.split("#")[0]] || "iProf";
    sess.set("iprof-sheet", "1");
    gsap.fromTo(sheet, { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: "power3.inOut", onComplete: function () { location.href = href; } });
  });

  /* ——— Curseur plume et trace d'encre ——— */
  var pen = d.querySelector(".pen"), trail = d.querySelector(".inktrail"), tctx = trail ? trail.getContext("2d") : null;
  var pts = [], looping = false, penReady = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function sizeTrail() { if (!trail) return; trail.width = innerWidth * dpr; trail.height = innerHeight * dpr; }
  function drawTrail() {
    if (!tctx) return;
    var now = performance.now();
    pts = pts.filter(function (p) { return now - p.t < 520; });
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, innerWidth, innerHeight);
    tctx.lineCap = "round";
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], age = (now - b.t) / 520;
      var dist = Math.hypot(b.x - a.x, b.y - a.y);
      tctx.strokeStyle = "rgba(35,56,184," + (0.55 * (1 - age)).toFixed(3) + ")";
      tctx.lineWidth = Math.max(0.6, 3.2 - dist * 0.06) * (1 - age * 0.5);
      tctx.beginPath(); tctx.moveTo(a.x, a.y); tctx.lineTo(b.x, b.y); tctx.stroke();
    }
    if (pts.length) requestAnimationFrame(drawTrail); else { looping = false; tctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function initPen() {
    if (!fine || calm || !pen) return;
    html.classList.add("has-pen");
    if (penReady) return;
    penReady = true;
    sizeTrail();
    window.addEventListener("resize", sizeTrail);
    d.addEventListener("pointermove", function (e) {
      if (calm || e.pointerType !== "mouse") return;
      pen.style.transform = "translate(" + (e.clientX - 3) + "px," + (e.clientY - 3) + "px)";
      var t = e.target;
      var textField = t.closest && t.closest("input:not([type=checkbox]):not([type=radio]), textarea");
      pen.style.opacity = textField ? "0" : "1";
      pen.classList.toggle("is-link", !!(t.closest && t.closest("a, button, label, [data-tilt], .theme")));
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (!looping) { looping = true; requestAnimationFrame(drawTrail); }
    }, { passive: true });
    d.addEventListener("pointerdown", function () { pen.classList.add("is-down"); });
    d.addEventListener("pointerup", function () { pen.classList.remove("is-down"); });
    d.documentElement.addEventListener("mouseleave", function () { pen.style.opacity = "0"; });
  }

  /* ——— Micro-interactions : aimant et inclinaison ——— */
  if (fine && hasGsap) {
    d.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (calm) return;
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", function () { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .4)" }); });
    });
    d.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (calm) return;
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotationY: px * 9, rotationX: -py * 9, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
      });
      el.addEventListener("pointerleave", function () { gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.8, ease: "power3.out" }); });
    });
  }

  /* ——— Copier ——— */
  d.querySelectorAll("[data-copy]").forEach(function (b) {
    var label = b.querySelector("span"), orig = label.textContent;
    b.addEventListener("click", function () {
      var v = b.dataset.copy;
      var done = function () { b.classList.add("is-copied"); label.textContent = "Copié"; setTimeout(function () { b.classList.remove("is-copied"); label.textContent = orig; }, 2000); };
      var fallback = function () {
        var t = d.createElement("textarea"); t.value = v; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        d.body.appendChild(t); t.select();
        var ok = false; try { ok = d.execCommand("copy"); } catch (e) {}
        d.body.removeChild(t);
        if (ok) done(); else { label.textContent = v; }
      };
      try { navigator.clipboard.writeText(v).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  /* ——— Conseils : fiches qui se retournent et filtre ——— */
  d.querySelectorAll(".theme").forEach(function (card) {
    var front = card.querySelector(".theme__front"), back = card.querySelector(".theme__back");
    function flip(open, focus) {
      card.classList.toggle("is-flipped", open);
      front.inert = open; back.inert = !open;
      card.querySelectorAll(".theme__front .theme__flip").forEach(function (b) { b.setAttribute("aria-expanded", String(open)); });
      if (focus) setTimeout(function () { var t = open ? back.querySelector("a, button") : front.querySelector(".theme__flip"); if (t) t.focus({ preventScroll: true }); }, calm ? 0 : 450);
    }
    card.addEventListener("click", function (e) {
      if (e.target.closest(".theme__flip")) flip(!card.classList.contains("is-flipped"), true);
    });
    card._iprofFlip = flip;
  });
  if (location.hash) {
    var target = null;
    try { target = d.querySelector(location.hash); } catch (e) { target = null; }
    if (target && target.classList.contains("theme") && target._iprofFlip) setTimeout(function () { target._iprofFlip(true, false); }, 900);
  }
  var filters = d.querySelectorAll(".filter");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      filters.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var cards = d.querySelectorAll(".theme");
      var state = hasGsap && window.Flip && !calm ? Flip.getState(cards) : null;
      cards.forEach(function (c) { c.style.display = f === "tous" || c.dataset.cat === f ? "" : "none"; });
      if (state) {
        Flip.from(state, {
          duration: 0.6, ease: "power2.inOut", absolute: true, scale: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5 }); },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.35 }); },
          onComplete: function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); },
        });
      } else if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ——— Tarifs : calculateur ——— */
  var cf = d.getElementById("calc-form");
  if (cf) {
    var H = d.getElementById("heures"), V = d.getElementById("visites"), vrow = d.getElementById("visites-row");
    var lines = d.getElementById("calc-lines"), total = d.getElementById("calc-total"), note = d.getElementById("calc-note");
    var chf = function (n) { return "CHF " + n.toLocaleString("de-CH") + ".–"; };
    var clampInput = function (el) { var v = parseInt(el.value, 10), mn = +el.min || 1, mx = +el.max || 20; if (isNaN(v)) v = mn; v = Math.max(mn, Math.min(mx, v)); el.value = v; return v; };
    var renderCalc = function (anim) {
      var h = clampInput(H);
      V.max = String(h);
      var v = clampInput(V);
      var dom = d.getElementById("lieu-dom").checked;
      vrow.classList.toggle("is-off", !dom);
      vrow.querySelectorAll("input, button").forEach(function (x) { x.disabled = !dom; });
      var blocks = Math.floor(h / 5), rest = h % 5, cost = blocks * 400 + rest * 90, unit = h * 90;
      var tmin = dom ? v * 20 : 0, tmax = dom ? v * 50 : 0, L = [];
      if (blocks) L.push([blocks + " forfait" + (blocks > 1 ? "s" : "") + " formation (5 × 60’)", chf(blocks * 400)]);
      if (rest) L.push([rest + " h × CHF 90.–", chf(rest * 90)]);
      L.push(dom ? ["Déplacements : " + v + " × CHF 20.– à 50.–", chf(tmin) + " à " + chf(tmax)] : ["À distance : pas de déplacement", chf(0)]);
      lines.innerHTML = L.map(function (l) { return '<p><span class="op">' + l[0] + "</span><span>" + l[1] + "</span></p>"; }).join("");
      var lo = cost + tmin, hi = cost + tmax;
      total.textContent = lo === hi ? chf(lo) : chf(lo) + " à " + chf(hi);
      note.textContent = blocks ? "Économie grâce au forfait : " + chf(unit - cost) : "Le forfait de 5 heures revient à CHF 400.– au lieu de 450.–";
      if (anim && hasGsap && !calm) {
        gsap.fromTo(lines.children, { clipPath: "inset(-30% 100% -30% 0)" }, { clipPath: "inset(-30% 0% -30% 0)", duration: 0.55, stagger: 0.1, ease: "power2.out" });
        gsap.fromTo(total, { scale: 1.12, rotation: -3 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" });
      }
    };
    cf.addEventListener("click", function (e) {
      var b = e.target.closest("[data-step]");
      if (!b) return;
      var el = d.getElementById(b.dataset.for);
      el.value = (parseInt(el.value, 10) || 0) + parseInt(b.dataset.step, 10);
      renderCalc(true);
    });
    cf.addEventListener("change", function () { renderCalc(true); });
    cf.addEventListener("input", function (e) { if (e.target.type === "number" && e.target.value !== "") renderCalc(false); });
    cf.addEventListener("submit", function (e) { e.preventDefault(); });
    renderCalc(false);
  }

  /* ——— Contact : rendez-vous en trois étapes (simulation) ——— */
  var rf = d.getElementById("rdv-form");
  if (rf) {
    var cur = 1, stepsLi = rf.querySelectorAll(".rdv__steps li"), doneBox = rf.querySelector(".rdv__done");
    var pageEl = function (n) { return rf.querySelector('.rdv__page[data-step="' + n + '"]'); };
    var markSteps = function (n) {
      stepsLi.forEach(function (li) {
        var s = +li.dataset.s;
        li.removeAttribute("aria-current");
        li.classList.toggle("is-done", s < n);
        if (s === n) li.setAttribute("aria-current", "step");
      });
    };
    var show = function (from, to, dir, after) {
      var swap = function () { from.hidden = true; to.hidden = false; if (after) after(); };
      if (hasGsap && !calm) {
        gsap.to(from, { rotationY: -dir * 60, transformPerspective: 1200, transformOrigin: dir > 0 ? "0% 50%" : "100% 50%", autoAlpha: 0, duration: 0.32, ease: "power2.in", onComplete: function () {
          swap(); gsap.set(from, { clearProps: "all" });
          gsap.fromTo(to, { rotationY: dir * 50, transformPerspective: 1200, transformOrigin: dir > 0 ? "100% 50%" : "0% 50%", autoAlpha: 0 }, { rotationY: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity,visibility" });
        } });
      } else swap();
    };
    var go = function (n) {
      var dir = n > cur ? 1 : -1, from = pageEl(cur), to = pageEl(n);
      show(from, to, dir, function () {
        cur = n; markSteps(n);
        var f = to.querySelector("input, textarea, button");
        if (f) f.focus({ preventScroll: true });
      });
    };
    var locField = d.getElementById("loc-field");
    var syncLoc = function () { locField.hidden = !d.getElementById("l-dom").checked; };
    rf.addEventListener("change", function (e) { if (e.target.name === "lieu") syncLoc(); });
    syncLoc();
    rf.addEventListener("click", function (e) {
      if (e.target.closest("[data-next]")) go(cur + 1);
      else if (e.target.closest("[data-prev]")) go(cur - 1);
      else if (e.target.closest("[data-restart]")) {
        rf.reset(); syncLoc();
        doneBox.hidden = true;
        rf.querySelectorAll(".rdv__page").forEach(function (p) { p.hidden = +p.dataset.step !== 1; });
        cur = 1; markSteps(1);
        rf.querySelector(".rdv__page input").focus();
      }
    });
    var val = function (name) { return Array.prototype.map.call(rf.querySelectorAll('[name="' + name + '"]:checked'), function (x) { return x.value; }).join(", "); };
    var setErr = function (input, errId, bad) { input.setAttribute("aria-invalid", String(bad)); var er = d.getElementById(errId); er.hidden = !bad; if (bad) input.setAttribute("aria-describedby", errId); else input.removeAttribute("aria-describedby"); };
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var nom = d.getElementById("rdv-nom"), tel = d.getElementById("rdv-tel"), ok = d.getElementById("rdv-ok");
      var badNom = nom.value.trim().length < 2, badTel = tel.value.replace(/[^0-9]/g, "").length < 9, badOk = !ok.checked;
      setErr(nom, "err-nom", badNom); setErr(tel, "err-tel", badTel); setErr(ok, "err-ok", badOk);
      if (badNom || badTel || badOk) { (badNom ? nom : badTel ? tel : ok).focus(); return; }
      var rows = [
        ["Besoin", val("type") || "Non précisé"], ["Sujet", val("sujet") || "Non précisé"], ["Question", d.getElementById("rdv-msg").value.trim() || "Aucune"],
        ["Lieu", val("lieu") + (d.getElementById("l-dom").checked && d.getElementById("rdv-loc").value.trim() ? " · " + d.getElementById("rdv-loc").value.trim() : "")],
        ["Moment", val("moment") || "Non précisé"], ["Disponibilités", d.getElementById("rdv-dispo").value.trim() || "Non précisées"],
        ["Nom", nom.value.trim()], ["Téléphone", tel.value.trim()], ["E-mail", d.getElementById("rdv-mail").value.trim() || "Non indiqué"], ["Langue", val("langue")],
      ];
      var recap = d.getElementById("rdv-recap");
      recap.innerHTML = "";
      rows.forEach(function (r) { var div = d.createElement("div"), dt = d.createElement("dt"), dd = d.createElement("dd"); dt.textContent = r[0]; dd.textContent = r[1]; div.appendChild(dt); div.appendChild(dd); recap.appendChild(div); });
      show(pageEl(3), doneBox, 1, function () { stepsLi.forEach(function (li) { li.removeAttribute("aria-current"); li.classList.add("is-done"); }); doneBox.focus(); });
    });
    var topic = sess.get("iprof-topic");
    if (topic) {
      sess.del("iprof-topic");
      rf.querySelectorAll('[name="sujet"]').forEach(function (r) { if (r.value === topic) r.checked = true; });
    }
  }

  /* ——— Animations (désactivées en mode calme) ——— */
  var mm = null;
  function teardown() { if (mm) { mm.revert(); mm = null; } }

  function animate(firstLoad) {
    if (!hasGsap || calm || !window.ScrollTrigger) return;
    mm = gsap.matchMedia();
    mm.add({ desk: "(min-width: 900px)", mob: "(max-width: 899px)" }, function (c) {
      var desk = c.conditions.desk;
      var intro = gsap.timeline({ defaults: { ease: "power3.out" }, delay: arriving ? 0.5 : 0.1 });

      // Logo écrit à la plume
      var logoImg = d.querySelector(".site-header .logo__img");
      if (logoImg && firstLoad && !arriving) {
        intro.fromTo(logoImg, { clipPath: "inset(-10% 100% -10% 0)" }, { clipPath: "inset(-10% 0% -10% 0)", duration: 1.1, ease: "power2.inOut", clearProps: "clipPath" }, 0);
      }

      // Ouverture de page
      var hero = d.querySelector(".hero");
      if (hero) {
        var h1 = hero.querySelector("h1[data-split]");
        if (h1 && window.SplitText) {
          var sp = SplitText.create(h1, { type: "lines", mask: "lines", linesClass: "line" });
          intro.from(sp.lines, { yPercent: 110, duration: 0.95, stagger: 0.09 }, 0.15);
        }
        hero.querySelectorAll("[data-hand]").forEach(function (el, i) {
          intro.fromTo(el, { clipPath: "inset(-30% 100% -30% -5%)" }, { clipPath: "inset(-30% -5% -30% -5%)", duration: 0.9, ease: "power2.inOut" }, i ? 1.3 : 0.05);
        });
        intro.from(hero.querySelectorAll("[data-fade]"), { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.55);
        hero.querySelectorAll(".annot").forEach(function (a) { intro.call(function () { a.classList.add("is-on"); }, null, 1.05); });
        var fig = hero.querySelector("[data-ink]");
        if (fig) {
          intro.from(fig, { y: 40, rotation: 4, autoAlpha: 0, duration: 1.0 }, 0.2);
          intro.call(function () { requestInk(fig, 0); }, null, 0.3);
        }
        var note = hero.querySelector(".sticky-note");
        if (note) intro.from(note, { y: -70, rotation: -28, autoAlpha: 0, duration: 0.9, ease: "back.out(1.7)" }, 1.25);
        var hs = hero.querySelector(".stamp");
        if (hs) intro.from(hs, { scale: 1.6, autoAlpha: 0, duration: 0.45, ease: "power4.in" }, 1.35);
        var ruler = hero.querySelector(".ruler");
        if (ruler) {
          intro.fromTo(ruler, { clipPath: "inset(-20% 100% -20% 0)" }, { clipPath: "inset(-20% 0% -20% 0)", duration: 1, ease: "power2.inOut", clearProps: "clipPath" }, 0.95)
            .from(ruler.querySelectorAll("li"), { y: 18, autoAlpha: 0, stagger: 0.09, duration: 0.6 }, 1.25);
        }
      }

      // Croquis qui se dessinent et parallaxe
      d.querySelectorAll(".ph").forEach(function (ph) {
        var paths = ph.querySelectorAll(".sk"), washes = ph.querySelectorAll(".wash");
        var inHero = ph.hasAttribute("data-ink");
        var t = gsap.timeline({ paused: true, delay: inHero ? 0.6 : 0 });
        if (washes.length) t.from(washes, { scale: 0.5, opacity: 0, transformOrigin: "50% 50%", duration: 1.3, stagger: 0.12, ease: "power2.out" }, 0);
        if (paths.length && window.DrawSVGPlugin) t.from(paths, { drawSVG: "0%", duration: 1.1, stagger: { each: 0.018, from: "random" }, ease: "power1.inOut" }, 0.05);
        ScrollTrigger.create({ trigger: ph, start: "top 88%", once: true, onEnter: function () { t.play(); } });
        if (ph.hasAttribute("data-parallax")) {
          var inner = ph.querySelector(".sketch, .ph__frame > img, .ph__frame > picture");
          if (inner) gsap.fromTo(inner, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: ph, start: "top bottom", end: "bottom top", scrub: true } });
        }
      });

      // Titres de section
      d.querySelectorAll("[data-split]").forEach(function (h) {
        if (h.closest(".hero") || !window.SplitText) return;
        SplitText.create(h, {
          type: "lines", mask: "lines", autoSplit: true,
          onSplit: function (self) { return gsap.from(self.lines, { yPercent: 108, duration: 0.95, stagger: 0.09, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } }); },
        });
      });

      // Annotations
      d.querySelectorAll(".annot").forEach(function (a) {
        if (a.closest(".hero")) return;
        ScrollTrigger.create({ trigger: a, start: "top 82%", once: true, onEnter: function () { a.classList.add("is-on"); } });
      });
      circles.forEach(function (ci) {
        var inHero = !!ci.el.closest(".hero");
        gsap.fromTo(ci.path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", delay: inHero ? 1.2 : 0.1, scrollTrigger: inHero ? null : { trigger: ci.el, start: "top 85%", once: true } });
      });

      // Fiches qui tombent sur la page
      gsap.utils.toArray("[data-drop]").forEach(function (el, i) {
        gsap.from(el, { y: -60, rotation: i % 2 ? 6 : -6, autoAlpha: 0, duration: 1.1, ease: "back.out(1.3)", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
      });
      gsap.utils.toArray(".theme").forEach(function (el, i) {
        gsap.from(el, { y: 60, autoAlpha: 0, duration: 0.9, delay: (i % 3) * 0.08, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
      });

      // Le jargon corrigé au stylo rouge
      d.querySelectorAll(".jr").forEach(function (r) {
        var old = r.querySelector(".jr__old"), nw = r.querySelector(".jr__new");
        var tl = gsap.timeline({ scrollTrigger: desk ? { trigger: r, start: "top 72%", end: "top 38%", scrub: 0.6 } : { trigger: r, start: "top 80%", once: true } });
        var k = desk ? 1 : 0.55;
        tl.to(old.firstElementChild, { backgroundSize: "100% .5em", duration: 1 * k }).to(old, { color: "rgba(30,34,48,.55)", duration: 1 * k }, 0)
          .fromTo(nw, { clipPath: "inset(-30% 100% -30% -5%)" }, { clipPath: "inset(-30% -5% -30% -5%)", duration: 1.4 * k, ease: desk ? "none" : "power1.out" }, 0.6 * k);
      });
      if (desk) {
        var jh = d.querySelector(".jargon__head");
        if (jh) ScrollTrigger.create({ trigger: jh, start: "top " + (headerH() + 24), endTrigger: ".jargon__body", end: "bottom bottom", pin: true, pinSpacing: false });
      }

      // Galerie horizontale des piliers
      var hsEl = d.querySelector("[data-hs]");
      if (hsEl && desk) {
        var track = hsEl.querySelector(".hs__track");
        var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
        var tween = gsap.to(track, { x: function () { return -dist(); }, ease: "none", scrollTrigger: { trigger: hsEl, start: "center 55%", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
        hsEl.querySelectorAll(".pilier .ph").forEach(function (ph, i) {
          gsap.fromTo(ph, { rotation: i % 2 ? 6 : -6, y: 30 }, { rotation: i % 2 ? 1.2 : -1.4, y: 0, ease: "none", scrollTrigger: { trigger: ph, containerAnimation: tween, start: "left right", end: "center center", scrub: true } });
        });
      }

      // Carte du Léman
      var zone = d.querySelector("[data-zone] .map");
      if (zone) {
        var zt = gsap.timeline({ scrollTrigger: { trigger: zone, start: "top 78%", once: true } });
        if (window.DrawSVGPlugin) zt.from(zone.querySelector(".map__shore"), { drawSVG: "0%", duration: 1.4, ease: "power2.inOut" });
        zt.from(zone.querySelector(".map__water"), { opacity: 0, duration: 0.8 }, 0.5)
          .from(zone.querySelector(".map__zone"), { opacity: 0, scale: 0.6, transformOrigin: "15% 95%", duration: 1, ease: "power3.out" }, 0.6)
          .from(zone.querySelectorAll(".map__town"), { scale: 0, opacity: 0, transformOrigin: "50% 50%", stagger: 0.1, duration: 0.45, ease: "back.out(3)" }, 0.8)
          .from(zone.querySelectorAll(".map__lake, .map__note"), { opacity: 0, y: 10, stagger: 0.1, duration: 0.45 }, 1.1);
        if (window.DrawSVGPlugin) zt.from(zone.querySelectorAll(".map__arrow"), { drawSVG: "0%", duration: 0.6 }, "<");
        var bubble = d.querySelector(".map__bubble");
        if (bubble) zt.from(bubble, { scale: 0, rotation: -25, transformOrigin: "0% 100%", duration: 0.7, ease: "back.out(2.2)" }, "-=0.1");
      }

      // Compteurs
      d.querySelectorAll("[data-count]").forEach(function (el) {
        var o = { v: 0 }, n = +el.dataset.count;
        ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () { gsap.to(o, { v: n, duration: 1.8, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v); } }); } });
      });

      // Tampons
      d.querySelectorAll("[data-stamp]").forEach(function (el) {
        if (el.closest(".hero")) return;
        gsap.from(el, { scale: 1.6, autoAlpha: 0, duration: 0.45, ease: "power4.in", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onComplete: function () { gsap.fromTo(el, { y: 2 }, { y: 0, duration: 0.25 }); } });
      });

      // Chiffres écrits à la main
      d.querySelectorAll("[data-write]").forEach(function (el) {
        var group = el.closest("[data-ledger], .pricelist") || el.parentNode;
        var idx = Array.prototype.indexOf.call(group.querySelectorAll("[data-write]"), el);
        gsap.fromTo(el, { clipPath: "inset(-30% 100% -30% -5%)" }, { clipPath: "inset(-30% -5% -30% -5%)", duration: 0.9, delay: idx * 0.28, ease: "power2.inOut", scrollTrigger: { trigger: group, start: "top 80%", once: true } });
      });

      // Cases cochées
      d.querySelectorAll(".check").forEach(function (ch) {
        ScrollTrigger.create({ trigger: ch, start: "top 68%", once: true, onEnter: function () { ch.classList.add("is-done"); } });
      });

      // Cartes empilées (cours)
      if (desk) {
        var cards = gsap.utils.toArray(".stack__card");
        cards.forEach(function (card, i) {
          if (i === cards.length - 1) return;
          gsap.to(card, { scale: 0.94, rotation: i % 2 ? 1 : -1, ease: "none", scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top " + (headerH() + 40 + (i + 1) * 16) + "px", scrub: true } });
        });
      }

      // Citation surlignée mot à mot
      var q = d.querySelector("[data-quote] .bigquote");
      if (q) gsap.to(q.querySelectorAll(".w"), { backgroundSize: "100% .42em", stagger: 0.12, ease: "none", scrollTrigger: { trigger: q, start: "top 78%", end: "bottom 45%", scrub: 0.5 } });

      // Langues
      gsap.utils.toArray(".langs--big li").forEach(function (li, i) {
        gsap.from(li, { y: 50, rotation: i % 2 ? 10 : -10, autoAlpha: 0, duration: 0.9, delay: i * 0.12, ease: "back.out(1.5)", scrollTrigger: { trigger: li.parentNode, start: "top 85%", once: true } });
      });

      return function () { intro.kill(); };
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { sizeCircles(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  window.addEventListener("resize", function () { sizeCircles(); });

  startLenis();
  initPen();
  animate(true);
})();
