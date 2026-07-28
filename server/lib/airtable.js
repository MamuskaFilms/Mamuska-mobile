// Cliente liviano de Airtable REST API (sin dependencias pesadas).
// Reemplaza las llamadas mcp__...__list_records_for_table / create_records_for_table / update_records_for_table
// que el artifact de Cowork hacía a través de window.cowork.callMcpTool.
const fetch = require('node-fetch');

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;
const ROOT = 'https://api.airtable.com/v0';

function headers() {
  if (!API_KEY) throw new Error('Falta AIRTABLE_API_KEY en el .env');
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
}

// Tablas ya creadas en la base "Mamuska Films OS" (mismos IDs que usaba el panel de escritorio)
const TABLES = {
  clients: 'tblFVA4uZ5YW9nkZM',
  projects: 'tbltDLe6h4RsqL34s',
  leads: 'tblgOARyANjagbIuX',
  team: 'tblWlPwnN6y0SA8LE',
  invoices: 'tblDULHklXdkGopVm',
  aiHub: 'tblJX2QlKn5YMkjrh',
  dashboard: 'tblPMwJGlDvjciq60',
  tasks: 'tblMV3iFxdEe5KUip',
  versions: 'tbltnFClZT31IOYdB',
  proposals: 'tblacEMxPrAhBxRxP',
  contracts: 'tblxpdWwrsoDlzxfW',
  assets: 'tbleUF3amzPtuvxrM',
  notifications: 'tbldfqg8wcP55jlup'
};

async function listRecords(tableKey, { pageSize = 100, filterByFormula } = {}) {
  const tableId = TABLES[tableKey];
  if (!tableId) throw new Error(`Tabla desconocida: ${tableKey}`);
  let records = [];
  let offset;
  do {
    const url = new URL(`${ROOT}/${BASE_ID}/${tableId}`);
    url.searchParams.set('pageSize', String(pageSize));
    if (filterByFormula) url.searchParams.set('filterByFormula', filterByFormula);
    if (offset) url.searchParams.set('offset', offset);
    const r = await fetch(url, { headers: headers() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'Error de Airtable al listar');
    records = records.concat(d.records || []);
    offset = d.offset;
  } while (offset);
  return records;
}

async function createRecords(tableKey, fieldsArray) {
  const tableId = TABLES[tableKey];
  const r = await fetch(`${ROOT}/${BASE_ID}/${tableId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ records: fieldsArray.map(fields => ({ fields })) })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Error de Airtable al crear');
  return d.records;
}

async function updateRecords(tableKey, recordsArray) {
  // recordsArray: [{ id, fields }]
  const tableId = TABLES[tableKey];
  const r = await fetch(`${ROOT}/${BASE_ID}/${tableId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ records: recordsArray })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Error de Airtable al actualizar');
  return d.records;
}

async function deleteRecords(tableKey, ids) {
  const tableId = TABLES[tableKey];
  const url = new URL(`${ROOT}/${BASE_ID}/${tableId}`);
  ids.forEach(id => url.searchParams.append('records[]', id));
  const r = await fetch(url, { method: 'DELETE', headers: headers() });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Error de Airtable al borrar');
  return d.records;
}

module.exports = { TABLES, listRecords, createRecords, updateRecords, deleteRecords };
