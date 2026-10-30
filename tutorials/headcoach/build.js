import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'headcoach');

const STEPS = [
  [/^\+\s*(\d+)$/, (n, [a]) => n + a],
  [/^-\s*(\d+)$/, (n, [a]) => n - a],
  [/^[×x*]\s*(\d+)$/, (n, [a]) => n * a],
  [/^[÷/]\s*(\d+)$/, (n, [a]) => n / a],
  [/^double it$/, (n) => n * 2],
  [/^triple it$/, (n) => n * 3],
  [/^half of it$/, (n) => n / 2],
  [/^square it$/, (n) => n * n],
  [/^(\d+)\/(\d+) of it$/, (n, [a, b]) => (n * a) / b],
  [/^(\d+)% of it$/, (n, [a]) => (n * a) / 100],
];

function apply(value, step, puzzle, index) {
  for (const [pattern, fn] of STEPS) {
    const match = step.trim().match(pattern);
    if (!match) continue;
    const result = fn(value, match.slice(1).map(Number));
    if (!Number.isInteger(result) || result < 0) {
      throw new Error(`Puzzle ${puzzle}, step ${index + 1}: "${step}" on ${value} gives ${result}, not a whole number`);
    }
    return result;
  }
  throw new Error(`Puzzle ${puzzle}, step ${index + 1}: "${step}" isn't a step the build understands`);
}

function build(spec, index, total) {
  const step = index + 1;
  if (!Number.isInteger(spec.start) || spec.start < 0) throw new Error(`Puzzle ${step}: start must be a whole number`);
  if (!spec.steps?.length) throw new Error(`Puzzle ${step}: needs at least one step`);

  let value = spec.start;
  const data = spec.steps.map((clue, i) => {
    value = apply(value, clue, step, i);
    return { clue: clue.trim(), result: value };
  });

  const id = `tutorial-${step}`;

  return {
    meta: {
      id,
      title: 'Head Coach',
      difficulty: spec.difficulty || '',
      type: 'headcoach',
      variant: 'Head Coach',
      slug: `head-coach-${id}`,
      number: '',
      description: '',
      section: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: 0,
      rowCount: 0,
      allowedValues: '1234567890',
      solution: String(value),
    },
    cluedata: [{ start: spec.start, answer: value, difficulty: spec.difficulty || '', data }],
    copy: {},
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `headcoach-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
