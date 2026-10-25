/* eslint-disable @typescript-eslint/no-require-imports -- Local browser-test harness. */
const { spawn } = require('node:child_process');
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
  if (code !== 0 || process.argv.includes('--build-only')) { process.exitCode = code; return; }
  process.exitCode = await run(playwright, ['test', ...process.argv.slice(2)]);
})();
