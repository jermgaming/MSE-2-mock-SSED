// Runs migration first, then starts the API server in a separate process.
import { spawn } from 'node:child_process';

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

try {
  await run('src/migrate.js');
  await run('src/server.js');
} catch (error) {
  console.error(error);
  process.exit(1);
}
