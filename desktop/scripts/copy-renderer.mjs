import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(currentDir, '..');
const webDistDir = path.resolve(desktopDir, '../web/dist');
const rendererDistDir = path.resolve(desktopDir, 'dist/renderer');

/**
 * Copies the Web build into the Electron package directory.
 * @returns {Promise<void>} Resolves after the renderer directory is replaced.
 */
const copyRenderer = async () => {
  await rm(rendererDistDir, { force: true, recursive: true });
  await cp(webDistDir, rendererDistDir, { recursive: true });
};

await copyRenderer();
