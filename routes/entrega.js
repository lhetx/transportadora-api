const express = require('express');

function createEntregaRouter(db) {
  const router = express.Router();
  router.param('id', (req, res, next, value) => {
    const id = Number(value);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id) || id > 2147483647) {
      return res.status(400).json({ erro: 'O id deve ser um inteiro positivo válido.' });
    }
    req.entregaId = id;
    next();
  });

  function validate(req, res, next) {
    const body = req.body;
    const limits = { destinatario: 150, cidade: 100, status: 50 };
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ erro: 'Envie um objeto JSON com destinatario, cidade e status.' });
    }
    const invalid = Object.entries(limits).filter(([key, max]) =>
      typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max
    ).map(([key]) => key);
    if (invalid.length) {
      return res.status(400).json({ erro: 'Campos obrigatórios inválidos ou acima do limite.', campos: invalid });
    }
    req.entrega = Object.keys(limits).map(key => body[key].trim());
    next();
  }

  router.get('/', async (req, res) => {
    const rows = await db.query('SELECT id, destinatario, cidade, status FROM entrega ORDER BY id');
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const rows = await db.query('SELECT id, destinatario, cidade, status FROM entrega WHERE id = ?', [req.entregaId]);
    if (!rows.length) return res.status(404).json({ erro: 'Entrega não encontrada.' });
    res.json(rows[0]);
  });

  router.post('/', validate, async (req, res) => {
    const result = await db.query('INSERT INTO entrega (destinatario, cidade, status) VALUES (?, ?, ?)', req.entrega);
    const [destinatario, cidade, status] = req.entrega;
    res.location(`/entrega/${result.insertId}`).status(201).json({ id: result.insertId, destinatario, cidade, status });
  });

  router.put('/:id', validate, async (req, res) => {
    const result = await db.query('UPDATE entrega SET destinatario = ?, cidade = ?, status = ? WHERE id = ?', [...req.entrega, req.entregaId]);
    if (!result.affectedRows) return res.status(404).json({ erro: 'Entrega não encontrada.' });
    const [destinatario, cidade, status] = req.entrega;
    res.json({ id: req.entregaId, destinatario, cidade, status });
  });

  router.delete('/:id', async (req, res) => {
    const result = await db.query('DELETE FROM entrega WHERE id = ?', [req.entregaId]);
    if (!result.affectedRows) return res.status(404).json({ erro: 'Entrega não encontrada.' });
    res.json({ mensagem: 'Entrega excluída com sucesso.' });
  });
  return router;
}

module.exports = { createEntregaRouter };
