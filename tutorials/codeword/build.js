import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'codeword');

function words(grid) {
  const found = [];
  const collect = (lines) => lines.forEach((line) => {
    line.split('#').forEach((run) => {
      if (run.length > 1) found.push(run);
    });
  });

  collect(grid);
  collect([...grid[0]].map((_, c) => grid.map((row) => row[c]).join('')));

  return found.sort();
}

function shuffle(letters, seed) {
  const result = [...letters];
  let state = seed;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function build(spec, index, total) {
  const step = index + 1;
  const rows = spec.grid.length;
  const cols = spec.grid[0].length;

  spec.grid.forEach((row, r) => {
    if (row.length !== cols || /[^A-Z#]/.test(row)) throw new Error(`Puzzle ${step}: row ${r + 1} should be ${cols} of A-Z or #`);
  });

  const expected = [...spec.words].sort();
  const actual = words(spec.grid);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Puzzle ${step}: grid spells ${actual.join(', ')} but words lists ${expected.join(', ')}`);
  }

  const letters = [...new Set(spec.grid.join('').replace(/#/g, ''))].sort();
  [...spec.given].forEach((letter) => {
    if (!letters.includes(letter)) throw new Error(`Puzzle ${step}: given letter ${letter} isn't in the grid`);
  });

  const key = shuffle(letters, step * 7919).join('');
  const numberOf = (letter) => key.indexOf(letter) + 1;
  const id = `tutorial-${step}`;

  return {
    headline: null,
    meta: {
      id,
      title: 'Codeword',
      difficulty: spec.difficulty || '',
      type: 'codeword',
      number: '',
      variant: 'Codeword',
      slug: `codeword-${id}`,
      description: '',
      section: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: cols,
      rowCount: rows,
      allowedValues: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      solution: key,
    },
    copy: { gridsize: { type: 'Standard', rows, cols } },
    celldata: [...spec.grid.join('')].map((ch) => (ch === '#' ? '' : numberOf(ch))).join(','),
    cluedata: [...key].map((letter) => (spec.given.includes(letter) ? letter : ' ')).join(''),
    feedback: null,
    sharing: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `codeword-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
