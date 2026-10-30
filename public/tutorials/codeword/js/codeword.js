var app = window.app || {};

(function () {
  'use strict';

  app.helpers.clearUserNotes = function (cells) {
    const rowColCell = app.helpers.getColRowFromCellId(cells[0]);
    const clueNumber = app.puzzle.cells[rowColCell.row][rowColCell.col].clueNumber;

    app.vue.data.user.notesArr[clueNumber] = '';
    app.helpers.saveUserState();
  };

  app.helpers.downCell = function (cellId) {
    var currentId = cellId || app.vue.data.active.cell;
    var colRowActive = app.helpers.getColRowFromCellId(currentId);
    var firstCellId = app.helpers.getCellIdFromColRow(colRowActive.col, 0);
    var newId = currentId + (app.puzzle.colCount * 2 - 1);
    var colRowNewActive = app.helpers.getColRowFromCellId(newId);
    var lastCellId = firstCellId + 74;

    if (colRowNewActive.row < 9) {
      if (app.puzzle.cells[colRowNewActive.col][colRowNewActive.row].numberOrSymbol !== 'number') {
        newId += app.puzzle.rowCount * 2 - 1;

        var newColRowActive = app.helpers.getColRowFromCellId(newId);

        if (app.puzzle.cells[newColRowActive.row][newColRowActive.col].given_number !== ' ') {
          newId += app.puzzle.rowCount * 2 - 1 + (app.puzzle.rowCount * 2 - 1);
        }
      }
    }

    if (newId >= lastCellId) {
      newId = firstCellId;
    }

    app.vue.methods.setActiveCell(newId);
  };

  /**
   * get the row and col of a cell with a specified id
   *
   * @param {int} id - cell id
   * @returns {object}
   */
  app.helpers.getColRowFromCellId = function (id) {
    const colRow = {};

    colRow.row = Math.floor(id / app.vue.data.source.settings.colCount);
    colRow.col = Math.floor(id - colRow.row * app.vue.data.source.settings.colCount);

    return colRow;
  };

  app.helpers.getCellIdFromColRow = function (col, row) {
    return row * (app.vue.data.source.settings.colCount * 2 - 1) + col;
  };

  app.helpers.getDefaultUserState = function () {
    return {
      answers: app.puzzle.cluedata,
      notesArr: [],
      prefilled: 0,
      prefilledCells: [],
      revealedNumbers: [],
      settings: {
        timer: true,
        answersautocheck: false,
      },
    };
  };

  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();

    if (app.vue.data.config.hasTimer && app.timer) {
      app.timer.restart();
    }

    app.status.started = null;
    app.status.completed = null;
    app.status.admired = null;
    app.status.progress = 0;
    app.vue.data.admired = false;

    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.loadPuzzleSettings = function () {
    var defaultUserState = app.helpers.getDefaultUserState();

    return app.storageVariant.get('settings').then(data => {
      var merged = Object.assign({}, defaultUserState.settings, data || {});
      for (var i in merged) app.vue.data.userPuzzleSettings[i] = merged[i];
    });
  };

  let codewordWords = null;

  app.helpers.getWords = function () {
    if (codewordWords) return codewordWords;

    const cells = app.puzzle.cells;
    const words = [];
    const collect = lines => {
      lines.forEach(line => {
        let run = [];
        line.concat([null]).forEach(cell => {
          if (cell && cell.type === 'value') {
            run.push(cell);
            return;
          }
          if (run.length > 1) words.push(run.map(c => ({ id: c.id, number: +c.clueNumber })));
          run = [];
        });
      });
    };

    collect(cells);
    collect(cells[0].map((_, col) => cells.map(row => row[col])));
    codewordWords = words;

    return words;
  };

  app.helpers.getNumberCount = function (number) {
    return app.puzzle.cells.flat().filter(cell => +cell.clueNumber === number).length;
  };

  app.helpers.findHint = function () {
    const answers = app.vue.data.user.answers || '';
    const solution = app.vue.data.source.settings.solution || '';
    const known = number => (answers[number - 1] || ' ').trim() !== '';
    const byCount = (a, b) => app.helpers.getNumberCount(b) - app.helpers.getNumberCount(a);

    const wrong = [];
    for (let number = 1; number <= solution.length; number++) {
      if (known(number) && answers[number - 1] !== solution[number - 1]) wrong.push(number);
    }

    if (wrong.length) {
      return { type: 'mistake', number: wrong.sort(byCount)[0], missing: 0, cells: [] };
    }

    const numbers = [];
    for (let number = 1; number <= solution.length; number++) numbers.push(number);

    const unsolved = numbers.filter(number => !known(number)).sort(byCount);
    const frequency = () => ({ type: 'frequency', number: unsolved[0], missing: 0, cells: [] });

    if (!unsolved.length) return null;
    if (!known(numbers.sort(byCount)[0])) return frequency();

    let best = null;

    app.helpers.getWords().forEach(word => {
      const missing = [...new Set(word.filter(cell => !known(cell.number)).map(cell => cell.number))];
      if (!missing.length) return;

      const filled = word.filter(cell => known(cell.number)).length / word.length;
      const score = filled * word.filter(cell => known(cell.number)).length;

      if (word.length >= 7 && filled >= 0.5 && (!best || score > best.score)) best = { word, missing, score };
    });

    if (!best) return frequency();

    const repeats = best.missing
      .map(number => ({ number, count: best.word.filter(cell => cell.number === number).length }))
      .filter(entry => entry.count > 1)
      .sort((a, b) => b.count - a.count || byCount(a.number, b.number));

    return {
      type: 'word',
      number: best.missing.sort(byCount)[0],
      missing: best.missing.length,
      cells: best.word.map(cell => cell.id),
      repeat: repeats.length ? repeats[0].number : null,
      repeatCount: repeats.length ? repeats[0].count : 0,
    };
  };

  app.helpers.guideCheckTip = function () {
    if (app.vue.data.userPuzzleSettings.answersautocheck) return;

    const answers = app.vue.data.user.answers || '';
    const given = app.puzzle.cluedata || '';
    const solution = app.vue.data.source.settings.solution || '';
    let entered = 0;
    let wrong = false;

    for (let i = 0; i < answers.length; i++) {
      if (!answers[i].trim() || (given[i] || '').trim()) continue;
      entered++;
      if (answers[i] !== solution[i]) wrong = true;
    }

    if (entered >= 4 && wrong) app.helpers.guideTip('check');
  };

  app.helpers.getDOMValue = function (selector, value) {
    const node = document.querySelector(selector);

    if (!node) return null;

    return getComputedStyle(node)[value];
  };

  app.helpers.getDefaultActiveState = function () {
    return {
      cell: this.getStarterIdForActiveCell(),
      cells: app.vue.methods.getIdsFromClueNumber(app.puzzle.firstClueNumberPuzzle),
    };
  };

  app.helpers.getStarterIdForActiveCell = function () {
    for (let i = 0; i < app.vue.data.source.cluedata.length; i++) {
      if (app.vue.data.source.cluedata[i] === ' ') {
        return parseInt(app.vue.methods.getIdFromClueData(app.vue.data.source.cluedata[i]));
      }
    }
  };

  app.helpers.getDefaultNoteArr = function () {
    return {
      notesArr: app.vue.methods.getIdsFromClueNumber(app.puzzle.firstClueNumberPuzzle),
    };
  };

  app.helpers.getColRowFromGivenCellId = function (id) {
    'use strict';

    var o = this,
      colRow = {};

    const cols = app.puzzle.givenCells[0].length;

    colRow.row = Math.floor(id / cols);
    colRow.col = Math.floor(id - colRow.row * cols);

    return colRow;
  };

  app.helpers.historyInit = function () {
    var options = {
      props: ['active', 'modes', 'user'],
    };
    app.history = app.history || new DMHistoryVue(app.vue.model, options);
  };

  app.helpers.historyRedo = function () {
    if (app.history) {
      app.history.forward();
    }
  };

  app.helpers.historySave = function () {
    if (app.history) {
      app.history.push();
    }
  };

  app.helpers.historyUndo = function () {
    if (app.history) {
      app.history.back();
    }
  };

  app.helpers.loadNotes = function () {
    app.vue.data.user.notesArr = app.helpers.getDefaultNoteArr();
  };

  /**
   * Load answer state from storage
   * If not found then load default answer state and save
   */
  app.helpers.loadUserState = function () {
    return app.storagePuzzle.get('user').then(data => {
      if (data !== null) {
        app.vue.data.user = data;
        app.vue.data.user.answers = data.answers;
      } else {
        app.vue.data.user = app.helpers.getDefaultUserState();
        app.helpers.saveUserState();
      }
    });
  };

  app.helpers.prevCell = function (cellId) {
    var currentId = cellId || app.vue.data.active.cell;
    var colRowActive = app.helpers.getColRowFromCellId(currentId);
    var firstCellId = app.helpers.getCellIdFromColRow(8, colRowActive.row);
    var newId = 0;
    newId = currentId - 2;
    var newColRowActive = app.helpers.getColRowFromCellId(newId);

    if (app.puzzle.cells[newColRowActive.row][newColRowActive.col].given_number !== ' ') {
      newId -= 2;
    }
    var lastCellId = firstCellId - 8;

    if (newId < lastCellId) {
      newId = firstCellId;
    }

    app.vue.methods.setActiveCell(newId);
  };

  app.helpers.nextCell = function (cellId) {
    var currentId = cellId || app.vue.data.active.cell;
    var colRowActive = app.helpers.getColRowFromCellId(currentId);
    var newId = 0;
    var firstCellId = app.helpers.getCellIdFromColRow(0, colRowActive.row);
    newId = currentId + 2;
    var newColRowActive = app.helpers.getColRowFromCellId(newId);

    if (app.puzzle.cells[newColRowActive.row][newColRowActive.col].given_number !== ' ') {
      newId += 2;
    }

    var lastCellId = firstCellId + 8;

    if (newId > lastCellId) {
      newId = firstCellId;
    }

    app.vue.methods.setActiveCell(newId);
  };

  app.helpers.puzzleCompletedUnsuccessfully = function () {
    app.vue.data.blind.gridIncorrect = true;

    setTimeout(() => {
      app.vue.data.blind.gridIncorrect = false;
    }, 2000);
  };

  app.helpers.puzzleStart = function (vm) {
    app.helpers.prefillLetters();
    app.helpers.historyInit();

    if (!app.status.completed && app.vue.data.config.hasTimer) {
      app.timer.start(app.vue.data.time);
      app.helpers.saveUserTime();
    }

    app.helpers.historySave();

    if (app.vue.model.isCompletedWithoutErrors) {
      app.helpers.puzzleCompletedSuccessfully(true);
    } else if (app.vue.model.isCompletedWithErrors) {
      app.helpers.puzzleCompletedUnsuccessfully(true);
      app.helpers.tsThisBeforeThat('hideCompletionOverlay', 'letterEntered');
    }
  };

  /**
   * Callback called from timer class
   */
  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

  app.helpers.revealCell = function (id) {
    const rowColCell = app.helpers.getColRowFromCellId(id);
    const number = +app.puzzle.cells[rowColCell.row][rowColCell.col].clueNumber;
    const user = app.vue.data.user;

    if (!(user.revealedNumbers || []).includes(number)) {
      user.revealedNumbers = [...(user.revealedNumbers || []), number];
    }

    app.helpers.setUserAnswer(id);
    app.helpers.historySave();
  };

  app.helpers.prefillLetters = function () {
    const settings = app.vue.data.userPuzzleSettings;
    const letters = app.config.assistLetters;
    if (!letters && (!settings || !settings.prefillletters)) return;
    if (!app.vue.model || !app.puzzle || app.vue.data.mp_config?.db_root) return;

    const user = app.vue.data.user;
    const solution = app.vue.data.source.settings.solution || '';
    const given = app.puzzle.cluedata || '';
    const answers = (user.answers || '').padEnd(solution.length);
    const open = [];

    for (let number = 1; number <= solution.length; number++) {
      if (!(given[number - 1] || ' ').trim()) open.push(number);
    }

    if (!open.length || open.some(number => answers[number - 1].trim())) return;

    let fill;
    if (letters) {
      fill = open.filter(number => letters.includes(solution[number - 1].toUpperCase()));
    } else {
      const pct = parseInt(settings.prefillpercent, 10) || 0;
      const shuffled = [...open].sort(() => Math.random() - 0.5);
      fill = shuffled.slice(0, Math.min(Math.round((open.length * pct) / 100), open.length));
    }

    if (!fill.length) return;

    const next = [...answers];
    fill.forEach(number => {
      next[number - 1] = solution[number - 1];
    });

    user.answers = next.join('');
    user.prefilled = fill.length;
    user.prefillTotal = open.length;
    user.prefilledCells = fill;
    user.cellsRevealed = (user.cellsRevealed || 0) + fill.length;
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.checkStartedStatus();
  };

  app.helpers.setUserAnswer = function (cells, answer) {
    // only take first cell Id only as all of them should have same clueNumber
    const cellId = typeof cells === 'object' ? cells[0] : cells;
    const rowColCell = this.getColRowFromCellId(cellId);
    const clueNumber = +app.puzzle.cells[rowColCell.row][rowColCell.col].clueNumber;

    answer =
      answer === undefined ? app.puzzle.cells[rowColCell.row][rowColCell.col].solution : answer;

    if (
      app.vue.data.user.answers === undefined ||
      app.vue.data.user.answers === null ||
      app.vue.data.user.answers.length < app.puzzle.cluedata.length
    ) {
      app.vue.data.user.answers = app.puzzle.cluedata;
    }

    app.vue.data.user.answers = app.vue.data.user.answers
      .split('')
      .map((a, idx) => {
        if (idx === clueNumber - 1) {
          return answer;
        } else if (a === answer) {
          return ' ';
        }

        return a;
      })
      .join('');

    if (answer && answer.trim()) {
      app.vue.data.autoCheckPending = clueNumber;
      clearTimeout(app.helpers._autoCheckTimer);
      app.helpers._autoCheckTimer = setTimeout(() => {
        app.vue.data.autoCheckPending = null;
      }, 1000);
    }

    if (app.vue.data.hint && app.vue.data.hint.type) {
      app.vue.methods.dismissHint();
    }

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.checkStartedStatus();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.updateProgress = function () {
    app.status.progress = Math.floor(app.vue.model.totalCellsPercent);
  };

  app.helpers.setUserNote = function (cells, answer) {
    const rowColCell = app.helpers.getColRowFromCellId(cells[0]);
    const clueNumber = app.puzzle.cells[rowColCell.row][rowColCell.col].clueNumber;

    app.vue.data.user.notesArr[clueNumber] = answer;
    app.helpers.saveUserState();
  };

  app.helpers.upCell = function (cellId) {
    var currentId = cellId || app.vue.data.active.cell;
    var colRowActive = app.helpers.getColRowFromCellId(currentId);
    var firstCellId = app.helpers.getCellIdFromColRow(colRowActive.col, 8);
    var newId = currentId - (app.puzzle.colCount * 2 - 1);
    var colRowNewActive = app.helpers.getColRowFromCellId(newId);
    var lastCellId = firstCellId - 74;

    if (colRowNewActive.row >= 0) {
      if (app.puzzle.cells[colRowNewActive.col][colRowNewActive.row].numberOrSymbol !== 'number') {
        newId -= app.puzzle.rowCount * 2 - 1;

        var newColRowActive = app.helpers.getColRowFromCellId(newId);

        if (app.puzzle.cells[newColRowActive.col][newColRowActive.row].given_number !== ' ') {
          newId = newId - (app.puzzle.rowCount * 2 - 1) - (app.puzzle.rowCount * 2 - 1);
        }
      }
    }

    if (newId <= lastCellId) {
      newId = firstCellId;
    }

    app.vue.methods.setActiveCell(newId);
  };

  app.helpers.convertUserAnswers = function () {
    if (
      !app.vue.data.user.answers ||
      typeof app.vue.data.user.answers !== 'string' ||
      app.vue.data.user.answers.length === 0
    ) {
      let answers = app.vue.data.source.cluedata.split('');

      if (app.vue.data.user.userInputAnswersInArray !== undefined) {
        for (let i = 1; i <= 26; i++) {
          if (
            app.vue.data.user.userInputAnswersInArray[i] !== undefined &&
            app.vue.data.user.userInputAnswersInArray[i] !== ''
          ) {
            answers[i - 1] = app.vue.data.user.userInputAnswersInArray[i];
          }
        }

        delete app.vue.data.user.userInputAnswersInArray;
      }

      app.vue.data.user.answers = answers.join('');
    }
  };

  /**
   * Resize grid
   */
  app.helpers.resizeGrid = function () {
    const mainGridAndGiven = document.getElementById('mainGridAndGiven');
    const gameplay = document.getElementById('gameplay');
    const gameplayContainer = document.getElementById('gameplayContainer');
    const sidePanel = document.getElementById('sidePanel');

    mainGridAndGiven.removeAttribute('style');
    gameplayContainer.removeAttribute('style');
    gameplay.removeAttribute('style');

    const area = mainGridAndGiven.parentElement;
    ['--codeword-grid-size', '--codeword-grid-left', '--codeword-grid-top'].forEach(name => area.style.removeProperty(name));

    const IDEAL_GRID_SIZE = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ideal-grid-size')
    );

    if (matchMedia('(width >= 1024px)').matches) {
      const style = getComputedStyle(mainGridAndGiven);
      const available =
        mainGridAndGiven.clientHeight - parseFloat(style.paddingBlockStart) - parseFloat(style.paddingBlockEnd);
      const size = Math.floor(Math.min(IDEAL_GRID_SIZE, available)) + 'px';

      area.style.setProperty('--codeword-grid-size', size);
      gameplayContainer.style.inlineSize = size;
      gameplayContainer.style.blockSize = size;
      gameplay.style.blockSize = size;
      area.style.setProperty('--codeword-grid-left', gameplayContainer.offsetLeft + 'px');
      area.style.setProperty('--codeword-grid-top', gameplayContainer.offsetTop + 'px');
      return;
    }

    const style = getComputedStyle(mainGridAndGiven);
    const grid = document.getElementById('pinch-zoom-image');
    const gap = parseFloat(style.rowGap);
    const paddingInline = parseFloat(style.paddingInlineStart) + parseFloat(style.paddingInlineEnd);
    const contentHeight =
      mainGridAndGiven.clientHeight - parseFloat(style.paddingBlockStart) - parseFloat(style.paddingBlockEnd);
    const gridBox = grid.getBoundingClientRect();
    const ratio = (gridBox.height + sidePanel.offsetHeight) / gridBox.width;
    const width = Math.floor(Math.min(gridBox.width, IDEAL_GRID_SIZE, (contentHeight - gap) / ratio));

    mainGridAndGiven.style.inlineSize = width + paddingInline + 'px';

    const gridHeight = Math.ceil(grid.getBoundingClientRect().height) + 'px';

    gameplayContainer.style.overflowY = 'hidden';
    gameplayContainer.style.blockSize = gridHeight;
    gameplay.style.blockSize = gridHeight;
  };

  app.handlers.letterEntered = function (component) {
    if (app.vue.data.modes.notes) {
      app.helpers.setUserNote(app.vue.data.active.cells[0], component.item.display);
    } else {
      if (app.vue.model.userString.includes(component.item.display)) {
        return false;
      }

      app.helpers.setUserAnswer(app.vue.data.active.cells[0], component.item.display);
    }

    app.helpers.historySave();
  };

  /**
   * add event listeners to redict events to relevant handler
   */
  app.helpers.addEventListeners = function () {
    document.addEventListener(
      'CellClick',
      e => {
        app.handlers.cellClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'ClueClick',
      e => {
        app.handlers.clueClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterEntered',
      e => {
        app.handlers.letterEntered(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterDeleted',
      e => {
        app.handlers.letterDeleted(e.detail.item, e);
      },
      false
    );
    window.addEventListener('resize', () => {
      app.handlers.onResize();
    });
    const AUTO_RESUME_WITHIN_MS = 3000;
    let hiddenAt = null;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        app.vue.methods.pauseGame(true);
        return;
      }

      const awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt;
      hiddenAt = null;

      if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
        app.vue.methods.resumeGame();
      }
    });
    screen.orientation.addEventListener('change', e => {
      app.handlers.onOrientationChange();
    });
    document.addEventListener(
      'puzzlehistorychange',
      e => {
        app.vue.data.history = e.detail.history;
        app.helpers.saveUserState();
      },
      false
    );
  };
})();
