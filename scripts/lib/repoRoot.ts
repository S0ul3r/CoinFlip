import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (parent of `scripts/`) */
export const REPO_ROOT = path.join(__dirname, '..', '..');
