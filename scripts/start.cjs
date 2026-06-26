const { execSync } = require('child_process');

// Patch is applied at build time (scripts/build.js), runtime patch is a safety net
const patchProcessResponse = require('./patch-openid-client.cjs');
patchProcessResponse();

const port = process.env.PORT || 3000;

try {
  execSync('prisma db push --skip-generate', { stdio: 'inherit', env: { ...process.env } });
} catch (e) {
  console.error('[start] prisma db push failed:', e.message);
  process.exit(1);
}

try {
  execSync('next start -p ' + port, { stdio: 'inherit', env: { ...process.env } });
} catch (e) {
  console.error('[start] next start failed:', e.message);
  process.exit(1);
}
