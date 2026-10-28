import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/app/api.js';

test('hosted session restoration reconnects a daemon using the existing cookie', async (t) => {
  const calls = [];
  let connected = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://deluge.example/deck/json');
    assert.equal(options.credentials, 'same-origin');
    const { method } = JSON.parse(options.body);
    calls.push(method);
    const result = {
      'auth.check_session': true,
      'web.connected': connected,
      'web.get_hosts': [['local', 'localhost', 58846]],
      'web.get_host_status': ['local', 'Online'],
      'web.connect': true,
    }[method];
    if (method === 'web.connect') connected = true;
    return Response.json({ result });
  });
  globalThis.window = { __DELUGE_DECK_PLUGIN__: true, location: { origin: 'https://deluge.example' } };
  globalThis.document = { baseURI: 'https://deluge.example/deck/' };
  t.after(() => { delete globalThis.window; delete globalThis.document; });

  assert.deepEqual(await api.session(), {
    mode: 'plugin', authenticated: true, connected: true, delugeUrl: 'https://deluge.example',
  });
  assert.ok(calls.includes('web.connect'));
  assert.ok(!calls.includes('auth.login'), 'Restoring a session must not ask for the password again');

  calls.length = 0;
  await api.session();
  assert.deepEqual(calls, ['auth.check_session', 'web.connected']);
});

test('a valid cookie remains authenticated when all daemon hosts are offline', async (t) => {
  globalThis.window = { __DELUGE_DECK_PLUGIN__: true, location: { origin: 'https://deluge.example' } };
  globalThis.document = { baseURI: 'https://deluge.example/deck/' };
  t.after(() => { delete globalThis.window; delete globalThis.document; });
  const calls = [];
  let authenticated = true;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const { method } = JSON.parse(options.body);
    calls.push(method);
    return Response.json({ result: method === 'auth.check_session' ? authenticated : method === 'web.get_hosts' ? [] : false });
  });
  assert.equal((await api.session()).authenticated, true);
  assert.equal((await api.session()).connected, false);
  authenticated = false;
  calls.length = 0;
  assert.equal((await api.session()).authenticated, false);
  assert.deepEqual(calls, ['auth.check_session'], 'Expired sessions must still require login');
});
