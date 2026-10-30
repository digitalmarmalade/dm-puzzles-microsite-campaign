import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'traintracks');

const PIECES = ['LR', 'TB', 'LT', 'LB', 'RT', 'RB'];
const STEP = { L: [0, -1], R: [0, 1], T: [-1, 0], B: [1, 0] };
const OPPOSITE = { L: 'R', R: 'L', T: 'B', B: 'T' };
const EDGE_SIDE = { left: 'L', right: 'R', top: 'T', bottom: 'B' };

const pieceFor = (a, b) => PIECES.find((p) => p.includes(a) && p.includes(b));

function entry(station, size) {
  const i = (station.edge === 'left' || station.edge === 'right' ? station.row : station.col) - 1;
  const cell = {
    left: [i, 0],
    right: [i, size - 1],
    top: [0, i],
    bottom: [size - 1, i],
  }[station.edge];
  return { cell, side: EDGE_SIDE[station.edge] };
}

function leavesAt(station, size, r, c, side) {
  const { cell, side: stationSide } = entry(station, size);
  return side === stationSide && r === cell[0] && c === cell[1];
}

function parse(spec, step) {
  const size = spec.track.length;
  return spec.track.map((row, r) => {
    const squares = row.trim().split(/\s+/);
    if (squares.length !== size) throw new Error(`Puzzle ${step}: row ${r + 1} needs ${size} squares`);
    return squares.map((square) => {
      if (square === '.') return { piece: '', given: false };
      const piece = square.replace('*', '');
      if (!PIECES.includes(piece)) throw new Error(`Puzzle ${step}: "${square}" in row ${r + 1} isn't a piece`);
      return { piece, given: square.endsWith('*') };
    });
  });
}

function follow(grid, stations, step) {
  const size = grid.length;
  let { cell: [r, c], side } = entry(stations.A, size);
  const visited = new Set();

  for (;;) {
    const square = grid[r]?.[c];
    if (!square?.piece || !square.piece.includes(side)) {
      throw new Error(`Puzzle ${step}: the track breaks at row ${r + 1}, column ${c + 1}`);
    }
    if (visited.has(`${r},${c}`)) throw new Error(`Puzzle ${step}: the track crosses itself at row ${r + 1}, column ${c + 1}`);
    visited.add(`${r},${c}`);

    const out = square.piece.replace(side, '');
    if (leavesAt(stations.B, size, r, c, out)) break;
    r += STEP[out][0];
    c += STEP[out][1];
    side = OPPOSITE[out];
  }

  const pieces = grid.flat().filter((s) => s.piece).length;
  if (visited.size !== pieces) throw new Error(`Puzzle ${step}: ${pieces - visited.size} piece(s) aren't on the track from A to B`);
}

function solve(size, stations, rowClues, colClues, givens) {
  const rows = new Array(size).fill(0);
  const cols = new Array(size).fill(0);
  const seen = new Set();
  const route = [];
  const solutions = [];
  const givenCount = Object.keys(givens).length;

  const walk = (r, c, side, givensUsed) => {
    if (solutions.length > 1) return;
    if (r < 0 || r >= size || c < 0 || c >= size || seen.has(`${r},${c}`)) return;
    if (rows[r] >= rowClues[r] || cols[c] >= colClues[c]) return;

    seen.add(`${r},${c}`);
    rows[r]++;
    cols[c]++;

    for (const out of 'LRTB') {
      if (out === side) continue;
      const piece = pieceFor(side, out);
      const given = givens[`${r},${c}`];
      if (given && given !== piece) continue;
      const used = givensUsed + (given ? 1 : 0);

      route.push({ r, c, piece });
      if (leavesAt(stations.B, size, r, c, out)) {
        const countsMatch = rows.every((n, i) => n === rowClues[i]) && cols.every((n, i) => n === colClues[i]);
        if (countsMatch && used === givenCount) solutions.push(route.slice());
      } else {
        walk(r + STEP[out][0], c + STEP[out][1], OPPOSITE[out], used);
      }
      route.pop();
    }

    seen.delete(`${r},${c}`);
    rows[r]--;
    cols[c]--;
  };

  const { cell: [r, c], side } = entry(stations.A, size);
  walk(r, c, side, 0);
  return solutions;
}

function build(spec, index, total) {
  const step = index + 1;
  const grid = parse(spec, step);
  const size = grid.length;

  follow(grid, spec.stations, step);

  const rowClues = grid.map((row) => row.filter((s) => s.piece).length);
  const colClues = grid[0].map((_, c) => grid.filter((row) => row[c].piece).length);
  const givens = {};
  grid.forEach((row, r) => row.forEach((s, c) => s.given && (givens[`${r},${c}`] = s.piece)));

  const solutions = solve(size, spec.stations, rowClues, colClues, givens);
  if (solutions.length !== 1) {
    throw new Error(`Puzzle ${step}: has ${solutions.length ? 'more than one solution' : 'no solution'}`);
  }

  const stationFor = (label) => {
    const { edge, row, col } = spec.stations[label];
    return edge === 'left' || edge === 'right' ? { edge, row, label } : { edge, col, label };
  };
  const id = `tutorial-${step}`;

  return {
    meta: {
      id,
      type: 'traintracks',
      title: 'Train Tracks',
      difficulty: spec.difficulty || '',
      variant: 'Train Tracks',
      slug: `train-tracks-${id}`,
      number: '',
      description: '',
      section: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    cluedata: grid.flat().map((s) => (s.given ? s.piece : '')).join(','),
    copy: {
      settings: {
        colCount: size,
        rowCount: size,
        solution: grid.flat().map((s) => s.piece).join(','),
        rowClues,
        colClues,
        stations: [stationFor('A'), stationFor('B')],
      },
      gridsize: { type: 'Standard', rows: size, cols: size },
    },
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `traintracks-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
