# WaLead Widget

Widget flotante de WhatsApp que **captura el email y el WhatsApp del visitante** (con selector
de país y formato internacional), los **guarda en Google Sheets** y luego abre WhatsApp con el mensaje ya
escrito. Liviano, sin dependencias y personalizable con `data-attributes`.

## Instalación rápida

```html
<script src="https://cdn.jsdelivr.net/gh/VictorBogado23/walead-widget@v1.1.0/widget.min.js"
        data-phone="5491122334455"
        data-sheet="https://script.google.com/macros/s/XXXX/exec"
        data-country="AR"
        data-color="#25D366"
        data-cta-text="Escríbenos"></script>
```

Solo `data-phone` es obligatorio. La guía completa está en
[`INSTALACION.md`](./INSTALACION.md).

## Contenido del repo

| Archivo | Descripción |
|---|---|
| `widget.min.js` | El widget embebible, reducido (esto es lo que sirve jsDelivr). Se genera con `npm run build`. |
| `widget.js` | Código fuente del widget: los cambios se hacen acá. |
| `Codigo-Apps-Script.gs` | Código para la Google Sheet que recibe los leads. |
| `demo.html` | Página de demostración. |
| `configurador.html` | Configurador visual: arma la línea de instalación con vista previa en vivo. |
| `INSTALACION.md` | Guía de instalación y lista de atributos. |

## Características

- Formulario de email + WhatsApp con selector de país (número en formato E.164).
- Diseño moderno y adaptable (bottom sheet en celulares), accesible y aislado con Shadow DOM.
- Guardado de leads en Google Sheets (sin servidor propio).
- Personalizable: color, textos, avatar, país por defecto, plantilla del mensaje, posición, consentimiento.
- Captura de metadatos de campaña (`utm_*`, `gclid`, `fbclid`).
- Evento `walead_submit` al `dataLayer` con `user_data` listo para conversiones avanzadas (Google Ads / GA4 / Meta).
- `lead_id` estable por persona: sin filas ni conversiones duplicadas.
- Embudo medible: `walead_open`, `walead_start`, `walead_submit`.

## Licencia

MIT — libre para usar y comercializar.
