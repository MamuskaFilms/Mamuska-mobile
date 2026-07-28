# Mamuska OS Mobile

Versión independiente (fuera de Cowork) de Mamuska OS, pensada para instalarse como app en el celular (PWA). No depende de `window.cowork.*` — tiene su propio backend con tus propias claves de API.

## Qué funciona en esta v1

- Brain (IA) para consultas y para: crear cliente, crear proyecto, crear factura, registrar pago, crear tarea, crear lead.
- Dashboard con KPIs reales desde Airtable (misma base "Mamuska Films OS" que ya usás).
- Listas de proyectos, leads y tareas.
- Instalable en el celular (Agregar a pantalla de inicio).

## Qué falta conectar (Fase 2, con tus credenciales reales)

- Crear carpetas reales en Drive / eventos en Calendar / borradores en Gmail (el código OAuth ya está armado en `server/routes/google.js`, falta que crees el proyecto en Google Cloud).
- Sincronizar facturas con QuickBooks real (el código OAuth ya está armado en `server/routes/qb.js`, falta tu app de Intuit Developer).
- Postproducción avanzada, Vault (subida de archivos) y el resto de vistas del panel de escritorio — se agregan incrementalmente sobre esta misma base.

---

## Paso 1 — Crear tus cuentas y claves

### 1. Anthropic (el Brain)
1. Andá a https://console.anthropic.com → creá una cuenta → cargá un método de pago (Billing).
2. Andá a "API Keys" → "Create Key" → copiá la clave (empieza con `sk-ant-...`).
3. Guardala para el paso 3.

### 2. Airtable (ya la usás — solo falta un token)
1. Andá a https://airtable.com/create/tokens
2. Creá un Personal Access Token con scopes `data.records:read` y `data.records:write`, con acceso a la base "Mamuska Films OS".
3. Copiá el token (empieza con `pat...`).

### 3. Google Cloud (Drive/Calendar/Gmail) — opcional, se puede hacer después
1. Andá a https://console.cloud.google.com → creá un proyecto nuevo.
2. "APIs y servicios" → habilitá: Google Drive API, Google Calendar API, Gmail API.
3. "Pantalla de consentimiento OAuth" → tipo Externo → agregate como usuario de prueba.
4. "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth" → tipo "Aplicación web" → en "URI de redirección autorizados" poné la misma URL que vas a usar en `GOOGLE_REDIRECT_URI`.
5. Copiá el Client ID y Client Secret.

### 4. Intuit Developer (QuickBooks) — opcional, se puede hacer después
1. Andá a https://developer.intuit.com → creá una cuenta y una app nueva.
2. En la app, sección "Keys & OAuth" → copiá Client ID y Client Secret (ambiente Sandbox para probar).
3. Agregá la misma URL de `QB_REDIRECT_URI` como Redirect URI.

---

## Paso 2 — Desplegar en Render (gratis para empezar)

1. Subí esta carpeta (`mamuska-mobile`) a un repositorio de GitHub.
2. Andá a https://render.com → creá cuenta (podés entrar con GitHub) → "New +" → "Web Service".
3. Conectá el repositorio.
4. Configuración:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. En "Environment" agregá las variables del archivo `.env.example` con tus valores reales (`ANTHROPIC_API_KEY`, `AIRTABLE_API_KEY`, `APP_PASSWORD`, y las de Google/QuickBooks si ya las tenés).
6. "Create Web Service" — Render te da una URL tipo `https://mamuska-os.onrender.com`.
7. Si vas a usar Google/QuickBooks, volvé a esas consolas y actualizá los Redirect URI con tu URL real de Render.

## Paso 3 — Instalar en el celular

1. Abrí la URL de Render en Safari (iPhone) o Chrome (Android).
2. Ingresá la clave que pusiste en `APP_PASSWORD`.
3. **iPhone:** botón compartir → "Agregar a pantalla de inicio".
   **Android:** menú (⋮) → "Agregar a pantalla de inicio" / "Instalar app".
4. Listo — queda como ícono de app normal en tu celular.

---

## Desarrollo local (antes de desplegar)

```bash
cd mamuska-mobile
cp .env.example .env   # completá tus claves
npm install
npm start
```
Abrí http://localhost:3000
