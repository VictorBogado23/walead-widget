/*!
 * WaLead Widget — Widget de WhatsApp con captura de leads
 * Uso mínimo:
 *   <script src="https://TU-DOMINIO/widget.js"
 *           data-phone="5491122334455"></script>
 *
 * Captura email + teléfono (con selector de país, formato E.164), publica
 * 'walead_submit' en el dataLayer (email y teléfono dentro de user_data) y
 * abre WhatsApp. Guardar el lead (Sheet, CRM, etc.) se hace desde GTM.
 *
 * Antes de enviar, el visitante debe aceptar la casilla de consentimiento.
 * Todos los atributos son opcionales salvo data-phone.
 * Ver el instructivo (INSTALACION.md) para la lista completa.
 *
 * MIT — libre para comercializar con tus clientes.
 */
(function () {
  "use strict";

  // Evita que se cargue dos veces en la misma página.
  if (window.__waLeadLoaded) return;
  window.__waLeadLoaded = true;

  // Config global opcional (para Google Tag Manager u otros loaders donde
  // document.currentScript no está disponible). Ej:
  //   window.WALEAD_CONFIG = { phone:"549...", name:"Mi negocio" };
  var GCFG = (typeof window !== "undefined" && window.WALEAD_CONFIG) || null;

  // El <script> que nos cargó (para leer sus data-attributes).
  var thisScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  // ------- Lectura de configuración -------
  // Prioridad: window.WALEAD_CONFIG  >  data-atributos del <script>  >  fallback.
  function attr(name, fallback) {
    // camelCase para la config global: "button-text" -> "buttonText"
    var camel = name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    if (GCFG && GCFG[camel] != null && GCFG[camel] !== "") return GCFG[camel];
    if (GCFG && GCFG[name] != null && GCFG[name] !== "") return GCFG[name];
    var v = thisScript ? thisScript.getAttribute("data-" + name) : null;
    return v === null || v === "" ? fallback : v;
  }
  // Para textos que se pueden quitar: a diferencia de attr(), un valor vacío
  // explícito (data-privacy="") significa "no mostrar", no "usar el fallback".
  function textAttr(name, fallback) {
    var camel = name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    if (GCFG && GCFG[camel] != null) return GCFG[camel];
    if (GCFG && GCFG[name] != null) return GCFG[name];
    var v = thisScript ? thisScript.getAttribute("data-" + name) : null;
    return v === null ? fallback : v;
  }

  // Nombre del negocio: se usa como título por defecto y como {negocio} en todos los textos.
  var NAME = String(attr("name", "") || "").trim();

  var cfg = {
    phone: String(attr("phone", "") || "").replace(/[^\d]/g, ""), // solo dígitos, con código de país
    color: attr("color", "#25D366"), // color de marca
    position: attr("position", "right"), // right | left
    title: attr("title", NAME || "¿Hablamos?"),
    subtitle: textAttr("subtitle", "Te respondemos por WhatsApp"), // vacío = no se muestra
    greeting: textAttr(
      "greeting",
      "¡Hola! 👋 Dejanos tu email y tu WhatsApp y seguimos la conversación por ahí."
    ),
    buttonText: attr("button-text", "Continuar en WhatsApp"),
    ctaText: attr("cta-text", ""), // globo de texto junto a la burbuja (opcional)
    avatar: attr("avatar", ""), // URL de foto/logo para el encabezado (opcional)
    // Plantilla del mensaje de WhatsApp: {negocio}, {email}, {phone}, {country}, {pagina}, {url}
    template: attr("template", "¡Hola! Quiero hacer una consulta."),
    country: String(attr("country", "") || "").toUpperCase(), // país por defecto (ISO, ej: AR)
    countries: String(attr("countries", "") || "").toUpperCase(), // países destacados arriba (ej: "AR,UY,PY")
    delay: parseInt(attr("delay", "0"), 10) || 0, // ms para abrir solo automáticamente (0 = no)
    // La casilla de consentimiento es obligatoria siempre; este atributo solo cambia el texto.
    consentText: attr("consent-text", "Acepto que usen mi email y mi WhatsApp para contactarme."),
    privacy: textAttr("privacy", ""), // línea opcional debajo del botón
    theme: String(attr("theme", "auto")).toLowerCase(), // auto | light | dark
    thanks: attr("thanks", "Te estamos llevando a WhatsApp para seguir la conversación."),
    // Selector CSS de elementos del sitio que abren el widget (ej: ".btn-contacto, a[href*='wa.me']").
    // Además, siempre funcionan [data-walead-open] y a[href="#walead"].
    triggers: attr("triggers", ""),
    launcher: String(attr("launcher", "true")) !== "false", // false = sin burbuja flotante
  };

  // {negocio} funciona en todos los textos visibles.
  ["title", "subtitle", "greeting", "buttonText", "ctaText", "privacy", "thanks"].forEach(function (k) {
    cfg[k] = String(cfg[k]).replace(/\{\s*negocio\s*\}/g, NAME);
  });
  cfg.consentText = String(cfg.consentText).replace(/\{\s*negocio\s*\}/g, NAME || "este sitio");

  // API pública. Las llamadas hechas antes de que el widget esté listo quedan en cola.
  //   WaLead.open()                 abre (y lleva el foco al formulario)
  //   WaLead.open({ focus: false }) abre sin mover el foco
  var api = null;
  var queue = [];
  window.WaLead = {
    open: function (o) { api ? api.open(o) : queue.push(["open", o]); },
    close: function () { api ? api.close() : queue.push(["close"]); },
    toggle: function () { api ? api.toggle() : queue.push(["toggle"]); },
  };

  if (!cfg.phone) {
    console.warn("[WaLead] Falta data-phone. El widget no se mostrará.");
    return;
  }

  // ------- Países -------
  // [ISO, nombre, código, ejemplo, mín. dígitos nacionales, máx. dígitos nacionales]
  var COUNTRIES = [
    ["AR", "Argentina", "54", "11 2345 6789", 10, 11],
    ["BO", "Bolivia", "591", "7123 4567", 8, 8],
    ["BR", "Brasil", "55", "11 91234 5678", 10, 11],
    ["CL", "Chile", "56", "9 1234 5678", 9, 9],
    ["CO", "Colombia", "57", "300 1234567", 10, 10],
    ["CR", "Costa Rica", "506", "8312 3456", 8, 8],
    ["CU", "Cuba", "53", "5 1234567", 8, 8],
    ["EC", "Ecuador", "593", "99 123 4567", 9, 9],
    ["SV", "El Salvador", "503", "7012 3456", 8, 8],
    ["GT", "Guatemala", "502", "5123 4567", 8, 8],
    ["HN", "Honduras", "504", "9123 4567", 8, 8],
    ["MX", "México", "52", "55 1234 5678", 10, 10],
    ["NI", "Nicaragua", "505", "8123 4567", 8, 8],
    ["PA", "Panamá", "507", "6123 4567", 7, 8],
    ["PY", "Paraguay", "595", "981 123456", 9, 9],
    ["PE", "Perú", "51", "912 345 678", 9, 9],
    ["PR", "Puerto Rico", "1", "787 234 5678", 10, 10],
    ["DO", "República Dominicana", "1", "809 234 5678", 10, 10],
    ["UY", "Uruguay", "598", "94 123 456", 8, 8],
    ["VE", "Venezuela", "58", "412 1234567", 10, 10],
    ["ES", "España", "34", "612 34 56 78", 9, 9],
    ["US", "Estados Unidos", "1", "201 555 0123", 10, 10],
    ["CA", "Canadá", "1", "506 234 5678", 10, 10],
    ["DE", "Alemania", "49", "1512 3456789", 6, 13],
    ["AU", "Australia", "61", "412 345 678", 9, 9],
    ["CN", "China", "86", "131 2345 6789", 11, 11],
    ["FR", "Francia", "33", "6 12 34 56 78", 9, 9],
    ["IN", "India", "91", "81234 56789", 10, 10],
    ["IL", "Israel", "972", "50 234 5678", 9, 9],
    ["IT", "Italia", "39", "312 345 6789", 6, 11],
    ["JP", "Japón", "81", "90 1234 5678", 10, 10],
    ["NL", "Países Bajos", "31", "6 12345678", 9, 9],
    ["PT", "Portugal", "351", "912 345 678", 9, 9],
    ["GB", "Reino Unido", "44", "7400 123456", 10, 10],
    ["CH", "Suiza", "41", "78 123 45 67", 9, 9],
  ].map(function (c) {
    return { iso: c[0], name: c[1], dial: c[2], example: c[3], min: c[4], max: c[5] };
  });

  function findCountry(iso) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
    return null;
  }

  // País inicial: data-country > idioma del navegador (es-AR, es-MX…) > primero destacado > AR.
  function detectCountry() {
    if (findCountry(cfg.country)) return cfg.country;
    var langs = (navigator.languages || [navigator.language || ""]);
    for (var i = 0; i < langs.length; i++) {
      var m = /-([A-Za-z]{2})$/.exec(langs[i] || "");
      if (m && findCountry(m[1].toUpperCase())) return m[1].toUpperCase();
    }
    var first = cfg.countries.split(",")[0];
    return findCountry(first) ? first : "AR";
  }

  // Orden de la lista: destacados (data-countries o el inicial) arriba, resto alfabético.
  function orderedCountries(initial) {
    var top = (cfg.countries ? cfg.countries.split(",") : [initial])
      .map(function (s) { return findCountry(s.trim()); })
      .filter(Boolean);
    var rest = COUNTRIES.filter(function (c) { return top.indexOf(c) === -1; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
    return { top: top, rest: rest };
  }

  // Si el número empieza con + o 00, detecta el país por el prefijo (el más largo gana).
  function countryFromIntl(raw, current) {
    var d = String(raw).replace(/\D/g, "");
    if (/^\s*00/.test(raw)) d = d.slice(2);
    if (current && d.indexOf(current.dial) === 0) return current;
    var best = null;
    COUNTRIES.forEach(function (c) {
      if (d.indexOf(c.dial) !== 0) return;
      // A igual prefijo gana el país principal (+1 → Estados Unidos).
      if (!best || c.dial.length > best.dial.length || (c.dial === best.dial && c.iso === "US")) best = c;
    });
    return best;
  }

  // Devuelve solo los dígitos nacionales, normalizados para E.164.
  function nationalDigits(raw, c) {
    var str = String(raw || "");
    var d = str.replace(/\D/g, "");
    var intl = /^\s*(\+|00)/.test(str);
    if (/^\s*00/.test(str)) d = d.slice(2);
    // Con "+código" explícito, o pegado con el código pero sin "+".
    if (d.indexOf(c.dial) === 0 && (intl || d.length > c.max)) d = d.slice(c.dial.length);
    if (c.iso !== "IT") d = d.replace(/^0+/, ""); // prefijo troncal local
    if (c.iso === "AR") {
      // 11 15 2345 6789  ->  11 2345 6789 (saca el "15" de celulares)
      if (d.length === 12) {
        for (var i = 2; i <= 4; i++) {
          if (d.substr(i, 2) === "15") { d = d.slice(0, i) + d.slice(i + 2); break; }
        }
      }
      if (d.length === 10) d = "9" + d; // celulares en formato internacional: +54 9 …
    }
    if (c.iso === "MX" && d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    return d;
  }

  function toE164(raw, c) {
    var d = nationalDigits(raw, c);
    if (d.length < c.min || d.length > c.max || (c.dial + d).length > 15) return "";
    return "+" + c.dial + d;
  }

  // ------- Sugerencia de errores de tipeo en el email -------
  var DOMAIN_FIX = {
    "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com",
    "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
    "gmail.cm": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com",
    "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com",
    "hotmail.con": "hotmail.com", "hotmail.co": "hotmail.com", "hotmil.com": "hotmail.com",
    "outlok.com": "outlook.com", "outlook.con": "outlook.com", "outllok.com": "outlook.com",
    "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "yahooo.com": "yahoo.com",
    "icloud.con": "icloud.com", "iclod.com": "icloud.com",
  };
  function emailSuggestion(email) {
    var at = email.lastIndexOf("@");
    if (at < 1) return "";
    var dom = email.slice(at + 1).toLowerCase();
    var fix = DOMAIN_FIX[dom] || (/\.con$/.test(dom) ? dom.replace(/\.con$/, ".com") : "");
    return fix ? email.slice(0, at + 1) + fix : "";
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // ------- Colores derivados del color de marca -------
  var BRAND = normHex(cfg.color) ? "#" + normHex(cfg.color) : "#25D366";
  var BRAND_DARK = shade(BRAND, -0.18);
  var ON_BRAND = pickTextColor(BRAND, BRAND_DARK); // texto legible sobre todo el degradé
  var INK = shade(BRAND, -0.45); // versión oscura para texto/links sobre blanco
  var INK_LIGHT = shade(BRAND, 0.55); // versión clara para texto/links sobre fondo oscuro
  var RING = hexA(BRAND, 0.22);
  var TINT = shade(BRAND, 0.93); // fondo suave del saludo (tema claro)
  var TINT_DARK = mix(BRAND, "#111a2b", 0.14); // fondo suave del saludo (tema oscuro)

  // ------- Estilos (dentro de Shadow DOM: no chocan con el sitio) -------
  var css = [
    ":host{all:initial}",
    ".wl{--wl-brand:" + BRAND + ";--wl-brand-d:" + BRAND_DARK + ";--wl-on:" + ON_BRAND + ";--wl-ink:" + INK + ";--wl-ring:" + RING + ";",
    "--wl-bg:#fff;--wl-text:#111b21;--wl-soft:#3b4a54;--wl-muted:#5f6f7a;--wl-line:#e9edef;--wl-field:#84929b;--wl-hover:#f0f2f5;--wl-chat:" + TINT + ";--wl-bubble:#fff;--wl-input:#f7f8fa;--wl-err:#d93036;--wl-edge:rgba(0,0,0,0);",
    "font-family:__WL_FONT__;font-size:14px;line-height:1.4;color:var(--wl-text);-webkit-font-smoothing:antialiased;}",
    ".wl.wl-dark{color-scheme:dark;--wl-ink:" + INK_LIGHT + ";--wl-bg:#111a2b;--wl-text:#eaf0fb;--wl-soft:#c3cede;--wl-muted:#9aa8bf;--wl-line:#26344d;--wl-field:#71819c;--wl-hover:#1b2740;--wl-chat:" + TINT_DARK + ";--wl-bubble:#1b2740;--wl-input:#0d1524;--wl-err:#ff8589;--wl-edge:rgba(255,255,255,.1)}",
    ".wl *,.wl *::before,.wl *::after{box-sizing:border-box}",
    ".wl button,.wl input{font-family:inherit}",
    "[hidden]{display:none!important}",

    // Burbuja
    ".wl-launch{position:fixed;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;padding:0;cursor:pointer;background:var(--wl-brand);color:var(--wl-on);display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.15),0 8px 28px rgba(0,0,0,.18);transition:transform .2s ease,opacity .2s ease}",
    ".wl-right .wl-launch{right:20px}.wl-left .wl-launch{left:20px}",
    ".wl-launch:hover{transform:translateY(-2px) scale(1.04)}",
    ".wl-launch:focus-visible{outline:3px solid var(--wl-ring);outline-offset:3px}",
    ".wl-launch svg{grid-area:1/1;transition:transform .25s ease,opacity .2s ease}",
    ".wl-launch .wl-i-wa{width:32px;height:32px}",
    ".wl-launch .wl-i-close{width:24px;height:24px;opacity:0;transform:rotate(-90deg) scale(.6)}",
    ".wl-open .wl-launch .wl-i-wa{opacity:0;transform:rotate(90deg) scale(.6)}",
    ".wl-open .wl-launch .wl-i-close{opacity:1;transform:none}",
    ".wl-launch::after{content:'';position:absolute;inset:0;border-radius:50%;animation:wl-pulse 2.4s ease-out 1.5s 3;pointer-events:none}",
    "@keyframes wl-pulse{0%{box-shadow:0 0 0 0 var(--wl-ring)}70%{box-shadow:0 0 0 18px rgba(0,0,0,0)}100%{box-shadow:0 0 0 0 rgba(0,0,0,0)}}",
    ".wl-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ff3b30;color:#fff;font-size:11px;font-weight:700;line-height:16px;text-align:center;border:2px solid #fff}",
    ".wl-seen .wl-badge,.wl-open .wl-badge{display:none}",

    // Globo CTA
    ".wl-cta{position:fixed;bottom:31px;z-index:2147483000;max-width:240px;background:var(--wl-bg);color:var(--wl-text);border:0;border-radius:18px;padding:9px 16px;font-size:14px;font-weight:600;box-shadow:0 4px 18px rgba(0,0,0,.14);cursor:pointer;opacity:0;transform:translateY(6px);transition:opacity .3s ease,transform .3s ease;pointer-events:none}",
    ".wl-right .wl-cta{right:92px}.wl-left .wl-cta{left:92px}",
    ".wl-cta.wl-show{opacity:1;transform:none;pointer-events:auto}",
    ".wl-open .wl-cta{opacity:0;pointer-events:none}",

    // Panel
    ".wl-panel{position:fixed;bottom:96px;z-index:2147483001;width:370px;max-width:calc(100vw - 32px);max-height:calc(100vh - 116px);display:flex;flex-direction:column;background:var(--wl-bg);border-radius:22px;overflow:hidden;box-shadow:0 0 0 1px var(--wl-edge),0 24px 60px -12px rgba(16,24,40,.28),0 4px 14px rgba(16,24,40,.08);opacity:0;visibility:hidden;transform:translateY(12px) scale(.96);transition:opacity .28s ease,transform .38s cubic-bezier(.16,1,.3,1),visibility 0s linear .38s}",
    ".wl-right .wl-panel{right:20px;transform-origin:bottom right}.wl-left .wl-panel{left:20px;transform-origin:bottom left}",
    ".wl-open .wl-panel{opacity:1;visibility:visible;transform:none;transition-delay:0s}",

    ".wl-head{display:flex;align-items:center;gap:12px;padding:14px 8px 14px 18px;background:linear-gradient(135deg,var(--wl-brand),var(--wl-brand-d));color:var(--wl-on);flex:0 0 auto}",
    ".wl-avatar{position:relative;flex:0 0 44px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}",
    ".wl-avatar.wl-logo{background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35)}",
    ".wl-avatar img{width:100%;height:100%;border-radius:50%;object-fit:contain;padding:4px}",
    ".wl-avatar .wl-dot{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;background:#25D366;color:#fff;display:grid;place-items:center;box-shadow:0 0 0 2px var(--wl-brand-d)}",
    ".wl-avatar .wl-dot svg{width:11px;height:11px}",
    ".wl-avatar svg{width:26px;height:26px}",
    ".wl-who{flex:1;min-width:0}",
    ".wl-title{font-size:16px;font-weight:700;line-height:1.25;margin:0}",
    ".wl-sub{font-size:13px;opacity:.88;margin-top:2px}",
    ".wl-x{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:0;padding:0;background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center;opacity:.85;transition:background .15s,opacity .15s}",
    ".wl-x:hover{background:rgba(127,127,127,.22);opacity:1}",
    ".wl-x:focus-visible{outline:2px solid currentColor;outline-offset:1px}",
    ".wl-x svg{width:20px;height:20px}",

    ".wl-content{overflow-y:auto;flex:1 1 auto;overscroll-behavior:contain}",
    ".wl-chat{background:var(--wl-chat);padding:16px 18px 16px 26px}",
    ".wl-msg{position:relative;max-width:90%;background:var(--wl-bubble);border-radius:4px 16px 16px 16px;padding:10px 14px 22px;box-shadow:0 1px 2px rgba(16,24,40,.06),0 2px 8px rgba(16,24,40,.05);font-size:14px;line-height:1.45;color:var(--wl-text);animation:wl-in .45s cubic-bezier(.16,1,.3,1) .18s both}",
    ".wl-msg p{margin:0}",
    ".wl-time{position:absolute;right:10px;bottom:4px;font-size:12px;color:var(--wl-muted)}",
    "@keyframes wl-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}",

    // Formulario
    ".wl-form{padding:18px 18px 20px}",
    ".wl-field{margin-bottom:14px;position:relative}",
    ".wl-field>label{display:block;font-size:13px;font-weight:600;color:var(--wl-soft);margin-bottom:6px}",
    ".wl-control{display:flex;align-items:center;height:48px;border:1px solid var(--wl-field);border-radius:14px;background:var(--wl-input);transition:border-color .15s,box-shadow .15s,background .15s}",
    ".wl-control:hover{border-color:var(--wl-soft)}",
    ".wl-control:focus-within{border-color:var(--wl-brand);background:var(--wl-bg);box-shadow:0 0 0 4px var(--wl-ring)}",
    ".wl-invalid .wl-control{border-color:var(--wl-err)}",
    ".wl-invalid .wl-control:focus-within{box-shadow:0 0 0 4px rgba(229,72,77,.18)}",
    ".wl-ic{display:grid;place-items:center;width:42px;color:var(--wl-muted);flex:0 0 auto}",
    ".wl-ic svg{width:18px;height:18px}",
    ".wl-control input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;font-size:16px;color:var(--wl-text);padding:0 14px 0 0;margin:0;border-radius:0 14px 14px 0}",
    ".wl-control input::placeholder{color:var(--wl-muted);opacity:1}",
    ".wl-ok{display:none;width:20px;height:20px;margin-right:12px;color:var(--wl-ink);flex:0 0 auto}",
    ".wl-valid .wl-ok{display:block}",

    ".wl-cc{display:flex;align-items:center;gap:6px;height:100%;padding:0 10px 0 12px;margin:0;border:0;border-right:1px solid var(--wl-line);background:transparent;cursor:pointer;color:var(--wl-text);font-size:14px;border-radius:13px 0 0 13px;flex:0 0 auto}",
    ".wl-cc:hover{background:var(--wl-hover)}",
    ".wl-cc:focus-visible{outline:2px solid var(--wl-brand);outline-offset:-3px}",
    ".wl-flag{width:22px;height:16px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.08);background:var(--wl-line);flex:0 0 auto}",
    ".wl-cc .wl-chev{width:14px;height:14px;color:var(--wl-muted);transition:transform .15s}",
    ".wl-cc[aria-expanded=true] .wl-chev{transform:rotate(180deg)}",
    ".wl-dial{font-variant-numeric:tabular-nums}",
    ".wl-phone input{padding-left:12px}",

    // Selector de país: capa sobre el panel, debajo del encabezado.
    ".wl-pop{position:absolute;left:10px;right:10px;top:84px;bottom:10px;z-index:5;display:flex;flex-direction:column;background:var(--wl-bg);border:1px solid var(--wl-line);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);overflow:hidden;animation:wl-in .15s ease}",
    ".wl-search{padding:8px;border-bottom:1px solid var(--wl-line);flex:0 0 auto}",
    ".wl-search input{width:100%;height:44px;border:1.5px solid var(--wl-field);border-radius:8px;padding:0 12px;font-size:16px;outline:0;margin:0;color:var(--wl-text);background:transparent}",
    ".wl-search input:focus{border-color:var(--wl-brand)}",
    ".wl-list{list-style:none;margin:0;padding:4px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}",
    ".wl-list li{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:14px}",
    ".wl-list li .wl-cn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".wl-list li .wl-cd{color:var(--wl-muted);font-variant-numeric:tabular-nums}",
    ".wl-list li.wl-active{background:var(--wl-hover)}",
    ".wl-list li[aria-selected=true]{font-weight:600}",
    ".wl-list li.wl-sep{height:1px;min-height:0;padding:0;margin:4px 6px;background:var(--wl-line);pointer-events:none}",
    ".wl-empty{padding:16px;color:var(--wl-muted);text-align:center;font-size:13px}",

    ".wl-err{display:none;align-items:flex-start;gap:4px;font-size:13px;color:var(--wl-err);margin-top:4px}",
    ".wl-err svg{width:14px;height:14px;flex:0 0 auto;margin-top:1px}",
    ".wl-invalid .wl-err{display:flex}",
    ".wl-suggest{margin-top:4px;font-size:13px;color:var(--wl-soft)}",
    ".wl-suggest button{border:0;background:none;padding:12px 0;margin:-12px 0;color:var(--wl-ink);font-size:inherit;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:2px}",

    ".wl-field>.wl-consent{display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:4px 0;font-size:13px;font-weight:400;color:var(--wl-soft);margin:0;cursor:pointer;line-height:1.4}",
    ".wl-consent input{-webkit-appearance:none;appearance:none;width:20px;height:20px;margin:0;flex:0 0 auto;cursor:pointer;border:1px solid var(--wl-field);border-radius:6px;background:var(--wl-input);display:grid;place-items:center;transition:background .15s,border-color .15s}",
    ".wl-consent input::after{content:'';width:5px;height:10px;border:solid var(--wl-on);border-width:0 2px 2px 0;transform:translateY(-1px) rotate(45deg) scale(0);transition:transform .15s cubic-bezier(.16,1,.3,1)}",
    ".wl-consent input:checked{background:var(--wl-brand);border-color:var(--wl-brand)}",
    ".wl-consent input:checked::after{transform:translateY(-1px) rotate(45deg) scale(1)}",
    ".wl-invalid .wl-consent input{border-color:var(--wl-err)}",
    ".wl-consent input:focus-visible{outline:3px solid var(--wl-ring);outline-offset:2px}",

    ".wl-submit{width:100%;height:52px;border:0;border-radius:999px;background:var(--wl-brand);color:var(--wl-on);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 6px 18px -4px var(--wl-ring),0 2px 6px var(--wl-ring);transition:filter .15s,transform .15s,box-shadow .15s;text-decoration:none}",
    ".wl-submit:hover{filter:brightness(1.06);transform:translateY(-1px)}",
    ".wl-submit:active{transform:scale(.985)}",
    ".wl-submit:focus-visible{outline:3px solid var(--wl-ring);outline-offset:2px}",
    ".wl-submit svg{width:22px;height:22px}",
    ".wl-privacy{display:flex;align-items:center;justify-content:center;gap:6px;margin:12px 0 0;font-size:12px;color:var(--wl-muted);text-align:center}",
    ".wl-privacy svg{width:13px;height:13px;flex:0 0 auto}",

    // Pantalla de éxito
    ".wl-done{padding:32px 24px 26px;text-align:center}",
    ".wl-check{width:64px;height:64px;border-radius:50%;margin:0 auto 14px;background:var(--wl-ring);color:var(--wl-ink);display:grid;place-items:center;animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.4)}",
    ".wl-check svg{width:32px;height:32px}",
    ".wl-done h4{margin:0 0 6px;font-size:16px;color:var(--wl-text)}",
    ".wl-done p{margin:0 0 20px;color:var(--wl-muted);font-size:14px}",
    "@keyframes wl-pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}",

    ".wl-backdrop{display:none}",

    // Sin burbuja: el panel se abre solo desde botones del sitio.
    ".wl-nolauncher .wl-launch,.wl-nolauncher .wl-cta{display:none}",
    ".wl-nolauncher .wl-panel{bottom:20px;max-height:calc(100vh - 40px)}",

    // Móvil: el panel sube desde abajo (bottom sheet)
    "@media (max-width:480px){",
    ".wl-panel{left:0!important;right:0!important;bottom:0;width:100%;max-width:100%;max-height:92vh;max-height:92dvh;border-radius:20px 20px 0 0;transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .2s ease,visibility 0s linear .3s}",
    ".wl-open .wl-panel{transform:none}",
    ".wl-nolauncher .wl-panel{bottom:0;max-height:92vh;max-height:92dvh}",
    ".wl-backdrop{display:block;position:fixed;inset:0;z-index:2147483000;background:rgba(11,20,26,.45);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility 0s linear .25s}",
    ".wl-open .wl-backdrop{opacity:1;visibility:visible;transition-delay:0s}",
    ".wl-open .wl-launch{opacity:0;pointer-events:none}",
    ".wl-launch{bottom:16px}.wl-right .wl-launch{right:16px}.wl-left .wl-launch{left:16px}",
    ".wl-cta{bottom:27px}.wl-right .wl-cta{right:86px}.wl-left .wl-cta{left:86px}",
    ".wl-form{padding-bottom:calc(16px + env(safe-area-inset-bottom))}",
    "}",

    "@media (prefers-reduced-motion:reduce){.wl *,.wl *::before,.wl *::after{animation:none!important;transition:none!important}}",
  ].join("");

  // ------- Íconos -------
  var waIcon =
    '<svg class="wl-i-wa" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.9 1 1-4.8-.2-.4C5.5 18.6 5 16.8 5 15 5 9 9.9 4 16 4s11 5 11 11-4.9 10-11 10zm6.1-7.5c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.8-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z"/></svg>';
  function stroke(path, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  }
  var closeIcon = stroke('<path d="M18 6 6 18M6 6l12 12"/>', "wl-i-close");
  var xIcon = stroke('<path d="M18 6 6 18M6 6l12 12"/>');
  var mailIcon = stroke('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>');
  var chevIcon = stroke('<path d="m6 9 6 6 6-6"/>', "wl-chev");
  var okIcon = stroke('<path d="M20 6 9 17l-5-5"/>', "wl-ok");
  var lockIcon = stroke('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
  var alertIcon = stroke('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>');
  var checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function flagUrl(iso) {
    return "https://flagcdn.com/w40/" + iso.toLowerCase() + ".png";
  }

  // ------- Almacenamiento (siempre tolerante a fallos) -------
  function store(kind, key, val) {
    try {
      var s = window[kind];
      if (val === undefined) return s.getItem(key);
      s.setItem(key, val);
    } catch (e) {}
    return null;
  }

  // ------- Construcción del DOM -------
  function build() {
    var host = document.createElement("div");
    host.id = "walead-widget";
    document.body.appendChild(host);
    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    var now = new Date();
    var hhmm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);

    var html =
      "<style>" + css.replace("__WL_FONT__", siteFont()) + "</style>" +
      '<div class="wl wl-' + (cfg.position === "left" ? "left" : "right") + (cfg.launcher ? "" : " wl-nolauncher") + '">' +
      '<div class="wl-backdrop"></div>' +
      '<div class="wl-panel" role="dialog" aria-modal="false" aria-labelledby="wl-title" aria-hidden="true">' +
        '<div class="wl-head">' +
          '<div class="wl-avatar' + (cfg.avatar ? " wl-logo" : "") + '">' +
            (cfg.avatar ? '<img src="' + escapeHtml(cfg.avatar) + '" alt=""><span class="wl-dot">' + waIcon + "</span>" : waIcon) +
          "</div>" +
          '<div class="wl-who"><h3 class="wl-title" id="wl-title">' + escapeHtml(cfg.title) + "</h3>" +
            (cfg.subtitle ? '<div class="wl-sub">' + escapeHtml(cfg.subtitle) + "</div>" : "") +
          "</div>" +
          '<button class="wl-x" type="button" aria-label="Cerrar">' + xIcon + "</button>" +
        "</div>" +
        '<div class="wl-content">' +
          (cfg.greeting
            ? '<div class="wl-chat"><div class="wl-msg"><p>' + escapeHtml(cfg.greeting) + '</p><span class="wl-time">' + hhmm + "</span></div></div>"
            : "") +
          '<form class="wl-form" novalidate>' +
            '<div class="wl-field" data-f="email">' +
              '<label for="wl-email">Email</label>' +
              '<div class="wl-control"><span class="wl-ic">' + mailIcon + "</span>" +
                '<input id="wl-email" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="nombre@ejemplo.com" aria-describedby="wl-email-err" required>' +
                okIcon +
              "</div>" +
              '<div class="wl-suggest" hidden></div>' +
              '<div class="wl-err" id="wl-email-err" role="alert">' + alertIcon + "<span></span></div>" +
            "</div>" +
            '<div class="wl-field" data-f="phone">' +
              '<label for="wl-phone">WhatsApp</label>' +
              '<div class="wl-control wl-phone">' +
                '<button type="button" class="wl-cc" aria-haspopup="listbox" aria-expanded="false">' +
                  '<img class="wl-flag" alt="" width="22" height="16"><span class="wl-dial"></span>' + chevIcon +
                "</button>" +
                '<input id="wl-phone" type="tel" name="phone" autocomplete="tel-national" inputmode="tel" aria-describedby="wl-phone-err" required>' +
                okIcon +
              "</div>" +
              '<div class="wl-err" id="wl-phone-err" role="alert">' + alertIcon + "<span></span></div>" +
            "</div>" +
            '<div class="wl-field" data-f="consent">' +
              '<label class="wl-consent"><input type="checkbox" id="wl-consent" name="consentimiento" aria-describedby="wl-consent-err" required><span>' + escapeHtml(cfg.consentText) + "</span></label>" +
              '<div class="wl-err" id="wl-consent-err" role="alert">' + alertIcon + "<span></span></div>" +
            "</div>" +
            '<button class="wl-submit" type="submit">' + waIcon + "<span>" + escapeHtml(cfg.buttonText) + "</span></button>" +
            (cfg.privacy ? '<p class="wl-privacy">' + lockIcon + "<span>" + escapeHtml(cfg.privacy) + "</span></p>" : "") +
          "</form>" +
          '<div class="wl-done" hidden>' +
            '<div class="wl-check">' + checkIcon + "</div>" +
            "<h4>¡Listo!</h4>" +
            "<p>" + escapeHtml(cfg.thanks) + "</p>" +
            '<a class="wl-submit wl-wa-link" target="_blank" rel="noopener">' + waIcon + "<span>Abrir WhatsApp</span></a>" +
          "</div>" +
        "</div>" +
        '<div class="wl-pop" hidden>' +
          '<div class="wl-search"><input type="text" placeholder="Buscar país o código" aria-label="Buscar país" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="wl-list"></div>' +
          '<ul class="wl-list" id="wl-list" role="listbox" aria-label="Países"></ul>' +
        "</div>" +
      "</div>" +
      (cfg.ctaText ? '<button class="wl-cta" type="button">' + escapeHtml(cfg.ctaText) + "</button>" : "") +
      '<button class="wl-launch" type="button" aria-label="Abrir chat de WhatsApp" aria-expanded="false">' +
        waIcon + closeIcon + '<span class="wl-badge" aria-hidden="true">1</span>' +
      "</button>" +
      "</div>";

    shadow.innerHTML = html;

    function $(sel) { return shadow.querySelector(sel); }
    var root = $(".wl");
    var panel = $(".wl-panel");
    var launch = $(".wl-launch");
    var cta = $(".wl-cta");
    var form = $(".wl-form");
    var done = $(".wl-done");
    var emailField = $('[data-f="email"]');
    var phoneField = $('[data-f="phone"]');
    var emailInput = $("#wl-email");
    var phoneInput = $("#wl-phone");
    var suggestBox = $(".wl-suggest");
    var ccBtn = $(".wl-cc");
    var pop = $(".wl-pop");
    var search = $(".wl-search input");
    var list = $(".wl-list");
    var consentField = $('[data-f="consent"]');
    var consentChk = $("#wl-consent");

    if (store("sessionStorage", "walead_seen")) root.classList.add("wl-seen");

    // El tema se revisa también al abrir: el sitio pudo cambiar entre claro y oscuro.
    function applyTheme() {
      root.classList.toggle("wl-dark", cfg.theme === "dark" || (cfg.theme !== "light" && siteIsDark()));
    }
    applyTheme();

    // En celular, el panel se apoya sobre el teclado para que el botón siga a la vista.
    function fitKeyboard() {
      var vv = window.visualViewport;
      var kb = vv && window.innerWidth <= 480 ? window.innerHeight - vv.height - vv.offsetTop : 0;
      panel.style.bottom = kb > 0 ? kb + "px" : "";
      panel.style.maxHeight = kb > 0 ? vv.height - 12 + "px" : "";
    }
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fitKeyboard);

    // ------- Abrir / cerrar -------
    var returnFocus = null; // elemento que abrió el panel (para devolverle el foco al cerrar)
    function isOpen() { return root.classList.contains("wl-open"); }
    function toggle(open, byUser, origen) {
      if (open === undefined) open = !isOpen();
      if (open === isOpen()) return;
      if (open) {
        track({ event: "walead_open", walead_origen: origen || "api" });
        applyTheme();
      }
      root.classList.toggle("wl-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      launch.setAttribute("aria-expanded", open ? "true" : "false");
      launch.setAttribute("aria-label", open ? "Cerrar chat de WhatsApp" : "Abrir chat de WhatsApp");
      if (open) {
        root.classList.add("wl-seen");
        store("sessionStorage", "walead_seen", "1");
        if (cta) cta.classList.remove("wl-show");
        // En escritorio llevamos el foco al primer campo; en táctil no (evita abrir el teclado).
        if (byUser && !form.hidden && window.matchMedia && matchMedia("(pointer:fine)").matches) {
          setTimeout(function () { emailInput.focus(); }, 260);
        }
      } else {
        closePop();
        store("sessionStorage", "walead_closed", "1");
        if (byUser) (returnFocus && document.contains(returnFocus) ? returnFocus : launch).focus();
        returnFocus = null;
      }
    }
    launch.addEventListener("click", function () { toggle(undefined, true, "burbuja"); });
    $(".wl-x").addEventListener("click", function () { toggle(false, true); });
    $(".wl-backdrop").addEventListener("click", function () { toggle(false, true); });
    if (cta && cfg.launcher) {
      cta.addEventListener("click", function () { toggle(true, true, "burbuja"); });
      setTimeout(function () { if (!isOpen()) cta.classList.add("wl-show"); }, 1200);
    }

    // Botones del sitio que abren el widget. Se escucha en fase de captura para
    // frenar la navegación del link (ej: un <a href="https://wa.me/…">) antes que nadie.
    var TRIGGERS = "[data-walead-open],a[href='#walead']" + (cfg.triggers ? "," + cfg.triggers : "");
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest || host.contains(t)) return;
      var hit = null;
      try { hit = t.closest(TRIGGERS); } catch (e) {
        console.warn("[WaLead] data-triggers no es un selector CSS válido:", cfg.triggers);
        TRIGGERS = "[data-walead-open],a[href='#walead']";
        return;
      }
      if (!hit) return;
      ev.preventDefault();
      returnFocus = hit;
      toggle(true, true, "boton");
    }, true);

    api = {
      open: function (o) { toggle(true, !(o && o.focus === false), "api"); },
      close: function () { toggle(false, true); },
      toggle: function () { toggle(undefined, true, "api"); },
    };
    queue.forEach(function (call) { api[call[0]](call[1]); });
    shadow.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && isOpen() && pop.hidden) toggle(false, true);
    });

    // Apertura automática (una vez por sesión, si no la cerró ni envió antes).
    if (cfg.delay > 0 && !store("sessionStorage", "walead_closed") && !store("sessionStorage", "walead_sent")) {
      setTimeout(function () { if (!isOpen()) toggle(true, false, "auto"); }, cfg.delay);
    }

    // ------- Selector de país -------
    var current = findCountry(detectCountry());
    var order = orderedCountries(current.iso);
    var visible = []; // países visibles en la lista filtrada
    var activeIdx = -1;

    function setCountry(c, keepFocus) {
      current = c;
      var img = ccBtn.querySelector(".wl-flag");
      img.src = flagUrl(c.iso);
      img.onerror = function () { img.style.display = "none"; };
      img.onload = function () { img.style.display = ""; };
      ccBtn.querySelector(".wl-dial").textContent = "+" + c.dial;
      ccBtn.setAttribute("aria-label", "País: " + c.name + " +" + c.dial + ". Cambiar país");
      phoneInput.placeholder = c.example;
      if (phoneField.classList.contains("wl-invalid") || phoneField.classList.contains("wl-valid")) validatePhone();
      if (keepFocus) phoneInput.focus();
    }

    function renderList(q) {
      q = (q || "").trim().toLowerCase().replace(/^\+/, "");
      var plain = function (s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; };
      var match = function (c) {
        return !q || plain(c.name.toLowerCase()).indexOf(plain(q)) !== -1 || c.dial.indexOf(q) === 0 || c.iso.toLowerCase() === q;
      };
      var top = order.top.filter(match);
      var rest = order.rest.filter(match);
      visible = top.concat(rest);
      var out = "";
      visible.forEach(function (c, i) {
        if (i === top.length && top.length && rest.length) out += '<li class="wl-sep" role="presentation"></li>';
        out +=
          '<li role="option" id="wl-opt-' + c.iso + '" data-i="' + i + '" aria-selected="' + (c === current) + '">' +
          '<img class="wl-flag" src="' + flagUrl(c.iso) + '" alt="" width="22" height="16" loading="lazy">' +
          '<span class="wl-cn">' + escapeHtml(c.name) + '</span><span class="wl-cd">+' + c.dial + "</span></li>";
      });
      list.innerHTML = out || '<li class="wl-empty" role="presentation">No encontramos ese país</li>';
      setActive(Math.max(0, visible.indexOf(current)));
    }

    function setActive(i) {
      var items = list.querySelectorAll('[role="option"]');
      if (!items.length) { activeIdx = -1; return; }
      activeIdx = Math.max(0, Math.min(i, items.length - 1));
      Array.prototype.forEach.call(items, function (li, k) { li.classList.toggle("wl-active", k === activeIdx); });
      var li = items[activeIdx];
      search.setAttribute("aria-activedescendant", li.id);
      var top = li.offsetTop, bottom = top + li.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top - 4;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 4;
    }

    function openPop() {
      pop.style.top = $(".wl-head").offsetHeight + 10 + "px";
      pop.hidden = false;
      ccBtn.setAttribute("aria-expanded", "true");
      search.value = "";
      renderList("");
      search.focus();
    }
    function closePop(focusBtn) {
      if (pop.hidden) return;
      pop.hidden = true;
      ccBtn.setAttribute("aria-expanded", "false");
      if (focusBtn) ccBtn.focus();
    }
    function choose(i) {
      if (!visible[i]) return;
      closePop();
      setCountry(visible[i], true);
    }

    ccBtn.addEventListener("click", function () { pop.hidden ? openPop() : closePop(true); });
    search.addEventListener("input", function () { renderList(search.value); });
    search.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); setActive(activeIdx + 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive(activeIdx - 1); }
      else if (ev.key === "Enter") { ev.preventDefault(); choose(activeIdx); }
      else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closePop(true); }
      else if (ev.key === "Tab") closePop();
    });
    // Si una bandera no carga, se oculta y queda solo el nombre y el código.
    list.addEventListener("error", function (ev) {
      if (ev.target.tagName === "IMG") ev.target.style.display = "none";
    }, true);
    list.addEventListener("click", function (ev) {
      var li = ev.target.closest('[role="option"]');
      if (li) choose(parseInt(li.getAttribute("data-i"), 10));
    });
    shadow.addEventListener("mousedown", function (ev) {
      if (!pop.hidden && !pop.contains(ev.target) && !ccBtn.contains(ev.target)) closePop();
    });

    // ------- Embudo: walead_open -> walead_start -> walead_submit -------
    var started = false;
    function markStart() {
      if (started) return;
      started = true;
      track({ event: "walead_start" });
    }
    form.addEventListener("input", markStart);
    ccBtn.addEventListener("click", markStart);

    // ------- Validación -------
    function setState(field, msg, valid) {
      field.classList.toggle("wl-invalid", !!msg);
      field.classList.toggle("wl-valid", !!valid);
      field.querySelector(".wl-err span").textContent = msg || "";
      field.querySelector("input:not([type=text])").setAttribute("aria-invalid", msg ? "true" : "false");
    }

    function validateEmail(silent) {
      var v = emailInput.value.trim();
      var msg = !v ? "Ingresá tu email" : !EMAIL_RE.test(v) ? "Revisá el email, parece incompleto" : "";
      var sug = !msg ? emailSuggestion(v) : "";
      suggestBox.hidden = !sug;
      if (sug) {
        suggestBox.innerHTML = "¿Quisiste decir <button type=\"button\">" + escapeHtml(sug) + "</button>?";
        suggestBox.querySelector("button").onclick = function () {
          emailInput.value = sug;
          validateEmail();
          phoneInput.focus();
        };
      }
      if (!silent) setState(emailField, msg, !msg);
      return !msg;
    }

    function validatePhone(silent) {
      var v = phoneInput.value.trim();
      var msg = !v ? "Ingresá tu número de WhatsApp" : !toE164(v, current) ? "Número inválido para " + current.name + ". Ej: " + current.example : "";
      if (!silent) setState(phoneField, msg, !msg);
      return !msg;
    }

    function validateConsent() {
      var ok = consentChk.checked;
      setState(consentField, ok ? "" : "Para continuar, aceptá el uso de tus datos");
      return ok;
    }

    // Si pegan el número con +código, cambiamos el país y dejamos solo el número local.
    function absorbIntlPrefix() {
      var v = phoneInput.value;
      if (!/^\s*(\+|00)/.test(v)) return;
      var c = countryFromIntl(v, current);
      if (!c) return;
      var digits = v.replace(/\D/g, "");
      if (/^\s*00/.test(v)) digits = digits.slice(2);
      phoneInput.value = digits.slice(c.dial.length);
      if (c !== current) setCountry(c);
    }

    emailInput.addEventListener("blur", function () { if (emailInput.value.trim()) validateEmail(); });
    emailInput.addEventListener("input", function () {
      if (emailField.classList.contains("wl-invalid") || emailField.classList.contains("wl-valid")) validateEmail();
    });
    phoneInput.addEventListener("blur", function () {
      absorbIntlPrefix();
      if (phoneInput.value.trim()) validatePhone();
    });
    phoneInput.addEventListener("paste", function () { setTimeout(absorbIntlPrefix, 0); });
    phoneInput.addEventListener("input", function () {
      // Solo dígitos y separadores comunes.
      var clean = phoneInput.value.replace(/[^\d\s()+.-]/g, "");
      if (clean !== phoneInput.value) phoneInput.value = clean;
      if (phoneField.classList.contains("wl-invalid") || phoneField.classList.contains("wl-valid")) validatePhone();
    });
    consentChk.addEventListener("change", function () { validateConsent(); });

    // ------- Prellenado (si el visitante ya dejó sus datos antes) -------
    var saved = null;
    try { saved = JSON.parse(store("localStorage", "walead_lead") || "null"); } catch (e) {}
    if (saved && findCountry(saved.pais)) current = findCountry(saved.pais);
    setCountry(current);
    if (saved) {
      if (saved.email) emailInput.value = saved.email;
      if (saved.nacional) phoneInput.value = saved.nacional;
    }

    // ------- Envío -------
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      markStart();
      absorbIntlPrefix();

      var okEmail = validateEmail();
      var okPhone = validatePhone();
      var okConsent = validateConsent();
      if (!okEmail) return emailInput.focus();
      if (!okPhone) return phoneInput.focus();
      if (!okConsent) return consentChk.focus();

      var email = emailInput.value.trim().toLowerCase();
      var telefono = toE164(phoneInput.value, current);
      var data = {
        lead_id: leadId(email, telefono),
        email: email,
        telefono: telefono,
        pais: current.iso,
      };

      pushLead(data);
      store("sessionStorage", "walead_sent", "1");
      store("localStorage", "walead_lead", JSON.stringify({
        id: data.lead_id,
        email: data.email,
        nacional: phoneInput.value.trim(),
        pais: current.iso,
      }));

      var msg = renderTemplate(cfg.template, {
        negocio: NAME,
        pagina: document.title,
        url: location.href,
        email: data.email,
        phone: data.telefono,
        telefono: data.telefono,
        country: current.name,
        pais: current.name,
      });
      var waUrl = "https://wa.me/" + cfg.phone + "?text=" + encodeURIComponent(msg);

      // Pantalla de éxito (con botón por si el navegador bloquea la ventana).
      $(".wl-wa-link").href = waUrl;
      form.hidden = true;
      var chat = $(".wl-chat");
      if (chat) chat.hidden = true;
      done.hidden = false;
      $(".wl-wa-link").focus();

      window.open(waUrl, "_blank", "noopener");
    });
  }

  // ------- Envío del lead -------
  // Publica el evento 'walead_submit' en el dataLayer. Desde GTM se manda a
  // GA4 / Google Ads / Meta / Sheet. Email y teléfono van solo en user_data.
  function pushLead(data) {
    // Candado anti-duplicado: si este navegador ya envió este lead_id, no se
    // cuenta otra conversión (el visitante igual va a WhatsApp).
    var previo = null;
    try { previo = JSON.parse(store("localStorage", "walead_lead") || "null"); } catch (e) {}
    window.__waLeadSent = window.__waLeadSent || {};
    if (window.__waLeadSent[data.lead_id] || (previo && previo.id === data.lead_id)) {
      track({ event: "walead_repeat", walead_lead_id: data.lead_id });
      return;
    }
    window.__waLeadSent[data.lead_id] = true;

    track({
      event: "walead_submit",       // <- activador en GTM
      walead_lead_id: data.lead_id, // ID de transacción / event_id: evita contar doble
      // Formato que esperan GA4 / Google Ads para datos proporcionados por el usuario.
      user_data: {
        email: data.email,
        phone_number: data.telefono, // E.164: +5491122334455
        address: { country: data.pais },
      },
    });
  }

  function track(ev) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(ev);
    } catch (e) {}
  }

  // ID estable del lead: misma persona + mismo negocio = mismo ID en cualquier
  // navegador o dispositivo. Es lo que evita filas y conversiones duplicadas.
  function leadId(email, telefono) {
    var str = cfg.phone + "|" + email + "|" + telefono;
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var hex = function (n) { return ("0000000" + (n >>> 0).toString(16)).slice(-8); };
    return "wl_" + hex(h2) + hex(h1);
  }

  // ------- Integración visual con el sitio -------
  var FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  // Usa la fuente del sitio; las fuentes de la página también valen dentro del Shadow DOM.
  function siteFont() {
    var f = "";
    try { f = getComputedStyle(document.body).fontFamily || ""; } catch (e) {}
    f = f.replace(/[<>{};]/g, "").trim();
    return f ? f + "," + FONT_STACK : FONT_STACK;
  }
  // Mira el fondo real del sitio: body y, si es transparente, html.
  function siteIsDark() {
    var els = [document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) {
      var m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(els[i]).backgroundColor || "");
      if (!m) continue;
      var p = m[1].split(/[\s,/]+/).map(parseFloat);
      if (p.length > 3 && p[3] === 0) continue;
      return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] < 110;
    }
    return false;
  }

  // ------- Helpers -------
  function renderTemplate(tpl, data) {
    return tpl
      .replace(/\{([^}]+)\}/g, function (_, key) {
        var v = data[key.trim()];
        return v ? v : "";
      })
      .replace(/[ \t]{2,}/g, " ") // espacios dobles que deja una variable vacía
      .trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normHex(hex) {
    var c = String(hex || "").trim().replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return /^[0-9a-f]{6}$/i.test(c) ? c : "";
  }
  function rgb(hex) {
    var c = normHex(hex);
    return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); });
  }
  // pct < 0 oscurece, pct > 0 aclara.
  function shade(hex, pct) {
    return "#" + rgb(hex).map(function (v) {
      v = Math.round(pct < 0 ? v * (1 + pct) : v + (255 - v) * pct);
      return ("0" + v.toString(16)).slice(-2);
    }).join("");
  }
  // Mezcla a con b: t = proporción de a.
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return "#" + x.map(function (v, i) {
      return ("0" + Math.round(v * t + y[i] * (1 - t)).toString(16)).slice(-2);
    }).join("");
  }
  function hexA(hex, a) {
    return "rgba(" + rgb(hex).join(",") + "," + a + ")";
  }

  // Luminancia relativa y contraste según WCAG 2.
  function luminance(hex) {
    var c = rgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  // Elige negro o blanco: el que mejor se lee en el peor punto de los fondos dados.
  function pickTextColor() {
    var bgs = Array.prototype.slice.call(arguments);
    function worst(ink) {
      return Math.min.apply(null, bgs.map(function (bg) { return contrast(ink, bg); }));
    }
    return worst("#ffffff") >= worst("#111111") ? "#ffffff" : "#111111";
  }

  // ------- Arranque cuando el DOM está listo -------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
