// Reemplaza window.cowork.askClaude() del artifact de Cowork.
// Llama directo a la API de Anthropic con tu propia clave (tiene costo por uso).
const fetch = require('node-fetch');

async function askClaude(prompt, dataArray = []) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY en el .env');
  const userContent = [prompt, ...dataArray.map(d => '\n\nDatos adjuntos:\n' + d)].join('');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userContent }]
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Error de la API de Anthropic');
  return (d.content || []).map(c => c.text || '').join('');
}

module.exports = { askClaude };
