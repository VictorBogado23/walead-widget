# WaLead Widget — Guía de instalación

Widget flotante de WhatsApp que **captura los datos del visitante** (nombre, teléfono,
email, consulta…), los **guarda en Google Sheets** y recién entonces abre WhatsApp con el
mensaje ya escrito. Se instala con **una sola línea** y se personaliza con atributos.

Pensado para que lo **comercialices con tus clientes**: alojás un único `widget.js` y a cada
cliente le das su línea de instalación con su configuración.

---

## Archivos del paquete

| Archivo | Para qué sirve |
|---|---|
| `widget.js` | El widget. Lo alojás **vos** una sola vez (tu hosting o CDN). |
| `Codigo-Apps-Script.gs` | Código que va en la Google Sheet de cada cliente para recibir los leads. |
| `demo.html` | Página de ejemplo / muestra comercial. |
| `INSTALACION.md` | Esta guía. |

---

## Puesta en marcha (una vez, de tu lado)

1. Subí `widget.js` a tu hosting o a un CDN. Ejemplos de URL final:
   - `https://tudominio.com/widget.js`
   - o un CDN gratis como jsDelivr apuntando a un repo de GitHub.
2. Esa URL es la que van a usar todos tus clientes. Cuando mejores el widget, lo actualizás
   ahí y **todos se actualizan solos**.

---

## Alta de un cliente nuevo

### Paso 1 — Crear la hoja de leads (Google Sheets)

1. Entrá a **sheets.new** con la cuenta de Google del cliente (o la tuya).
2. Menú **Extensiones ▸ Apps Script**.
3. Borrá todo y pegá el contenido de `Codigo-Apps-Script.gs`.
4. **Implementar ▸ Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
5. Copiá la **URL de la aplicación web** (termina en `/exec`).

> Esa URL es el "buzón" donde caen los leads. Es la que va en `data-sheet`.

### Paso 2 — Pegar el widget en el sitio del cliente

Antes de `</body>` (o en el `<head>`), una línea:

```html
<script src="https://tudominio.com/widget.js"
        data-phone="5491122334455"
        data-sheet="https://script.google.com/macros/s/XXXX/exec"
        data-color="#25D366"
        data-cta-text="Escribinos"></script>
```

Listo. Aparece la burbuja, el visitante deja sus datos, se guardan en la hoja y se abre
WhatsApp con el mensaje armado.

---

## Todos los atributos disponibles

Solo **`data-phone` es obligatorio**. El resto son opcionales.

| Atributo | Ejemplo | Descripción |
|---|---|---|
| `data-phone` | `5491122334455` | **(Obligatorio)** Número de WhatsApp con código de país, sin `+` ni espacios. |
| `data-sheet` | `https://…/exec` | URL del Apps Script donde se guardan los leads. Si lo omitís, solo abre WhatsApp (no guarda). |
| `data-color` | `#25D366` | Color de marca (burbuja, botón, encabezado). El texto se ajusta a negro/blanco solo. |
| `data-position` | `right` / `left` | Esquina donde aparece la burbuja. Por defecto `right`. |
| `data-title` | `¿Hablamos?` | Título del encabezado del panel. |
| `data-subtitle` | `Dejanos tus datos…` | Bajada del encabezado. |
| `data-cta-text` | `Escribinos` | Texto al lado de la burbuja (si lo omitís, muestra solo el ícono). |
| `data-button-text` | `Ir a WhatsApp` | Texto del botón de envío. |
| `data-greeting` | `Completá el formulario…` | Mensaje destacado arriba del formulario. |
| `data-fields` | ver abajo | Campos del formulario. |
| `data-template` | ver abajo | Plantilla del mensaje de WhatsApp. |
| `data-consent-text` | `Acepto ser contactado.` | Si lo definís, muestra un checkbox obligatorio de consentimiento. |
| `data-delay` | `5000` | Milisegundos para abrir el panel solo automáticamente. `0` = no abrir solo. |
| `data-thanks` | `¡Gracias!…` | Mensaje que se muestra tras enviar. |

### `data-fields` — definir los campos

Lista separada por comas. Cada campo es `clave:Etiqueta`. Agregá `*` para hacerlo obligatorio.

```
data-fields="name:Nombre y apellido,phone:Teléfono,email:Email,message:¿En qué te ayudamos?"
```

- El **tipo** se detecta solo por la clave: `email`→email, `phone/tel/cel`→teléfono,
  `message/mensaje/consulta`→área de texto.
- `name`, `phone` y `email` son obligatorios por defecto. Cualquier otro campo lo hacés
  obligatorio agregando `*` al final (ej: `empresa:Empresa*`).

### `data-template` — el mensaje de WhatsApp

Usá `{clave}` para insertar lo que cargó el visitante:

```
data-template="Hola! Soy {name} ({email}). Mi teléfono es {phone}. Consulta: {message}"
```

---

## Qué se guarda en la hoja

Cada lead crea una fila con: **Fecha** + todos los campos del formulario + metadatos útiles
para publicidad (se guardan con prefijo `_`): `_page_url`, `_page_title`, `_referrer`,
`_timestamp`, y si vienen en la URL: `_utm_source`, `_utm_medium`, `_utm_campaign`,
`_gclid`, `_fbclid`. Ideal para saber de qué campaña vino cada lead.

---

## Medición (opcional, para Google Ads / Meta)

Al enviarse un lead, el widget hace `dataLayer.push({event:"walead_submit", …})`. Si el
cliente usa Google Tag Manager, podés crear un **trigger de evento personalizado**
`walead_submit` y mandarlo como conversión a GA4 / Google Ads. (Mismo enfoque que usan las
soluciones comerciales tipo tochat.be.)

---

## Notas

- El widget es liviano, sin dependencias, y no interfiere con el diseño del sitio (sus
  estilos usan el prefijo `wl-`).
- Si `data-phone` falta, el widget no se muestra (y avisa por consola).
- Los datos del visitante solo se envían a la hoja del cliente; no pasan por ningún otro
  servidor.
