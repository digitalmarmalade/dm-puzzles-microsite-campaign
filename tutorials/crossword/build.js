import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'crossword');

const lettersOf = (answer) => answer.toUpperCase().replace(/[^A-Z]/g, '');
const formatOf = (answer) =>
  answer.trim().split(/([\s-]+)/).reduce((out, part) => {
    if (/^\s+$/.test(part)) return out + ',';
    if (/^-+$/.test(part)) return out + '-';
    return out + lettersOf(part).length;
  }, '');

function build(spec, index, total) {
  const rows = spec.grid.length;
  const cols = spec.grid[0].length;
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? spec.grid[r][c] : '#');
  const open = (r, c) => at(r, c) !== '#';

  const starts = [];
  let number = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!open(r, c)) continue;
      const across = !open(r, c - 1) && open(r, c + 1);
      const down = !open(r - 1, c) && open(r + 1, c);
      if (across || down) starts.push({ r, c, number: ++number, across, down });
    }
  }

  const words = [];
  for (const direction of ['across', 'down']) {
    for (const start of starts.filter((s) => s[direction])) {
      const cells = [];
      let r = start.r;
      let c = start.c;
      while (open(r, c)) {
        cells.push({ r, c });
        direction === 'across' ? c++ : r++;
      }
      const solution = cells.map(({ r, c }) => at(r, c)).join('');
      const answer = Object.keys(spec[direction]).find((a) => lettersOf(a) === solution);
      if (!answer) throw new Error(`Puzzle ${index + 1}: no ${direction} clue for ${solution}`);
      words.push({ direction, number: start.number, cells, solution, answer, clue: spec[direction][answer] });
    }
  }
  words.forEach((word, i) => (word.id = i + 1));

  for (const direction of ['across', 'down']) {
    for (const answer of Object.keys(spec[direction])) {
      if (!words.some((w) => w.direction === direction && w.answer === answer)) {
        throw new Error(`Puzzle ${index + 1}: ${direction} clue "${answer}" isn't in the grid`);
      }
    }
  }

  const wordAt = (direction, r, c) =>
    words.find((w) => w.direction === direction && w.cells.some((p) => p.r === r && p.c === c));

  const grid = [];
  let solution = '';
  for (let r = 0; r < rows; r++) {
    grid.push([]);
    for (let c = 0; c < cols; c++) {
      const start = starts.find((s) => s.r === r && s.c === c);
      const across = open(r, c) && wordAt('across', r, c);
      const down = open(r, c) && wordAt('down', r, c);
      grid[r].push({
        SquareID: r * cols + c + 1,
        Number: start ? String(start.number) : '',
        Blank: open(r, c) ? '' : 'blank',
        WordAcrossID: across ? across.id : '',
        WordDownID: down ? down.id : '',
        Letter: open(r, c) ? at(r, c) : '',
      });
      solution += open(r, c) ? at(r, c) : ' ';
    }
  }

  const range = (a, b) => (a === b ? String(a) : `${a}-${b}`);
  const step = index + 1;
  const id = `tutorial-${step}`;

  return {
    headline: '',
    type: 'crossword',
    copy: {
      title: '',
      id,
      type: 'block',
      crosswordtype: 'Crossword',
      gridsize: { type: 'Standard', cols: String(cols), rows: String(rows) },
      settings: { solution, solution_hashed: crypto.createHash('md5').update(solution).digest('hex') },
      hints: {},
      words: words.map((w) => {
        const first = w.cells[0];
        const last = w.cells[w.cells.length - 1];
        return {
          id: w.id,
          x: range(first.c + 1, last.c + 1),
          y: range(first.r + 1, last.r + 1),
          solution: w.solution,
        };
      }),
      clues: ['across', 'down'].map((direction) => ({
        name: 'Clues',
        title: direction === 'across' ? 'Across' : 'Down',
        clues: words
          .filter((w) => w.direction === direction)
          .map((w) => ({
            word: w.id,
            number: w.number,
            clue: w.clue,
            format: formatOf(w.answer),
            length: w.solution.length,
            answer: w.answer,
          })),
      })),
    },
    options: [],
    grid,
    meta: {
      variant: 'Crossword',
      slug: `crossword-${id}`,
      id,
      number: '',
      description: '',
      type: 'crossword',
      section: '',
      difficulty: spec.difficulty || '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `crossword-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
