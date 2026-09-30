# WaLead Widget

Widget flotante de WhatsApp que **captura los datos del visitante** (nombre, teléfono,
email, consulta…), los **guarda en Google Sheets** y luego abre WhatsApp con el mensaje ya
escrito. Liviano, sin dependencias y personalizable con `data-attributes`.

## Instalación rápida

```html
<script src="https://cdn.jsdelivr.net/gh/VictorBogado23/walead-widget@v1.0.0/widget.js"
        data-phone="5491122334455"
        data-sheet="https://script.google.com/macros/s/XXXX/exec"
        data-color="#25D366"
        data-cta-text="Escribinos"></script>
```

Solo `data-phone` es obligatorio. La guía completa está en
[`INSTALACION.md`](./INSTALACION.md).

## Contenido del repo

| Archivo | Descripción |
|---|---|
| `widget.js` | El widget embebible (esto es lo que sirve jsDelivr). |
| `Codigo-Apps-Script.gs` | Código para la Google Sheet que recibe los leads. |
| `demo.html` | Página de demostración. |
| `INSTALACION.md` | Guía de instalación y lista de atributos. |

## Características

- Formulario de captura de datos antes de ir a WhatsApp.
- Guardado de leads en Google Sheets (sin servidor propio).
- Personalizable: color, textos, campos, plantilla del mensaje, posición, consentimiento.
- Captura de metadatos de campaña (`utm_*`, `gclid`, `fbclid`).
- Evento `walead_submit` al `dataLayer` para medir conversiones en GTM / GA4.

## Licencia

MIT — libre para usar y comercializar.
