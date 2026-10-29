# Contexto: Despliegue, Landing Page y Chatbot

Documento de **teoría/decisiones** (no implementación). Captura el orden de ideas de
la sesión sobre cómo desplegar el CRM y cómo encarar la landing page y el chatbot.
Nada de esto está implementado todavía.

## Objetivo general

- Desplegar el CRM (Django + django-unfold) en **EC2 usando Docker**.
- Usar **Route 53** para DNS.
- Sumar una **landing page** (mayoritariamente estática) con:
  - Formulario de "solicitar información" que guarde el prospecto como `Lead`.
  - A mediano plazo, un **chatbot** para interactuar con el cliente final.

## Infraestructura transversal (afecta a todo)

- **Route 53 es solo DNS**: permite apuntar
  - `tudominio.com` → landing (CloudFront/S3 o Nginx del EC2).
  - `app.tudominio.com` (o `crm.`/`site.`) → Django en EC2.
- **Base de datos**: hoy el proyecto usa **SQLite** (dev). Para producción conviene
  migrar a **Postgres (RDS)** o al menos Postgres en contenedor con volumen dedicado.
  SQLite ata a un solo contenedor/volumen y complica backups y escalado. Afecta cómo
  la landing escribe leads.
- Decisión de infra pendiente, pero recomendada antes de producción.

---

## Decisión 1 — Landing page: ¿estática o server de Node? ¿React o Next?

### Punto clave

La pregunta de fondo NO es "React vs Next", es **"¿dónde vive el formulario y quién lo
procesa?"**. Ventaja decisiva: **ya existe un backend Django**.

- El formulario puede hacer un simple `POST` a un endpoint de Django que cree el
  `Lead`, **reutilizando el patrón de `main/api.py`** (endpoints abiertos, CSRF exento)
  y la validación/dedup que ya existe en **`Lead.clean()`**.
- Conclusión: **no se necesita un server de Node** para la landing. El "backend" del
  formulario es Django.

### Opciones evaluadas

**React puro (Vite) → build estático**
- Genera HTML/CSS/JS estáticos; se sirven desde **S3 + CloudFront** (o Nginx del EC2).
- Formulario → `fetch()` al endpoint Django.
- Sin server de Node que mantener/parchear/monitorear. Menos superficie y costo.
- Contra: para marketing, el SEO es inferior al SSR/SSG (meta tags dinámicos, Open
  Graph para previews al compartir, Core Web Vitals).

**Next.js**
- Recomendado por el equipo de React para sitios de contenido/marketing (SSG/SSR
  resuelve SEO y performance).
- En modo **static export (`output: 'export'`) / SSG** también genera estáticos y
  **no requiere server de Node corriendo**. SEO sin peso operativo.
- Contra: más framework del necesario para una landing simple; y si algún día se usan
  features que requieren server (ISR, API routes, middleware), ya haría falta Node
  corriendo (otro contenedor que mantener).

### Recomendación

1. **Si SEO/marketing es prioridad** (rankear, previews bonitos al compartir):
   **Next.js en static export (SSG)**. SEO + buenas métricas, output estático
   (S3+CloudFront), sin server de Node. Es la opción más "sostenible en el tiempo".
2. **Si se quiere lo más simple** y el SEO avanzado no es crítico aún:
   **React + Vite** estático. Menos conceptos, migrable a Next después.

En ambos casos: **estático servido por CloudFront/S3 o Nginx; formulario → endpoint
Django**. No montar un server de Node solo para la landing.

Regla práctica: **solo justificar un server de Node si el chatbot obliga a frontend
con lógica de servidor** — y no obliga (ver decisión 2).

---

## Decisión 2 — Chatbot: bot propio (Bedrock/Anthropic + Channels) vs. tercero (Landbot)

### Pregunta real

¿Se quiere un **bot omnicanal de marketing/ventas** o un **asistente integrado al
CRM**? Son cosas distintas y condicionan la respuesta.

### Opción A — Tercero (Landbot y similares)

A favor:
- **Omnicanal de serie**: web, WhatsApp (Meta), Messenger, a veces email. Integrar
  WhatsApp Business API por cuenta propia es burocrático (verificación Meta,
  plantillas aprobadas, proveedor BSP); el tercero lo resuelve.
- **Time-to-market**: días, sin código, editor visual.
- **Captura de leads sin backend**: el bot captura datos y los manda por webhook → el
  endpoint Django crea el `Lead`.

En contra:
- **Costo recurrente** que escala con conversaciones/MAU; a mediano plazo puede salir
  caro.
- **Flujos rígidos**: builders excelentes para árboles de decisión, limitados para IA
  conversacional abierta (aunque muchos ya integran LLMs, con menos control).
- **Datos fuera de la infra**: conversaciones en el tercero. El lead es el activo del
  CRM: evaluar.
- **Integración con el CRM**: unidireccional vía webhooks; el bot no "sabe" del estado
  del pipeline salvo que se construya la integración inversa (consultar la API), lo
  que diluye la ventaja de "sin código".

### Opción B — Bot propio (Bedrock o Anthropic API + componente de chat + Channels)

A favor:
- **Control total y datos en la infra**: conversaciones y leads en Postgres, ligados a
  `Lead`/`ActivityLog`.
- **Integración profunda con el CRM**: con *tool/function calling* el agente puede
  crear leads, consultar productos (`Product`), registrar interacciones
  (`Interaction`) — acciones ya modeladas en el dominio.
- **Bedrock encaja con AWS**: modelos (incluido Claude) dentro de la cuenta AWS, con
  IAM, sin gestionar API key externa, facturación unificada. Anthropic directo también
  sirve y suele ir un paso adelante en features; Bedrock simplifica gobernanza/infra.

En contra:
- **Omnicanalidad la construyes tú**. Web es fácil (componente + endpoint).
  WhatsApp/Meta implica integrar la API de cada canal — justo lo que el tercero regala.
  Este es el verdadero trade-off.
- **Channels añade complejidad de infra**: WebSockets requieren ASGI
  (Daphne/Uvicorn), *channel layer* con **Redis** y Nginx para `ws://`; otro servicio
  en `docker-compose`.
  - **Importante**: para un chatbot HTTP request/response con un LLM, **probablemente
    NO se necesita Channels**. El streaming de respuestas del LLM se resuelve bien con
    **SSE (Server-Sent Events)** sobre HTTP normal, mucho más simple que WebSockets.
    Channels solo se justifica con interacción bidireccional en tiempo real (p. ej.
    handoff a agente humano en vivo, multiusuario).

### ¿Sigue siendo viable el tercero? — Arquitectura en capas (no excluyente)

- **Canal web** (landing): **bot propio**. Donde más valor da la integración con el
  CRM y menos fricción tiene (sin API de Meta de por medio).
- **Canales de mensajería** (WhatsApp/Messenger): el **tercero** sigue siendo la vía
  pragmática a mediano plazo por la burocracia de Meta. Se puede usar el tercero
  **solo como pasarela de canal** que reenvía mensajes por webhook a *la* lógica de
  agente en Django. Omnicanalidad del tercero, pero cerebro y datos en la infra propia.

### Recomendación

- **Fase 1 (corto plazo)**: bot propio **solo en web**, con **Bedrock** (por el
  despliegue AWS) o Anthropic API, componente de chat en la landing, y endpoint Django
  con **SSE** (no Channels todavía). *Function calling* para crear leads/interacciones
  en el CRM.
- **Fase 2 (mediano plazo, si el negocio lo pide)**: evaluar omnicanalidad. O integrar
  WhatsApp Business API directamente, o meter un tercero **como pasarela de canales**
  apuntando al mismo backend de agente. Decidir con datos de uso real.
- **Channels/Redis**: dejar fuera hasta tener un requisito real de tiempo real
  bidireccional (handoff humano en vivo). No meterlo "por si acaso".

---

## Resumen ejecutivo

**Decisión 1 (landing):**
- No montar server de Node. El formulario lo procesa Django (reutilizar patrón de
  `main/api.py` + `Lead.clean()`).
- Elegir **Next.js en static export (SSG)** si el SEO/marketing pesa; **React+Vite
  estático** si se prefiere lo mínimo. Ambos → estático en **S3+CloudFront** (o Nginx
  del EC2).

**Decisión 2 (chatbot):**
- Empezar con **bot propio en web** (Bedrock + function calling al CRM + **SSE**, sin
  Channels).
- Dejar la **omnicanalidad (WhatsApp/Meta) para mediano plazo**; cuando llegue,
  considerar un tercero **como pasarela de canal** hacia el agente propio, no como el
  cerebro completo.

**Infra transversal:**
- Migrar de SQLite a **Postgres/RDS** antes de producción.
- Route 53: `tudominio.com` → landing (CloudFront), `app.tudominio.com` → Django (EC2).

---

## Decisión 3 — Estructura del repo para la landing

### Punto clave

El `manage.py` de Django **ya vive en la raíz** del repo, junto a `PonchosCRM/`,
`main/`, `templates/`, `static/`, `.venv/`, `requirements.txt`. **No** se mueve a
`src/backend/`: rompería imports, rutas de settings, el `.venv` y las convenciones de
los steering docs, sin beneficio. Por eso se descarta el layout `src/backend` +
`src/frontend` (válido para proyectos que nacen de cero, no para éste).

La decisión real es **monorepo (landing como carpeta hermana) vs. repo separado**.

### Opción A — Monorepo, landing como carpeta hermana (recomendada)

```
ponchos-crm/
├── manage.py                  # Django se queda en la raíz (NO se mueve)
├── requirements.txt
├── PonchosCRM/                # proyecto Django (settings, urls, wsgi)
├── main/                      # app del CRM
├── templates/  static/  .venv/  .kiro/
│
├── landing/                   # ← nuevo: la landing (React o Next)
│   ├── package.json
│   ├── next.config.js         # output: 'export' (si Next)
│   ├── public/                # imágenes, favicon, og-image
│   └── src/
│       ├── components/ContactForm.tsx   # POST → endpoint Django de Lead
│       └── lib/api.ts                   # URL del endpoint (env var)
│
├── docker/                    # ← opcional: orquestación de despliegue
│   ├── Dockerfile.backend
│   ├── Dockerfile.landing     # solo si la landing se sirve con Nginx propio
│   └── nginx.conf
└── docker-compose.yml         # servicio de Django; la landing NO corre como server
```

La landing buildea a estáticos (`next build` / `vite build`) y se despliega a
**S3+CloudFront** (o Nginx del EC2). No corre como server.

### Opción B — Repo separado (`ponchos-landing/`)

Se justifica si la landing la mantiene **otro equipo/persona**, se quieren pipelines
CI/CD totalmente independientes, o no se quiere mezclar el historial de git.

### ¿La Opción A genera deuda técnica?

No, **siempre que backend y landing sean dos artefactos de build y despliegue
independientes**. La deuda técnica no la decide "misma carpeta o no", la decide el
acoplamiento en runtime/build/despliegue.

- **No es deuda**: dos toolchains (Python + Node) en un repo — no se acoplan;
  versionar ambos juntos — es conveniencia de git, no acoplamiento.
- **A y B tienen el mismo acoplamiento técnico** (se reduce al endpoint HTTP de
  `Lead`). Cambian en el acoplamiento **organizacional**: la B añade overhead de
  coordinar dos repos.

**Tres invariantes que mantienen la Opción A libre de deuda:**
1. La landing buildea a estáticos y se despliega sola (S3+CloudFront), **nunca** dentro
   de Django (no servirla desde `static/`, no montar Next como server junto al WSGI).
2. **CI con builds por path**: si cambió `landing/**` se buildea la landing; si cambió
   el resto, el backend. No reconstruir todo en cada push.
3. **Contrato del endpoint `Lead` documentado** (campos, validación de `Lead.clean()`,
   respuesta). Es el único punto de acoplamiento legítimo.

Si alguna de las tres no se puede sostener (no se controla el CI, otro equipo tomará
la landing), entonces la Opción B — no por deuda técnica, sino por límites
organizacionales.

### Recomendación

**Opción A (monorepo con `landing/` hermana)**, salvo que la landing la mantenga otro
equipo → entonces Opción B.

---

## Estado

Decisiones de teoría; nada implementado. Pendiente de confirmar antes de ejecutar.
