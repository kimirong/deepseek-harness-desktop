'use strict'
// Unit tests for the shell's server-lifecycle logic (no Electron required).
const { test } = require('node:test')
const assert = require('node:assert')
const net = require('node:net')
const { READY_LINE, probeExisting, describeLauncher } = require('./server')

test('describeLauncher renders the one-click start command', () => {
  assert.strictEqual(describeLauncher({ command: 'pnpm', args: ['dsh', 'web'] }), 'pnpm dsh web --port <自动分配>')
  assert.strictEqual(describeLauncher(null), null)
})

test('READY_LINE matches the dsh web stdout format', () => {
  const line = 'dsh web: http://127.0.0.1:43123 (LAN: http://192.168.1.5:43123)'
  const match = line.match(READY_LINE)
  assert.ok(match)
  assert.strictEqual(match[1], 'http://127.0.0.1:43123')
})

test('READY_LINE does not match unrelated output', () => {
  assert.strictEqual('Scope: all 200 workspace projects'.match(READY_LINE), null)
})

test('probeExisting is false for a closed port', async () => {
  const closed = await new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port)) // port is now free
    })
  })
  assert.strictEqual(await probeExisting(closed, 500), false)
})

test('probeExisting detects a live harness instance on 3080 (skips when absent)', async (t) => {
  const live = await probeExisting(3080, 2000)
  if (!live) {
    t.skip('no harness instance running on 3080')
    return
  }
  assert.strictEqual(live, true)
})
