import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'gridfill');

function parse(spec, step) {
  const size = spec.blocks.length;
  const blocks = new Map();

  spec.blocks.forEach((row, r) => {
    if (row.length !== size) throw new Error(`Puzzle ${step}: row ${r + 1} isn't ${size} squares long`);
    [...row].forEach((ch, c) => {
      if (!/[a-z]/i.test(ch)) throw new Error(`Puzzle ${step}: "${ch}" in row ${r + 1} isn't a letter`);
      const key = ch.toLowerCase();
      if (!blocks.has(key)) blocks.set(key, { key, cells: [], number: null });
      const block = blocks.get(key);
      block.cells.push([r, c]);
      if (ch !== key) {
        if (block.number) throw new Error(`Puzzle ${step}: block ${key} has more than one capital`);
        block.number = [r, c];
      }
    });
  });

  for (const block of blocks.values()) {
    const rows = block.cells.map(([r]) => r);
    const cols = block.cells.map(([, c]) => c);
    const top = Math.min(...rows);
    const left = Math.min(...cols);
    const height = Math.max(...rows) - top + 1;
    const width = Math.max(...cols) - left + 1;
    if (height * width !== block.cells.length) throw new Error(`Puzzle ${step}: block ${block.key} isn't a rectangle`);
    if (block.cells.length > 9) throw new Error(`Puzzle ${step}: block ${block.key} is bigger than 9 squares`);
    if (!block.number) throw new Error(`Puzzle ${step}: block ${block.key} has no capital for its number`);
    Object.assign(block, { top, left, height, width });
  }

  return { size, blocks: [...blocks.values()] };
}

function countSolutions(size, clues) {
  const options = clues.map(({ r, c, area }) => {
    const rects = [];
    for (let height = 1; height <= area; height++) {
      if (area % height) continue;
      const width = area / height;
      for (let top = r - height + 1; top <= r; top++) {
        for (let left = c - width + 1; left <= c; left++) {
          if (top < 0 || left < 0 || top + height > size || left + width > size) continue;
          const holdsOther = clues.some((o) => (o.r !== r || o.c !== c) && o.r >= top && o.r < top + height && o.c >= left && o.c < left + width);
          if (!holdsOther) rects.push({ top, left, height, width });
        }
      }
    }
    return rects;
  });

  const order = options.map((_, i) => i).sort((a, b) => options[a].length - options[b].length);
  const used = new Set();
  let found = 0;

  const search = (i) => {
    if (found > 1) return;
    if (i === order.length) {
      if (used.size === size * size) found++;
      return;
    }
    for (const rect of options[order[i]]) {
      const cells = [];
      for (let r = rect.top; r < rect.top + rect.height; r++) {
        for (let c = rect.left; c < rect.left + rect.width; c++) cells.push(r * size + c);
      }
      if (cells.some((cell) => used.has(cell))) continue;
      cells.forEach((cell) => used.add(cell));
      search(i + 1);
      cells.forEach((cell) => used.delete(cell));
    }
  };

  search(0);
  return found;
}

function build(spec, index, total) {
  const step = index + 1;
  const { size, blocks } = parse(spec, step);
  const clues = blocks.map((b) => ({ r: b.number[0], c: b.number[1], area: b.cells.length }));

  const solutions = countSolutions(size, clues);
  if (solutions !== 1) {
    throw new Error(`Puzzle ${step}: has ${solutions ? 'more than one solution' : 'no solution'}`);
  }

  const cellId = ([r, c]) => r * size + c + 1;
  const solution = blocks
    .slice()
    .sort((a, b) => cellId([a.top, a.left]) - cellId([b.top, b.left]))
    .map((b) => b.cells.map(cellId).sort((x, y) => x - y).join(','))
    .join(';');

  const celldata = new Array(size * size).fill(' ');
  clues.forEach(({ r, c, area }) => (celldata[r * size + c] = String(area)));

  const id = `tutorial-${step}`;

  return {
    meta: {
      id,
      title: 'Cell Blocks',
      difficulty: spec.difficulty || '',
      type: 'cellblocks',
      variant: 'Cell Blocks',
      slug: `cell-blocks-${id}`,
      number: '',
      description: '',
      section: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: size,
      rowCount: size,
      allowedValues: '0123456789',
      solution,
    },
    copy: { gridsize: { type: 'Standard', rows: size, cols: size } },
    celldata: celldata.join(''),
    cluedata: '',
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `gridfill-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
