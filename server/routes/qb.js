// OAuth2 real con QuickBooks Online (Intuit).
// Requiere crear una app en https://developer.intuit.com/app/developer/dashboard con:
//  - Redirect URI autorizado: QB_REDIRECT_URI (igual al del .env)
//  - Scope: com.intuit.quickbooks.accounting
//  - Empezá en modo "Sandbox" (datos de prueba) antes de pasar a producción
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const OAuthClient = require('intuit-oauth');

const TOKEN_PATH = path.join(__dirname, '..', 'data', 'qb-token.json');

function client() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QB_REDIRECT_URI
  });
}

router.get('/auth/qb', (req, res) => {
  const oc = client();
  const url = oc.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'mamuska' });
  res.redirect(url);
});

router.get('/auth/qb/callback', async (req, res) => {
  try {
    const oc = client();
    const token = await oc.createToken(req.url);
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token.getJson()));
    res.send('QuickBooks conectado. Ya podés cerrar esta pestaña y volver a la app.');
  } catch (e) {
    res.status(500).send('Error conectando QuickBooks: ' + e.message);
  }
});

router.get('/api/qb/status', (req, res) => {
  res.json({ connected: fs.existsSync(TOKEN_PATH) });
});

// Nota: para las llamadas reales (crear factura, AR aging, P&L) una vez conectado,
// se usa el token guardado en TOKEN_PATH + la librería node-quickbooks o llamadas
// REST directas a la Accounting API de Intuit. Se completa en la Fase 3 (con tus
// credenciales reales ya funcionando) para evitar escribir código que no se pueda probar.

module.exports = router;
