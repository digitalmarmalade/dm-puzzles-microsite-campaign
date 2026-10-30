import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'takuzu');

function validLines(size) {
  const lines = [];
  for (let bits = 0; bits < 2 ** size; bits++) {
    const line = bits.toString(2).padStart(size, '0');
    if (line.split('1').length - 1 !== size / 2) continue;
    if (line.includes('000') || line.includes('111')) continue;
    lines.push(line);
  }
  return lines;
}

function solve(grid, right, down) {
  const size = grid.length;
  const fits = (sign, a, b) => sign === '.' || (sign === '=' ? a === b : a !== b);
  const rowFits = (line, r) => [...right[r]].every((sign, c) => fits(sign, line[c], line[c + 1]))
    && (r === 0 || [...down[r - 1]].every((sign, c) => fits(sign, rows[r - 1][c], line[c])));
  const candidates = validLines(size);
  const rows = [];
  const solutions = [];

  const columnsFit = (complete) => {
    const columns = [];
    for (let c = 0; c < size; c++) {
      const column = rows.map((row) => row[c]).join('');
      if (column.includes('000') || column.includes('111')) return false;
      if (column.split('0').length - 1 > size / 2 || column.split('1').length - 1 > size / 2) return false;
      columns.push(column);
    }
    return !complete || new Set(columns).size === size;
  };

  const search = () => {
    if (solutions.length > 1) return;
    if (rows.length === size) {
      solutions.push(rows.slice());
      return;
    }
    const given = grid[rows.length];
    for (const line of candidates) {
      if (rows.includes(line)) continue;
      if ([...given].some((ch, c) => ch !== '.' && ch !== line[c])) continue;
      if (!rowFits(line, rows.length)) continue;
      rows.push(line);
      if (columnsFit(rows.length === size)) search();
      rows.pop();
    }
  };

  search();
  return solutions;
}

function build(spec, index, total) {
  const step = index + 1;
  const size = spec.grid.length;
  if (size % 2) throw new Error(`Puzzle ${step}: the grid needs an even size`);
  spec.grid.forEach((row, r) => {
    if (row.length !== size || /[^01.]/.test(row)) throw new Error(`Puzzle ${step}: row ${r + 1} should be ${size} of 0, 1 or .`);
  });

  const right = spec.right || spec.grid.map(() => '.'.repeat(size - 1));
  const down = spec.down || spec.grid.slice(1).map(() => '.'.repeat(size));
  if (right.length !== size || right.some((row) => row.length !== size - 1 || /[^.=x]/.test(row))) {
    throw new Error(`Puzzle ${step}: right needs ${size} rows of ${size - 1} of ., = or x`);
  }
  if (down.length !== size - 1 || down.some((row) => row.length !== size || /[^.=x]/.test(row))) {
    throw new Error(`Puzzle ${step}: down needs ${size - 1} rows of ${size} of ., = or x`);
  }

  const solutions = solve(spec.grid, right, down);
  if (solutions.length !== 1) {
    throw new Error(`Puzzle ${step}: has ${solutions.length ? 'more than one solution' : 'no solution'}`);
  }

  const id = `tutorial-${step}`;

  return {
    meta: {
      id,
      title: 'Takuzu',
      difficulty: spec.difficulty || '',
      type: 'takuzu',
      number: '',
      variant: 'Takuzu',
      slug: `takuzu-${id}`,
      description: '',
      section: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: size,
      rowCount: size,
      allowedValues: '01',
      solution: solutions[0].join(''),
    },
    copy: { gridsize: { type: 'Standard', rows: size, cols: size } },
    celldata: spec.grid.join('').replace(/\./g, ' '),
    cluedata: cluedata(right, down, size),
    feedback: null,
  };
}

function cluedata(right, down, size) {
  const sign = (ch) => (ch === '.' ? ' ' : ch);
  const across = right.map((row) => [...row].map(sign).join('') + ' ').join('');
  const below = [...down.map((row) => [...row].map(sign).join('')), ' '.repeat(size)].join('');
  const data = across + below;
  return data.trim() ? data : '';
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `takuzu-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
