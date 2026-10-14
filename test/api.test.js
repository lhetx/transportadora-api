const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');

async function fixture(t, db) {
  const server = createApp(db, { logging: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return async (path = '/entrega', method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
}

test('CRUD completo por HTTP e binding dos valores', async t => {
  const rows = new Map();
  let sequence = 0;
  const calls = [];
  const db = { async query(sql, values = []) {
    calls.push({ sql, values });
    if (sql.startsWith('INSERT')) {
      const id = ++sequence;
      rows.set(id, { id, destinatario: values[0], cidade: values[1], status: values[2] });
      return { insertId: id };
    }
    if (sql.startsWith('UPDATE')) {
      const id = values[3];
      if (!rows.has(id)) return { affectedRows: 0 };
      rows.set(id, { id, destinatario: values[0], cidade: values[1], status: values[2] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith('DELETE')) return { affectedRows: Number(rows.delete(values[0])) };
    return values.length ? (rows.has(values[0]) ? [rows.get(values[0])] : []) : [...rows.values()];
  } };
  const request = await fixture(t, db);
  assert.deepEqual((await request()).body, []);
  const data = { destinatario: "Ana O'Neil'); DROP TABLE entrega; --", cidade: 'Goiânia', status: 'pendente' };
  const created = await request('/entrega', 'POST', data);
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('location'), '/entrega/1');
  assert.deepEqual(created.body, { id: 1, ...data });
  const insert = calls.find(call => call.sql.startsWith('INSERT'));
  assert.equal(insert.sql.includes(data.destinatario), false);
  assert.deepEqual(insert.values, Object.values(data));
  assert.deepEqual((await request('/entrega/1')).body, { id: 1, ...data });
  assert.equal((await request()).body.length, 1);
  const updated = { ...data, status: 'entregue' };
  assert.equal((await request('/entrega/1', 'PUT', updated)).status, 200);
  assert.deepEqual((await request('/entrega/1')).body, { id: 1, ...updated });
  assert.equal((await request('/entrega/1', 'PUT', updated)).status, 200);
  assert.equal((await request('/entrega/1', 'DELETE')).status, 200);
  assert.deepEqual((await request()).body, []);
  for (const method of ['GET', 'PUT', 'DELETE']) {
    assert.equal((await request('/entrega/1', method, method === 'PUT' ? data : undefined)).status, 404);
  }
});

test('dados e identificadores inválidos não chegam ao banco', async t => {
  const request = await fixture(t, { query() { assert.fail('Não deveria consultar o banco'); } });
  for (const id of ['0', '-1', 'abc', '1.5', '2147483648', '1%20OR%201=1']) {
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request(`/entrega/${id}`, method, method === 'PUT' ? {} : undefined)).status, 400);
  }
  for (const body of [{}, [], { destinatario: ' ', cidade: 'Goiânia', status: 'pendente' }, { destinatario: 'Ana', cidade: 1, status: 'pendente' }, { destinatario: 'x'.repeat(151), cidade: 'Goiânia', status: 'pendente' }]) {
    assert.equal((await request('/entrega', 'POST', body)).status, 400);
    assert.equal((await request('/entrega/1', 'PUT', body)).status, 400);
  }
  assert.equal((await request('/desconhecida')).status, 404);
});

for (const [code, expected] of [['ECONNREFUSED', 503], ['ER_ACCESS_DENIED_ERROR', 503], ['ER_PARSE_ERROR', 500]]) {
  test(`erro ${code} retorna JSON ${expected} sem detalhes internos`, async t => {
    const request = await fixture(t, { async query() { throw Object.assign(new Error('senha-secreta'), { code }); } });
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      const result = await request(method === 'PUT' || method === 'DELETE' ? '/entrega/1' : '/entrega', method,
        method === 'POST' || method === 'PUT' ? { destinatario: 'Ana', cidade: 'Goiânia', status: 'pendente' } : undefined);
      assert.equal(result.status, expected);
      assert.equal(JSON.stringify(result.body).includes('senha-secreta'), false);
    }
  });
}

test('JSON malformado, limite do corpo e CORS', async t => {
  const server = createApp({ query() { assert.fail('Não deveria consultar o banco'); } }, { logging: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/entrega`;
  for (const [body, expected] of [['{invalid', 400], [JSON.stringify({ data: 'a'.repeat(110000) }), 413]]) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, expected);
    assert.ok((await response.json()).erro);
  }
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8080', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
});
