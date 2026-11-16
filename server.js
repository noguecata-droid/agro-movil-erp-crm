const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const RATE_PER_KG = 0.15;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

init();

// Helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ---- CRM: Agricultores ----
app.get('/api/farmers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM farmers ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const { nombre, ubicacion, producto } = req.body;
    if (!nombre || !ubicacion || !producto) {
      return res.status(400).json({ error: 'nombre, ubicacion y producto son requeridos' });
    }
    if (!['Carchi', 'Santo Domingo'].includes(ubicacion)) {
      return res.status(400).json({ error: 'ubicacion debe ser Carchi o Santo Domingo' });
    }
    const result = await run(
      'INSERT INTO farmers (nombre, ubicacion, producto) VALUES (?, ?, ?)',
      [nombre.trim(), ubicacion, producto.trim()]
    );
    const farmer = await get('SELECT * FROM farmers WHERE id = ?', [result.id]);
    res.status(201).json(farmer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/farmers/:id', async (req, res) => {
  try {
    const { nombre, ubicacion, producto } = req.body;
    if (ubicacion && !['Carchi', 'Santo Domingo'].includes(ubicacion)) {
      return res.status(400).json({ error: 'ubicacion debe ser Carchi o Santo Domingo' });
    }
    await run(
      'UPDATE farmers SET nombre = COALESCE(?, nombre), ubicacion = COALESCE(?, ubicacion), producto = COALESCE(?, producto) WHERE id = ?',
      [nombre || null, ubicacion || null, producto || null, req.params.id]
    );
    const farmer = await get('SELECT * FROM farmers WHERE id = ?', [req.params.id]);
    if (!farmer) return res.status(404).json({ error: 'Agricultor no encontrado' });
    res.json(farmer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/farmers/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM farmers WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Agricultor no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- ERP: Contenedores ----
app.get('/api/containers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM containers ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/containers', async (req, res) => {
  try {
    const { codigo, estado, ubicacion_actual } = req.body;
    if (!codigo) return res.status(400).json({ error: 'codigo es requerido' });
    const result = await run(
      `INSERT INTO containers (codigo, tipo, estado, ubicacion_actual) VALUES (?, 'Reefer 40 pies', ?, ?)`,
      [codigo.trim(), estado || 'Disponible', ubicacion_actual || null]
    );
    const container = await get('SELECT * FROM containers WHERE id = ?', [result.id]);
    res.status(201).json(container);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El código de contenedor ya existe' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/containers/:id', async (req, res) => {
  try {
    const { codigo, estado, ubicacion_actual } = req.body;
    await run(
      'UPDATE containers SET codigo = COALESCE(?, codigo), estado = COALESCE(?, estado), ubicacion_actual = COALESCE(?, ubicacion_actual) WHERE id = ?',
      [codigo || null, estado || null, ubicacion_actual || null, req.params.id]
    );
    const container = await get('SELECT * FROM containers WHERE id = ?', [req.params.id]);
    if (!container) return res.status(404).json({ error: 'Contenedor no encontrado' });
    res.json(container);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/containers/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM containers WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Contenedor no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- ERP: Lotes y facturación ----
app.get('/api/lots', async (req, res) => {
  try {
    const rows = await all(`
      SELECT l.*, f.nombre AS farmer_nombre, f.ubicacion AS farmer_ubicacion, c.codigo AS container_codigo
      FROM lots l
      JOIN farmers f ON f.id = l.farmer_id
      LEFT JOIN containers c ON c.id = l.container_id
      ORDER BY l.id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lots', async (req, res) => {
  try {
    const { farmer_id, container_id, producto, kilos, notas } = req.body;
    const kilosNum = parseFloat(kilos);
    if (!farmer_id || !producto || !(kilosNum > 0)) {
      return res.status(400).json({ error: 'farmer_id, producto y kilos (> 0) son requeridos' });
    }
    const farmer = await get('SELECT id FROM farmers WHERE id = ?', [farmer_id]);
    if (!farmer) return res.status(400).json({ error: 'Agricultor no válido' });
    if (container_id) {
      const container = await get('SELECT id FROM containers WHERE id = ?', [container_id]);
      if (!container) return res.status(400).json({ error: 'Contenedor no válido' });
    }
    const total = Math.round(kilosNum * RATE_PER_KG * 100) / 100;
    const result = await run(
      `INSERT INTO lots (farmer_id, container_id, producto, kilos, tarifa_por_kg, total_cobro, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [farmer_id, container_id || null, producto.trim(), kilosNum, RATE_PER_KG, total, notas || null]
    );
    const lot = await get(`
      SELECT l.*, f.nombre AS farmer_nombre, f.ubicacion AS farmer_ubicacion, c.codigo AS container_codigo
      FROM lots l
      JOIN farmers f ON f.id = l.farmer_id
      LEFT JOIN containers c ON c.id = l.container_id
      WHERE l.id = ?
    `, [result.id]);
    res.status(201).json(lot);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lots/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM lots WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Resumen / Dashboard ----
app.get('/api/summary', async (req, res) => {
  try {
    const totals = await get(`
      SELECT
        (SELECT COUNT(*) FROM farmers) AS farmers,
        (SELECT COUNT(*) FROM containers) AS containers,
        (SELECT COUNT(*) FROM lots) AS lots,
        (SELECT COALESCE(SUM(kilos),0) FROM lots) AS kilos_total,
        (SELECT COALESCE(SUM(total_cobro),0) FROM lots) AS cobro_total
    `);
    const byLocation = await all(`
      SELECT f.ubicacion, COUNT(l.id) AS lotes, COALESCE(SUM(l.kilos),0) AS kilos, COALESCE(SUM(l.total_cobro),0) AS cobro
      FROM farmers f LEFT JOIN lots l ON l.farmer_id = f.id
      GROUP BY f.ubicacion
    `);
    res.json({ ...totals, rate: RATE_PER_KG, byLocation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`Modelo IaaS: tarifa $${RATE_PER_KG} por kg procesado (sin inversión inicial)`);
});
