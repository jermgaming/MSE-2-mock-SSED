import { spawn } from 'node:child_process';

const node = '/nodejs/bin/node';

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, [script], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

await run('src/migrate.js');
await run('src/server.js');
