# WaLead Widget — Guía de instalación

Widget flotante de WhatsApp que **captura el email y el WhatsApp del visitante** (con selector
de país y formato internacional), los **publica en el `dataLayer`** y recién entonces abre WhatsApp con el
mensaje ya escrito. Se instala con **una sola línea** y se personaliza con atributos.

El widget **no guarda datos por su cuenta**: guardar el lead (Google Sheets, CRM) y medir
conversiones se arma en Google Tag Manager a partir del evento `walead_submit`.

Pensado para que lo **comercialices con tus clientes**: alojas un único `widget.js` y a cada
cliente le das su línea de instalación con su configuración.

---

## Archivos del paquete

| Archivo | Para qué sirve |
|---|---|
| `widget.min.js` | El widget, reducido. Lo alojas **tú** una sola vez (tu hosting o CDN). |
| `widget.js` | Código fuente. Después de cambiarlo, ejecuta `npm run build` para regenerar `widget.min.js`. |
| `demo.html` | Página de ejemplo / muestra comercial. |
| `INSTALACION.md` | Esta guía. |

---

## Puesta en marcha (una vez, de tu lado)

1. Sube `widget.min.js` a tu hosting o a un CDN. Ejemplos de URL final:
   - `https://tudominio.com/widget.min.js`
   - o un CDN gratis como jsDelivr apuntando a un repo de GitHub.
2. Esa URL es la que van a usar todos tus clientes. Cuando mejores el widget, lo actualizas
   ahí y **todos se actualizan solos**.

---

## Alta de un cliente nuevo

### Paso 1 — Pegar el widget en el sitio del cliente

Antes de `</body>` (o en el `<head>`), una línea:

```html
<script src="https://tudominio.com/widget.min.js"
        data-phone="5491122334455"
        data-country="AR"
        data-color="#25D366"
        data-cta-text="Escríbenos"></script>
```

Aparece la burbuja, el visitante deja sus datos, se publica `walead_submit` en el `dataLayer`
y se abre WhatsApp con el mensaje armado.

### Paso 2 — Configurar GTM

Ver [Medición y conversiones avanzadas](#medición-y-conversiones-avanzadas-google-ads--ga4--meta).
Ahí también se arma el guardado en la hoja o el CRM.

---

## Todos los atributos disponibles

Solo **`data-phone` es obligatorio**. El resto son opcionales.

| Atributo | Ejemplo | Descripción |
|---|---|---|
| `data-phone` | `5491122334455` | **(Obligatorio)** Número de WhatsApp del negocio, con código de país, sin `+` ni espacios. |
| `data-name` | `Pizzería Don José` | Nombre del negocio. Es el título por defecto y se inserta con `{negocio}` en cualquier texto. |
| `data-country` | `AR` | País preseleccionado en el teléfono (código ISO). Si lo omites, se detecta por el idioma del navegador. |
| `data-countries` | `AR,UY,PY` | Países que aparecen destacados arriba de la lista (el resto sigue disponible). |
| `data-color` | `#25D366` | Color de marca (burbuja, botón, encabezado). El texto se ajusta a negro/blanco solo. |
| `data-theme` | `auto` / `light` / `dark` | Tema del panel. Por defecto `auto`: mira el fondo del sitio. La fuente del widget también se toma del sitio. |
| `data-position` | `right` / `left` | Esquina donde aparece la burbuja. Por defecto `right`. |
| `data-title` | `¿Hablamos?` | Título del encabezado del panel. |
| `data-subtitle` | `Te respondemos por WhatsApp` | Línea debajo del título. Por defecto: "Te respondemos por WhatsApp". Vacío (`data-subtitle=""`) = no se muestra. |
| `data-avatar` | `https://…/logo.png` | Logo del negocio en el encabezado, sobre un círculo blanco y con un puntito verde de WhatsApp. Conviene un logo cuadrado. Por defecto, el ícono de WhatsApp. |
| `data-greeting` | `¡Hola! 👋 …` | Mensaje tipo chat que se muestra arriba del formulario. Vacío = no se muestra. |
| `data-cta-text` | `¿Te ayudamos? 👋` | Globo de texto junto a la burbuja (si lo omites, muestra solo el ícono). |
| `data-button-text` | `Continuar en WhatsApp` | Texto del botón de envío. |
| `data-template` | ver abajo | Mensaje que queda escrito en WhatsApp. |
| `data-consent-text` | `Acepto que usen mi email y mi WhatsApp para contactarme.` | Cambia el texto de la casilla de consentimiento. La casilla siempre aparece, sale destildada y es obligatoria: sin tildarla no se envía nada. |
| `data-privacy` | `Te respondemos en el día.` | Texto opcional con candado debajo del botón. Por defecto no se muestra. |
| `data-delay` | `5000` | Milisegundos para abrir el panel solo (una vez por sesión). `0` = no abrir solo. |
| `data-thanks` | `Te estamos llevando…` | Texto de la pantalla de confirmación. |
| `data-triggers` | `.btn-contacto` | Selector CSS de botones/links del sitio que abren el widget. Ver abajo. |
| `data-launcher` | `false` | Oculta la burbuja flotante: el widget se abre solo desde botones del sitio. |

### Abrir el widget desde botones del sitio ("Contacto", "Consúltanos"…)

Hay tres formas; se pueden combinar.

**1. Marcar el botón** (si puedes editar el HTML del sitio):

```html
<button data-walead-open>Consúltanos</button>
<a href="#walead">Contacto</a>
```

**2. Usar los botones que ya existen** (sin tocar el sitio) con `data-triggers` y un selector CSS:

```html
<script src="…/widget.min.js"
        data-phone="5491122334455"
        data-triggers=".btn-contacto, #menu a[href='/contacto']"></script>
```

> Tip: `data-triggers="a[href*='wa.me'], a[href*='api.whatsapp.com']"` intercepta los links
> de WhatsApp que el sitio ya tenga, así esos clics también dejan el lead antes de ir al chat.

**3. Por JavaScript** (desde GTM, un popup, otro script):

```js
WaLead.open();   // abre
WaLead.close();  // cierra
WaLead.toggle(); // alterna
```

En los tres casos el clic no navega (si era un link, se cancela) y se abre el panel.
Cada apertura publica `dataLayer.push({event:"walead_open", walead_origen})`, con origen
`burbuja`, `boton`, `auto` o `api`. Ver [embudo](#embudo-de-conversión).

### El formulario

Pide solo dos datos, los que sirven para conversiones avanzadas:

- **Email**: se valida y se sugiere la corrección de errores comunes (`gmial.com` → `gmail.com`).
- **WhatsApp**: con selector de país (bandera + código, con buscador). El número se guarda
  siempre en formato internacional **E.164** (`+5491122334455`), aunque la persona lo escriba
  con 0, con 15, con espacios o pegue el número con `+código` (en ese caso el país se cambia solo).

Si la persona vuelve al sitio, el formulario aparece precargado con sus datos.

### Los dos mensajes: saludo y mensaje de WhatsApp

- **`data-greeting`**: lo que el negocio le dice al visitante dentro del widget.
- **`data-template`**: lo que el visitante te envía; queda escrito en el chat de WhatsApp
  (la persona lo puede editar antes de mandarlo).

Variables disponibles:

| Variable | Dónde | Se reemplaza por |
|---|---|---|
| `{negocio}` | todos los textos | el valor de `data-name` |
| `{pagina}` | mensaje de WhatsApp | título de la página donde estaba el visitante |
| `{url}` | mensaje de WhatsApp | link de esa página |
| `{email}`, `{phone}`, `{country}` | mensaje de WhatsApp | lo que cargó el visitante |

```html
data-name="Pizzería Don José"
data-greeting="¡Hola! 👋 Somos {negocio}. Dejanos tu email y tu WhatsApp y te respondemos enseguida."
data-template="¡Hola {negocio}! Vi la página {pagina} y quiero hacer una consulta."
```

### Configurador visual

`configurador.html` arma la línea de instalación sin escribir código: completas nombre,
número, mensajes y colores, ves el widget y el mensaje de WhatsApp en vivo, y copias el código
(versión `<script>` o versión GTM). Ábrelo en el navegador desde el repo, o publícalo con
GitHub Pages para compartirlo con tus clientes.

### Instalación desde Google Tag Manager

En GTM (etiqueta HTML personalizada) los `data-` del script no siempre se pueden leer.
Define la configuración antes de cargar el widget:

```html
<script>
  window.WALEAD_CONFIG = {
    phone: "5491122334455",
    country: "AR"
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/VictorBogado23/walead-widget@1/widget.min.js"></script>
```

Las claves son las mismas que los atributos, en camelCase (`buttonText`, `ctaText`, …).

### Actualizaciones automáticas

La dirección termina en `@1`: carga siempre la última versión 1.x, así que las mejoras
llegan solas a todos los sitios **sin tocar GTM**. Dentro de la versión 1 nunca se quitan
ni se renombran opciones ni datos del `dataLayer`; solo se agregan. Un cambio que obligue
a tocar la instalación saldría como versión 2 y habría que pasar a `@2` a mano.

Una versión nueva tarda hasta 12 horas en llegar a jsDelivr (al publicar se fuerza la
actualización para que llegue al momento) y hasta 7 días en navegadores que ya tenían
guardada la anterior. Para fijar una versión exacta, usa `@v1.2.0`.

---

## Leads duplicados

Cada lead tiene un `lead_id` que sale del número del negocio, el email y el teléfono: la misma
persona tiene siempre el mismo ID, en cualquier navegador o dispositivo. Hay dos barreras:

1. **Widget**: si ese navegador ya envió el lead, no vuelve a publicar `walead_submit`.
   La persona igual pasa a WhatsApp y se publica `walead_repeat`.
2. **Google Ads / Meta**: usando `walead_lead_id` como ID de transacción o `event_id`, descartan
   la conversión repetida aunque venga de otro dispositivo. Si guardas en una hoja desde GTM,
   usa el mismo ID para no repetir filas.

Si la persona cambia el email o el teléfono, cuenta como un lead nuevo.

---

## Medición y conversiones avanzadas (Google Ads / GA4 / Meta)

Al enviarse un lead, el widget hace:

```js
dataLayer.push({
  event: "walead_submit",
  walead_lead_id: "wl_3f9a1c2e7b604d18",
  user_data: {
    email: "juan@gmail.com",           // en minúsculas
    phone_number: "+5491122334455",    // E.164
    address: { country: "AR" }
  }
});
```

El email y el teléfono van **solo** dentro de `user_data`.

Configuración en GTM:

1. **Activador**: Evento personalizado → nombre `walead_submit`.
2. **Variables de capa de datos** (versión 2): `walead_lead_id`, `user_data.email`,
   `user_data.phone_number` y, si la quieres entera, `user_data`.
3. **Google Ads — Conversiones avanzadas**: en la etiqueta de conversión, activa *Incluir datos
   proporcionados por el usuario* → nueva variable *Datos proporcionados por el usuario* →
   *Configuración manual* → Email = `{{user_data.email}}`, Teléfono = `{{user_data.phone_number}}`.
   En *ID de transacción* usa `{{walead_lead_id}}`.
4. **GA4**: en la etiqueta de evento (ej. `generate_lead`), en *Datos proporcionados por el
   usuario*, usa la misma variable.
5. **Meta (píxel / CAPI)**: manda `event_id` = `{{walead_lead_id}}`, `em` = `{{user_data.email}}`
   y `ph` = `{{user_data.phone_number}}` (Meta pide el teléfono sin `+`; GTM o tu plantilla de
   CAPI lo normaliza y hashea).
6. **Hoja o CRM**: una etiqueta con el mismo activador que envíe `walead_lead_id`, el email y
   el teléfono. Los datos de campaña (`gclid`, `utm_*`) los toma GTM con sus propias variables.

Google y Meta hashean (SHA-256) los datos del lado de la etiqueta: el widget los entrega
normalizados (email en minúsculas, teléfono E.164), que es lo que exigen para que coincidan.

### Embudo de conversión

Cada paso publica un evento en el `dataLayer`; crea en GTM un activador por cada uno:

| Evento | Cuándo ocurre | Se envía |
|---|---|---|
| `walead_open` | Se abre el panel | Una vez por apertura, con `walead_origen` |
| `walead_start` | La persona empieza a completar el formulario | Una vez por carga de página |
| `walead_submit` | Lead nuevo enviado | Es la conversión |
| `walead_repeat` | Alguien que ya era lead vuelve a enviar | No es conversión |

---

## Notas

- El widget es liviano, sin dependencias, y no interfiere con el diseño del sitio: vive
  dentro de un Shadow DOM, así que ni los estilos del sitio lo rompen ni los suyos se filtran.
- Diseño adaptable: en celulares el panel sube desde abajo, con fondo oscurecido.
- Accesible: navegación con teclado (Tab, flechas en la lista de países, Esc para cerrar),
  etiquetas y errores leídos por lectores de pantalla, respeta "reducir movimiento".
- Las banderas se cargan desde `flagcdn.com`.
- Si `data-phone` falta, el widget no se muestra (y avisa por consola).
- El widget no envía los datos del visitante a ningún servidor: solo los publica en el
  `dataLayer` del propio sitio. Adónde van después lo decide la configuración de GTM.
