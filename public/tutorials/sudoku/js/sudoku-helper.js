var app = window.app || {};

(function () {
  'use strict';

  const H = (app.sudokuHelper = app.sudokuHelper || {});

  const range = n => Array.from({ length: n }, (_, i) => i);

  const ELIMINATION_TECHNIQUES = ['cage-combo', 'pointing', 'claiming', 'naked-pair', 'hidden-pair'];

  H.createBoard = function (input) {
    const { width, height, boxWidth, boxHeight } = input;
    const size = width * height;
    const units = [];

    for (let r = 0; r < height; r++) {
      units.push({ type: 'row', index: r, cells: range(width).map(c => r * width + c) });
    }
    for (let c = 0; c < width; c++) {
      units.push({ type: 'col', index: c, cells: range(height).map(r => r * width + c) });
    }
    const boxCols = width / boxWidth;
    const boxRows = height / boxHeight;
    for (let br = 0; br < boxRows; br++) {
      for (let bc = 0; bc < boxCols; bc++) {
        const cells = [];
        for (let r = 0; r < boxHeight; r++) {
          for (let c = 0; c < boxWidth; c++) {
            cells.push((br * boxHeight + r) * width + bc * boxWidth + c);
          }
        }
        units.push({ type: 'box', index: br * boxCols + bc, cells });
      }
    }

    const unitsOf = range(size).map(() => []);
    units.forEach(u => u.cells.forEach(id => unitsOf[id].push(u)));

    const cages = (input.cages || []).map(c => ({ total: c.total, cells: c.cells.slice() }));
    const cageOf = range(size).map(() => null);
    cages.forEach(cage => cage.cells.forEach(id => (cageOf[id] = cage)));

    const peers = range(size).map(id => {
      const set = new Set();
      unitsOf[id].forEach(u => u.cells.forEach(p => p !== id && set.add(p)));
      return set;
    });

    const cagePeers = range(size).map(id => {
      const set = new Set(peers[id]);
      if (cageOf[id]) cageOf[id].cells.forEach(p => p !== id && set.add(p));
      return set;
    });

    const digits = input.digits.slice();

    return {
      width,
      height,
      size,
      units,
      unitsOf,
      peers,
      cagePeers,
      cages,
      cageOf,
      digits,
      unitSum: digits.reduce((a, b) => a + b, 0),
      isKiller: cages.length > 0,
    };
  };

  function rowCol(board, id) {
    return { row: Math.floor(id / board.width), col: id % board.width };
  }

  function distance(board, a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return 0;
    const pa = rowCol(board, a);
    const pb = rowCol(board, b);
    return Math.abs(pa.row - pb.row) + Math.abs(pa.col - pb.col);
  }

  function unitOfType(board, id, type) {
    return board.unitsOf[id].find(u => u.type === type);
  }

  function computeCandidates(ctx) {
    const { board, values, elim } = ctx;
    return range(board.size).map(id => {
      if (values[id]) return null;
      const used = new Set();
      board.cagePeers[id].forEach(p => values[p] && used.add(values[p]));
      const removed = elim[id];
      return new Set(board.digits.filter(d => !used.has(d) && !(removed && removed.has(d))));
    });
  }

  function roles(entries) {
    const out = {};
    entries.forEach(([ids, role]) => {
      (Array.isArray(ids) ? ids : [ids]).forEach(id => (out[id] = role));
    });
    return out;
  }

  function sorted(set) {
    return Array.from(set).sort((a, b) => a - b);
  }

  function emptyCells(ctx, cells) {
    return cells.filter(id => !ctx.values[id]);
  }

  function placedIn(ctx, cells) {
    return new Set(cells.map(id => ctx.values[id]).filter(Boolean));
  }

  function candidateSnapshot(ctx, ids) {
    const out = {};
    ids.forEach(id => {
      if (ctx.cand[id]) out[id] = sorted(ctx.cand[id]);
    });
    return out;
  }

  // Smallest set of placed `digit`s that rules the digit out of every cell in `cells`.
  function coverWithBlockers(ctx, cells, digit) {
    const { board, values } = ctx;
    const coverage = new Map();

    cells.forEach(e => {
      board.cagePeers[e].forEach(p => {
        if (values[p] === digit) {
          if (!coverage.has(p)) coverage.set(p, new Set());
          coverage.get(p).add(e);
        }
      });
    });

    const uncovered = new Set(cells);
    const blockers = [];
    while (uncovered.size) {
      let best = null;
      let bestCount = 0;
      coverage.forEach((covers, p) => {
        let count = 0;
        covers.forEach(e => uncovered.has(e) && count++);
        if (count > bestCount) {
          best = p;
          bestCount = count;
        }
      });
      if (!best && best !== 0) break;
      blockers.push(best);
      coverage.get(best).forEach(e => uncovered.delete(e));
      coverage.delete(best);
    }

    return { blockers, ruled: Array.from(uncovered) };
  }

  // ---------- Techniques ----------

  function findMistakes(ctx) {
    const { board, values, solution, givens } = ctx;
    const wrong = range(board.size).filter(id => !givens[id] && values[id] && values[id] !== solution[id]);
    return wrong.map(id => ({
      technique: 'mistake',
      focus: id,
      clear: id,
      accept: 'clear',
      frames: [
        {
          key: wrong.length > 1 ? (wrong.length === 2 ? 'helper_mistake_more_one' : 'helper_mistake_more_other') : 'helper_mistake',
          params: { count: wrong.length - 1 },
          roles: roles([[id, 'mistake']]),
        },
      ],
    }));
  }

  function findCageSingles(ctx) {
    const { board, values } = ctx;
    return board.cages
      .filter(cage => cage.cells.length === 1 && !values[cage.cells[0]])
      .map(cage => {
        const id = cage.cells[0];
        return {
          technique: 'cage-single',
          focus: id,
          place: { cell: id, digit: cage.total },
          accept: 'place',
          frames: [{ key: 'helper_cage_single', params: { digit: cage.total }, roles: roles([[id, 'target']]) }],
        };
      });
  }

  function findFullHouses(ctx) {
    const { board, values } = ctx;
    const steps = [];
    board.units.forEach(unit => {
      const empties = emptyCells(ctx, unit.cells);
      if (empties.length !== 1) return;
      const id = empties[0];
      const used = placedIn(ctx, unit.cells);
      const digit = board.digits.find(d => !used.has(d));
      const r = [[unit.cells, 'focus'], [id, 'target']];
      steps.push({
        technique: 'full-house',
        unitType: unit.type,
        focus: id,
        place: { cell: id, digit },
        accept: 'place',
        frames: [
          { key: 'helper_full_house_1_' + unit.type, params: {}, roles: roles(r) },
          { key: 'helper_full_house_2_' + unit.type, params: { digit }, roles: roles(r) },
        ],
      });
    });
    return steps;
  }

  function findCageLasts(ctx) {
    const { board, values } = ctx;
    const steps = [];
    board.cages.forEach(cage => {
      if (cage.cells.length < 2) return;
      const empties = emptyCells(ctx, cage.cells);
      if (empties.length !== 1) return;
      const id = empties[0];
      const sum = cage.cells.reduce((a, c) => a + (values[c] || 0), 0);
      const digit = cage.total - sum;
      const r = [[cage.cells, 'focus'], [id, 'target']];
      steps.push({
        technique: 'cage-last',
        focus: id,
        place: { cell: id, digit },
        accept: 'place',
        frames: [
          { key: 'helper_cage_last_1', params: {}, roles: roles(r) },
          { key: 'helper_cage_last_2', params: { total: cage.total, sum, digit }, roles: roles(r) },
        ],
      });
    });
    return steps;
  }

  function findHiddenSingles(ctx, types) {
    const { board, cand } = ctx;
    const steps = [];
    const seen = new Set();

    board.units
      .filter(u => types.includes(u.type))
      .forEach(unit => {
        const empties = emptyCells(ctx, unit.cells);
        const used = placedIn(ctx, unit.cells);
        board.digits.forEach(digit => {
          if (used.has(digit)) return;
          const spots = empties.filter(id => cand[id].has(digit));
          if (spots.length !== 1) return;
          const id = spots[0];
          if (seen.has(id + ':' + digit + ':' + unit.type)) return;
          seen.add(id + ':' + digit + ':' + unit.type);

          const others = empties.filter(e => e !== id);
          const { blockers, ruled } = coverWithBlockers(ctx, others, digit);
          const base = [[unit.cells, 'focus'], [id, 'target']];

          steps.push({
            technique: 'hidden-single',
            unitType: unit.type,
            focus: id,
            place: { cell: id, digit },
            accept: 'place',
            frames: [
              { key: 'helper_hidden_single_1_' + unit.type, params: {}, roles: roles(base) },
              {
                key: (blockers.length ? 'helper_hidden_single_2_' : 'helper_hidden_single_2_notes_') + unit.type,
                params: { digit },
                roles: roles(base.concat([[ruled, 'ruled'], [blockers, 'evidence']])),
              },
            ],
          });
        });
      });

    return steps;
  }

  function findNakedSingles(ctx) {
    const { board, values, cand } = ctx;
    const steps = [];

    range(board.size).forEach(id => {
      if (values[id] || cand[id].size !== 1) return;
      const digit = cand[id].values().next().value;
      const peerCells = sorted(board.peers[id]);
      const evidence = [];
      let viaNotes = false;

      board.digits.forEach(other => {
        if (other === digit) return;
        const holders = sorted(board.cagePeers[id]).filter(p => values[p] === other);
        if (!holders.length) {
          viaNotes = true;
          return;
        }
        holders.sort((a, b) => distance(board, a, id) - distance(board, b, id));
        evidence.push(holders[0]);
      });

      const base = [[peerCells, 'focus'], [id, 'target']];
      steps.push({
        technique: 'naked-single',
        focus: id,
        place: { cell: id, digit },
        accept: 'place',
        frames: [
          { key: 'helper_naked_single_1', params: {}, roles: roles(base) },
          {
            key: viaNotes ? 'helper_naked_single_2_notes' : 'helper_naked_single_2',
            params: { digit },
            roles: roles(base.concat([[evidence, 'evidence']])),
          },
        ],
      });
    });

    return steps;
  }

  // Rows, columns and blocks, plus runs of 2–3 adjacent rows or columns.
  function killerRegions(board) {
    if (board.regions) return board.regions;
    const regions = board.units.map(u => ({ type: u.type, cells: u.cells, count: 1 }));
    const rows = board.units.filter(u => u.type === 'row');
    const cols = board.units.filter(u => u.type === 'col');
    [
      [rows, 'rows'],
      [cols, 'cols'],
    ].forEach(([lines, name]) => {
      [2, 3].forEach(span => {
        for (let i = 0; i + span <= lines.length; i++) {
          const cells = [];
          for (let k = 0; k < span; k++) cells.push.apply(cells, lines[i + k].cells);
          regions.push({ type: name + span, cells, count: span });
        }
      });
    });
    board.regions = regions;
    return regions;
  }

  // The 45 rule: a unit's digits always sum to the same total.
  function findInniesOuties(ctx) {
    const { board, values } = ctx;
    const steps = [];

    killerRegions(board).forEach(unit => {
      const unitSum = board.unitSum * unit.count;
      const inUnit = new Set(unit.cells);
      const touching = [];
      board.cages.forEach(cage => {
        if (cage.cells.some(id => inUnit.has(id))) touching.push(cage);
      });

      const inside = touching.filter(cage => cage.cells.every(id => inUnit.has(id)));
      const covered = new Set();
      inside.forEach(cage => cage.cells.forEach(id => covered.add(id)));
      const rest = unit.cells.filter(id => !covered.has(id));
      const restEmpty = rest.filter(id => !values[id]);

      if (rest.length && restEmpty.length === 1 && inside.length) {
        const id = restEmpty[0];
        const sum =
          inside.reduce((a, cage) => a + cage.total, 0) +
          rest.reduce((a, c) => a + (values[c] || 0), 0);
        const digit = unitSum - sum;
        const r = [[unit.cells, 'focus'], [id, 'target']];
        steps.push({
          technique: 'innie',
          unitType: unit.type,
          focus: id,
          weight: unit.count - 1,
          place: { cell: id, digit },
          accept: 'place',
          frames: [
            { key: 'helper_innie_1_' + unit.type, params: {}, roles: roles(r) },
            { key: 'helper_innie_2_' + unit.type, params: { unitsum: unitSum, sum, digit }, roles: roles(r) },
          ],
        });
      }

      const outside = [];
      touching.forEach(cage => cage.cells.forEach(id => !inUnit.has(id) && outside.push(id)));
      if (outside.length === 1 && !values[outside[0]]) {
        const id = outside[0];
        const total = touching.reduce((a, cage) => a + cage.total, 0);
        const digit = total - unitSum;
        const r = [[unit.cells, 'focus'], [id, 'target']];
        steps.push({
          technique: 'outie',
          unitType: unit.type,
          focus: id,
          weight: unit.count - 1,
          place: { cell: id, digit },
          accept: 'place',
          frames: [
            { key: 'helper_outie_1_' + unit.type, params: {}, roles: roles(r) },
            { key: 'helper_outie_2_' + unit.type, params: { unitsum: unitSum, total, digit }, roles: roles(r) },
          ],
        });
      }
    });

    return steps;
  }

  function combinations(digits, size, total) {
    const out = [];
    const walk = (start, picked, sum) => {
      if (picked.length === size) {
        if (sum === total) out.push(picked.slice());
        return;
      }
      for (let i = start; i < digits.length; i++) {
        if (sum + digits[i] > total) break;
        picked.push(digits[i]);
        walk(i + 1, picked, sum + digits[i]);
        picked.pop();
      }
    };
    walk(0, [], 0);
    return out;
  }

  function eliminationStep(ctx, technique, focus, eliminations, notesCells, frames, extra) {
    return Object.assign(
      {
        technique,
        focus,
        eliminate: eliminations,
        notesCells,
        candidates: candidateSnapshot(ctx, notesCells),
        accept: 'eliminate',
        frames,
      },
      extra || {},
    );
  }

  // Per cell, which of `digits` it can take in at least one complete placement.
  function assignments(cells, digits, cand) {
    const possible = cells.map(() => new Set());
    if (cells.length !== digits.length) return possible;

    let budget = 20000;
    const used = new Set();
    const picked = [];
    const walk = i => {
      if (--budget < 0) return;
      if (i === cells.length) {
        picked.forEach((d, k) => possible[k].add(d));
        return;
      }
      digits.forEach(d => {
        if (used.has(d) || !cand[cells[i]].has(d)) return;
        used.add(d);
        picked.push(d);
        walk(i + 1);
        picked.pop();
        used.delete(d);
      });
    };
    walk(0);

    if (budget < 0) {
      return cells.map(id => new Set(digits.filter(d => cand[id].has(d))));
    }
    return possible;
  }

  function findCageCombos(ctx) {
    const { board, values, cand } = ctx;
    const steps = [];

    board.cages.forEach(cage => {
      if (cage.cells.length < 2) return;
      const empties = emptyCells(ctx, cage.cells);
      if (!empties.length) return;
      const placed = cage.cells.map(id => values[id]).filter(Boolean);

      const possible = empties.map(() => new Set());
      const combos = combinations(board.digits, cage.cells.length, cage.total).filter(combo => {
        if (!placed.every(d => combo.includes(d))) return false;
        const remaining = combo.filter(d => !placed.includes(d));
        const found = assignments(empties, remaining, cand);
        found.forEach((set, i) => set.forEach(d => possible[i].add(d)));
        return found.some(set => set.size);
      });
      if (!combos.length) return;

      const eliminations = [];
      empties.forEach((id, i) => {
        cand[id].forEach(d => !possible[i].has(d) && eliminations.push({ cell: id, digit: d }));
      });
      if (!eliminations.length) return;

      const affected = Array.from(new Set(eliminations.map(e => e.cell)));
      const afterNotes = {};
      empties.forEach((id, i) => {
        if (possible[i].size <= 4) afterNotes[id] = { show: sorted(possible[i]), strike: [] };
      });

      const digitsInPlay = new Set();
      possible.forEach(set => set.forEach(d => digitsInPlay.add(d)));
      let key = 'helper_cage_combo_2_digits';
      if (combos.length === 1) key = 'helper_cage_combo_2_one';
      else if (combos.length <= 3) key = 'helper_cage_combo_2_many';

      steps.push(
        eliminationStep(
          ctx,
          'cage-combo',
          empties[0],
          eliminations,
          empties,
          [
            {
              key: 'helper_cage_combo_1',
              params: { total: cage.total, size: cage.cells.length },
              roles: roles([[cage.cells, 'focus']]),
            },
            {
              key,
              params: { total: cage.total, size: cage.cells.length, combos, digits: sorted(digitsInPlay) },
              roles: roles([[cage.cells, 'focus'], [affected, 'elim']]),
              notes: afterNotes,
            },
          ],
          { weight: Math.min(combos.length, 4) * 10 - eliminations.length },
        ),
      );
    });

    return steps;
  }

  function findPointing(ctx) {
    const { board, cand } = ctx;
    const steps = [];

    board.units
      .filter(u => u.type === 'box')
      .forEach(box => {
        const empties = emptyCells(ctx, box.cells);
        const used = placedIn(ctx, box.cells);
        board.digits.forEach(digit => {
          if (used.has(digit)) return;
          const spots = empties.filter(id => cand[id].has(digit));
          if (spots.length < 2) return;

          ['row', 'col'].forEach(type => {
            const line = unitOfType(board, spots[0], type);
            if (!spots.every(id => line.cells.includes(id))) return;
            const targets = emptyCells(ctx, line.cells).filter(
              id => !box.cells.includes(id) && cand[id].has(digit),
            );
            if (!targets.length) return;

            const spotNotes = {};
            spots.forEach(id => (spotNotes[id] = { show: [digit], strike: [] }));
            const elimNotes = Object.assign({}, spotNotes);
            targets.forEach(id => (elimNotes[id] = { show: [], strike: [digit] }));

            steps.push(
              eliminationStep(
                ctx,
                'pointing',
                spots[0],
                targets.map(id => ({ cell: id, digit })),
                spots.concat(targets),
                [
                  {
                    key: 'helper_pointing_1',
                    params: { digit },
                    roles: roles([[box.cells, 'focus'], [spots, 'pair']]),
                    notes: spotNotes,
                  },
                  {
                    key: 'helper_pointing_2_' + type,
                    params: { digit },
                    roles: roles([[box.cells, 'focus'], [line.cells, 'focus'], [spots, 'pair'], [targets, 'elim']]),
                    notes: elimNotes,
                  },
                ],
                { lineType: type },
              ),
            );
          });
        });
      });

    return steps;
  }

  function findClaiming(ctx) {
    const { board, cand } = ctx;
    const steps = [];

    board.units
      .filter(u => u.type === 'row' || u.type === 'col')
      .forEach(line => {
        const empties = emptyCells(ctx, line.cells);
        const used = placedIn(ctx, line.cells);
        board.digits.forEach(digit => {
          if (used.has(digit)) return;
          const spots = empties.filter(id => cand[id].has(digit));
          if (spots.length < 2) return;
          const box = unitOfType(board, spots[0], 'box');
          if (!spots.every(id => box.cells.includes(id))) return;
          const targets = emptyCells(ctx, box.cells).filter(
            id => !line.cells.includes(id) && cand[id].has(digit),
          );
          if (!targets.length) return;

          const spotNotes = {};
          spots.forEach(id => (spotNotes[id] = { show: [digit], strike: [] }));
          const elimNotes = Object.assign({}, spotNotes);
          targets.forEach(id => (elimNotes[id] = { show: [], strike: [digit] }));

          steps.push(
            eliminationStep(
              ctx,
              'claiming',
              spots[0],
              targets.map(id => ({ cell: id, digit })),
              spots.concat(targets),
              [
                {
                  key: 'helper_claiming_1_' + line.type,
                  params: { digit },
                  roles: roles([[line.cells, 'focus'], [spots, 'pair']]),
                  notes: spotNotes,
                },
                {
                  key: 'helper_claiming_2_' + line.type,
                  params: { digit },
                  roles: roles([[line.cells, 'focus'], [box.cells, 'focus'], [spots, 'pair'], [targets, 'elim']]),
                  notes: elimNotes,
                },
              ],
              { unitType: line.type },
            ),
          );
        });
      });

    return steps;
  }

  function findNakedPairs(ctx) {
    const { board, cand } = ctx;
    const steps = [];

    board.units.forEach(unit => {
      const empties = emptyCells(ctx, unit.cells);
      const twos = empties.filter(id => cand[id].size === 2);
      for (let i = 0; i < twos.length; i++) {
        for (let j = i + 1; j < twos.length; j++) {
          const a = sorted(cand[twos[i]]);
          const b = sorted(cand[twos[j]]);
          if (a[0] !== b[0] || a[1] !== b[1]) continue;
          const pair = [twos[i], twos[j]];
          const eliminations = [];
          empties.forEach(id => {
            if (pair.includes(id)) return;
            a.forEach(d => cand[id].has(d) && eliminations.push({ cell: id, digit: d }));
          });
          if (!eliminations.length) continue;

          const affected = Array.from(new Set(eliminations.map(e => e.cell)));
          const pairNotes = {};
          pair.forEach(id => (pairNotes[id] = { show: a, strike: [] }));
          const elimNotes = Object.assign({}, pairNotes);
          affected.forEach(id => {
            elimNotes[id] = { show: [], strike: a.filter(d => cand[id].has(d)) };
          });

          steps.push(
            eliminationStep(
              ctx,
              'naked-pair',
              pair[0],
              eliminations,
              pair.concat(affected),
              [
                {
                  key: 'helper_naked_pair_1_' + unit.type,
                  params: { digits: a },
                  roles: roles([[unit.cells, 'focus'], [pair, 'pair']]),
                  notes: pairNotes,
                },
                {
                  key: 'helper_naked_pair_2_' + unit.type,
                  params: { digits: a },
                  roles: roles([[unit.cells, 'focus'], [pair, 'pair'], [affected, 'elim']]),
                  notes: elimNotes,
                },
              ],
              { unitType: unit.type },
            ),
          );
        }
      }
    });

    return steps;
  }

  function findHiddenPairs(ctx) {
    const { board, cand } = ctx;
    const steps = [];

    board.units.forEach(unit => {
      const empties = emptyCells(ctx, unit.cells);
      const used = placedIn(ctx, unit.cells);
      const open = board.digits.filter(d => !used.has(d));
      const spotsOf = {};
      open.forEach(d => (spotsOf[d] = empties.filter(id => cand[id].has(d))));

      for (let i = 0; i < open.length; i++) {
        for (let j = i + 1; j < open.length; j++) {
          const a = open[i];
          const b = open[j];
          const sa = spotsOf[a];
          const sb = spotsOf[b];
          if (sa.length !== 2 || sb.length !== 2 || sa[0] !== sb[0] || sa[1] !== sb[1]) continue;
          const pair = sa;
          const eliminations = [];
          pair.forEach(id => cand[id].forEach(d => d !== a && d !== b && eliminations.push({ cell: id, digit: d })));
          if (!eliminations.length) continue;

          const pairNotes = {};
          pair.forEach(id => (pairNotes[id] = { show: [a, b], strike: [] }));

          steps.push(
            eliminationStep(
              ctx,
              'hidden-pair',
              pair[0],
              eliminations,
              pair,
              [
                {
                  key: 'helper_hidden_pair_1_' + unit.type,
                  params: { digits: [a, b] },
                  roles: roles([[unit.cells, 'focus'], [pair, 'pair']]),
                  notes: pairNotes,
                },
                {
                  key: 'helper_hidden_pair_2_' + unit.type,
                  params: { digits: [a, b] },
                  roles: roles([[unit.cells, 'focus'], [pair, 'elim']]),
                  notes: pairNotes,
                },
              ],
              { unitType: unit.type },
            ),
          );
        }
      }
    });

    return steps;
  }

  function hasNotes(ctx, id) {
    const notes = ctx.notes && ctx.notes[id];
    return !!notes && notes.some(Boolean);
  }

  function findReveal(ctx) {
    const { board, values, cand, solution } = ctx;
    const cells = range(board.size).filter(id => !values[id]);
    if (!cells.length) return [];
    const min = Math.min.apply(null, cells.map(id => (cand[id] ? cand[id].size : board.digits.length)));
    return cells
      .filter(id => (cand[id] ? cand[id].size : board.digits.length) === min)
      .map(id => ({
        technique: 'reveal',
        focus: id,
        place: { cell: id, digit: solution[id] },
        accept: 'reveal',
        frames: [{ key: 'helper_reveal', params: {}, roles: roles([[id, 'target']]) }],
      }));
  }

  function findCandidateFallback(ctx, active) {
    const { board, values, cand } = ctx;
    const cells = range(board.size).filter(id => !values[id] && cand[id].size && !hasNotes(ctx, id));
    if (!cells.length) return [];

    const focus = cells.slice().sort((a, b) => distance(board, a, active) - distance(board, b, active))[0];

    return [
      {
        technique: 'candidates',
        focus,
        notesCells: cells,
        candidates: candidateSnapshot(ctx, cells),
        eliminate: [],
        accept: 'notes',
        frames: [
          {
            key: cells.length === 1 ? 'helper_candidates_one' : 'helper_candidates_other',
            params: { count: cells.length },
            roles: roles([[cells, 'pair']]),
          },
        ],
      },
    ];
  }

  const TECHNIQUES = [
    { name: 'cage-single', killer: true, find: findCageSingles },
    { name: 'full-house', find: findFullHouses },
    { name: 'cage-last', killer: true, find: findCageLasts },
    { name: 'hidden-single', find: ctx => findHiddenSingles(ctx, ['box']) },
    { name: 'hidden-single', find: ctx => findHiddenSingles(ctx, ['row', 'col']) },
    { name: 'naked-single', find: findNakedSingles },
    { name: 'innie', killer: true, find: findInniesOuties },
    { name: 'cage-combo', killer: true, find: findCageCombos },
    { name: 'pointing', find: findPointing },
    { name: 'claiming', find: findClaiming },
    { name: 'naked-pair', find: findNakedPairs },
    { name: 'hidden-pair', find: findHiddenPairs },
  ];

  function isValid(ctx, step) {
    const { solution } = ctx;
    if (step.place) {
      const { cell, digit } = step.place;
      if (ctx.values[cell] || solution[cell] !== digit) return false;
    }
    if (step.eliminate) {
      step.eliminate = step.eliminate.filter(e => solution[e.cell] !== e.digit);
      if (ELIMINATION_TECHNIQUES.includes(step.technique) && !step.eliminate.length) return false;
    }
    return true;
  }

  // The player's own notes already rule this digit out — only trusted when the notes still
  // include the real answer, so a wrong note never hides a step.
  function playerKnows(ctx, e) {
    const notes = ctx.notes && ctx.notes[e.cell];
    if (!notes || !notes.some(Boolean)) return false;
    if (!notes[ctx.solution[e.cell] - 1]) return false;
    return !notes[e.digit - 1];
  }

  function nearest(board, steps, active) {
    let best = steps[0];
    let bestScore = Infinity;
    steps.forEach(step => {
      const score = (step.weight || 0) * 100 + distance(board, step.focus, active);
      if (score < bestScore) {
        best = step;
        bestScore = score;
      }
    });
    return best;
  }

  H.findStep = function (input) {
    const board = H.createBoard(input);
    const values = input.values.slice();
    const solution = input.solution;
    const givens = input.givens;
    const active = input.active;

    const mistakes = findMistakes({ board, values, solution, givens });
    if (mistakes.length) return nearest(board, mistakes, active);

    const elim = {};
    Object.keys(input.eliminated || {}).forEach(id => {
      elim[id] = new Set(input.eliminated[id]);
    });

    const ctx = { board, values, solution, givens, elim, notes: input.notes, cand: null };

    search: for (let pass = 0; pass < 200; pass++) {
      ctx.cand = computeCandidates(ctx);

      for (const technique of TECHNIQUES) {
        if (technique.killer && !board.isKiller) continue;
        let steps = technique.find(ctx).filter(step => isValid(ctx, step));
        if (!steps.length) continue;

        if (steps[0].accept === 'eliminate') {
          const fresh = steps.filter(step => step.eliminate.some(e => !playerKnows(ctx, e)));
          if (!fresh.length) {
            steps.forEach(step =>
              step.eliminate.forEach(e => {
                if (!elim[e.cell]) elim[e.cell] = new Set();
                elim[e.cell].add(e.digit);
              }),
            );
            continue search;
          }
          steps = fresh;
        }

        let step = nearest(board, steps, active);
        if (step.accept === 'place' && step.frames.length > 1) {
          const cell = step.place.cell;
          const options = ctx.cand[cell];
          if (step.technique === 'hidden-single' && options && options.size === 1) {
            step = findNakedSingles(ctx).find(s => s.place.cell === cell) || step;
          }
          if (step.technique === 'hidden-single') step.prompt = 'only_place';
          else if (options && options.size === 1) step.prompt = 'only_one';
          else step.prompt = 'find_it';
        }
        return step;
      }

      break;
    }

    const fallback = findCandidateFallback(ctx, active);
    if (fallback.length) return nearest(board, fallback, active);

    const reveal = findReveal(ctx);
    return reveal.length ? nearest(board, reveal, active) : null;
  };

  // ---------- Vue integration ----------

  if (!app.vue || !app.vue.data) return;

  app.vue.data.helper = { open: false, step: null, frame: 0 };

  app.helpers.getHelperInput = function () {
    const puzzle = app.puzzle;
    const width = puzzle.width;
    const size = width * puzzle.height;
    const answers = app.vue.data.user.answers;
    const solution = [].concat.apply([], puzzle.solution).map(Number);
    const notes = {};

    Object.keys(app.vue.data.user.notes || {}).forEach(id => {
      const arr = app.vue.data.user.notes[id];
      if (arr && arr.some && arr.some(Boolean)) notes[id] = arr.slice();
    });

    let cages = null;
    const source = app.vue.data.source;
    if (puzzle.cages && source && source.cages) {
      cages = source.cages.map(cage => ({
        total: Number(cage.value),
        cells: cage.cells.map(([x, y]) => (y - 1) * width + (x - 1)),
      }));
    }

    return {
      width,
      height: puzzle.height,
      boxWidth: puzzle.boxWidth,
      boxHeight: puzzle.boxHeight,
      digits: puzzle.allowedValues.split('').map(n => parseInt(n, 10)),
      values: range(size).map(id => Number(answers[id]) || 0),
      solution,
      givens: range(size).map(id => app.helpers.isCellGiven(id)),
      cages,
      eliminated: app.vue.data.user.helperEliminated || {},
      notes,
      active: app.vue.data.active ? app.vue.data.active.cell : null,
    };
  };

  app.vue.methods.openHelper = function () {
    app.vue.methods.hideModal('hintsMenu');
    if (app.vue.model.isCompletedWithoutErrors) return;

    const step = H.findStep(app.helpers.getHelperInput());

    app.vue.data.helper = {
      open: true,
      frame: 0,
      step: step || {
        technique: 'none',
        accept: null,
        frames: [{ key: 'helper_none', params: {}, roles: {} }],
      },
    };

    if (step) {
      app.vue.data.user.hintsShown = (app.vue.data.user.hintsShown || 0) + 1;
      app.helpUsed('hint', 'helper-' + step.technique);
    }

    // Select the target so the player can type the answer in themselves.
    if (step && step.accept === 'place') {
      const { row, col } = app.helpers.getColRowFromCellId(step.place.cell);
      app.vue.methods.setActiveItem('cell', step.place.cell);
      app.vue.methods.setActiveItem('row', row);
      app.vue.methods.setActiveItem('col', col);
    }
    app.helpers.helperAnswers = app.vue.data.user.answers.slice();

    setTimeout(() => {
      const button = document.querySelector('.sudoku-helper [data-helper-primary]');
      if (button) button.focus({ preventScroll: true });
    }, 50);
  };

  app.vue.methods.closeHelper = function () {
    if (!app.vue.data.helper.open) return;
    app.vue.data.helper = { open: false, step: null, frame: 0 };
    app.helpers.helperAnswers = null;
  };

  // Mobile only: the hint covers the keypad, so step aside with the target still selected.
  app.vue.methods.helperTry = function () {
    const step = app.vue.data.helper.step;
    if (step && step.place) {
      const { row, col } = app.helpers.getColRowFromCellId(step.place.cell);
      app.vue.methods.setActiveItem('cell', step.place.cell);
      app.vue.methods.setActiveItem('row', row);
      app.vue.methods.setActiveItem('col', col);
    }
    app.vue.methods.closeHelper();
  };

  app.vue.methods.helperNext = function () {
    const helper = app.vue.data.helper;
    if (helper.step && helper.frame < helper.step.frames.length - 1) helper.frame++;
  };

  app.vue.methods.helperPrimary = function () {
    const helper = app.vue.data.helper;
    if (!helper.step) return;
    if (helper.frame < helper.step.frames.length - 1) {
      app.vue.methods.helperNext();
    } else if (helper.step.accept) {
      app.vue.methods.helperAccept();
    } else {
      app.vue.methods.closeHelper();
    }
  };

  app.helpers.fillNotesFromCandidates = function (cellId, candidates) {
    const current = app.vue.data.user.notes[cellId];
    if (current && current.some(Boolean)) return;
    const notes = Array(app.puzzle.width).fill(false);
    (candidates || []).forEach(d => (notes[d - 1] = true));
    app.vue.data.user.notes[cellId] = notes;
  };

  app.vue.methods.helperAccept = function () {
    const step = app.vue.data.helper.step;
    if (!step) return;
    const user = app.vue.data.user;

    if (step.accept === 'place' || step.accept === 'reveal') {
      const { cell, digit } = step.place;
      const { row, col } = app.helpers.getColRowFromCellId(cell);
      app.vue.methods.setActiveItem('cell', cell);
      app.vue.methods.setActiveItem('row', row);
      app.vue.methods.setActiveItem('col', col);
      if (step.accept === 'reveal') {
        app.helpers.revealCell(cell, true);
      } else {
        app.helpers.setUserAnswer(cell, digit);
      }
      app.helpers.tsSet('letterEntered');
    }

    if (step.accept === 'clear') {
      app.helpers.setUserAnswer(step.clear, 0, false);
    }

    if (step.accept === 'eliminate' || step.accept === 'notes') {
      step.notesCells.forEach(id => app.helpers.fillNotesFromCandidates(id, step.candidates[id]));

      user.helperEliminated = user.helperEliminated || {};
      step.eliminate.forEach(({ cell, digit }) => {
        if (user.notes[cell]) user.notes[cell][digit - 1] = false;
        const list = user.helperEliminated[cell] || (user.helperEliminated[cell] = []);
        if (!list.includes(digit)) list.push(digit);
      });

      app.helpers.saveUserNotes();
      app.helpers.saveUserState();
    }

    app.helpers.historySave();
    app.vue.methods.closeHelper();
  };

  app.vue.computed.helperFrame = function () {
    const helper = this.helper;
    return helper.open && helper.step ? helper.step.frames[helper.frame] : null;
  };

  app.vue.computed.helperIsLastFrame = function () {
    const helper = this.helper;
    return !!helper.step && helper.frame >= helper.step.frames.length - 1;
  };

  app.vue.computed.helperPrimaryLabel = function () {
    const helper = this.helper;
    if (!helper.step) return '';
    if (!this.helperIsLastFrame) return this.lang.helper_button_next;
    const labels = {
      place: 'helper_button_accept',
      reveal: 'helper_button_reveal',
      clear: 'helper_button_remove',
      eliminate: 'helper_button_update_notes',
      notes: 'helper_button_add_notes',
    };
    return this.lang[labels[helper.step.accept] || 'helper_button_close'];
  };

  app.vue.computed.helperTechniqueLabel = function () {
    const step = this.helper.step;
    if (!step) return '';
    return this.lang['helper_technique_' + step.technique.replace(/-/g, '_')] || '';
  };

  app.helpers.helperFormatDigit = function (digit) {
    if (app.puzzle && app.puzzle.isColour) {
      return `<span class="helper-swatch" style="--swatch: var(--digit-${digit})" aria-hidden="true"></span>`;
    }
    return `<strong class="helper-digit">${digit}</strong>`;
  };

  app.helpers.helperJoin = function (items, joinerKey) {
    const lang = app.vue.model.lang;
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' ' + (lang[joinerKey] || '') + ' ' + items[items.length - 1];
  };

  app.vue.computed.helperText = function () {
    const frame = this.helperFrame;
    if (!frame) return '';
    const fmt = app.helpers.helperFormatDigit;
    const join = app.helpers.helperJoin;
    const params = frame.params || {};
    let text = this.lang[frame.key] || '';

    const replacements = {
      digit: params.digit !== undefined ? fmt(params.digit) : '',
      digits: params.digits ? join(params.digits.map(fmt), 'helper_and') : '',
      digits_or: params.digits ? join(params.digits.map(fmt), 'helper_or') : '',
      combos: params.combos ? join(params.combos.map(c => c.map(fmt).join(' + ')), 'helper_or') : '',
      total: params.total,
      sum: params.sum,
      size: params.size,
      count: params.count,
      unitsum: params.unitsum,
    };

    Object.keys(replacements).forEach(key => {
      if (replacements[key] !== undefined) text = text.split('[[' + key + ']]').join(replacements[key]);
    });

    const prompt = this.helper.step.prompt;
    if (this.helper.frame === 0 && prompt) {
      const extra = this.lang['helper_' + prompt + (app.puzzle && app.puzzle.isColour ? '_colour' : '')];
      if (extra) text += ' ' + extra;
    }

    return text;
  };

  // The player solved it themselves → close. A wrong try in the target keeps the step open
  // so they can still press Next; any other change makes the step stale.
  app.vue.watch['user.answers'] = {
    deep: true,
    handler() {
      const helper = app.vue.data.helper;
      const before = app.helpers.helperAnswers;
      if (!helper.open || !helper.step || !before) return;

      const answers = app.vue.data.user.answers;
      const place = helper.step.place;
      const target = place ? place.cell : null;

      for (let id = 0; id < answers.length; id++) {
        if (id !== target && Number(answers[id]) !== Number(before[id])) {
          app.vue.methods.closeHelper();
          return;
        }
      }

      if (target !== null && Number(answers[target]) === place.digit) app.vue.methods.closeHelper();
    },
  };

  // Check/Reveal from the menu must act on the normal grid, not the helper's highlights.
  const originalShowModal = app.vue.methods.showModal;
  if (originalShowModal) {
    app.vue.methods.showModal = function (modal) {
      if (modal === 'hintsMenu') app.vue.methods.closeHelper();
      return originalShowModal.apply(this, arguments);
    };
  }

  ['historyUndo', 'historyRedo', 'resetGrid'].forEach(name => {
    const original = app.vue.methods[name];
    if (!original) return;
    app.vue.methods[name] = function () {
      app.vue.methods.closeHelper();
      return original.apply(this, arguments);
    };
  });

  const originalCompletedWatch = app.vue.watch.isCompletedWithoutErrors;
  if (originalCompletedWatch && originalCompletedWatch.handler) {
    const handler = originalCompletedWatch.handler;
    originalCompletedWatch.handler = function (val) {
      if (val) app.vue.methods.closeHelper();
      return handler.apply(this, arguments);
    };
  }

  // Capture phase so digits and arrows never reach the grid while a step is showing.
  window.addEventListener(
    'keydown',
    e => {
      if (!app.vue.data.helper || !app.vue.data.helper.open) return;
      const code = e.keyCode || e.which;
      if (code === 27) {
        e.preventDefault();
        app.vue.methods.closeHelper();
        return;
      }
      const typing = code === 8 || code === 46 || (code >= 48 && code <= 57) || (code >= 96 && code <= 105);
      const step = app.vue.data.helper.step;
      if (typing && step && step.accept === 'place') return;

      if (typing || (code >= 37 && code <= 40)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
})();
