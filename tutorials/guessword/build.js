import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'puzzles.json'), 'utf8'));
const outDir = path.join(here, '..', '..', 'public', 'tutorials', 'guessword');
const dictionaryFile = path.join(outDir, 'json', 'dictionary.json');
const dictionary = fs.existsSync(dictionaryFile) ? new Set(JSON.parse(fs.readFileSync(dictionaryFile, 'utf8'))) : null;

const LENGTH = 5;
const GUESSES = 6;

function evaluate(guess, answer) {
  const result = Array(LENGTH).fill('grey');
  const left = {};
  for (let i = 0; i < LENGTH; i++) {
    if (guess[i] === answer[i]) result[i] = 'green';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < LENGTH; i++) {
    if (result[i] === 'grey' && left[guess[i]] > 0) {
      result[i] = 'yellow';
      left[guess[i]]--;
    }
  }
  return result;
}

function checkOpener(spec, answer, step) {
  if (!spec.opener) return;
  const opener = String(spec.opener).toUpperCase();
  if (dictionary && !dictionary.has(opener)) throw new Error(`Puzzle ${step}: opener "${opener}" isn't in the word list`);
  const colours = evaluate(opener, answer);
  const greens = colours.includes('green');
  const yellows = colours.includes('yellow');
  const ok = { green: greens && !yellows, yellow: yellows && !greens, mix: greens && yellows }[spec.shows];
  if (ok === undefined) throw new Error(`Puzzle ${step}: shows must be green, yellow or mix`);
  if (!ok) throw new Error(`Puzzle ${step}: ${opener} against ${answer} gives ${colours.join(' ')}, not ${spec.shows}`);
}

function build(spec, index, total) {
  const step = index + 1;
  const answer = String(spec.answer || '').toUpperCase();
  if (!new RegExp(`^[A-Z]{${LENGTH}}$`).test(answer)) throw new Error(`Puzzle ${step}: "${spec.answer}" isn't a ${LENGTH}-letter word`);
  if (dictionary && !dictionary.has(answer)) throw new Error(`Puzzle ${step}: "${answer}" isn't in the word list`);
  checkOpener(spec, answer, step);

  const id = `tutorial-${step}`;

  return {
    headline: 'GuessWord',
    meta: {
      id,
      title: 'GuessWord',
      difficulty: spec.difficulty || '',
      type: 'guessword',
      variant: 'GuessWord',
      slug: `guessword-${id}`,
      number: '',
      description: '',
      archive: '',
      related: '',
      tutorial: { step, steps: total },
    },
    copy: {
      title: 'GuessWord',
      gridsize: { type: 'Standard', rows: GUESSES, cols: LENGTH },
      settings: { colCount: LENGTH, rowCount: GUESSES, solution: answer },
    },
    cluedata: '',
    celldata: '',
    feedback: null,
  };
}

if (!dictionary) console.warn('No word list yet, so answers are only checked for length. Unzip the GuessWord tutorial build first.');
fs.mkdirSync(outDir, { recursive: true });
source.puzzles.forEach((spec, i) => {
  const file = path.join(outDir, `guessword-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(build(spec, i, source.puzzles.length), null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), file));
});
