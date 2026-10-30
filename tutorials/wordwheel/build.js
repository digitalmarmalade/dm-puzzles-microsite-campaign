import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'wordwheel');

const MIN_WORD = 4;

function counts(str) {
  const map = {};
  for (const ch of str) map[ch] = (map[ch] || 0) + 1;
  return map;
}

function build(spec, index, total) {
  const step = index + 1;
  const centre = String(spec.centre || '').toUpperCase();
  const outer = String(spec.outer || '').toUpperCase();
  if (!/^[A-Z]$/.test(centre)) throw new Error(`Puzzle ${step}: centre must be one letter`);
  if (!/^[A-Z]{6,10}$/.test(outer)) throw new Error(`Puzzle ${step}: the ring needs 6 to 10 letters`);

  const tiles = counts(centre + outer);
  const words = (spec.words || []).map((w) => String(w).toLowerCase());
  if (!words.length) throw new Error(`Puzzle ${step}: no words`);
  if (new Set(words).size !== words.length) throw new Error(`Puzzle ${step}: a word is listed twice`);

  for (const word of words) {
    if (!/^[a-z]+$/.test(word) || word.length < MIN_WORD) throw new Error(`Puzzle ${step}: "${word}" needs ${MIN_WORD} letters or more`);
    if (!word.toUpperCase().includes(centre)) throw new Error(`Puzzle ${step}: "${word}" doesn't use the centre ${centre}`);
    const used = counts(word.toUpperCase());
    for (const ch in used) {
      if (used[ch] > (tiles[ch] || 0)) throw new Error(`Puzzle ${step}: "${word}" needs more ${ch}s than the wheel has`);
    }
  }

  const ranks = spec.ranks || [];
  if (ranks.some((n, i) => !(n > 0 && n < words.length && (i === 0 || n > ranks[i - 1])))) {
    throw new Error(`Puzzle ${step}: ranks must rise and stay below ${words.length}`);
  }

  const id = `tutorial-${step}`;

  return {
    headline: 'Word Wheel',
    meta: {
      id,
      title: 'Word Wheel',
      difficulty: spec.difficulty || '',
      type: 'wordwheel',
      variant: 'Word Wheel',
      slug: `wordwheel-${id}`,
      number: '',
      description: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    settings: {
      colCount: 0,
      rowCount: 0,
      allowedValues: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      solution: words.join(','),
    },
    copy: {
      title: 'Word Wheel',
      gridsize: { type: 'Standard', rows: 0, cols: 0 },
    },
    celldata: `${centre},${outer}`,
    cluedata: ranks.join(','),
    feedback: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `wordwheel-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
