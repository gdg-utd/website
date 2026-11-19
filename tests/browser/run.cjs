/* eslint-disable @typescript-eslint/no-require-imports -- Local browser-test harness. */
const { spawn } = require('node:child_process');
const { copyFileSync, constants, existsSync } = require('node:fs');
const path = require('node:path');
const environment = require('./environment.cjs');
const root = path.resolve(__dirname, '../..');
const env = {...process.env, ...environment};
const next = require.resolve('next/dist/bin/next');
const playwright = require.resolve('@playwright/test/cli');
function run(file, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], {cwd:root, env, stdio:'inherit', ...options});
    child.on('error', (error) => { console.error(error); resolve(1); });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}
(async () => {
  // Build a real production bundle with synthetic service configuration.
  const code = await run(next, ['build','--webpack']);
  if (code !== 0) { process.exitCode = code; return; }

  // Next.js 16.4.3's Webpack build emits proxy.js, but next start loads middleware.js.
  const serverDir = path.join(root, '.next', 'server');
  const proxy = path.join(serverDir, 'proxy.js');
  const middleware = path.join(serverDir, 'middleware.js');
  if (existsSync(proxy) && !existsSync(middleware)) {
    copyFileSync(proxy, middleware, constants.COPYFILE_EXCL);
  }

  if (process.argv.includes('--build-only')) return;
  if (process.argv.includes('--manual')) {
    console.log('Local account sandbox: http://localhost:3100/signup');
    console.log('Seeded logins: member@utdallas.edu, reviewer@utdallas.edu, admin@utdallas.edu');
    console.log('Seeded password: BrowserTest123! | Signup confirmation code: 123456');
    require('./server.cjs');
    return;
  }
  process.exitCode = await run(playwright, ['test', ...process.argv.slice(2)]);
})().catch(error => { console.error(error); process.exitCode = 1; });
