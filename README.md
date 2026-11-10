# WaLead Widget

Widget flotante de WhatsApp que **captura el email y el WhatsApp del visitante** (con selector
de país y formato internacional), los **publica en el `dataLayer`** y luego abre WhatsApp con el
mensaje ya escrito. Guardar el lead (Sheet, CRM) y medir conversiones se hace desde Google Tag
Manager. Liviano, sin dependencias y personalizable con `data-attributes`.

## Instalación rápida

```html
<script src="https://cdn.jsdelivr.net/gh/VictorBogado23/walead-widget@1/widget.min.js"
        data-phone="5491122334455"
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
| `demo.html` | Página de demostración. |
| `configurador.html` | Configurador visual: arma la línea de instalación con vista previa en vivo. |
| `INSTALACION.md` | Guía de instalación y lista de atributos. |

## Características

- Formulario de email + WhatsApp con selector de país (número en formato E.164).
- Diseño moderno y adaptable (bottom sheet en celulares), accesible y aislado con Shadow DOM.
- Personalizable: color, textos, avatar, país por defecto, plantilla del mensaje, posición, consentimiento.
- Evento `walead_submit` al `dataLayer`: email y teléfono van solo dentro de `user_data`, listos para conversiones avanzadas (Google Ads / GA4 / Meta).
- `lead_id` estable por persona: sin conversiones duplicadas.
- Embudo medible: `walead_open`, `walead_start`, `walead_submit`.

## Licencia

MIT — libre para usar y comercializar.
