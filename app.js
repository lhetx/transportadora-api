const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const { createEntregaRouter } = require('./routes/entrega');

function createApp(db, { logging = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  if (logging) app.use(morgan('dev'));
  app.use(bodyParser.json({ limit: '100kb' }));
  app.use('/entrega', createEntregaRouter(db));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo da requisição muito grande.' });
    const unavailable = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'POOL_CLOSED'].includes(error.code);
    if (logging) console.error('Erro na API:', error.code || error.message);
    res.status(unavailable ? 503 : 500).json({ erro: unavailable ? 'Banco de dados indisponível. Verifique a conexão e a configuração.' : 'Erro interno ao executar a operação.' });
  });
  return app;
}

module.exports = { createApp };
