/* eslint-disable @typescript-eslint/no-require-imports -- Local browser-test harness. */
const { spawn } = require('node:child_process');
const path = require('node:path');
const environment = require('./environment.cjs');
const { createBackend } = require('./supabase.cjs');
const backend = createBackend();
let child;
function stop() { child?.kill('SIGTERM'); backend.close(); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
backend.listen(4319, '127.0.0.1', () => {
  child = spawn(process.execPath, ['--require', path.join(__dirname,'network.cjs'),require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3100'], {
    cwd:path.resolve(__dirname,'../..'), env:{...process.env,...environment}, stdio:'inherit',
  });
  child.on('exit', (code) => {backend.close(); process.exitCode=code ?? 1;});
});
