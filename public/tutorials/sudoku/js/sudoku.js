var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  const AUTO_CHECK_DELAY_MS = 1000;

  //  Sudoku's helpUsed also dispatches a puzzlehint telemetry event.
  app.helpUsed = function (cat, subcat) {
    'use strict';

    app.vue.data.user.help = app.vue.data.user.help || {};
    app.vue.data.user.help[cat] = app.vue.data.user.help[cat] || {};
    app.vue.data.user.help[cat][subcat] = app.vue.data.user.help[cat][subcat] || 0;
    app.vue.data.user.help[cat][subcat]++;
    if (cat === 'check') {
      app.vue.data.user.checksUsed = (app.vue.data.user.checksUsed || 0) + 1;
    }
    app.helpers.saveUserState();
    app.helpers.dispatchEvent('puzzlehint', JSON.parse(JSON.stringify(app.vue.data.user.help)));
  };

  app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
    if (app.status.admired && !isStart) {
      app.vue.model.hideModal('completeSuccess');
    } else {
      if (!isStart && sendComplete) {
        app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      }

      app.helpers.showCompletionScreen(isStart);
    }
  };

  app.helpers.getFeedbackLinkObject = function (variant, archive) {
    const { today, puzzles, variants, config } = archive;
    const id = today && variant !== app.config.variant ? today[variant] : undefined;
    const base = app.helpers.parseArchiveBaseUrl(config?.baseUrl) ?? document.referrer;

    let puzObj = null;

    if (!id) {
      const variantSlugs = variants[variant];

      if (!variantSlugs) return null;

      const first = variantSlugs[0];
      puzObj = first !== app.config.slug ? puzzles[first] : null;

      for (let i = 0; i < variantSlugs.length; i++) {
        if (variantSlugs[i] === app.config.slug && variantSlugs.length > i + 1) {
          puzObj = puzzles[variantSlugs[i + 1]];
          break;
        }
      }
    } else {
      puzObj = puzzles[id];
    }

    if (puzObj) {
      const title = puzObj.variant + ' No.' + puzObj.number;
      const date = app.helpers.formatArchiveDate(puzObj.date);
      const imageSlug = puzObj.variant.split(' ').join('-').toLowerCase() + '.svg';

      return {
        title,
        url: `${base}puzzle/?p=${puzObj.slug}`,
        link_text: title,
        date: date,
        imageSlug: imageSlug,
        image: app.helpers.getFeedbackLinkImagePath(puzObj.variant.replace(/\s+/g, '').toLowerCase()),
      };
    }

    return null;
  };

  app.helpers.loadActiveState = function () {
    return app.storagePuzzle.get('active').then((data) => {
      if (data !== null) {
        app.vue.data.active = data;
      } else {
        app.vue.data.active = app.helpers.getDefaultActiveState();
      }

      app.vue.data.last['cell-' + app.vue.data.active.direction] = app.vue.data.active.cell;
    });
  };

  app.helpers.loadPuzzleSettings = function () {
    var defaultUserState = app.helpers.getDefaultUserState();

    return app.storageVariant.get('settings').then((data) => {
      // Defaults under saved values, so new default keys apply to older saves.
      var merged = Object.assign({}, defaultUserState.settings, data || {});
      for (var i in merged) {
        app.vue.data.userPuzzleSettings[i] = merged[i];
      }
    });
  };

  app.helpers.puzzleCompletedSuccessfully = function (isStart) {
    if (app.vue.data.config.hasTimer) {
      app.timer.stop();
    }

    app.helpers.saveUserPlayStatus();
    app.helpers.showCompletionScreen(isStart);
    app.helpers.checkAdmiredStatus(isStart, app.helpers.checkCompletedStatus());
  };

  app.helpers.saveActiveState = function () {
    app.storagePuzzle.set('active', app.vue.data.active);
    app.helpers.dispatchEvent('progress', { node: 'active', data: app.vue.data.active });
  };

  app.helpers.screenOrientation = function () {
    const heightQuery = window.matchMedia('(max-height: 500px)');
    const orientationQuery = window.matchMedia('(orientation: landscape)');

    app.vue.data.state.lockScreen = heightQuery.matches && orientationQuery.matches;
  };

  app.helpers.expandDataUserNotes = function (data) {
    var arr = [];
    if (!data) {
      return arr;
    }
    var noteCount = app.puzzle.width;
    var cellCount = app.puzzle.height * app.puzzle.width;
    for (var cidx = 0; cidx < cellCount; cidx++) {
      var key = 'C_';
      key += cidx < 10 ? '0' : '';
      key += cidx;
      if (data[key]) {
        var arr2 = [];
        for (var i = 1; i <= noteCount; i++) {
          arr2.push(data[key].indexOf(i) > -1);
        }
        arr.push(arr2);
      } else {
        arr.push(new Array(noteCount).fill(false));
      }
    }
    return arr;
  };

  app.helpers.formatArchiveDate = function (dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  app.helpers.getActiveCellLocation = function () {
    var cellId = app.vue.data.active.cell;
    var cell = app.helpers.getCellLocation(cellId);
    var grid = app.helpers.getGridDimensions();
    var obj = {
      row: cell.row,
      col: cell.col,
      rows: grid.rows,
      cols: grid.cols,
    };
    obj.percentage = {
      row: ((obj.row - 1) / (obj.rows - 1)) * 100,
      col: ((obj.col - 1) / (obj.cols - 1)) * 100,
    };
    return obj;
  };

  app.helpers.getUserAnswerString = function (puzzle) {
    puzzle = puzzle || app.vue.model.puzzle;

    var rows = puzzle.grid.length,
      cols = puzzle.grid[0].length,
      string = '';

    for (var i = 0; i < rows * cols; i++) {
      string += app.vue.data.user.answers['cell_' + i];
    }

    return string;
  };

  app.helpers.reduceDataUserAnswers = function (data) {
    return data.join('');
  };

  app.helpers.reduceDataUserNotes = function (data) {
    var noteCount = app.puzzle.width;
    var obj = {};
    for (var cidx = 0; cidx < data.length; cidx++) {
      var key = 'C_';
      key += cidx < 10 ? '0' : '';
      key += cidx;
      for (var nidx = 0; nidx < noteCount; nidx++) {
        if (data[cidx][nidx] === true) {
          obj[key] = obj[key] || '';
          obj[key] += nidx + 1;
        }
      }
    }
    return obj;
  };

  app.helpers.useModelOrThis = function (prop) {
    try {
      return app.vue.model[prop] || this[prop];
    } catch {}
  };

  app.helpers.getInputTargets = function () {
    if (app.vue.data.multiSelect) {
      return (app.vue.data.selectedCells || []).filter(
        id => !app.helpers.isCellGiven(id)
      );
    }
    return app.vue.data.active.cell != null ? [app.vue.data.active.cell] : [];
  };

  // HANDLERS
  app.handlers.letterDeleted = function (component, event) {
    if (app.vue.model.isCompletedWithoutErrors !== false) return;

    const targets = app.helpers.getInputTargets();
    if (!targets.length) return;

    targets.forEach(id => {
      if (app.helpers.isCellGiven(id)) return;
      app.helpers.setUserAnswer(id, 0, false);
      app.helpers.deleteNotes(id);
    });
    app.helpers.historySave();
  };

  app.handlers.letterEntered = function (component, event) {
    const targets = app.helpers.getInputTargets();
    if (!targets.length) return;

    const multi = app.vue.data.multiSelect;

    if (app.vue.data.modes.pencil) {
      targets.forEach(id => {
        if (!app.helpers.isCellGiven(id)) app.helpers.setNotes(id, component.item.display);
      });
    } else {
      if (
        !multi &&
        app.vue.methods.getOccurrence(
          Object.values(app.vue.data.user.answers),
          parseInt(component.item.display)
        ) >= app.puzzle.width
      ) {
        app.vue.data.keyMode = 'normal';
        app.vue.data.keyCode = null;
        return false;
      }

      targets.forEach(id => {
        if (!app.helpers.isCellGiven(id)) app.helpers.setUserAnswer(id, component.item.display);
      });

      if (app.vue.model.isCompletedWithErrors === true) {
        app.vue.watch.isCompletedWithErrors.handler.call(app.vue.model, true);
      }
    }

    app.helpers.historySave();
    app.helpers.tsSet('letterEntered');
  };

  /**
   * Resize grid
   */
  app.helpers.resizeGrid = function () {
    const query = window.matchMedia('(min-width: 720px)');
            const windowWidth = window.innerWidth;
            const gameAndKeys = document.getElementById('gameAndKeys');
            const gameplay = document.getElementById('gameplay');
            const gameplayContainer = document.getElementById('gameplayContainer');
            const keysContainer = document.getElementById('keysContainer');
    
            gameplay.setAttribute('style', '');
    
            const appMargin = parseInt(getComputedStyle(gameplayContainer.closest('.content-wrapper')).paddingInline);
            const gameAndKeysWidth = gameAndKeys.offsetWidth;
            const gameAndKeysGap = parseInt(getComputedStyle(gameAndKeys).gap);
            const gameplayContainerHeight = gameplayContainer.offsetHeight;
            const gameplayHeight = gameplay.offsetHeight;
            const gameplayWidth = gameplay.offsetWidth;
            const keysContainerWidth = keysContainer.offsetWidth;
            let heightDifference, adjustedSize;
               
            if (gameplayHeight !== gameplayContainerHeight) {
                heightDifference = gameplayContainerHeight / gameplayHeight;
                adjustedSize = gameplayWidth * heightDifference;
    
                if (adjustedSize > windowWidth) {
                    adjustedSize = windowWidth - (appMargin * 2);
                }
    
                if (adjustedSize + keysContainerWidth + gameAndKeysGap > gameAndKeysWidth && query.matches) {
                    adjustedSize = gameAndKeysWidth - keysContainerWidth - gameAndKeysGap;
                }
    
                gameplay.style.inlineSize = Math.floor(adjustedSize) + 'px';
            }
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
    var AUTO_RESUME_WITHIN_MS = 3000;
    var hiddenAt = null;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        app.vue.methods.pauseGame?.(true);
        return;
      }

      var awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt;
      hiddenAt = null;

      if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
        app.vue.methods.resumeGame?.();
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

  app.helpers.getDefaultUserState = function () {
    const defaultPuzzleTypeSettings = {};
    const defaultPuzzleSettings = {
      rule: true,
      answersautocheck: true,
      highlightRowsAndColumns: true,
      showUsedNumbers: true,
      notesZoom: false,
      autoRemoveCandidates: true,
      highlightSingleCandidate: false,
      textSize: 0,
      gridResize: 0,
      timer: true,
      cellsskipfilled: true,
      soundskeyboard: false,
      clueshidecompleted: true,
      prefillletters: false,
      prefillpercent: 12,
      theme: 'system',
      themeOptions: ['system', 'light', 'dark'],
      print: {
        showSolution: false,
        clueTextSize: 0,
        gridTextSize: 0,
        gridOpacity: 100,
      },
    };

    // reset app.puzzle.notes
    for (var id = 0, row = 0; row < app.puzzle.height; row++) {
      for (var col = 0; col < app.puzzle.width; col++, id++) {
        app.puzzle.notes[id] = app.puzzle.notes[id] || [];
        for (var n = 0; n < app.puzzle.width; n++) {
          app.puzzle.notes[id][n] = false;
        }
      }
    }

    const userData = {
      answers: [].concat.apply([], app.puzzle.clues),
      notes: app.puzzle.notes,
      settings: Object.assign({}, defaultPuzzleSettings, defaultPuzzleTypeSettings),
      help: {},
      cellsRevealed: 0,
      checksUsed: 0,
      hintsShown: 0,
      helperEliminated: {},
      prefilled: 0,
      prefillTotal: 0,
      prefilledCells: [],
      revealedCells: [],
      difficultyRated: false,
    };

    app.vue.data.active = app.vue.data.active ?? app.helpers.getDefaultActiveState();

    return userData;
  };

  app.helpers.getColRowFromCellId = function (cellId) {
    var width = app.puzzle.width;

    return {
      row: Math.floor(cellId / width),
      col: cellId % width,
    };
  };

  app.helpers.getDefaultActiveState = function () {
    for (var i = 0; i < app.puzzle.width; i++) {
      for (var j = 0; j < app.puzzle.width; j++) {
        if (app.puzzle.grid[i][j].given === 0) {
          return {
            cell: app.puzzle.grid[i][j].id,
            row: app.puzzle.grid[i][j].row,
            col: app.puzzle.grid[i][j].col,
          };
        }
      }
    }
  };

  app.helpers.expandDataUserAnswers = function (data) {
    return data && typeof data === 'string'
        ? data.split('').map(x => Number.parseInt(x, 10))
        : data;
  }

  app.helpers.getUserState = function () {
    const userState = {...app.vue.data.user};
    userState.answers = app.helpers.reduceDataUserAnswers(userState.answers);
    userState.notes = app.helpers.reduceDataUserNotes(userState.notes);
    return JSON.parse(JSON.stringify(userState));
  }

  /**
   * Load answer state from storage
   * If not found then load default answer state and save
   */
  app.helpers.loadUserState = function () {
    if (app.config.puzzleApp) {
      return Promise.resolve(null);
    }

    return app.storagePuzzle.get('user').then(data => {
      const defaultUserState = app.helpers.getDefaultUserState();

      if (data !== null) {
        app.vue.data.user = {...defaultUserState, ...data};
        app.vue.data.user.answers = app.helpers.expandDataUserAnswers(data.answers);
      } else {
        app.vue.data.user = defaultUserState;
      }

      app.storagePuzzle.get('notes').then(data => {
        if (data !== null) {
          app.vue.data.user.notes = app.helpers.expandDataUserNotes(data);
        }

        app.storagePuzzle.get('help').then(data => {
          if (data !== null) {
            app.vue.data.user.help = data;
          }
        });
      });
    });
  };

  /**
   * get the id of a cell at a specified col & row
   *
   * @param {int} col - column number
   * @param {int} row - row number
   * @returns {int} cellId
   */
  app.helpers.getCellIdFromColRow = function (col, row) {
    return row * app.puzzle.width + col + 1;
  };

  app.helpers.isCellGiven = function (cellId) {
    return app.puzzle.clues[cellId] !== 0;
  };

  app.helpers.prevCell = function (cellId) {
    cellId = cellId || app.vue.data.active.cell;
    var newId = cellId - 1;

    if (newId < 0) {
      newId = app.puzzle.solution.length - 1;
    }

    if (!app.helpers.isCellGiven(newId)) {
      app.vue.methods.setActiveItem('cell', newId);
    } else {
      this.prevCell(newId);
    }

    var { row, col } = app.helpers.getColRowFromCellId(newId);

    app.vue.methods.setActiveItem('row', row);
    app.vue.methods.setActiveItem('col', col);
  };

  app.helpers.nextCell = function (cellId) {
    cellId = cellId || app.vue.data.active.cell;
    /*
     * causes a recurrsive error when cellId = solution.length
     * var newId = (cellId || app.vue.data.active.cell) + 1;
     */
    var newId = cellId + 1;

    if (newId > [].concat.apply([], app.puzzle.solution).length - 1) newId = 0;

    if (!app.helpers.isCellGiven(newId)) {
      app.vue.methods.setActiveItem('cell', newId);
    } else {
      this.nextCell(newId);
    }

    var { row, col } = app.helpers.getColRowFromCellId(newId);

    app.vue.methods.setActiveItem('row', row);
    app.vue.methods.setActiveItem('col', col);
  };

  app.helpers.prevRow = function (cellId) {
    cellId = cellId || app.vue.data.active.cell;
    var newId = (cellId || app.vue.data.active.cell) - app.puzzle.width;

    if (newId < 0) {
      newId = app.puzzle.height * app.puzzle.width + (newId % app.puzzle.width);
    }

    if (!app.helpers.isCellGiven(newId)) {
      app.vue.methods.setActiveItem('cell', newId);
    } else {
      this.prevRow(newId);
    }

    var { row, col } = app.helpers.getColRowFromCellId(newId);

    app.vue.methods.setActiveItem('row', row);
    app.vue.methods.setActiveItem('col', col);
  };

  app.helpers.nextRow = function (cellId) {
    cellId = cellId || app.vue.data.active.cell;
    var newId = (cellId || app.vue.data.active.cell) + app.puzzle.width;

    if (newId >= [].concat.apply([], app.puzzle.solution).length) {
      newId = newId % app.puzzle.width;
    }

    if (!app.helpers.isCellGiven(newId)) {
      app.vue.methods.setActiveItem('cell', newId);
    } else {
      this.nextRow(newId);
    }

    var { row, col } = app.helpers.getColRowFromCellId(newId);

    app.vue.methods.setActiveItem('row', row);
    app.vue.methods.setActiveItem('col', col);
  };

  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
    }

    app.status.started = null;
    app.status.completed = null;
    app.status.admired = false;
    app.status.progress = 0;
    app.vue.data.admired = false;

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.vue.methods.revealGrid = function () {
    app.helpUsed('reveal', 'grid');
    app.helpers.recordCellsRevealed(app.vue.model.emptyUserAnswer);
    app.vue.data.reveal.grid = true;
    if (!app.vue.data.show.main) app.vue.data.show.main = [];
    if (app.vue.data.show.main.includes('solution-mode'))
      app.vue.methods.removeFromMainClass('solution-mode');
    else app.vue.data.show.main.push('solution-mode');

    this.hideModal();

    var self = this;
    setTimeout(function () {
      self.$root.resetActions('reveal.grid');
    }, 0);
  };

  app.helpers.revealCell = function (id, skipHistory) {
    const user = app.vue.data.user;
    if (!user.revealedCells) user.revealedCells = [];
    if (!user.revealedCells.includes(id)) user.revealedCells = user.revealedCells.concat(id);
    app.helpUsed('reveal', 'cell');
    app.helpers.recordCellsRevealed(1);
    var { row, col } = app.helpers.getColRowFromCellId(id);
    app.helpers.setUserAnswer(id, app.puzzle.solution[row][col], false);
    if (!skipHistory) app.helpers.historySave();
  };

  app.helpers.saveUserNotes = function () {
    const reduced = app.helpers.reduceDataUserNotes(app.vue.data.user.notes);
    app.storagePuzzle.set('notes', reduced);
  };

  app.helpers.deleteNotes = function (cellId) {
    app.vue.data.user.notes[cellId] = Array(app.puzzle.width).fill(false);
    app.helpers.saveUserNotes();
  };

  /**
   * Get DOM element value
   */
  app.helpers.getDOMValue = function (selector, value) {
    const node = document.querySelector(selector);

    if (!node) return null;

    return getComputedStyle(node)[value];
  };

  app.helpers.setNotes = function (cellId, number) {
    number = parseInt(number, 10);
    app.vue.data.user.notes[cellId] =
      app.vue.data.user.notes[cellId] || Array(app.puzzle.width).fill(false);
    app.vue.data.user.notes[cellId][number - 1] = !app.vue.data.user.notes[cellId][number - 1];
    app.helpers.saveUserState();
    app.helpers.saveUserNotes();
  };

  app.helpers.historyInit = function () {
    var options = {
      props: ['active', 'user'],
    };

    app.history = app.history || new DMHistoryVue(app.vue.model, options);
  };

  app.helpers.historyReset = function () {
		app.history?.reset();
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

  app.helpers.prefillNumbers = function () {
    const settings = app.vue.data.userPuzzleSettings;
    if (!settings || !settings.prefillletters || !app.puzzle) return;

    const answers = app.vue.data.user.answers;
    const width = app.puzzle.width;
    const open = [];
    for (let id = 0; id < width * app.puzzle.height; id++) {
      if (app.helpers.isCellGiven(id)) continue;
      if (answers[id]) return;
      open.push(id);
    }

    const pct = parseInt(settings.prefillpercent, 10) || 0;
    const count = Math.min(Math.round((open.length * pct) / 100), open.length);
    if (!count) return;

    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [open[i], open[j]] = [open[j], open[i]];
    }

    const fill = open.slice(0, count);
    fill.forEach(id => {
      answers[id] = Number(app.puzzle.solution[Math.floor(id / width)][id % width]);
    });

    app.vue.data.user.prefilledCells = fill;
    app.vue.data.user.prefilled = count;
    app.vue.data.user.prefillTotal = open.length;
    app.vue.data.user.cellsRevealed = (app.vue.data.user.cellsRevealed || 0) + count;
    app.helpers.updateProgress();
    app.helpers.saveUserState();
  };

  app.helpers.puzzleStart = function (vm) {
    app.helpers.prefillNumbers();
    app.helpers.historyInit();
    app.puzzleShown = true;

    app.vue.data.admired = false;

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

  app.helpers.puzzleCompletedUnsuccessfully = function () {
    app.helpers.dispatchEvent('puzzleincomplete', app.status)
    app.vue.data.blind.gridIncorrect = true;
    // Set directly — checkGrid() would log a check-hint.
    app.vue.data.check.grid = true;
    app.helpers.recordAutoCheck(app.vue.model.checkErrors.length);

    setTimeout(() => {
      app.vue.data.blind.gridIncorrect = false;
    }, 2000);
  };

  /**
   * Callback called from timer class
   */
  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

  app.helpers.clearPeerCandidates = function (cellId, value) {
    value = parseInt(value, 10);
    if (!value) return;

    const width = app.puzzle.width;
    const height = app.puzzle.height;
    const boxWidth = app.puzzle.boxWidth;
    const boxHeight = app.puzzle.boxHeight;
    const { row, col } = app.helpers.getColRowFromCellId(cellId);
    const notes = app.vue.data.user.notes;
    let changed = false;

    const clear = id => {
      const arr = notes[id];
      if (arr && arr[value - 1]) {
        arr[value - 1] = false;
        changed = true;
      }
    };

    for (let c = 0; c < width; c++) clear(row * width + c);
    for (let r = 0; r < height; r++) clear(r * width + col);

    const boxRow = Math.floor(row / boxHeight) * boxHeight;
    const boxCol = Math.floor(col / boxWidth) * boxWidth;
    for (let r = boxRow; r < boxRow + boxHeight; r++) {
      for (let c = boxCol; c < boxCol + boxWidth; c++) {
        clear(r * width + c);
      }
    }

    if (changed) app.helpers.saveUserNotes();
  };

  app.helpers.setUserAnswer = function (cellId, answer, moveToNextCell) {
    app.vue.data.user.answers[cellId] = Number(answer);

    if (Number(answer)) {
      app.vue.data.lastEnteredCell = cellId;
      app.vue.data.autoCheckPending = cellId;
      clearTimeout(app.helpers._autoCheckTimer);
      app.helpers._autoCheckTimer = setTimeout(function () {
        app.vue.data.autoCheckPending = null;
      }, AUTO_CHECK_DELAY_MS);
      if (app.vue.data.userPuzzleSettings && app.vue.data.userPuzzleSettings.autoRemoveCandidates) {
        app.helpers.clearPeerCandidates(cellId, answer);
      }
    }

    app.helpers.checkStartedStatus();
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
    app.helpers.celebrateCompletedUnits(cellId);
  };

  app.helpers.getUnitsForCell = function (cellId) {
    const width = app.puzzle.width;
    const height = app.puzzle.height;
    const boxWidth = app.puzzle.boxWidth;
    const boxHeight = app.puzzle.boxHeight;

    const pr = Math.floor(cellId / width);
    const pc = cellId % width;
    const boxRow = Math.floor(pr / boxHeight) * boxHeight;
    const boxCol = Math.floor(pc / boxWidth) * boxWidth;

    const rowCells = [];
    const colCells = [];
    const boxCells = [];
    for (let c = 0; c < width; c++) rowCells.push(pr * width + c);
    for (let r = 0; r < height; r++) colCells.push(r * width + pc);
    for (let r = boxRow; r < boxRow + boxHeight; r++) {
      for (let c = boxCol; c < boxCol + boxWidth; c++) {
        boxCells.push(r * width + c);
      }
    }

    return [
      { key: 'r' + pr, cells: rowCells },
      { key: 'c' + pc, cells: colCells },
      { key: 'b' + boxRow + '_' + boxCol, cells: boxCells },
    ];
  };

  app.helpers.isCellCorrect = function (id) {
    const value = app.vue.data.user.answers[id];
    if (!value) return false;
    const width = app.puzzle.width;
    return Number(value) === Number(app.puzzle.solution[Math.floor(id / width)][id % width]);
  };

  // Points to Check once a row, column or box is full but wrong. Not on a full
  // grid, which has its own feedback.
  app.helpers.guideCheckTip = function () {
    if (app.helpers.guideTipSeen('check') || app.vue.data.modes.pencil) return;
    if (app.vue.data.userPuzzleSettings.answersautocheck) return;
    if (!app.puzzle || !app.puzzle.solution || app.vue.model.isCompleted) return;

    const cellId = app.vue.data.lastEnteredCell;
    if (cellId == null) return;

    const answers = app.vue.data.user.answers;
    const hasMistake = app.helpers.getUnitsForCell(cellId).some(function (unit) {
      return unit.cells.every(function (id) { return !!answers[id]; }) &&
        !unit.cells.every(app.helpers.isCellCorrect);
    });

    if (hasMistake) app.helpers.guideTip('check');
  };

  app.helpers.celebrateCompletedUnits = function (cellId) {
    if (!app.puzzle || !app.puzzle.solution) return;
    if (app.vue.model.isCompletedWithoutErrors) return;

    const width = app.puzzle.width;
    const pr = Math.floor(cellId / width);
    const pc = cellId % width;
    const isCorrect = app.helpers.isCellCorrect;
    const units = app.helpers.getUnitsForCell(cellId);

    const state = app.helpers._completeUnits || (app.helpers._completeUnits = {});
    const celebrating = {};
    let fire = false;

    for (const unit of units) {
      const complete = unit.cells.every(isCorrect);
      if (complete && !state[unit.key]) {
        fire = true;
        for (const id of unit.cells) {
          const step = Math.abs(Math.floor(id / width) - pr) + Math.abs((id % width) - pc);
          if (celebrating[id] === undefined || step < celebrating[id]) {
            celebrating[id] = step;
          }
        }
      }
      state[unit.key] = complete;
    }

    const digit = Number(app.vue.data.user.answers[cellId]);
    if (digit) {
      const key = 'digit-' + digit;
      const cells = [];
      app.puzzle.solution.forEach((row, r) =>
        row.forEach((value, c) => {
          if (Number(value) === digit) cells.push(r * width + c);
        })
      );
      const complete = cells.length > 0 && cells.every(isCorrect);
      if (complete && !state[key]) {
        fire = true;
        const distance = id => Math.abs(Math.floor(id / width) - pr) + Math.abs((id % width) - pc);
        cells
          .sort((a, b) => distance(a) - distance(b))
          .forEach((id, step) => {
            if (celebrating[id] === undefined || step < celebrating[id]) celebrating[id] = step;
          });
      }
      state[key] = complete;
    }

    if (!fire) return;

    app.vue.data.unitCelebrate = celebrating;
    clearTimeout(app.helpers._unitCelebrateTimer);
    app.helpers._unitCelebrateTimer = setTimeout(function () {
      app.vue.data.unitCelebrate = {};
    }, 900);
  };

  app.helpers.updateProgress = function () {
    let puzzleString = JSON.stringify(app.vue.data.json.puzzle)
      .split('[')
      .join('')
      .split(']')
      .join('')
      .split(',')
      .join('');

    let puzzleGivensCount = puzzleString.split('0').join('').length;
    let blankCellsCount = puzzleString.length - puzzleGivensCount;

    let filledCellsCount = app.vue.model.userString.split('0').join('').length;
    let userCellsCount = filledCellsCount - puzzleGivensCount;

    let percentComplete = Math.floor((userCellsCount / blankCellsCount) * 100);

    app.status.progress = percentComplete;
  };

  app.helpers.getUserAnswer = function (cellId) {
    return app.vue.data.user.answers[cellId];
  };

  app.helpers.saveModalsState = function () {
    app.storagePuzzle.set('modals.visible', app.vue.data.modals.visible);
  };

  app.helpers.loadModalsVisible = function () {
    app.storagePuzzle.get('modals.visible').then(function (visible) {
      if (visible !== null) {
        app.vue.data.modals.visible = visible;
      }
    });
  };

  // Returns the possible candidate numbers for a given empty cell
  app.helpers.getCandidatesForCell = function (cellId) {

      const answers = app.vue.data.user.answers;
      const width = app.puzzle.width;
      const height = app.puzzle.height;
      const boxWidth = app.puzzle.boxWidth;
      const boxHeight = app.puzzle.boxHeight;
      const { row, col } = app.helpers.getColRowFromCellId(cellId);
      const used = new Set();

      // Same row
      for (let c = 0; c < width; c++) {
          used.add(answers[row * width + c]);
      }
      // Same column
      for (let r = 0; r < height; r++) {
          used.add(answers[r * width + col]);
      }
      // Same box
      const boxRow = Math.floor(row / boxHeight) * boxHeight;
      const boxCol = Math.floor(col / boxWidth) * boxWidth;
      for (let r = boxRow; r < boxRow + boxHeight; r++) {
          for (let c = boxCol; c < boxCol + boxWidth; c++) {
              used.add(answers[r * width + c]);
          }
      }
      const allowed = app.puzzle.allowedValues.split('').map(n => parseInt(n, 10));
      return allowed.filter(n => !used.has(n));
  };

  app.helpers.mountUiHelpers = function () {
    app.helpers.updateBreakpoints();
    app.helpers.screenOrientation();

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
    });

    app.helpers.hideSpinner();
  };
})();
