const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'teresa2025';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  const query = `
    CREATE TABLE IF NOT EXISTS reuniones (
      id SERIAL PRIMARY KEY,
      delegados TEXT,
      fecha DATE,
      hora TEXT,
      lugar TEXT,
      municipio TEXT,
      lider TEXT,
      celular TEXT,
      asistentes INTEGER,
      tipo_poblacion TEXT,
      observaciones TEXT,
      notas TEXT,
      dispositivo_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log('Tabla "reuniones" verificada/creada');
}

initDb().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
});

// Salud
app.get('/', (req, res) => {
  res.send('API Lista de Chequeo Dra. Teresa - OK');
});

// Obtener reuniones
// - modo admin:   GET /api/reuniones?modo=admin&password=teresa2025
// - por dispositivo: GET /api/reuniones?dispositivoId=XXX
app.get('/api/reuniones', async (req, res) => {
  const { dispositivoId, modo, password } = req.query;

  try {
    let result;

    if (modo === 'admin') {
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      result = await pool.query(
        'SELECT * FROM reuniones ORDER BY created_at DESC'
      );
    } else {
      if (!dispositivoId) {
        return res
          .status(400)
          .json({ error: 'Se requiere dispositivoId' });
      }

      result = await pool.query(
        'SELECT * FROM reuniones WHERE dispositivo_id = $1 ORDER BY created_at DESC',
        [dispositivoId]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener reuniones:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear reunión
app.post('/api/reuniones', async (req, res) => {
  const {
    delegados,
    fecha,
    hora,
    lugar,
    municipio,
    lider,
    celular,
    asistentes,
    tipoPoblacion,
    observaciones,
    notas,
    dispositivoId
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO reuniones
        (delegados, fecha, hora, lugar, municipio, lider, celular,
         asistentes, tipo_poblacion, observaciones, notas, dispositivo_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        delegados,
        fecha || null,
        hora,
        lugar,
        municipio,
        lider,
        celular,
        asistentes || null,
        tipoPoblacion,
        observaciones,
        notas,
        dispositivoId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear reunión:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar reunión
app.put('/api/reuniones/:id', async (req, res) => {
  const { id } = req.params;
  const {
    delegados,
    fecha,
    hora,
    lugar,
    municipio,
    lider,
    celular,
    asistentes,
    tipoPoblacion,
    observaciones,
    notas
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE reuniones
       SET delegados = $1,
           fecha = $2,
           hora = $3,
           lugar = $4,
           municipio = $5,
           lider = $6,
           celular = $7,
           asistentes = $8,
           tipo_poblacion = $9,
           observaciones = $10,
           notas = $11,
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        delegados,
        fecha || null,
        hora,
        lugar,
        municipio,
        lider,
        celular,
        asistentes || null,
        tipoPoblacion,
        observaciones,
        notas,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reunión no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar reunión:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar reunión
app.delete('/api/reuniones/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM reuniones WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reunión no encontrada' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar reunión:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
