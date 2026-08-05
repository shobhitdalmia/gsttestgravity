/**
 * Post-build patch script for Vercel deployment.
 *
 * PROBLEM: Nitro's code splitting creates a circular ESM import between:
 *   - server-XXXX.mjs  (helper chunk: contains createMiddleware + re-exports server namespace)
 *   - server-XXXX2.mjs (main bundle: imports createMiddleware from helper chunk)
 *
 * Due to this circular dep, `createMiddleware` resolves to `undefined` when the
 * CSRF middleware tries to call it at module evaluation time, causing a 500 error.
 *
 * FIX: Replace the import of createMiddleware in the main bundle with an inlined copy
 * of the function, breaking the circular dependency entirely.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SSR_DIR = '.vercel/output/functions/__server.func/_ssr';

// Exact inline implementation (matches the Nitro-generated asset)
const INLINE_CREATE_MIDDLEWARE = `var createMiddleware = (options, __opts) => {
\tconst resolvedOptions = {
\t\ttype: "request",
\t\t...__opts || options
\t};
\tconst setValidator = (validator) => {
\t\treturn createMiddleware({}, Object.assign(resolvedOptions, {
\t\t\tvalidator,
\t\t\tinputValidator: validator
\t\t}));
\t};
\treturn {
\t\toptions: resolvedOptions,
\t\tmiddleware: (middleware) => {
\t\t\treturn createMiddleware({}, Object.assign(resolvedOptions, { middleware }));
\t\t},
\t\tvalidator: setValidator,
\t\tinputValidator: setValidator,
\t\tclient: (client) => {
\t\t\treturn createMiddleware({}, Object.assign(resolvedOptions, { client }));
\t\t},
\t\tserver: (server) => {
\t\t\treturn createMiddleware({}, Object.assign(resolvedOptions, { server }));
\t\t}
\t};
};`;

async function main() {
  console.log('🔧 Patching Vercel output to fix circular ESM dependency...');

  let files;
  try {
    files = await readdir(SSR_DIR);
  } catch {
    console.error(`❌ SSR directory not found: ${SSR_DIR}`);
    console.error('   Run "npm run build" before running this script.');
    process.exit(1);
  }

  const serverFiles = files.filter(f => f.startsWith('server-') && f.endsWith('.mjs'));
  console.log(`   Found ${serverFiles.length} server chunks: ${serverFiles.join(', ')}`);

  let patchedCount = 0;

  for (const file of serverFiles) {
    const filePath = join(SSR_DIR, file);
    const content = await readFile(filePath, 'utf8');

    // Match any import of `n as createMiddleware` from another server-*.mjs chunk
    const importPattern = /import \{ n as createMiddleware \} from "\.\/server-[^"]+\.mjs";/g;

    if (importPattern.test(content)) {
      const patched = content.replace(importPattern, INLINE_CREATE_MIDDLEWARE);
      await writeFile(filePath, patched, 'utf8');
      console.log(`   ✅ Patched ${file}: replaced circular import with inlined createMiddleware`);
      patchedCount++;
    }
  }

  if (patchedCount === 0) {
    console.log('   ℹ️  No circular imports found — bundle structure may have changed.');
    console.log('   If the site still fails, check Vercel logs for new error details.');
  } else {
    console.log(`\n✅ Done! Patched ${patchedCount} file(s). Circular dependency eliminated.`);
  }
}

main().catch(err => {
  console.error('❌ Patch script failed:', err);
  process.exit(1);
});
