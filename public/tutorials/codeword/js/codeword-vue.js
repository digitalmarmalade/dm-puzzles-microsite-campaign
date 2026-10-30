var app = window.app || {};

(function () {
  'use strict';

  app.vue.data.active.cells = [];
  app.vue.data.check.letters = [];
  app.vue.data.modes.notes = false;
  app.vue.data.autoCheckPending = null;
  app.vue.data.hint = { type: null, step: 0, number: null, missing: 0, cells: [] };
  app.vue.data.hintDock = 'bottom';
  app.vue.data.history = {};
  app.vue.data.user = {
    answers: null,
    notesArr: [],
  };
  app.vue.data.modes.grid = true;
  app.vue.data.admired = false;
  app.vue.data.celebrating = false;

  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };

  app.vue.methods.changePrintShowSolution = function (value) {
    app.vue.data.print.showSolution = !!Number(value);
  };

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();

    if (!app.status.admired) {
      app.status.admired = Date.now();
      app.helpers.saveUserPlayStatus();
    }

    app.vue.data.admired = true;
  };

  app.vue.methods.shareResult = async function () {
    const url = app.vue.data.links.share;
    const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

    const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
    const text = `⏱️ I completed ${title} in ${this.timerDisplay}`;
    let file = null;
    try {
      const blob = app.helpers.generateShareImage && (await app.helpers.generateShareImage());
      if (blob) file = new File([blob], `${title}.png`, { type: 'image/png' });
    } catch (err) {
      console.warn('share image failed', err);
    }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text });
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.error(err);
      }
    }

    if (file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `${title}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    if (!navigator.share) {
      app.vue.methods.copyToClipboard(`${text} ${url}`);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    navigator
      .share({ title, text, url })
      .then(() => {
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
      })
      .catch((err) => {
        app.vue.methods.copyToClipboard(`${text} ${url}`);
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        console.error(err);
      });
  };

  app.vue.data.keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    [
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      {
        code: 8,
        display: `
                    <svg class="icon" data-size="24" aria-hidden="true">
                        <use href="#iconDelete"></use>
                    </svg>
                    <span class="sr-only">Delete</span>
                `,
        event: 'delete',
      },
    ],
  ];

  app.vue.computed.isCompleted = function () {
    return this.totalCellsPercent === 100;
  };

  app.vue.computed.isCompletedWithErrors = function () {
    return this.isCompleted && !this.isCompletedWithoutErrors;
  };

  app.vue.computed.isCompletedWithoutErrors = function () {
    return this.userString === app.vue.data.source.settings.solution;
  };

  app.vue.computed.listCellsError = function () {
    var cells = this.$root.puzzle.cells,
      errors = [];

    for (var i = 1, cellsLen = cells.length; i < cellsLen; i++) {
      if (
        !cells[i].isBlank &&
        this.user.answers['cell_' + (i - 1)] !== this.source.settings.solution[i - 1]
      ) {
        errors.push(i);
      }
    }
    return errors;
  };

  app.vue.computed.totalCellsCompleted = function () {
    return this.userString.replace(/ /g, '').length;
  };

  app.vue.computed.totalCellsPercent = function () {
    return (this.totalCellsCompleted / app.puzzle.solution.length) * 100;
  };

  app.vue.computed.listCellsError = function () {
    var cells = this.$root.puzzle.cells,
      errors = [];

    for (var i = 1, cellsLen = cells.length; i < cellsLen; i++) {
      if (
        !cells[i].isBlank &&
        this.user.answers['cell_' + (i - 1)] !== this.source.settings.solution[i - 1]
      ) {
        errors.push(i);
      }
    }
    return errors;
  };

  app.vue.computed.userString = function () {
    return app.vue.data.user.answers || app.puzzle.cluedata || ''.padEnd(app.puzzle.solution.length);
  };

  app.vue.methods.checkLetter = function () {
    app.helpUsed('check', 'letter');
    app.vue.data.check.letter = app.vue.data.active.cell;
    app.vue.data.check.letters = app.vue.data.active.cells;

    setTimeout(() => {
      app.vue.methods.resetActions('check.letter');
      app.vue.methods.resetActions('check.letters');
    }, 1000);
  };

  app.vue.computed.emptyCellsAmount = function () {
    return app.puzzle.cluedata.split(' ').length - 1;
  };

  app.vue.computed.emptyUserAnswer = function () {
    return app.vue.data.user.answers.split(' ').length - 1;
  };

  app.vue.computed.checkGridEmpty = function () {
    return this.emptyCellsAmount === this.emptyUserAnswer;
  };

  app.vue.methods.checkSimilarity = function (str1, str2) {
    let min = Math.min(str1.length, str2.length);
    let max = Math.max(str1.length, str2.length);
    let matchCount = 0;

    for (let i = 0; i < min; i++) {
      if (str1[i] === str2[i] || str1[i] === ' ') {
        matchCount++;
      }
    }

    return Math.floor((matchCount / max) * 100);
  };

  app.vue.methods.deleteClicked = function () {
    if (!app.vue.model.isCompletedWithoutErrors) {
      if (app.vue.data.modes.notes) {
        app.helpers.clearUserNotes(app.vue.data.active.cells[0]);
      } else {
        app.helpers.setUserAnswer(app.vue.data.active.cells[0], ' ');
      }

      app.helpers.historySave();
    }
  };

  app.vue.methods.getPuzzleObject = function () {
    let puzzle = app.vue.data.source;
    let obj = {
      allowed_values: puzzle.settings.allowedValues,
      cells: [],
      givenCells: [],
      colCount: parseInt(puzzle.settings.colCount, 10),
      counts: {
        cells: {
          active: 0,
        },
      },
      meta: puzzle.meta,
      number: puzzle.meta.number || null,
      celldata: puzzle.celldata.split(','),
      cluedata: puzzle.cluedata,
      rowCount: parseInt(puzzle.settings.rowCount, 10),
      gridlen: parseInt(puzzle.settings.colCount, 10) * parseInt(puzzle.settings.rowCount, 10),
      name: '',
      solution: puzzle.settings.solution.split(''),
      newSolution: [],
      stringSol: '',
      operator_col: [],
      operator_row: [],
      solutionNumberOnlyLength: puzzle.settings.solution.replace(/\s/g, '').length,
      firstClueNumberPuzzle: 0,
    };

    obj = app.vue.methods.setPuzzleGrid(obj, puzzle);
    obj = app.vue.methods.setPuzzleNumber(obj, puzzle);
    obj.firstClueNumberPuzzle = app.helpers.getFirstClueNumberPuzzle(obj.cells);

    app.vue.data.user.answers = puzzle.cluedata;

    var idc = 0;
    var givenCols = obj.solution.length <= 8 ? obj.solution.length : Math.ceil(obj.solution.length / 2);
    for (var rowGivenCell = 0; rowGivenCell < 2; rowGivenCell++) {
      for (var colGivenCell = 0; colGivenCell < givenCols && idc < obj.solution.length; colGivenCell++) {
        var givenCell = {
          id: idc,
          c: colGivenCell,
          r: rowGivenCell,
          value: '',
          clueNumber: idc + 1,
          cluedata: obj.cluedata[idc] ? obj.cluedata[idc] : '',
          solution: obj.solution[idc],
          candidates: [],
          notes: [],
          noteMode: false,
        };

        obj.givenCells[rowGivenCell] = obj.givenCells[rowGivenCell] || [];
        obj.givenCells[rowGivenCell][colGivenCell] = givenCell;
        obj.counts.cells.active++;
        idc++;
      }
    }

    return obj;
  };

  app.vue.methods.setPuzzleGrid = function (obj, puzzle) {
    let width = puzzle.settings.colCount;
    let height = puzzle.settings.rowCount;

    //get operators
    for (let cellId = 0, row = 0; row < height; row++) {
      for (let col = 0; col < width; cellId++, col++) {
        let cell = {
          id: cellId,
          c: cellId % obj.colCount,
          r: Math.floor(cellId / obj.rowCount),
          value: '',
          clueNumber: obj.celldata[cellId],
          cluedata: obj.cluedata[parseInt(obj.celldata[cellId]) - 1]
            ? obj.cluedata[parseInt(obj.celldata[cellId]) - 1]
            : '',
          solution: obj.solution[parseInt(obj.celldata[cellId]) - 1],
          candidates: [],
          notes: [],
          noteMode: false,
          type: obj.celldata[cellId].length === 0 ? 'blank' : 'value',
        };

        obj.cells[row] = obj.cells[row] || [];
        obj.cells[row][col] = cell;
        obj.counts.cells.active++;
      }
    }

    return obj;
  };

  app.vue.methods.setPuzzleNumber = function (obj, puzzle) {
    let number = Number(obj.number);

    if (number) {
      obj.number = number.toLocaleString();
    }

    return obj;
  };

  app.vue.methods.historyUndo = function () {
    if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
    app.helpers.historyUndo();
  };

  app.vue.methods.historyRedo = function () {
    if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
    app.helpers.historyRedo();
  };

  app.vue.methods.resetGrid = function () {
    app.helpers.resetUserState();
    app.vue.methods.dismissHint();
    app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());
    app.vue.methods.setActiveCell(0);
    app.vue.methods.hideModal();
    app.helpers.historySave();
  };

  app.vue.methods.resetActions = function (exclude) {
    if (exclude !== 'check.grid') {
      app.vue.data.check.grid = false;
    }

    if (exclude !== 'check.letter') {
      app.vue.data.check.letter = null;
    }

    if (exclude !== 'check.letters') {
      app.vue.data.check.letters = [];
    }

    if (exclude !== 'check.word') {
      app.vue.data.check.word = null;
    }

    if (exclude !== 'reveal.grid') {
      app.vue.data.reveal.grid = false;
    }
  };

  app.vue.methods.revealGrid = function () {
    const solution = app.vue.data.source.settings.solution || '';
    const answers = app.vue.data.user.answers || '';
    const unsolved = solution.split('').filter((letter, i) => letter.trim() && answers[i] !== letter).length;

    if (unsolved && !app.vue.data.user.solutionRevealed) {
      app.vue.data.user.solutionRevealed = true;
      app.helpUsed('reveal', 'grid');
      app.helpers.recordCellsRevealed(unsolved);
    }

    app.vue.data.reveal.grid = true;

    setTimeout(() => {
      app.vue.methods.resetActions('reveal.grid');
    }, 0);

    app.vue.methods.hideModal();
  };

  app.vue.methods.revealLetter = function () {
    //we only need 1 cell as sample only as all cells should have same cluenumber
    app.helpers.revealCell(app.vue.data.active.cells[0][0]);
    app.helpUsed('reveal', 'cell');
    app.helpers.recordCellsRevealed(1);

    setTimeout(() => {
      app.vue.methods.resetActions('reveal.letter');
    }, 0);
  };

  app.vue.methods.setActiveCell = function (id, numberOrSymbol, isGivenNumber) {
    if (isGivenNumber === ' ' || isGivenNumber === '') {
      if (numberOrSymbol === 'number') {
        app.vue.data.active.cell = id;
        app.helpers.saveActiveState();
      }
    }

    if (numberOrSymbol === undefined && isGivenNumber === undefined) {
      app.vue.data.active.cell = id;
      app.helpers.saveActiveState();
    }
  };

  app.helpers.getFirstClueNumberPuzzle = function (cells) {
    for (var r = 0; r < app.vue.data.source.settings.rowCount; r++) {
      for (var c = 0; c < app.vue.data.source.settings.colCount; c++) {
        if (cells[r][c].type !== 'blank') {
          return cells[r][c].clueNumber;
        }
      }
    }
  };

  app.vue.methods.setActiveItem = function (key, id) {
    if (!app.vue.data.user.answers || app.vue.data.user.answers.length === 0) {
      app.vue.data.user.answers = app.vue.data.source.cluedata;
    }

    if (!this.userString.includes(key)) {
      var rowColCell = app.helpers.getColRowFromCellId(id);
      var clueNumber = app.puzzle.cells[rowColCell.row][rowColCell.col].clueNumber;
      var allIds = app.vue.methods.getIdsFromClueNumber(clueNumber);

      app.vue.data.active[key] = allIds;
      app.vue.data.active.cell = id;
      app.helpers.saveActiveState();
    }
  };

  app.vue.methods.setActiveItemFromGivenCell = function (key, id) {
    var rowColCell = app.helpers.getColRowFromGivenCellId(id);
    var clueNumber = app.puzzle.givenCells[rowColCell.row][rowColCell.col].clueNumber;
    var allIds = app.vue.methods.getIdsFromClueNumber(clueNumber);

    app.vue.data.active[key] = allIds;
    app.vue.data.active.cell = id;
    app.helpers.saveActiveState();
  };

  app.vue.methods.getIdsFromClueNumber = function (clueNumber) {
    var ids = [];
    var idsGivenCell = [];

    //main grid
    for (var row = 0; row < app.puzzle.rowCount; row++) {
      for (var col = 0; col < app.puzzle.colCount; col++) {
        if (parseInt(app.puzzle.cells[row][col].clueNumber) === parseInt(clueNumber)) {
          ids.push(app.puzzle.cells[row][col].id);
        }
      }
    }

    //given cell - grid
    for (var givenCellRow = 0; givenCellRow < app.puzzle.givenCells.length; givenCellRow++) {
      for (var givenCellCol = 0; givenCellCol < app.puzzle.givenCells[givenCellRow].length; givenCellCol++) {
        if (
          parseInt(app.puzzle.givenCells[givenCellRow][givenCellCol].clueNumber) ===
          parseInt(clueNumber)
        ) {
          idsGivenCell.push(app.puzzle.givenCells[givenCellRow][givenCellCol].id);
        }
      }
    }

    return [ids, idsGivenCell];
  };

  app.vue.methods.getIdFromClueData = function (cluedata) {
    for (var row = 0; row < app.vue.data.source.settings.rowCount; row++) {
      for (var col = 0; col < app.vue.data.source.settings.colCount; col++) {
        if (app.puzzle.cells[row][col].cluedata === cluedata) {
          return app.puzzle.cells[row][col].id;
        }
      }
    }
  };

  app.vue.mounted = function () {
    app.helpers.initTheme();
    app.vue.data.admired = false;

    window.addEventListener('keydown', function (e) {
      const code = e.keyCode || e.which;

      if (app.vue.data.state.isPaused) return;

      if (code === 9) {
        app.emitter.emit('keyup-enter', e, code);
        e.preventDefault();
      }

      if (code === 8) {
        app.vue.methods.deleteClicked();
      }

      if (code === 37) {
        app.helpers.prevCell(app.vue.data.active.cell);
      }

      if (code === 38) {
        app.helpers.upCell(app.vue.data.active.cell);
      }

      if (code === 39) {
        app.helpers.nextCell(app.vue.data.active.cell);
      }

      if (code === 40) {
        app.helpers.downCell(app.vue.data.active.cell);
      }

      if (code === 46) {
        app.vue.methods.deleteClicked();
      }

      if (code >= 65 && code <= 90) {
        app.emitter.emit('keyup-az', e, code, String.fromCharCode(code));
      }

      app.emitter.emit('keyup', code);
    });

    app.helpers.mountUiHelpers();
    app.emitter.emit('mounted');
    app.helpers.mounted(this);
  };

  app.vue.watch.isCompletedWithErrors = function (val) {
    if (val === true) {
      app.helpers.puzzleCompletedUnsuccessfully();
    }
  };

  app.vue.watch.isCompletedWithoutErrors = function (val) {
    if (val !== true) return;

    if (app.status.completed) {
      app.helpers.puzzleCompletedSuccessfully();
      return;
    }

    if (app.vue.data.config.hasTimer) app.timer.stop();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxStep = (app.puzzle.cells.length - 1) + (app.puzzle.cells[0].length - 1);

    app.vue.data.celebrating = true;
    setTimeout(() => {
      app.vue.data.celebrating = false;
      if (app.vue.model.isCompletedWithoutErrors) app.helpers.puzzleCompletedSuccessfully();
    }, reduceMotion ? 0 : maxStep * 32 + 500);
  };

  app.vue.watch.userSettings = function (newValue, oldValue) {
    app.helpers.savePuzzleState();
  };

  app.vue.watch['state.breakpoints.lg'] = function () {
    Vue.nextTick(app.helpers.resizeGrid);
  };

  app.vue.methods.selectNumber = function (number) {
    const ids = app.vue.methods.getIdsFromClueNumber(number);

    app.vue.data.active.cells = ids;
    app.vue.data.active.cell = ids[0][0];
    app.helpers.saveActiveState();
  };

  app.vue.methods.getHint = function () {
    const hint = app.helpers.findHint();

    if (!hint) return;

    app.vue.data.user.hintsShown = (app.vue.data.user.hintsShown || 0) + 1;
    app.helpers.saveUserState();
    app.vue.data.hint = { ...hint, step: 1 };
    app.vue.methods.placeHint();

    if (hint.type === 'frequency') {
      app.vue.methods.selectNumber(hint.number);
    }
  };

  const HINT_STEPS = {
    word: ['word', 'number', 'letters'],
    frequency: ['frequency', 'letters'],
    mistake: ['mistake', 'mistake_number'],
  };

  app.vue.methods.hintNext = function () {
    const hint = app.vue.data.hint;
    const steps = HINT_STEPS[hint.type];

    if (hint.step < steps.length) {
      hint.step++;

      if (hint.type === 'mistake') {
        app.vue.methods.selectNumber(hint.number);
        app.helpUsed('check', 'letter');
      } else if (hint.type === 'word' && hint.step === 2) {
        app.vue.methods.selectNumber(hint.number);
      }

      app.vue.methods.placeHint();
      return;
    }

    app.vue.methods.selectNumber(hint.number);
    app.vue.methods.revealLetter();
    app.vue.methods.dismissHint();
  };

  app.vue.methods.dismissHint = function () {
    app.vue.data.hint = { type: null, step: 0, number: null, missing: 0, cells: [] };
  };

  app.vue.computed.hintKey = function () {
    const steps = HINT_STEPS[this.hint.type];

    return steps ? steps[this.hint.step - 1] : null;
  };

  app.vue.methods.placeHint = function () {
    app.vue.data.hintDock = 'bottom';

    const coveredCells = () => {
      const panel = document.querySelector('[data-area=main] > .hint-panel');
      const cells = document.querySelectorAll('#pinch-zoom-image .cell-group');

      if (!panel) return 0;

      const box = panel.getBoundingClientRect();

      return app.vue.data.hint.cells.filter(id => {
        const cell = cells[id] && cells[id].getBoundingClientRect();
        return cell && cell.bottom > box.top && cell.top < box.bottom && cell.right > box.left && cell.left < box.right;
      }).length;
    };

    Vue.nextTick(() => {
      if (!app.vue.data.hint.cells.length) return;

      const bottom = coveredCells();
      if (!bottom) return;

      app.vue.data.hintDock = 'top';

      Vue.nextTick(() => {
        if (coveredCells() >= bottom) app.vue.data.hintDock = 'bottom';
      });
    });
  };

  app.vue.computed.hintTechnique = function () {
    const key = this.hintKey === 'mistake_number' ? 'mistake' : this.hintKey;

    return this.lang['hint_technique_' + key] || '';
  };

  app.vue.computed.hintText = function () {
    const hint = this.hint;

    if (this.hintKey === 'letters') return this.hintLettersText;

    let key = 'hint_reason_' + this.hintKey;

    if (this.hintKey === 'word') key += hint.missing === 1 ? '_one' : '_other';

    let text = (this.lang[key] || '')
      .replaceAll('[[number]]', hint.number)
      .replaceAll('[[count]]', this.hintKey === 'word' ? hint.missing : app.helpers.getNumberCount(hint.number))
      .replaceAll('[[pattern]]', this.hintPattern)
      .replaceAll('[[repeat]]', this.hintNumberRepeat);

    if (this.hintKey === 'word' && hint.repeat) {
      const repeatKey = hint.repeatCount === 2 ? 'hint_reason_word_repeat_two' : 'hint_reason_word_repeat_other';
      text += ' ' + (this.lang[repeatKey] || '').replaceAll('[[count]]', hint.repeatCount);
    }

    return text;
  };

  app.vue.computed.hintNumberRepeat = function () {
    const cells = app.puzzle.cells.flat();
    const uses = this.hint.cells.filter(id => +cells[id].clueNumber === this.hint.number).length;

    return uses > 1 ? ' ' + (this.lang.hint_reason_number_repeat || '').replaceAll('[[count]]', uses) : '';
  };

  app.vue.computed.hintPattern = function () {
    const cells = app.puzzle.cells.flat();
    const answers = this.userString;
    const letters = this.hint.cells.map(id => {
      const number = +cells[id].clueNumber;
      const letter = (answers[number - 1] || ' ').trim();

      if (number === this.hint.number) return '<mark>?</mark>';

      return letter || '_';
    });

    return '<span class="hint-panel__pattern">' + letters.join('') + '</span>';
  };

  app.vue.computed.hintPosition = function () {
    const cells = app.puzzle.cells.flat();
    const ids = this.hint.cells;
    const at = index => ids.length && +cells[ids[index]].clueNumber === this.hint.number;

    if (at(ids.length - 1)) return 'last';
    if (at(0)) return 'first';

    return 'middle';
  };

  app.vue.computed.hintLettersText = function () {
    const answer = (this.source.settings.solution || '')[this.hint.number - 1];
    const unused = (order, count) => (order || app.puzzle.allowed_values)
      .split('')
      .filter(letter => !this.userString.includes(letter))
      .slice(0, count);
    const remaining = unused(app.puzzle.allowed_values, 26);

    if (remaining.length <= 5) {
      return (this.lang.hint_reason_letters_left || '').replaceAll('[[letters]]', remaining.join(', '));
    }

    const options = [
      { key: 'hint_reason_letters_' + this.hintPosition, order: this.lang['hint_common_' + this.hintPosition + '_letters'], count: 5 },
      { key: 'hint_reason_letters_middle', order: this.lang.hint_common_letters, count: 5 },
      { key: 'hint_reason_letters_middle', order: this.lang.hint_common_letters, count: 8 },
    ];
    const match = options.find(option => option.order && unused(option.order, option.count).includes(answer));

    if (!match) return this.lang.hint_reason_letters_rare || '';

    return (this.lang[match.key] || '').replaceAll('[[letters]]', unused(match.order, match.count).join(', '));
  };

  app.vue.computed.hintNextLabel = function () {
    const labels = {
      mistake: this.lang.hint_button_show_me,
      word: this.lang.hint_button_which,
      number: this.lang.hint_button_letters,
      frequency: this.lang.hint_button_letters,
      letters: this.lang.hint_button_reveal,
    };

    return labels[this.hintKey] || '';
  };

  app.vue.computed.hintsUsed = function () {
    return (
      (app.vue.data.user.cellsRevealed || 0) > 0 ||
      (app.vue.data.user.checksUsed || 0) > 0 ||
      (app.vue.data.user.hintsShown || 0) > 0
    );
  };

  app.vue.computed.hintsSummary = function () {
    const lang = this.lang || {};
    const line = (n, one, other) => (lang[n === 1 ? one : other] || '').replaceAll('[[n]]', n);
    const reveals = app.vue.data.user.cellsRevealed || 0;
    const checks = app.vue.data.user.checksUsed || 0;
    const hints = app.vue.data.user.hintsShown || 0;
    const parts = [];

    if (reveals > 0) parts.push(line(reveals, 'modal_completed_correct_hints_reveals_one', 'modal_completed_correct_hints_reveals_other'));
    if (checks > 0) parts.push(line(checks, 'modal_completed_correct_hints_checks_one', 'modal_completed_correct_hints_checks_other'));
    if (hints > 0) parts.push(line(hints, 'modal_completed_correct_hints_hints_one', 'modal_completed_correct_hints_hints_other'));

    return parts.join(', ');
  };

  app.vue.watch['check.grid'] = function (newValue) {
    if (newValue) {
      setTimeout(() => {
        if (
          app.vue.methods.checkSimilarity(
            this.userString,
            app.vue.data.source.settings.solution
          ) === 100 &&
          !this.checkGridEmpty
        ) {
          app.vue.data.blind.gridCorrect = true;

          setTimeout(() => {
            app.vue.data.blind.gridCorrect = false;
          }, 3000);
        }
      }, 0);
    }
  };

  app.vue.watch['check.letter'] = function (newValue) {};
})();
