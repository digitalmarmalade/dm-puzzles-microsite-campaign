import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeTutorials} from './sudoku.js';

writeTutorials(path.dirname(fileURLToPath(import.meta.url)), { name: 'Sudoku', slug: 'sudoku' });
