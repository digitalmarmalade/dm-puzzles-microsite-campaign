import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'wordsearch');

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

function findAll(rows, word) {
  const hits = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        let i = 0;
        while (i < word.length && rows[r + dr * i]?.[c + dc * i] === word[i]) i++;
        if (i === word.length) hits.push({ r, c, dr, dc });
      }
    }
  }
  return hits.filter((h, i) => !hits.slice(0, i).some((o) =>
    o.r === h.r + h.dr * (word.length - 1) && o.c === h.c + h.dc * (word.length - 1) && o.dr === -h.dr && o.dc === -h.dc));
}

function build(spec, index, total) {
  const step = index + 1;
  const rows = spec.grid.map((row) => String(row).toUpperCase().replace(/\s/g, ''));
  const cols = rows[0].length;
  if (rows.some((row) => row.length !== cols || !/^[A-Z]+$/.test(row))) throw new Error(`Puzzle ${step}: every row needs ${cols} letters`);

  const words = spec.words.map((w) => String(w).toUpperCase());
  const solution = words.map((word) => {
    if (!/^[A-Z]{3,}$/.test(word)) throw new Error(`Puzzle ${step}: "${word}" must be three letters or more`);
    const hits = findAll(rows, word);
    if (hits.length !== 1) throw new Error(`Puzzle ${step}: "${word}" appears ${hits.length} times, not once`);
    const { r, c, dr, dc } = hits[0];
    const n = word.length - 1;
    return `${r * cols + c + 1},${(r + dr * n) * cols + (c + dc * n) + 1}`;
  });

  const id = `tutorial-${step}`;

  return {
    meta: {
      id,
      title: 'Wordsearch',
      difficulty: spec.difficulty || '',
      type: 'wordsearch',
      variant: 'Wordsearch',
      slug: `wordsearch-${id}`,
      number: '',
      description: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: cols,
      rowCount: rows.length,
      allowedValues: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      solution: solution.join(';'),
    },
    copy: { title: 'Wordsearch' },
    celldata: rows.join(''),
    cluedata: words.join(','),
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `wordsearch-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
