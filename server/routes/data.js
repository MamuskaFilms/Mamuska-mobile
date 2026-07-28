const express = require('express');
const router = express.Router();
const at = require('../lib/airtable');
const { snapshot } = require('../agents');

// Lecturas directas de Airtable para poblar el dashboard/kanban/tareas/notificaciones del PWA.
router.get('/summary', async (req, res) => {
  try { res.json(await snapshot()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:table', async (req, res) => {
  try { res.json(await at.listRecords(req.params.table)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
