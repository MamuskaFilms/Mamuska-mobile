// OAuth2 real con Google para Drive + Calendar + Gmail.
// Requiere crear un proyecto en https://console.cloud.google.com con:
//  - Pantalla de consentimiento OAuth configurada (modo "Externo", tu email como usuario de prueba)
//  - Credencial "ID de cliente de OAuth" tipo "Aplicación web"
//  - URI de redirección autorizado: GOOGLE_REDIRECT_URI (el mismo valor del .env)
//  - Scopes a habilitar: drive.file, calendar.events, gmail.compose
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', 'data', 'google-token.json');

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function loadToken(client) {
  if (fs.existsSync(TOKEN_PATH)) {
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
    return true;
  }
  return false;
}

router.get('/auth/google', (req, res) => {
  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.compose'
    ]
  });
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(req.query.code);
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Google conectado. Ya podés cerrar esta pestaña y volver a la app.');
  } catch (e) {
    res.status(500).send('Error conectando Google: ' + e.message);
  }
});

router.get('/api/google/status', (req, res) => {
  res.json({ connected: fs.existsSync(TOKEN_PATH) });
});

// --- Acciones reales (una vez conectado) ---
router.post('/api/google/drive-folder', async (req, res) => {
  try {
    const client = oauthClient();
    if (!loadToken(client)) return res.status(401).json({ error: 'Google no conectado — andá a /auth/google' });
    const drive = google.drive({ version: 'v3', auth: client });
    const r = await drive.files.create({
      requestBody: { name: req.body.title, mimeType: 'application/vnd.google-apps.folder', parents: req.body.parentId ? [req.body.parentId] : [] },
      fields: 'id, webViewLink'
    });
    res.json({ id: r.data.id, viewUrl: r.data.webViewLink });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/google/calendar-event', async (req, res) => {
  try {
    const client = oauthClient();
    if (!loadToken(client)) return res.status(401).json({ error: 'Google no conectado — andá a /auth/google' });
    const cal = google.calendar({ version: 'v3', auth: client });
    const r = await cal.events.insert({
      calendarId: req.body.calendarId || 'primary',
      requestBody: {
        summary: req.body.summary,
        start: { dateTime: req.body.startTime, timeZone: req.body.timeZone || 'America/New_York' },
        end: { dateTime: req.body.endTime, timeZone: req.body.timeZone || 'America/New_York' }
      }
    });
    res.json({ id: r.data.id, htmlLink: r.data.htmlLink });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/google/gmail-draft', async (req, res) => {
  try {
    const client = oauthClient();
    if (!loadToken(client)) return res.status(401).json({ error: 'Google no conectado — andá a /auth/google' });
    const gmail = google.gmail({ version: 'v1', auth: client });
    const raw = Buffer.from(
      `To: ${req.body.to}\r\nSubject: ${req.body.subject}\r\n\r\n${req.body.body}`
    ).toString('base64url');
    const r = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
    res.json({ id: r.data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
