var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

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
    return data;
  };

  app.helpers.getGridDimensions = function () {
    var obj = {
      rows: app.vue.model.puzzle.grid.length,
      cols: app.vue.model.puzzle.grid[0].length,
    };
    return obj;
  };

  app.helpers.loadActiveState = function () {
    return app.storagePuzzle.get('active').then((data) => {
      if (data !== null) {
        app.vue.data.active = data;
      } else {
        app.vue.data.active = app.helpers.getDefaultActiveState();
      }
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

  app.helpers.mountUiHelpers = function () {
    app.helpers.updateBreakpoints();

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
    });

    app.helpers.hideSpinner();
  };

  //  Wordsearch fires an extra puzzlecomplete when completion is first recorded
  //  (the base only dispatches it in checkAdmiredStatus). Decorate so the base
  //  helper stays clean.
  app.helpers.checkCompletedStatus = (function (existing) {
    return function () {
      const result = existing.apply(this, arguments);
      if (result) {
        app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      }
      return result;
    };
  })(app.helpers.checkCompletedStatus);

  app.helpers.addEventListeners = function () {
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
    screen.orientation.addEventListener('change', () => {
      app.handlers.onOrientationChange();
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
    return row * app.puzzle.grid.length + col + 1;
  };

  /**
   * get the ids of all cells in between specified cells
   *
   * @param {int} start - id of start cell
   * @param {int} end - id of end cell
   * @returns {array} list of cell ids
   */
  app.helpers.getCellIdsBetweenGivenIds = function (start, end, shouldIncludeGivens) {
    const cells = [];
    const cols = app.vue.data.source.settings.colCount;
    const startRc = app.helpers.getColRowFromCellId(start);
    const endRc = app.helpers.getColRowFromCellId(end);

    if (shouldIncludeGivens) cells.push(start);

    const dr = startRc.x === endRc.x ? 0 : startRc.x > endRc.x ? -1 : 1;
    const dc = startRc.y === endRc.y ? 0 : startRc.y > endRc.y ? -1 : 1;

    let r = startRc.row;
    let c = startRc.col;

    for (var i = 0; i < cols; i++) {
      r += dr;
      c += dc;

      if (r === endRc.row && c === endRc.col) {
        break;
      }

      cells.push(app.helpers.getCellIdFromColRow(c, r));
    }

    if (shouldIncludeGivens) cells.push(end);

    return cells;
  };

  /**
   * Get the location (row & col) of the specified (or active if not specifed) cell
   * @return {object}
   */
  app.helpers.getCellLocation = function (cell = app.vue.data.active.cell) {
    return {
      row: Math.ceil(cell / app.vue.model.puzzle.grid.length),
      col:
        cell -
        (Math.ceil(cell / app.vue.model.puzzle.grid.length) - 1) * app.vue.model.puzzle.grid.length,
    };
  };

  /**
   * get the row and col of a cell with a specified id
   *
   * @param {int} id - cell id
   * @returns {object}
   */
  app.helpers.getColRowFromCellId = function (id) {
    const colRow = {};

    colRow.x = Math.floor(id / app.vue.data.source.settings.colCount);
    colRow.y = id - colRow.x * app.vue.data.source.settings.colCount;

    return colRow;
  };

  app.helpers.getDefaultUserState = function () {
    const userData = {
      answers: {},
      cellsRevealed: 0,
      checksUsed: 0,
    };

    const words = app.vue.data.source.cluedata.split(',');

    for (let i = 0; i < words.length; i++) {
      userData.answers[i] = {
        isFound: false,
        word: words[i],
        block: null,
      };
    }

    const defaultPuzzleTypeSettings = {};

    const defaultPuzzleSettings = {
      textSize: 0,
      timer: true,
      hidefoundwords: false,
    };

    userData.settings = Object.assign(
      {},
      defaultPuzzleSettings,
      defaultPuzzleTypeSettings
    );

    return userData;
  };

  /**
   * Get user state for storing or sending
   */
  app.helpers.getUserState = function () {
    let userState = {...app.vue.data.user};
    userState.answers = app.helpers.reduceDataUserAnswers(userState.answers);
    return JSON.parse(JSON.stringify(userState));
  };

  app.helpers.getSelectionDirection = function (x1, y1, x2, y2) {
    switch (true) {
      case x2 === x1 && y2 < y1:
        return 'N';

      case x2 > x1 && y2 < y1:
        return 'NE';

      case x2 > x1 && y2 === y1:
        return 'E';

      case x2 > x1 && y2 > y1:
        return 'SE';

      case x2 === x1 && y2 > y1:
        return 'S';

      case x2 < x1 && y2 > y1:
        return 'SW';

      case x2 < x1 && y2 === y1:
        return 'W';

      case x2 < x1 && y2 < y1:
        return 'NW';

      default:
        return false;
    }
  };

  app.helpers.getWordFromStartEndCells = function (start, end) {
    const colCount = app.vue.data.source.settings.colCount;

    const wordObj = {
      word: '',
      start: app.helpers.getColRowFromCellId(start),
      end: app.helpers.getColRowFromCellId(end),
    };

    let idx;
    let direction;

    // right
    if (wordObj.start.x == wordObj.end.x && wordObj.end.y > wordObj.start.y) {
      direction = 'R';

      for (idx = 0; idx <= wordObj.end.y - wordObj.start.y; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start + idx];
      }
    }

    // down right
    if (wordObj.end.y > wordObj.start.y && wordObj.end.x > wordObj.start.x) {
      direction = 'DR';

      for (idx = 0; idx <= wordObj.end.x - wordObj.start.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start + idx * colCount + idx];
      }
    }

    // down
    if (wordObj.start.y == wordObj.end.y && wordObj.end.x > wordObj.start.x) {
      direction = 'D';
      for (idx = 0; idx <= wordObj.end.x - wordObj.start.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start + idx * colCount];
      }
    }

    //  down left
    if (wordObj.end.y < wordObj.start.y && wordObj.end.x > wordObj.start.x) {
      direction = 'DL';

      for (idx = 0; idx <= wordObj.end.x - wordObj.start.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start + idx * colCount - idx];
      }
    }

    // left
    if (wordObj.start.x == wordObj.end.x && wordObj.end.y < wordObj.start.y) {
      direction = 'L';

      for (idx = 0; idx <= wordObj.start.y - wordObj.end.y; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start - idx];
      }
    }

    //  up left
    if (wordObj.end.y < wordObj.start.y && wordObj.end.x < wordObj.start.x) {
      direction = 'UL';

      for (idx = 0; idx <= wordObj.start.x - wordObj.end.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start - idx * colCount - idx];
      }
    }

    //  up
    if (wordObj.start.y == wordObj.end.y && wordObj.end.x < wordObj.start.x) {
      direction = 'U';

      for (idx = 0; idx <= wordObj.start.x - wordObj.end.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start - idx * colCount];
      }
    }

    //  up right
    if (wordObj.end.y > wordObj.start.y && wordObj.end.x < wordObj.start.x) {
      direction = 'UR';

      for (idx = 0; idx <= wordObj.start.x - wordObj.end.x; ++idx) {
        wordObj.word += app.vue.data.source.celldata[start - idx * colCount + idx];
      }
    }

    return { ...wordObj, direction };
  };

  app.helpers.puzzleStart = function (vm) {
    if (!app.status.completed && app.vue.data.config.hasTimer) {
      app.timer.start(app.vue.data.time);
      app.helpers.saveUserTime();
    } else if (app.vue.model.isCompleted) {
      app.helpers.checkAdmiredStatus(true)
    }

    app.helpers.hintWordsScroll();
  };

  app.helpers.hintWordsScroll = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var tween = function (el, from, to, duration, done) {
      var start = null;
      var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
      var step = function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        el.scrollTop = from + (to - from) * ease(t);
        if (t < 1) requestAnimationFrame(step);
        else if (done) done();
      };
      requestAnimationFrame(step);
    };

    setTimeout(function () {
      var el = document.getElementById('words');
      if (!el) return;

      var overflow = el.scrollHeight - el.clientHeight;
      if (overflow < 8 || el.scrollTop > 0) return;

      var peek = Math.min(32, overflow);
      tween(el, 0, peek, 500, function () {
        setTimeout(function () {
          tween(el, peek, 0, 500);
        }, 300);
      });
    }, 900);
  };

  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

  app.helpers.updateProgress = function () {
    const percent = (Object.values(app.vue.data.user.answers).filter(a => a.isFound).length / Object.keys(app.vue.data.user.answers).length) * 100;
    app.status.progress = Math.floor(percent);
  };

  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();

    app.status.started = null;
    app.status.completed = null;
    app.status.admired = false;
    app.status.progress = 0;

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.setUserAnswer = function (block) {
    const { start, end } = block;
    const { word } = app.helpers.getWordFromStartEndCells(start.cell, end.cell);

    if (word) {
      const idx = app.vue.data.source.cluedata.split(',').findIndex(c => {
        const d = c.replace(/[^A-Za-zÀ-ÖÙ-öù-ÿĀ-žḀ-ỿ]/g, '').toUpperCase();
        return d === word || d === word.split('').reverse().join('');
      });

      if (idx === -1) return;

      app.vue.data.user.answers[idx].isFound = true;
      app.vue.data.user.answers[idx].block = block;
      /* Multiplayer overrides this helper and stamps its own timestamp. */
      app.vue.data.user.answers[idx].found_at = Date.now();
    }

    app.helpers.checkStartedStatus();
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.resizeGrid = function () {
    const query = matchMedia('(min-width: 1024px)');
    const gameAndWords = document.getElementById('gameAndWords');
    const wordsAndProgress = document.getElementById('wordsAndProgress');
    const gameplay = document.getElementById('gameplay');
    const gameplayContainer = document.getElementById('gameplayContainer');

    gameplayContainer.removeAttribute('style');
    gameplay.removeAttribute('style');
    wordsAndProgress.removeAttribute('style');

    const rootStyle = getComputedStyle(document.documentElement);
    const IDEAL_GRID_SIZE = parseFloat(rootStyle.getPropertyValue('--ideal-grid-size'));
    const MIN_WORDS_HEIGHT = parseFloat(rootStyle.getPropertyValue('--words-min-size'));
    const GRID_RESIZE_OFFSET = parseFloat(
      rootStyle.getPropertyValue('--wordsearch-grid-resize-offset')
    ) || 0;
    const APP_MARGIN = parseFloat(
      getComputedStyle(document.querySelector('.content-wrapper')).paddingInline
    );

    let adjustedSize;
    let needsResizing;

    if (!query.matches) {
      needsResizing = wordsAndProgress.clientHeight < MIN_WORDS_HEIGHT;
    } else {
      needsResizing = gameplay.clientHeight > gameAndWords.clientHeight;
    }

    if (needsResizing) {
      if (!query.matches) {
        wordsAndProgress.style.blockSize = MIN_WORDS_HEIGHT + 'px';

        const ava =
          gameAndWords.clientHeight -
          wordsAndProgress.clientHeight -
          parseFloat(getComputedStyle(gameAndWords).gap) * 2 -
          (gameplayContainer?.previousElementSibling?.clientHeight ?? 0) +
          GRID_RESIZE_OFFSET;
        const curr = gameplay.clientHeight;

        adjustedSize = gameplay.clientWidth * (ava / curr);
      } else {
        adjustedSize =
          gameplay.clientWidth * (gameAndWords.clientHeight / gameplay.clientHeight) -
          APP_MARGIN * 1.5;
      }

      if (adjustedSize < gameplayContainer.clientWidth) {
        gameplayContainer.style.inlineSize = Math.floor(adjustedSize) + 'px';
        gameplayContainer.style.maxInlineSize = IDEAL_GRID_SIZE + 'px';
      }
    }
  };

  app.helpers.toast = Object.assign(
    (message, t = {}) => app.helpers.toast.add(message, { ...t, type: t.type ?? 'default' }),
    {
      add(message, t = {}) {
        const { duration = 7000, ...rest } = t;
        const id = crypto.getRandomValues(new Uint32Array(1))[0];

        app.vue.data.toasts = [...(app.vue.data.toasts || []), { id, message, ...rest }];

        if (duration) {
          setTimeout(() => app.helpers.toast.remove(id), duration);
        }

        return id;
      },
      remove(id) {
        app.vue.data.toasts = id ? app.vue.data.toasts.filter(t => t.id !== id) : [];
      },
      success(message, t) {
        return app.helpers.toast.add(message, { ...t, type: 'success' });
      },
      error(message, t) {
        return app.helpers.toast.add(message, { ...t, type: 'error' });
      },
    },
  );
})();
