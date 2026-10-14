const { createDatabase } = require('./config/database');
const { createApp } = require('./app');

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve estar entre 1 e 65535.');
const db = createDatabase();
const server = createApp(db).listen(port, () => console.log(`API disponível em http://localhost:${port}/entrega`));
server.on('error', async error => {
  console.error('Não foi possível iniciar o servidor:', error.code);
  await db.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      try { await db.close(); } catch (error) { console.error(error.code || error.message); process.exitCode = 1; }
    });
  });
}
