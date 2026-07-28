require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- Auth simple por clave (la app queda pública en internet, esto evita que cualquiera la use) ---
app.use((req, res, next) => {
  const openPaths = ['/login', '/manifest.json', '/sw.js'];
  if (openPaths.includes(req.path) || req.path.startsWith('/auth/') || req.path.startsWith('/icons/')) return next();
  const auth = req.headers['x-app-password'] || req.query.pw;
  if (!process.env.APP_PASSWORD || auth === process.env.APP_PASSWORD) return next();
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Clave incorrecta' });
  next(); // deja pasar el HTML/estáticos; el frontend pide la clave y la guarda para las llamadas /api
});

app.use('/api/data', require('./routes/data'));
app.use('/api/brain', require('./routes/brain'));
app.use('/', require('./routes/google'));
app.use('/', require('./routes/qb'));

app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mamuska OS Mobile escuchando en el puerto ${PORT}`));
