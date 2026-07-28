// Lógica de agentes portada al servidor (equivalente al objeto "Agents" del panel de escritorio),
// pero usando Airtable como fuente de verdad directa (no localStorage).
//
// v1: cubre CRM, Producción (sin Drive/Calendar todavía), Finanzas (sin QuickBooks todavía),
// Tareas y Comercial básico. Postproducción avanzada, Drive/Calendar/Gmail y QuickBooks reales
// se conectan en las próximas fases (ver server/routes/google.js y server/routes/qb.js).
const at = require('./lib/airtable');

// IMPORTANTE: la API REST de Airtable lee y escribe los campos usando su NOMBRE
// como clave (ej. "Proyecto"), no el field id (fldXXXX) — por eso usamos nombres
// reales aquí, tomados directo de /v0/meta/bases/.../tables. Si renombras un campo
// en Airtable, hay que actualizar el valor correspondiente aquí también.
const F = {
  clients: { name: 'Nombre Cliente' },
  projects: {
    name: 'Proyecto', client: 'Cliente', stage: 'Estado',
    shoot: 'Fecha Rodaje', due: 'Fecha Entrega', budget: 'Presupuesto',
    driveUrl: 'Drive', notes: 'Notas'
  },
  invoices: {
    movimiento: 'Movimiento', monto: 'Monto', cobrado: 'Monto Cobrado',
    saldo: 'Saldo Pendiente', estado: 'Estado', qbId: 'QuickBooks ID'
  },
  leads: {
    name: 'Nombre Lead', email: 'Email', value: 'Presupuesto Estimado',
    estado: 'Estado Lead', notes: 'Notas'
  },
  tasks: { title: 'Task', estado: 'Estado', due: 'Fecha Límite' }
};

const selName = v => (v && typeof v === 'object' ? v.name : v) || '';
const today = () => new Date().toISOString().slice(0, 10);

async function findClientByName(name) {
  const rows = await at.listRecords('clients');
  return rows.find(r => (r.fields[F.clients.name] || '').toLowerCase() === name.trim().toLowerCase());
}

async function createClient(name) {
  const existing = await findClientByName(name);
  if (existing) return { record: existing, message: `Cliente "${name}" ya existía` };
  const [rec] = await at.createRecords('clients', [{ [F.clients.name]: name }]);
  return { record: rec, message: `Cliente "${name}" creado` };
}

async function findProjectByName(name) {
  const rows = await at.listRecords('projects');
  const n = (name || '').toLowerCase();
  return rows.find(r => (r.fields[F.projects.name] || '').toLowerCase().includes(n));
}

async function createProject(p) {
  const msgs = [];
  const dup = await findProjectByName(p.name);
  if (dup && selName(dup.fields[F.projects.stage]) !== 'Cerrado') {
    return { record: dup, message: `⚠ Ya existe un proyecto activo llamado "${p.name}" — no se duplicó.` };
  }
  let clientId;
  if (p.client) {
    const { record, message } = await createClient(p.client);
    msgs.push(message);
    clientId = record.id;
  }
  const fields = {
    [F.projects.name]: p.name,
    [F.projects.stage]: 'Nuevo',
    [F.projects.budget]: +p.budget || 0
  };
  if (clientId) fields[F.projects.client] = [clientId];
  if (p.shoot) fields[F.projects.shoot] = p.shoot;
  if (p.due) fields[F.projects.due] = p.due;
  const [rec] = await at.createRecords('projects', [fields]);
  msgs.push(`Proyecto "${p.name}" creado`);
  if (p.budget > 0) {
    const inv = await createInvoice({ project: p.name, amount: p.budget });
    msgs.push(inv.message);
  }
  return { record: rec, message: msgs.join(' · ') };
}

async function createInvoice(p) {
  const pr = await findProjectByName(p.project);
  if (!pr) return { message: 'No encontré el proyecto para facturar' };
  const fields = {
    [F.invoices.movimiento]: `Factura — ${pr.fields[F.projects.name]}`,
    [F.invoices.monto]: +p.amount || 0,
    [F.invoices.cobrado]: 0,
    [F.invoices.saldo]: +p.amount || 0,
    [F.invoices.estado]: 'Pendiente'
  };
  const [rec] = await at.createRecords('invoices', [fields]);
  return { record: rec, message: `Factura de ${p.amount} creada para "${pr.fields[F.projects.name]}"` };
}

async function registerPayment(p) {
  const rows = await at.listRecords('invoices');
  // toma la más reciente factura pendiente del proyecto mencionado (heurística simple v1)
  const pr = await findProjectByName(p.project);
  const inv = rows.reverse().find(r => selName(r.fields[F.invoices.estado]) !== 'Pagado');
  if (!inv) return { message: 'No encontré una factura pendiente' };
  const monto = +inv.fields[F.invoices.monto] || 0;
  const cobradoPrevio = +inv.fields[F.invoices.cobrado] || 0;
  const nuevoCobrado = cobradoPrevio + (+p.amount || 0);
  const saldo = Math.max(0, monto - nuevoCobrado);
  const estado = saldo <= 0 ? 'Pagado' : 'Parcial';
  await at.updateRecords('invoices', [{ id: inv.id, fields: {
    [F.invoices.cobrado]: nuevoCobrado, [F.invoices.saldo]: saldo, [F.invoices.estado]: estado
  } }]);
  return { message: `Pago de ${p.amount} registrado (${estado})` };
}

async function createTask(p) {
  const fields = { [F.tasks.title]: p.title, [F.tasks.estado]: 'Pendiente' };
  if (p.due) fields[F.tasks.due] = p.due;
  const [rec] = await at.createRecords('tasks', [fields]);
  return { record: rec, message: `Tarea "${p.title}" creada` };
}

async function createLead(p) {
  const [rec] = await at.createRecords('leads', [{
    [F.leads.name]: p.name,
    [F.leads.email]: p.email || '',
    [F.leads.value]: +p.value || 0,
    [F.leads.estado]: 'Nuevo',
    [F.leads.notes]: p.notes || ''
  }]);
  return { record: rec, message: `Lead "${p.name}" creado` };
}

const AGENTS = { createClient, createProject, createInvoice, registerPayment, createTask, createLead };

async function snapshot() {
  const [clients, projects, invoices, leads, tasks] = await Promise.all([
    at.listRecords('clients'), at.listRecords('projects'), at.listRecords('invoices'),
    at.listRecords('leads'), at.listRecords('tasks')
  ]);
  return {
    clientes: clients.length,
    proyectos: projects.map(p => ({
      nombre: p.fields[F.projects.name], etapa: selName(p.fields[F.projects.stage]),
      presupuesto: p.fields[F.projects.budget], entrega: p.fields[F.projects.due]
    })),
    facturacion: invoices.reduce((a, i) => a + (+i.fields[F.invoices.monto] || 0), 0),
    cobrado: invoices.reduce((a, i) => a + (+i.fields[F.invoices.cobrado] || 0), 0),
    pipelineLeads: leads.filter(l => !['Ganado', 'Perdido'].includes(selName(l.fields[F.leads.estado]))).length,
    tareasAbiertas: tasks.filter(t => selName(t.fields[F.tasks.estado]) !== 'Completada').length
  };
}

module.exports = { AGENTS, snapshot, F, selName, today };
