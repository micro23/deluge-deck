import http from 'node:http';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, safeOrigin } from './index.mjs';

let upstream;
let base;
let upstreamUrl;
let connected = false;
let denyConnection = false;
let invalidResponse = false;
const calls = [];
const listen = async (instance) => {
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${instance.address().port}`;
};
before(async () => {
  upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const { method, params } = JSON.parse(Buffer.concat(chunks));
    calls.push({ method, params, cookie: req.headers.cookie, url: req.url });
    let result;
    if (method === 'auth.login') {
      res.setHeader('set-cookie', 'session=fixture; Path=/');
      result = true;
    } else if (method === 'auth.check_session') result = true;
    else if (method === 'web.connected') result = connected;
    else if (method === 'web.disconnect') { connected = false; result = true; }
    else if (method === 'web.get_hosts') result = [['offline', '127.0.0.1', 58846, 'alice'], ['online', '127.0.0.1', 58847, 'bob']];
    else if (method === 'web.get_host_status') result = [params[0], params[0] === 'offline' ? 'Offline' : 'Online', '2.1'];
    else if (method === 'web.connect') { connected = !denyConnection; result = connected; }
    else if (method === 'system.listMethods') result = [];
    else if (method === 'web.update_ui') result = { connected, torrents: {}, stats: {} };
    res.setHeader('content-type', 'application/json');
    res.end(invalidResponse ? '{}' : JSON.stringify({ result }));
  });
  upstreamUrl = await listen(upstream);
  base = await listen(server);
});
after(async () => {
  await Promise.all([server, upstream].map(instance => new Promise(resolve => {
    instance.closeAllConnections();
    instance.close(resolve);
  })));
});
const connect = (url = `${upstreamUrl}/deluge`) => fetch(`${base}/api/session/connect`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, password: 'fixture' }),
});

test('live companion discovers an online daemon, uses reverse-proxy paths, and isolates login cookies', async () => {
  connected = false;
  calls.length = 0;
  const response = await connect();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).connected, true);
  assert.deepEqual(calls.find(call => call.method === 'web.connect').params, ['online']);
  assert.ok(calls.every(call => call.url === '/deluge/json'));
  assert.equal(calls[0].cookie, undefined);
  assert.equal(calls[1].cookie, 'session=fixture');
  calls.length = 0;
  assert.equal((await connect(`${upstreamUrl}/other`)).status, 200);
  assert.equal(calls[0].cookie, undefined, 'A new target must never receive the prior session cookie');
  assert.ok(calls.every(call => call.url === '/other/json'));
});

test('live login fails when the daemon remains disconnected or sends invalid RPC JSON', async () => {
  connected = false;
  denyConnection = true;
  let response = await connect();
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /could not connect/);
  denyConnection = false;
  invalidResponse = true;
  response = await connect();
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /invalid RPC/);
  invalidResponse = false;
});

test('companion rejects malformed RPC inputs and unknown API routes with client errors', async () => {
  for (const body of ['null', '{"method":3,"params":[]}', '{', '{"method":"core.pause_torrents","params":null}']) {
    const response = await fetch(`${base}/api/rpc`, { method: 'POST', body });
    assert.equal(response.status, 400, body);
  }
  assert.equal((await fetch(`${base}/api/unknown`, { method: 'POST' })).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
  assert.equal((await fetch(`${base}/api/rpc`, { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) })).status, 413);
});

test('loopback origin validation rejects unrelated ports, hostile hosts, and cross-site requests', async () => {
  const req = (headers) => ({ headers: { host: '127.0.0.1:8118', ...headers } });
  assert.equal(safeOrigin(req({ origin: 'http://127.0.0.1:8118' })), true);
  assert.equal(safeOrigin(req({})), true);
  assert.equal(safeOrigin(req({ origin: 'http://127.0.0.1:9999' })), false);
  assert.equal(safeOrigin(req({ origin: 'https://evil.example' })), false);
  assert.equal(safeOrigin(req({ host: 'evil.example:8118' })), false);
  assert.equal(safeOrigin(req({ origin: 'null' })), false);
  assert.equal(safeOrigin(req({ 'sec-fetch-site': 'cross-site' })), false);
  const response = await fetch(`${base}/api/health`, { headers: { origin: 'http://127.0.0.1:9999' } });
  assert.equal(response.status, 403);
});
