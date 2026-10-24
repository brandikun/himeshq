import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const PLACEHOLDER = '%INLINE_SCRIPT_HASHES%';
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]+?)<\/script>/g;

/**
 * Replaces the placeholder in dist/_headers with CSP hashes of every inline script in the built
 * HTML, so `script-src` never needs 'unsafe-inline' and never goes stale when the script changes.
 */
export function inlineScriptHashes(): AstroIntegration {
  return {
    name: 'inline-script-hashes',
    hooks: {
      // LEARN: integrations hook into Astro's lifecycle; this one runs after the static build.
      'astro:build:done': async ({ dir }): Promise<void> => {
        const root = fileURLToPath(dir);
        const files = await readdir(root, { recursive: true });
        const hashes = new Set<string>();

        for (const file of files.filter((name) => name.endsWith('.html'))) {
          const html = await readFile(`${root}${file}`, 'utf8');
          for (const [, source] of html.matchAll(INLINE_SCRIPT)) {
            if (source !== undefined) {
              hashes.add(`'sha256-${createHash('sha256').update(source).digest('base64')}'`);
            }
          }
        }

        const headersPath = `${root}_headers`;
        const headers = await readFile(headersPath, 'utf8');
        if (!headers.includes(PLACEHOLDER)) {
          throw new Error(`dist/_headers is missing the ${PLACEHOLDER} placeholder`);
        }
        await writeFile(headersPath, headers.replace(PLACEHOLDER, [...hashes].join(' ')));
      },
    },
  };
}
