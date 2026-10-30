// Dépêches du Cœur — affichage de l'édition du jour.
// Lit edition.json, applique le mode de caviardage choisi et gère le choix quotidien.

(function () {
  "use strict";

  var MODES = ["barres", "initiales", "periphrase"];
  var LOCK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';
  var HEART_SVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path></svg>';

  var app = document.getElementById("app");
  var edition = null;

  // --- Stockage local (peut être indisponible : navigation privée, etc.) ---
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* tant pis : le choix ne sera pas mémorisé */ }
  }

  var memoryChoice = null;
  function getMode() {
    var m = load("ddc-masque", "barres");
    return MODES.indexOf(m) >= 0 ? m : "barres";
  }
  function getChoice() { return load("ddc-choix-" + edition.date, memoryChoice); }
  function setChoice(id) { memoryChoice = id; save("ddc-choix-" + edition.date, id); }

  // --- Outils ---
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k]; // réservé aux icônes constantes
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fill(text) {
    var mode = getMode();
    return String(text).replace(/\[\[([A-Z_]+)\]\]/g, function (m, key) {
      var mask = edition.masques[key];
      return mask ? (mask[mode] || mask.barres) : m;
    });
  }

  function frenchDate(iso) {
    var d = new Date(iso + "T12:00:00Z");
    var s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function wire(story, label) {
    return el("div", { className: "wire" }, [
      el("div", { className: "wire-head" }, [
        el("span", { text: label }),
        el("span", { text: story.source })
      ]),
      el("p", { text: fill(story.depeche) })
    ]);
  }

  // --- Vue : édition du jour ---
  function renderEdition() {
    var chosen = getChoice();
    var grid = el("div", { className: "grid" });

    edition.nouvelles.forEach(function (s, i) {
      var isChosen = chosen === s.id;
      var isLocked = chosen && !isChosen;
      var foot;

      if (!chosen) {
        foot = el("button", {
          type: "button", className: "btn",
          onclick: function () { setChoice(s.id); render(); }
        }, ["Choisir cette histoire"]);
      } else if (isChosen) {
        foot = el("a", { className: "btn read", href: "#lire/" + s.id }, ["Lire la nouvelle"]);
      } else {
        foot = el("div", { className: "lock", html: LOCK_SVG });
        foot.appendChild(document.createTextNode("Fermée jusqu’à demain"));
      }

      grid.appendChild(el("article", {
        className: "card" + (isChosen ? " chosen" : "") + (isLocked ? " locked" : "")
      }, [
        wire(s, "La dépêche"),
        el("div", { className: "card-body" }, [
          el("div", { className: "becomes" }, [
            el("span", { className: "becomes-label", text: "↳ devient" }),
            el("span", { className: "pill", text: s.trope })
          ]),
          el("h3", { text: s.titre }),
          el("p", { className: "teaser", text: s.accroche }),
          el("p", { className: "meta", text: "Nouvelle n° " + (i + 1) + " · " + s.duree })
        ]),
        el("div", { className: "card-foot" }, [foot])
      ]));
    });

    var parts = [
      el("section", { className: "section-head" }, [
        el("h2", { text: "Aujourd’hui, choisissez votre liaison." }),
        el("p", { text: "Une seule histoire par jour. Les deux autres s’effacent dès que votre cœur a choisi." })
      ]),
      grid
    ];

    if (chosen) {
      parts.push(el("div", { className: "chosen-note" }, [
        el("p", { text: "Votre cœur a choisi. Les deux autres histoires s’effaceront à minuit ; trois nouvelles dépêches arriveront avec le café." }),
        edition.demo ? el("button", {
          type: "button", className: "ghost",
          onclick: function () { setChoice(null); render(); }
        }, ["Rejouer (démo)"]) : null
      ]));
    }

    app.replaceChildren.apply(app, parts);
  }

  // --- Vue : lecture ---
  function renderStory(id) {
    var idx = -1;
    edition.nouvelles.forEach(function (s, i) { if (s.id === id) idx = i; });
    var chosen = getChoice();

    // Une nouvelle ne se lit que si c'est celle qu'on a choisie aujourd'hui.
    if (idx < 0 || (chosen && chosen !== id)) { location.hash = ""; return; }
    if (!chosen) setChoice(id);

    var s = edition.nouvelles[idx];
    var text = el("div", { className: "story-text" },
      s.paragraphes.map(function (p) { return el("p", { text: fill(p) }); }));
    var title = el("h2", { text: s.titre, tabindex: "-1" });

    app.replaceChildren(el("article", { className: "story" }, [
      el("a", { className: "back", href: "#" }, ["← Retour à l’édition du jour"]),
      el("div", { className: "story-kicker" }, [
        el("span", { className: "pill", text: s.trope }),
        el("span", { className: "meta", text: "Nouvelle n° " + (idx + 1) + " · " + s.duree })
      ]),
      title,
      el("p", { className: "byline", text: "Par une machine qui a lu la presse ce matin" }),
      wire(s, "La dépêche d’origine"),
      text,
      el("div", { className: "heart", html: HEART_SVG }),
      el("p", { className: "fin", text: "Fin. Demain, trois nouvelles dépêches et trois nouveaux cœurs." }),
      el("p", { className: "disclaimer", text: "Cette nouvelle a été écrite par une IA à partir d’un sujet d’actualité réel. Les noms propres sont masqués ; les sentiments sont inventés." })
    ]));
    title.focus({ preventScroll: true });
  }

  // --- Navigation et réglages ---
  function render() {
    var m = location.hash.match(/^#lire\/([\w-]+)$/);
    if (m) renderStory(m[1]); else renderEdition();
  }

  function renderChrome() {
    document.getElementById("dateline").textContent =
      frenchDate(edition.date) + " · Édition n° " + String(edition.numero).padStart(3, "0");

    var ticker = document.getElementById("ticker");
    edition.tendances.forEach(function (t) { ticker.appendChild(el("span", { text: t })); });

    if (edition.demo) {
      var notice = document.getElementById("notice");
      notice.textContent = "Prototype : les nouvelles de cette édition ont été écrites à la main pour tester le ton. La génération automatique arrive bientôt.";
      notice.hidden = false;
    }
  }

  function syncMaskButtons() {
    var mode = getMode();
    document.querySelectorAll("[data-mask]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-mask") === mode));
    });
  }

  document.querySelectorAll("[data-mask]").forEach(function (b) {
    b.addEventListener("click", function () {
      save("ddc-masque", b.getAttribute("data-mask"));
      syncMaskButtons();
      if (edition) render();
    });
  });

  window.addEventListener("hashchange", function () {
    if (!edition) return;
    render();
    window.scrollTo(0, 0);
  });

  syncMaskButtons();

  fetch("edition.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { edition = data; renderChrome(); render(); })
    .catch(function () {
      app.replaceChildren(el("p", { className: "loading", text: "L’édition du jour n’a pas pu être chargée. Réessayez dans un instant." }));
    });
})();
