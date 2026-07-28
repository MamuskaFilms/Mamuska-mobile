const express = require('express');
const router = express.Router();
const { askClaude } = require('../lib/anthropic');
const { AGENTS, snapshot } = require('../agents');

const BRAIN_PROMPT = `Eres el "Brain" de Mamuska OS, el sistema operativo de la productora audiovisual Mamuska Films.
Devolvés SOLO un JSON válido con esta forma exacta:
{"intent":"...", "reply":"respuesta corta en español para mostrarle al usuario", "plan":[{"action":"nombreDeAccion","params":{...}}]}
Acciones disponibles (usa solo estas): createClient{name} · createProject{name,client,budget,shoot,due} · createInvoice{project,amount} · registerPayment{project,amount} · createTask{title} · createLead{name,email,value,notes}
Si la instrucción es una pregunta general sobre el negocio (ej "¿cómo está la empresa?"), dejá "plan" vacío y escribí el análisis completo en "reply" usando los datos adjuntos.
Si no entendés la instrucción, intent "unknown", plan vacío, pedí aclaración en "reply".`;

router.post('/', async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Falta "text"' });
  try {
    const snap = await snapshot();
    const raw = await askClaude(
      `${BRAIN_PROMPT}\n\nInstrucción del usuario: "${text}"`,
      [JSON.stringify(snap)]
    );
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const out = JSON.parse(cleaned.slice(start, end + 1));

    const steps = [];
    for (const s of out.plan || []) {
      if (AGENTS[s.action]) {
        const r = await AGENTS[s.action](s.params || {});
        steps.push({ action: s.action, ok: true, message: r.message });
      } else {
        steps.push({ action: s.action, ok: false, message: 'Acción desconocida' });
      }
    }
    res.json({ reply: out.reply || '', intent: out.intent || 'unknown', steps });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

module.exports = router;
