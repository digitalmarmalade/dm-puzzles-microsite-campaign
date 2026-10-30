import fs from 'node:fs';
import path from 'node:path';

function parse(spec, step) {
  const size = spec.grid.length;
  const [boxWidth, boxHeight] = spec.box;
  if (size % boxWidth || size % boxHeight || boxWidth * boxHeight !== size) {
    throw new Error(`Puzzle ${step}: ${boxWidth}×${boxHeight} boxes don't fit a ${size}×${size} grid`);
  }

  return spec.grid.map((row, r) => {
    if (row.length !== size) throw new Error(`Puzzle ${step}: row ${r + 1} isn't ${size} squares long`);
    return [...row].map((ch) => {
      if (ch === '.') return 0;
      const value = Number(ch);
      if (!(value >= 1 && value <= size)) throw new Error(`Puzzle ${step}: "${ch}" in row ${r + 1}`);
      return value;
    });
  });
}

function solve(grid, boxWidth, boxHeight) {
  const size = grid.length;
  const work = grid.map((row) => row.slice());
  const solutions = [];

  const allowed = (r, c, value) => {
    const top = r - (r % boxHeight);
    const left = c - (c % boxWidth);
    for (let i = 0; i < size; i++) {
      if (work[r][i] === value || work[i][c] === value) return false;
      if (work[top + Math.floor(i / boxWidth)][left + (i % boxWidth)] === value) return false;
    }
    return true;
  };

  const search = () => {
    if (solutions.length > 1) return;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (work[r][c]) continue;
        for (let value = 1; value <= size; value++) {
          if (!allowed(r, c, value)) continue;
          work[r][c] = value;
          search();
          work[r][c] = 0;
        }
        return;
      }
    }
    solutions.push(work.map((row) => row.slice()));
  };

  search();
  return solutions;
}

function candidates(grid, boxWidth, boxHeight, r, c) {
  const size = grid.length;
  const top = r - (r % boxHeight);
  const left = c - (c % boxWidth);
  const used = new Set();
  for (let i = 0; i < size; i++) {
    used.add(grid[r][i]);
    used.add(grid[i][c]);
    used.add(grid[top + Math.floor(i / boxWidth)][left + (i % boxWidth)]);
  }
  return Array.from({ length: size }, (_, i) => i + 1).filter((value) => !used.has(value));
}

function boxes(size, boxWidth, boxHeight) {
  const list = [];
  for (let top = 0; top < size; top += boxHeight) {
    for (let left = 0; left < size; left += boxWidth) {
      const cells = [];
      for (let i = 0; i < size; i++) cells.push([top + Math.floor(i / boxWidth), left + (i % boxWidth)]);
      list.push(cells);
    }
  }
  return list;
}

function onlyPlaces(grid, boxWidth, boxHeight) {
  const found = [];
  for (const cells of boxes(grid.length, boxWidth, boxHeight)) {
    for (let value = 1; value <= grid.length; value++) {
      if (cells.some(([r, c]) => grid[r][c] === value)) continue;
      const spots = cells.filter(([r, c]) => !grid[r][c] && candidates(grid, boxWidth, boxHeight, r, c).includes(value));
      if (spots.length === 1) found.push({ r: spots[0][0], c: spots[0][1], value });
    }
  }
  return found;
}

function lastNumbers(grid, boxWidth, boxHeight) {
  const found = [];
  grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell) return;
    const left = candidates(grid, boxWidth, boxHeight, r, c);
    if (left.length === 1) found.push({ r, c, value: left[0] });
  }));
  return found;
}

function checkTeaches(spec, puzzle, step) {
  if (!spec.teaches) return;
  if (spec.teaches !== 'onlyPlace') throw new Error(`Puzzle ${step}: unknown teaches "${spec.teaches}"`);
  const [boxWidth, boxHeight] = spec.box;

  const lesson = onlyPlaces(puzzle, boxWidth, boxHeight).filter(({ r, c }) => candidates(puzzle, boxWidth, boxHeight, r, c).length > 1);
  if (!lesson.length) throw new Error(`Puzzle ${step}: no square needs the only-place-in-the-box move to start with`);

  const work = puzzle.map((row) => row.slice());
  for (;;) {
    const moves = [...lastNumbers(work, boxWidth, boxHeight), ...onlyPlaces(work, boxWidth, boxHeight)];
    if (!moves.length) break;
    moves.forEach(({ r, c, value }) => { work[r][c] = value; });
  }
  if (work.some((row) => row.includes(0))) throw new Error(`Puzzle ${step}: needs more than the two beginner moves to finish`);
}

function build(spec, index, total, variant) {
  const step = index + 1;
  const [boxWidth, boxHeight] = spec.box;
  const puzzle = parse(spec, step);
  const size = puzzle.length;

  const solutions = solve(puzzle, boxWidth, boxHeight);
  if (solutions.length !== 1) {
    throw new Error(`Puzzle ${step}: has ${solutions.length ? 'more than one solution' : 'no solution'}`);
  }
  checkTeaches(spec, puzzle, step);

  const id = `tutorial-${step}`;
  const slug = variant.name.toLowerCase().replace(/\s+/g, '-');

  return {
    version: 'http://ipuz.org/v2',
    kind: ['http://ipuz.org/sudoku#1'],
    title: variant.name,
    difficulty: spec.difficulty || '',
    boxes: true,
    dimensions: { width: size, height: size },
    settings: { boxColCount: size / boxWidth, boxRowCount: size / boxHeight },
    puzzle,
    solution: solutions[0],
    meta: {
      variant: variant.name,
      slug: `${slug}-${id}`,
      ...(variant.mode ? { mode: variant.mode } : {}),
      id,
      number: '',
      description: '',
      type: 'sudoku',
      section: '',
      difficulty: spec.difficulty || '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    copy: {},
    feedback: null,
  };
}

export function writeTutorials(dir, variant) {
  const source = JSON.parse(fs.readFileSync(path.join(dir, 'puzzles.json'), 'utf8'));
  const outDir = path.join(dir, '..', '..', 'public', 'tutorials', variant.slug);

  fs.mkdirSync(outDir, { recursive: true });
  source.puzzles.forEach((spec, i) => {
    const file = path.join(outDir, `${variant.slug}-${i + 1}.json`);
    fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length, variant), null, 2) + '\n');
    console.log('Wrote', path.relative(process.cwd(), file));
  });
}
