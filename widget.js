
Claude Desktop (Windows), Conectado






























Widget · JS
/*!
 * WaLead Widget — Widget de WhatsApp con captura de leads
 * Uso mínimo:
 *   <script src="https://TU-DOMINIO/widget.js"
 *           data-phone="5491122334455"
 *           data-sheet="https://script.google.com/macros/s/XXXX/exec"></script>
 *
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
 
  // El <script> que nos cargó (para leer sus data-attributes).
  var thisScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();
 
  // ------- Lectura de configuración desde los data-attributes -------
  function attr(name, fallback) {
    var v = thisScript.getAttribute("data-" + name);
    return v === null || v === "" ? fallback : v;
  }
  function boolAttr(name, fallback) {
    var v = thisScript.getAttribute("data-" + name);
    if (v === null) return fallback;
    return v === "true" || v === "1" || v === "";
  }
 
  var cfg = {
    phone: (attr("phone", "") || "").replace(/[^\d]/g, ""), // solo dígitos, con código de país
    sheet: attr("sheet", ""), // URL del Apps Script (opcional)
    color: attr("color", "#25D366"), // color de marca
    position: attr("position", "right"), // right | left
    title: attr("title", "¿Hablamos?"),
    subtitle: attr("subtitle", "Dejanos tus datos y te escribimos por WhatsApp."),
    buttonText: attr("button-text", "Iniciar chat"),
    ctaText: attr("cta-text", ""), // texto junto a la burbuja (opcional)
    // Campos del formulario: lista separada por comas.
    // Cada campo: clave o clave:etiqueta  (ej: "name:Nombre,phone:Teléfono,email,message:Consulta")
    fields: attr("fields", "name:Nombre,phone:Teléfono,message:Mensaje"),
    // Plantilla del mensaje de WhatsApp. Usa {campo} para interpolar.
    template: attr(
      "template",
      "Hola! Soy {name}. Mi teléfono: {phone}. {message}"
    ),
    greeting: attr("greeting", ""), // saludo interno arriba del form (opcional)
    currency: attr("currency", ""), // moneda enviada al Sheet (ej: ARS). Vacío por defecto.
    delay: parseInt(attr("delay", "0"), 10) || 0, // ms para abrir solo automáticamente (0 = no)
    consentText: attr("consent-text", ""), // si se define, muestra checkbox de consentimiento
    thanks: attr("thanks", "¡Gracias! Te estamos redirigiendo a WhatsApp…"),
  };
 
  if (!cfg.phone) {
    console.warn("[WaLead] Falta data-phone. El widget no se mostrará.");
    return;
  }
 
  // ------- Parseo de campos -------
  // Devuelve [{key, label, type, required}]
  function parseFields(str) {
    return str
      .split(",")
      .map(function (raw) {
        var part = raw.trim();
        if (!part) return null;
        var required = false;
        if (part.slice(-1) === "*") {
          required = true;
          part = part.slice(0, -1);
        }
        var bits = part.split(":");
        var key = bits[0].trim();
        var label = (bits[1] || key).trim();
        var type = "text";
        if (/mail/i.test(key)) type = "email";
        else if (/(phone|tel|whats|cel|movil|móvil)/i.test(key)) type = "tel";
        else if (/(message|mensaje|consulta|comentario)/i.test(key)) type = "textarea";
        // name, phone y email son requeridos por defecto
        if (/^(name|nombre|phone|tel|email|mail)$/i.test(key)) required = true;
        return { key: key, label: label, type: type, required: required };
      })
      .filter(Boolean);
  }
  var fields = parseFields(cfg.fields);
 
  var TEXT_ON = pickTextColor(cfg.color); // color de texto legible sobre el color de marca
 
  // ------- Estilos (aislados con prefijo .wl-) -------
  var css =
    "" +
    ".wl-root{position:fixed;bottom:20px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
    ".wl-right{right:20px;}.wl-left{left:20px;}" +
    ".wl-bubble{display:flex;align-items:center;gap:10px;cursor:pointer;background:" +
    cfg.color +
    ";color:" +
    TEXT_ON +
    ";border:none;border-radius:50px;padding:0;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease;}" +
    ".wl-bubble:hover{transform:scale(1.05);}" +
    ".wl-bubble .wl-ico{width:60px;height:60px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}" +
    ".wl-bubble .wl-ico svg{width:34px;height:34px;}" +
    ".wl-cta{padding-right:20px;font-weight:600;font-size:15px;white-space:nowrap;}" +
    ".wl-panel{position:absolute;bottom:78px;width:330px;max-width:calc(100vw - 40px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .2s ease,transform .2s ease;}" +
    ".wl-right .wl-panel{right:0;}.wl-left .wl-panel{left:0;}" +
    ".wl-open .wl-panel{opacity:1;transform:translateY(0);pointer-events:auto;}" +
    ".wl-head{background:" +
    cfg.color +
    ";color:" +
    TEXT_ON +
    ";padding:16px 18px;position:relative;}" +
    ".wl-head h3{margin:0;font-size:16px;font-weight:700;}" +
    ".wl-head p{margin:4px 0 0;font-size:13px;opacity:.9;line-height:1.35;}" +
    ".wl-x{position:absolute;top:12px;right:12px;background:transparent;border:none;color:" +
    TEXT_ON +
    ";font-size:20px;line-height:1;cursor:pointer;opacity:.8;padding:2px 6px;}" +
    ".wl-x:hover{opacity:1;}" +
    ".wl-body{padding:16px 18px;}" +
    ".wl-greet{font-size:13px;color:#444;margin:0 0 12px;line-height:1.4;background:#f4f6f8;padding:10px 12px;border-radius:10px;}" +
    ".wl-field{margin-bottom:12px;}" +
    ".wl-field label{display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px;}" +
    ".wl-field label .wl-req{color:#e53935;}" +
    ".wl-field input,.wl-field textarea{width:100%;box-sizing:border-box;border:1px solid #d5dbe0;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;}" +
    ".wl-field input:focus,.wl-field textarea:focus{border-color:" +
    cfg.color +
    ";}" +
    ".wl-field textarea{resize:vertical;min-height:64px;}" +
    ".wl-field.wl-err input,.wl-field.wl-err textarea{border-color:#e53935;}" +
    ".wl-errmsg{color:#e53935;font-size:11px;margin-top:3px;display:none;}" +
    ".wl-field.wl-err .wl-errmsg{display:block;}" +
    ".wl-consent{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#555;margin-bottom:12px;line-height:1.35;}" +
    ".wl-consent input{margin-top:2px;}" +
    ".wl-submit{width:100%;background:" +
    cfg.color +
    ";color:" +
    TEXT_ON +
    ";border:none;border-radius:10px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:filter .15s;}" +
    ".wl-submit:hover{filter:brightness(.95);}" +
    ".wl-submit:disabled{opacity:.6;cursor:default;}" +
    ".wl-submit svg{width:20px;height:20px;}" +
    ".wl-thanks{text-align:center;padding:26px 18px;font-size:14px;color:#333;line-height:1.5;}" +
    ".wl-thanks svg{width:46px;height:46px;color:" +
    cfg.color +
    ";margin-bottom:10px;}" +
    ".wl-foot{text-align:center;font-size:10px;color:#9aa4ad;padding:0 0 12px;}" +
    ".wl-foot a{color:#9aa4ad;text-decoration:none;}" +
    "@media (max-width:420px){.wl-panel{width:calc(100vw - 32px);}}";
 
  var waIcon =
    '<svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.9 1 1-4.8-.2-.4C5.5 18.6 5 16.8 5 15 5 9 9.9 4 16 4s11 5 11 11-4.9 10-11 10zm6.1-7.5c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.8-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z"/></svg>';
  var checkIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
 
  // ------- Construcción del DOM -------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
 
  function build() {
    var style = el("style");
    style.textContent = css;
    document.head.appendChild(style);
 
    var root = el("div", "wl-root wl-" + (cfg.position === "left" ? "left" : "right"));
 
    // Panel
    var panel = el("div", "wl-panel");
    var head = el("div", "wl-head");
    head.appendChild(el("h3", null, escapeHtml(cfg.title)));
    if (cfg.subtitle) head.appendChild(el("p", null, escapeHtml(cfg.subtitle)));
    var closeBtn = el("button", "wl-x", "&times;");
    closeBtn.setAttribute("aria-label", "Cerrar");
    head.appendChild(closeBtn);
    panel.appendChild(head);
 
    var body = el("div", "wl-body");
    var form = el("form", "wl-form");
    form.setAttribute("novalidate", "novalidate");
 
    if (cfg.greeting) body.appendChild(el("p", "wl-greet", escapeHtml(cfg.greeting)));
 
    fields.forEach(function (f) {
      var wrap = el("div", "wl-field");
      wrap.setAttribute("data-key", f.key);
      var lab = el(
        "label",
        null,
        escapeHtml(f.label) + (f.required ? ' <span class="wl-req">*</span>' : "")
      );
      wrap.appendChild(lab);
      var input;
      if (f.type === "textarea") {
        input = el("textarea");
      } else {
        input = el("input");
        input.type = f.type;
      }
      input.name = f.key;
      input.setAttribute("data-key", f.key);
      if (f.type === "tel") input.setAttribute("inputmode", "tel");
      wrap.appendChild(input);
      wrap.appendChild(el("div", "wl-errmsg", "Este campo es obligatorio"));
      form.appendChild(wrap);
    });
 
    if (cfg.consentText) {
      var cons = el("label", "wl-consent");
      var chk = el("input");
      chk.type = "checkbox";
      chk.className = "wl-consent-chk";
      cons.appendChild(chk);
      cons.appendChild(el("span", null, escapeHtml(cfg.consentText)));
      form.appendChild(cons);
    }
 
    var submit = el(
      "button",
      "wl-submit",
      waIcon + "<span>" + escapeHtml(cfg.buttonText) + "</span>"
    );
    submit.type = "submit";
    form.appendChild(submit);
    body.appendChild(form);
 
    var foot = el(
      "div",
      "wl-foot",
      'Protegido — tus datos solo se usan para contactarte.'
    );
    body.appendChild(foot);
    panel.appendChild(body);
 
    // Burbuja
    var bubble = el("button", "wl-bubble");
    bubble.setAttribute("aria-label", "Abrir chat de WhatsApp");
    bubble.appendChild(el("span", "wl-ico", waIcon));
    if (cfg.ctaText) bubble.appendChild(el("span", "wl-cta", escapeHtml(cfg.ctaText)));
 
    root.appendChild(panel);
    root.appendChild(bubble);
    document.body.appendChild(root);
 
    // ------- Interacción -------
    function toggle(open) {
      if (open === undefined) open = !root.classList.contains("wl-open");
      root.classList.toggle("wl-open", open);
    }
    bubble.addEventListener("click", function () {
      toggle();
    });
    closeBtn.addEventListener("click", function () {
      toggle(false);
    });
 
    // Apertura automática con delay opcional
    if (cfg.delay > 0) {
      setTimeout(function () {
        toggle(true);
      }, cfg.delay);
    }
 
    // Validación de un campo
    function validateField(wrap) {
      var f = fields.filter(function (x) {
        return x.key === wrap.getAttribute("data-key");
      })[0];
      var input = wrap.querySelector("input,textarea");
      var val = (input.value || "").trim();
      var msg = "";
      if (f.required && !val) msg = "Este campo es obligatorio";
      else if (val && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
        msg = "Email inválido";
      else if (val && f.type === "tel" && !/^[\d\s()+.-]{6,}$/.test(val))
        msg = "Teléfono inválido";
      if (msg) {
        wrap.classList.add("wl-err");
        wrap.querySelector(".wl-errmsg").textContent = msg;
        return false;
      }
      wrap.classList.remove("wl-err");
      return true;
    }
    form.addEventListener("input", function (ev) {
      var wrap = ev.target.closest(".wl-field");
      if (wrap && wrap.classList.contains("wl-err")) validateField(wrap);
    });
 
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
 
      var ok = true;
      var data = {};
      Array.prototype.forEach.call(form.querySelectorAll(".wl-field"), function (wrap) {
        if (!validateField(wrap)) ok = false;
        var input = wrap.querySelector("input,textarea");
        data[wrap.getAttribute("data-key")] = (input.value || "").trim();
      });
 
      // Consentimiento obligatorio si está configurado
      if (cfg.consentText) {
        var chkEl = form.querySelector(".wl-consent-chk");
        if (chkEl && !chkEl.checked) {
          ok = false;
          chkEl.parentNode.style.color = "#e53935";
        }
      }
      if (!ok) return;
 
      submit.disabled = true;
 
      // Metadatos útiles para el CRM
      var meta = {
        page_url: location.href,
        page_title: document.title,
        referrer: document.referrer || "",
        utm: getUTMs(),
        timestamp: new Date().toISOString(),
      };
 
      // 1) Guardar el lead en Google Sheets (si está configurado). No bloquea el WhatsApp.
      saveLead(data, meta);
 
      // 2) Armar y abrir el enlace de WhatsApp
      var msg = renderTemplate(cfg.template, data);
      var waUrl =
        "https://wa.me/" + cfg.phone + "?text=" + encodeURIComponent(msg);
 
      // Mostrar mensaje de gracias
      body.innerHTML =
        '<div class="wl-thanks">' +
        checkIcon +
        "<div>" +
        escapeHtml(cfg.thanks) +
        "</div></div>";
 
      // Abrir WhatsApp (nueva pestaña)
      window.open(waUrl, "_blank");
 
      // Disparar evento al dataLayer (para GA4 / GTM), igual que hace tochat.be
      pushDataLayer(data, meta);
    });
  }
 
  // Lee un valor de localStorage de forma segura.
  function ls(key) {
    try {
      var v = window.localStorage.getItem(key);
      return v == null ? "" : v;
    } catch (e) {
      return "";
    }
  }
 
  // ------- Guardado en Google Sheets -------
  // Manda el payload con los MISMOS nombres que espera el doPost del Sheet:
  // fecha, email, telefono, clasificacion, valor, moneda, transaction_id,
  // gclid, gbraid, wbraid, fbp, fbc.
  // fecha y transaction_id los completa GTM -> el widget los deja vacíos.
  function saveLead(data, meta) {
    if (!cfg.sheet) return;
 
    var ids = getClickIds(); // gclid/gbraid/wbraid/fbclid desde la URL
 
    var payload = {
      fecha: "", // lo pone GTM
      email: data.email || data.mail || "",
      telefono: data.phone || data.telefono || data.tel || "",
      clasificacion: "", // lo completa el comercial
      valor: "", // lo completa el comercial
      moneda: cfg.currency, // data-currency (ej: ARS), vacío por defecto
      transaction_id: "", // lo pone GTM
      // Identificadores: primero lo que ya guardó tu tracking en localStorage,
      // y si no, lo que venga en la URL de la visita.
      gclid: ls("gclid") || ids.gclid || "",
      gbraid: ls("gbraid") || ids.gbraid || "",
      wbraid: ls("wbraid") || ids.wbraid || "",
      fbp: ls("fbp") || "",
      fbc: ls("fbc") || (ids.fbclid ? "fb.1." + Date.now() + "." + ids.fbclid : "")
    };
 
    try {
      // 'no-cors' + text/plain evita el preflight CORS con Apps Script.
      fetch(cfg.sheet, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (e) {
      /* silencioso: nunca bloquear el envío a WhatsApp */
    }
  }
 
  // ------- Helpers -------
  function renderTemplate(tpl, data) {
    return tpl.replace(/\{([^}]+)\}/g, function (_, key) {
      var v = data[key.trim()];
      return v ? v : "";
    });
  }
 
  function getUTMs() {
    var out = {};
    try {
      var p = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(
        function (k) {
          var v = p.get(k);
          if (v) out[k] = v;
        }
      );
    } catch (e) {}
    return out;
  }
 
  // IDs de click de anuncios desde la URL actual (por si no están en localStorage).
  function getClickIds() {
    var out = { gclid: "", gbraid: "", wbraid: "", fbclid: "" };
    try {
      var p = new URLSearchParams(location.search);
      ["gclid", "gbraid", "wbraid", "fbclid"].forEach(function (k) {
        var v = p.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {}
    return out;
  }
 
  function pushDataLayer(data, meta) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "walead_submit",
        walead_name: data.name || data.nombre || "",
        walead_page: meta.page_url,
      });
    } catch (e) {}
  }
 
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
 
  // Elige negro o blanco según luminancia del color de marca (contraste legible).
  function pickTextColor(hex) {
    var c = (hex || "").replace("#", "");
    if (c.length === 3)
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    if (c.length !== 6) return "#ffffff";
    var r = parseInt(c.substr(0, 2), 16),
      g = parseInt(c.substr(2, 2), 16),
      b = parseInt(c.substr(4, 2), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b);
    return lum > 160 ? "#111111" : "#ffffff";
  }
 
  // ------- Arranque cuando el DOM está listo -------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
 
