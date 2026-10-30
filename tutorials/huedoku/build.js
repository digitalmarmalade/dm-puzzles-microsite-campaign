import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeTutorials} from '../sudoku/sudoku.js';

writeTutorials(path.dirname(fileURLToPath(import.meta.url)), { name: 'Huedoku', slug: 'huedoku', mode: 'colour' });
