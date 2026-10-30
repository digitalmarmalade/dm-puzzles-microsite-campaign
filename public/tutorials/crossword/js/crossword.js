var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

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

  app.helpers.addEventListeners = function () {
    document.addEventListener(
      'cellclick',
      (e) => {
        app.handlers.cellClick(e.detail.item, e, e.detail.wasCurrent);
      },
      false
    );

    document.addEventListener(
      'clueclick',
      (e) => {
        app.handlers.clueClick(e.detail.item, e);
      },
      false
    );

    document.addEventListener(
      'letterentered',
      (e) => {
        app.handlers.letterEntered(e.detail.item, e);
      },
      false
    );

    document.addEventListener(
      'letterdeleted',
      (e) => {
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

    screen.orientation.addEventListener('change', () => {
      app.handlers.onOrientationChange();
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

  app.helpers.useModelOrThis = function (prop) {
    try {
      return app.vue.model[prop] || this[prop];
    } catch {}
  };

  /**
   * Handle a click event triggered from within the cell component.
   * @param {VueComponent} component 'component-cell'
   * @param {CustomEvent} event
   */
  app.handlers.cellClick = function (component, event, wasCurrent) {
    //  if blank cell then ignore
    if (component.item.isBlank) {
      return false;
    }

    if (component.$root.modes.grid) {
      
      var currentDirection = component.$root.active.direction;
      var hasAcrossClue = component.item.across !== undefined;
      var hasDownClue = component.item.down !== undefined;
      
      if (wasCurrent) {
      
        if (currentDirection === 'across') {
          if (hasDownClue) {
            component.$root.active.direction = 'down';
          }
        } else {
          if (hasAcrossClue) {
            component.$root.active.direction = 'across';
          }
        }
      } else {
        
        if (hasAcrossClue && hasDownClue) {
          
          var currentWord =
            currentDirection === 'across' ? component.item.across : component.item.down;
          var otherDirection = currentDirection === 'across' ? 'down' : 'across';
          var otherWord = component.item[otherDirection];

          if (
            component.$root.isWordCompleted(currentWord) &&
            !component.$root.isWordCompleted(otherWord)
          ) {
            component.$root.active.direction = otherDirection;
          } else {
            component.$root.active.direction = currentDirection;
          }
        } else if (hasAcrossClue) {
          component.$root.active.direction = 'across';
        } else {
          component.$root.active.direction = 'down';
        }
      }
    }

    //  set active cell
    component.$root.active.cell = component.item.id;
    //  save
    app.helpers.saveActiveState();
    app.helpers.tsSet('cellClick');
  };

  /**
   * Handle a click event triggered from within the clue component.
   * @param {VueComponent} component 'component-clue'
   * @param {CustomEvent} event
   */
  app.handlers.clueClick = function (component, event) {
    //  set first cell of word
    component.$root.active.cell = component.$root.puzzle.words[component.item.word].cells[0].id;
    //  set direction
    component.$root.active.direction = component.item.direction;
    app.helpers.saveActiveState();
    app.helpers.tsSet('clueClick');
  };

  /**
   * Handle a click event triggered from within the keyboard-key component.
   * @param {VueComponent} component 'component-keyboard-key'
   * @param {CustomEvent} event
   */
  app.handlers.letterDeleted = function (component, event) {
    if (!app.vue.model.isCompletedReadOnly) {
      app.helpers.updateProgress();
      app.helpers.checkStartedStatus();
      app.helpers.saveUserPlayStatus();

      if (!app.helpers.isFirstCellOfWord()) {
        if (app.vue.data.active.direction === 'down') {
          app.helpers.setCellActiveUp(false);
        } else {
          app.helpers.setCellActiveLeft(false);
        }
      }
    }
  };

  /**
   * Handle a click event triggered from within the keyboard-key component.
   * @param {VueComponent} component 'component-keyboard-key'
   * @param {CustomEvent} event
   */
  app.handlers.letterEntered = function (component) {
    if (!app.vue.model.isCompletedReadOnly) {
      if (app.vue.model.isCompletedWithErrors === true) {
        app.vue.watch.isCompletedWithErrors.handler.call(app.vue.model, true);
      }
      var activeCell = component.$root.active.cell;
      var cellName = 'cell_' + (activeCell - 1);

      component.$root.user.answers[cellName] = component.item.display;

      if ((component.item.display || '').trim()) {
        app.vue.data.lastEnteredCell = activeCell;
      }

      var note = component.$root.modes.pencil ? 1 : 0;
      component.$root.user.notes[cellName] = note;

      app.helpers.updateProgress();
      app.helpers.checkStartedStatus();
      app.helpers.saveUserPlayStatus();
      app.helpers.saveUserState();
      app.helpers.tsSet('letterEntered');
      app.helpers.setCellActiveNext();
    }
  };

  app.helpers.accentLetters = {
    pl: { A: ['Ą'], C: ['Ć'], E: ['Ę'], L: ['Ł'], N: ['Ń'], O: ['Ó'], S: ['Ś'], Z: ['Ż', 'Ź'] },
  };

  app.helpers.accentMap = function () {
    var source = app.vue.data.source || {};
    var settings = (source.copy && source.copy.settings) || source.settings || {};
    return app.helpers.accentLetters[String(settings.language || '').toLowerCase()] || {};
  };

  app.helpers.accentVariants = function (letter) {
    return app.helpers.accentMap()[String(letter || '').toUpperCase()] || [];
  };

  app.helpers.isAccentLetter = function (letter) {
    var map = app.helpers.accentMap();
    var upper = String(letter || '').toUpperCase();
    return Object.keys(map).some(function (base) { return map[base].indexOf(upper) > -1; });
  };

  app.helpers.enterLetter = function (letter) {
    var model = app.vue.model;
    if (!model || model.isCompletedWithoutErrors || model.isCompletedReadOnly) return;
    var upper = String(letter).toUpperCase();
    app.vue.methods.resetActions();
    document.dispatchEvent(new CustomEvent('letterentered', model.getEventData({
      item: { code: upper.charCodeAt(0), display: upper, tooltip: upper },
      $root: model,
    }, 'keyboard-key')));
  };

  app.handlers.onResize = function () {
    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
      app.helpers.screenOrientation();
      app.helpers.updateBreakpoints();
      app.helpers.checkClueOverflow();
    });
  };

  app.handlers.onOrientationChange = function () {
    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
      app.helpers.screenOrientation();
      app.helpers.updateBreakpoints();
      app.helpers.checkClueOverflow();
    });
  };

  app.helpers.revealCell = function (id) {
    var user = app.vue.data.user;
    if (!user.revealedCells) user.revealedCells = [];
    if (user.revealedCells.indexOf(id) === -1) user.revealedCells = user.revealedCells.concat(id);
    app.helpers.recordCellsRevealed(1);
    app.helpers.setUserAnswer(id, app.vue.model.puzzle.cells[id].letter, false);
  };

  app.helpers.prefillLetters = function () {
    var settings = app.vue.data.userPuzzleSettings;
    var letters = app.config.assistLetters;
    if (!letters && (!settings || !settings.prefillletters)) return;
    if (!app.vue.model || !app.puzzle || !app.puzzle.words) return;

    var seen = {};
    var empty = [];

    Object.keys(app.puzzle.words).forEach(function (wordId) {
      var word = app.puzzle.words[wordId];
      if (!word || !word.cells) return;
      word.cells.forEach(function (c) {
        if (seen[c.id]) return;
        seen[c.id] = true;
        var current = app.vue.data.user.answers['cell_' + (c.id - 1)];
        if (!current || current === ' ') empty.push(c.id);
      });
    });

    var total = Object.keys(seen).length;
    if (!total || empty.length < total) return;

    var fill;
    if (letters) {
      fill = empty.filter(function (id) {
        return letters.indexOf(String(app.vue.model.puzzle.cells[id].letter).toUpperCase()) !== -1;
      });
    } else {
      var pct = parseInt(settings.prefillpercent, 10);
      if (isNaN(pct)) pct = 0;
      for (var i = empty.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = empty[i];
        empty[i] = empty[j];
        empty[j] = swap;
      }
      fill = empty.slice(0, Math.max(0, Math.min(Math.round((total * pct) / 100), empty.length)));
    }

    var count = fill.length;
    if (!count) return;

    fill.forEach(function (id) {
      app.vue.data.user.answers['cell_' + (id - 1)] = app.vue.model.puzzle.cells[id].letter;
    });

    app.vue.data.user.prefilled = count;
    app.vue.data.user.prefillTotal = total;
    app.vue.data.user.prefilledCells = fill;
    app.vue.data.user.cellsRevealed = (app.vue.data.user.cellsRevealed || 0) + count;
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.checkStartedStatus();
  };

  // Points to Check once a word is finished with a mistake in it. Not on a full grid
  // (that has its own feedback), and not with auto-check on (mistakes already show).
  app.helpers.guideCheckTip = function () {
    if (app.helpers.guideTipSeen('check')) return;
    if (app.vue.data.userPuzzleSettings.answersautocheck || app.vue.model.isCompleted) return;

    var cellId = app.vue.data.lastEnteredCell;
    var cell = cellId && app.puzzle.cells[cellId];
    if (!cell) return;

    var answers = app.vue.data.user.answers;
    var hasMistake = function (wordId) {
      var word = app.puzzle.words[wordId];
      if (!word || !app.vue.methods.isWordCompleted(wordId)) return false;
      return word.cells.some(function (c) {
        return answers['cell_' + (c.id - 1)] !== app.puzzle.cells[c.id].letter;
      });
    };

    if (hasMistake(cell.across) || hasMistake(cell.down)) app.helpers.guideTip('check');
  };

  app.helpers.setUserAnswer = function (cellId, answer) {
    app.vue.data.user.answers['cell_' + (cellId - 1)] = answer;
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.checkStartedStatus();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.updateProgress = function () {
    app.status.progress = Math.floor(app.vue.model.totalCellsPercent);
  };

  /**
   * Take supplied cell object and return a more helpful version
   * @param {object} cell
   * @retrun {object} obj
   */
  app.helpers.getCellObject = function (cell) {
    var obj = {
      isBlank: cell.Blank === 'blank',
      letter: cell.Letter,
      id: cell.SquareID,
      delimiters: [],
      delimiterSiblings: [],
    };

    if (cell.Number !== '') {
      obj.number = cell.Number;
    }

    if (cell.WordAcrossID !== '') {
      obj.across = cell.WordAcrossID;
    }

    if (cell.WordDownID !== '') {
      obj.down = cell.WordDownID;
    }

    if (cell.Shaded !== undefined) {
      obj.shaded = true;
    }

    if (cell.bars) {
			obj.bars = cell.bars
		}

    return obj;
  };

  /**
   * Get an array of clues adding some helper info
   * @param {array} clues
   * @param {string} direction
   * @param {integer} cluesetidx
   * @retrun {array} arr
   */
  app.helpers.getCluesArray = function (clues, direction, cluesetidx) {
    var arr = [];

    for (var i = 0; i < clues.length; i++) {
      var obj = clues[i];
      obj.direction = direction.toLowerCase();
      obj.cluesetidx = cluesetidx;
      arr.push(obj);
    }

    return arr;
  };

  /**
   * Get the default active state object
   * @return {object}
   */
  app.helpers.getDefaultActiveState = function () {
    return {
      clueset: 0,
      cell: app.puzzle.words[1].cells[0].id,
      direction: app.puzzle.words[1].cells[0].across ? 'across' : 'down',
    };
  };

  /**
   * Get the default answer state object
   * @return {object}
   */
  app.helpers.getDefaultUserState = function () {
    const grid = app.vue.data.source.grid;
    const gridLength = grid.length * grid[0].length;
    const userData = {
      answers: {},
      notes: {},
      notesInLetters: {},
      cellsRevealed: 0,
      checksUsed: 0,
      prefilled: 0,
      prefillTotal: 0,
      prefilledCells: [],
      revealedCells: [],
      difficultyRated: false,
    };

    for (let i = 0; i < gridLength; i++) {
      userData.answers['cell_' + i] = ' ';
      userData.notes['cell_' + i] = 0;
      userData.notesInLetters['cell_' + i] = 0;
    }

    userData.textSize = 0;
    userData.gridResize = 0;
    userData.help = {};

    var defaultPuzzleTypeSettings = {};
    var defaultPuzzleSettings = {
      textSize: 0,
      gridResize: 0,
      timer: true,
      clueshidecompleted: false,
      cellsskipfilled: true,
      answersautocheck: false,
      showdemarcation: false,
      cluesOverflowing: false,
      prefillletters: false,
      prefillpercent: 12,
    };

    app.vue.data.active = app.vue.data.active ?? app.helpers.getDefaultActiveState();
    userData.settings = Object.assign(
      {},
      defaultPuzzleSettings,
      defaultPuzzleTypeSettings
    );

    return userData;
  };

  /**
   * Get the first cell of specified word using current settings
   * @param {integer} word
   * @param {boolean} skipFilled
   * @return {integer}
   */
  app.helpers.getFirstCellOfWord = function (word, skipFilled) {
    if (app.vue.model.puzzle.words[word] === undefined) {
      return null;
    }

    skipFilled = skipFilled === undefined ? false : skipFilled;
    var firstCell = null;
    var cells = app.vue.model.puzzle.words[word].cells;

    for (var r = 0; r < cells.length; r++) {
      var id = cells[r].id;
      var answer = app.vue.model.user.answers['cell_' + (id - 1)];
      if (skipFilled === false || answer === ' ') {
        return id;
      }
      firstCell = firstCell === null ? id : firstCell;
    }
    return firstCell;
  };

  /**
   * Determine whether a given cell if the first of it's word
   * @param {integer} word
   * @param {integer} cell
   * @return {boolean}
   */
  app.helpers.isFirstCellOfWord = function (word, cell) {
    word = word || app.vue.model.activeWord;
    cell = cell || app.vue.data.active.cell;
    var cells = app.vue.model.puzzle.words[word].cells;

    return cell === cells[0].id;
  };

  /**
   * Determine whether a given cell if the last of it's word
   * @param {integer} word
   * @param {integer} cell
   * @return {boolean}
   */
  app.helpers.isLastCellOfWord = function (word, cell) {
    word = word || app.vue.model.activeWord;
    cell = cell || app.vue.data.active.cell;
    var cells = app.vue.model.puzzle.words[word].cells;

    return cell === cells[cells.length - 1].id;
  };

  app.helpers.playSound = function (file) {
    if (!app.vue.model.user.settings.playsounds) {
      return false;
    }
    var sound = new Audio('mp3/' + file + '.mp3');
    sound.pause();
    sound.currentTime = 0;
    sound.play();
  };

  app.helpers.puzzleCompletedUnsuccessfully = function () {
    app.vue.data.blind.gridIncorrect = true;
    // Set directly — checkGrid() would log a check-hint.
    app.vue.data.check.grid = true;
    app.helpers.recordAutoCheck(app.vue.model.checkErrors.length);

    setTimeout(() => {
      app.vue.data.blind.gridIncorrect = false;
    }, 4000);
  };

  /**
   * Start puzzle
   */
  app.helpers.puzzleStart = function (vm) {
    if (!app.vue.model) return;

    app.helpers.prefillLetters();

    if (!app.vue.model.isCompletedReadOnly) {
      app.timer.start(app.vue.data.time);
      app.helpers.saveUserTime();
    } else if (app.vue.model.isCompletedWithoutErrors) {
      app.helpers.checkAdmiredStatus(true);
    }
  };

  /**
   * Callback called from timer class
   */
  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

  /**
   * Reset answer state to default
   */
  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();
    app.helpers.saveUserState();
    app.status.started = null;
    app.status.completed = null;
    app.status.admired = false;
    app.helpers.updateProgress();
    app.helpers.saveUserPlayStatus();
  };

  /**
   * Scroll current clue into view
   */
  app.helpers.scrollToClue = function () {
    const { direction } = app.vue.data.active;

    setTimeout(() => {
      const clue = document.querySelector('li.current');
      const { top: clueTop, bottom: clueBottom } = clue.getBoundingClientRect();
      const { bottom: clueHeadingBottom } = document
        .querySelector(`.clue-set--${direction} .clue-set__heading`)
        .getBoundingClientRect();
      const { bottom: clueSetBottom } = document
        .querySelector(`.clue-set--${direction}`)
        .getBoundingClientRect();

      const isVisible = clueTop >= clueHeadingBottom && clueBottom <= clueSetBottom;

      if (!isVisible) {
        clue.scrollIntoView(false);
      }
    }, 0);
  };

  /**
   * Scroll current grid row into view if grid is overflowing
   */
  app.helpers.scrollToRow = function () {
    const { row } = app.helpers.getCellLocation();
    const rowNode = document.getElementById(`row-${row}`);
    const gameplayNode = document.getElementById('gameplayContainer');

    if (!rowNode || !gameplayNode) return;

    const { top, bottom } = rowNode.getBoundingClientRect();
    const { scrollHeight, scrollTop, clientHeight } = gameplayNode;

    if (top > clientHeight - scrollHeight) {
      gameplayNode.scrollTop = scrollTop + top - clientHeight;
    } else if (bottom > clientHeight) {
      gameplayNode.scrollTop = scrollTop + bottom - clientHeight;
    }
  };

  /**
   * Get DOM element value
   */
  app.helpers.getDOMValue = function (selector, value) {
    const node = document.querySelector(selector);

    if (!node) return null;

    return getComputedStyle(node)[value];
  };

  /**
   * Set active cell to be cell down from current
   */
  app.helpers.setCellActiveDown = function (skip) {
    var cell = app.vue.data.active.cell;
    var dims = this.getGridDimensions();
    var loc = this.getCellLocation(cell);
    var col = loc.col;
    var skip = skip === undefined ? app.vue.data.userPuzzleSettings.cellsskipfilled : skip;

    for (var r = 1; r < dims.rows; r++) {
      var row = loc.row + r > dims.rows ? 1 : loc.row + r;
      var newCell = app.vue.model.puzzle.grid[row - 1][col - 1];
      if (!newCell.isBlank) {
        if (!skip || app.vue.data.user.answers['cell_' + (newCell.id - 1)].trim() === '') {
          app.vue.data.active.cell = newCell.id;
          if (newCell[app.vue.data.active.direction] === undefined) {
            app.vue.data.active.direction =
              app.vue.data.active.direction === 'across' ? 'down' : 'across';
          }
          return false;
        }
      }
    }
  };

  /**
   * Set active cell to be cell left from current
   */
  app.helpers.setCellActiveLeft = function (skip) {
    var cell = app.vue.data.active.cell;
    var dims = this.getGridDimensions();
    var loc = this.getCellLocation(cell);
    var row = loc.row;
    var skip = skip === undefined ? app.vue.data.userPuzzleSettings.cellsskipfilled : skip;

    for (var c = 1; c < dims.cols; c++) {
      var col = loc.col - c < 1 ? dims.cols : loc.col - c;
      var newCell = app.vue.model.puzzle.grid[row - 1][col - 1];
      if (!newCell.isBlank) {
        if (!skip || app.vue.data.user.answers['cell_' + (newCell.id - 1)].trim() === '') {
          app.vue.data.active.cell = newCell.id;
          if (newCell[app.vue.data.active.direction] === undefined) {
            app.vue.data.active.direction =
              app.vue.data.active.direction === 'across' ? 'down' : 'across';
          }
          return false;
        }
      }
    }
  };

  /**
   * Get next cell of word
   */
  app.helpers.getNextCellOfWord = function (skip) {
    var word = app.vue.model.puzzle.words[app.vue.model.activeWord];
    var cells = word.cells;
    var foundCurrent = false;
    var skip = skip === undefined ? app.vue.data.userPuzzleSettings.cellsskipfilled : skip;
    var answers = app.vue.data.user.answers;

    for (var c = 0; c < cells.length; c++) {
      var cell = word.cells[c];
      var id = cell.id;
      if (foundCurrent) {
        if (!skip || answers['cell_' + (id - 1)].trim() === '') {
          return cell;
        }
      }
      if (id === app.vue.data.active.cell) {
        foundCurrent = true;
      }
    }
    return cell;
  };

  /**
   * Set active cell to be next cell after current
   */
  app.helpers.setCellActiveNext = function (skip) {
    var cell = app.vue.data.active.cell;
    var dims = this.getGridDimensions();
    var loc = this.getCellLocation(cell);
    var row = loc.row;
    var skip = skip === undefined ? app.vue.data.userPuzzleSettings.cellsskipfilled : skip;
    var completed = app.vue.model.activeWordCompleted;
    var lastLetter = app.helpers.isLastCellOfWord();

    var newCell = this.getNextCellOfWord();

    if (newCell.id === cell) {
      app.vue.methods.nextClueInDirection?.(false);
      return;
    }

    app.vue.data.active.cell = newCell.id;
  };

  /**
   * Set active cell to be cell right from current
   */
  app.helpers.setCellActiveRight = function (skip) {
    var cell = app.vue.data.active.cell;
    var dims = this.getGridDimensions();
    var loc = this.getCellLocation(cell);
    var row = loc.row;
    var skip = skip === undefined ? this.$root.userPuzzleSettings.cellsskipfilled : skip;

    for (var c = 1; c < dims.cols; c++) {
      var col = loc.col + c > dims.cols ? 1 : loc.col + c;
      var newCell = app.vue.model.puzzle.grid[row - 1][col - 1];
      if (!newCell.isBlank) {
        if (!skip || app.vue.data.user.answers['cell_' + (newCell.id - 1)].trim() === '') {
          app.vue.data.active.cell = newCell.id;
          if (newCell[app.vue.data.active.direction] === undefined) {
            app.vue.data.active.direction =
              app.vue.data.active.direction === 'across' ? 'down' : 'across';
          }
          return false;
        }
      }
    }
  };

  /**
   * Set active cell to be cell up from current
   */
  app.helpers.setCellActiveUp = function (skip) {
    var cell = app.vue.data.active.cell;
    var dims = this.getGridDimensions();
    var loc = this.getCellLocation(cell);
    var col = loc.col;
    var skip = skip === undefined ? app.vue.data.userPuzzleSettings.cellsskipfilled : skip;

    for (var r = 1; r < dims.rows; r++) {
      var row = loc.row - r < 1 ? dims.rows : loc.row - r;
      var newCell = app.vue.model.puzzle.grid[row - 1][col - 1];
      if (!newCell.isBlank) {
        if (!skip || app.vue.data.user.answers['cell_' + (newCell.id - 1)].trim() === '') {
          app.vue.data.active.cell = newCell.id;
          if (newCell[app.vue.data.active.direction] === undefined) {
            app.vue.data.active.direction =
              app.vue.data.active.direction === 'across' ? 'down' : 'across';
          }
          return false;
        }
      }
    }
  };

  /**
   * Get user state for storing or sending
   */
  app.helpers.getUserState = function () {
    let userState = {...app.vue.data.user};
    userState.answers = app.helpers.reduceDataUserAnswers(userState.answers);
    return JSON.parse(JSON.stringify(userState));
  };

  app.helpers.expandDataUserAnswers = function (string) {
    let obj = {};

    if (string) {
      for (let i =0; i < string.length; i++) {
        obj['cell_' + i] = string[i];
      }
    }

    return obj;
  };

  app.helpers.reduceDataUserAnswers = function (obj) {
      let str = '';

      for (let i = 0; i < app.puzzle.counts.cells.total; i++) {
          str += obj['cell_' + i]
      }

      return str
  };

  app.helpers.getUserAnswerWord = function (wordId) {
    let cells = app.vue.model.puzzle.words[wordId].cells;
    let answer = '';

    for (let i = 0; i < cells.length; i++) {
      answer += app.vue.data.user.answers['cell_' + (cells[i].id - 1)];
    }

    return answer;
  };

  app.helpers.checkClueOverflow = function () {
    const [nodeOne, nodeTwo] = Array.from(document.querySelectorAll('.clue-set'));

    if (!nodeOne && !nodeTwo) return;

    const isOverflowing = node => (node ? node.scrollHeight > node.clientHeight : false);

    if (isOverflowing(nodeOne) || isOverflowing(nodeTwo)) {
      app.vue.data.user.cluesOverflowing = true;
    }
  };

  app.helpers.initPuzzle = function () {
    app.vue.data.check.competitionEntered =
      app.puzzle.competition !== false && app.status !== undefined && app.status.completed !== null;
  };

  /**
   * Resize grid
   */
  app.helpers.resizeGrid = function () {

    const gameplay = document.getElementById('gameplay');
    const gameplayContainer = document.getElementById('gameplayContainer');
    const clues = document.getElementById('clues');

    if (!gameplay || !gameplayContainer || !clues) return;

    //Clear any existing styles
    gameplayContainer.removeAttribute('style');
    gameplay.removeAttribute('style');
    clues.removeAttribute('style');
    gameplay.classList.remove('resized');
    
    //Is the grid taller than the available space?
    const gameplayHeight = gameplay.clientHeight;
    const gameplayContainerHeight = gameplayContainer.clientHeight;
    const needsResizing = gameplayHeight > gameplayContainerHeight;

    if(needsResizing) {
      gameplayContainer.style.width = gameplayContainerHeight  + 'px';
      gameplayContainer.style.marginInline = 'auto';
      gameplayContainer.style.flexGrow = 'unset';
      gameplay.style.height = gameplayContainerHeight  + 'px';
      gameplay.classList.add('resized');
      clues.style.flexGrow = '1';      
    }    
  };

  app.helpers.toast = Object.assign(
    /* Default t so single-arg toast() calls do not throw on t.type. */
    (message, t = {}) => app.helpers.toast.add(message, { ...t, type: t.type ?? 'default' }),
    {
      add(message, t = {}) {
        const { duration = 7000, ...rest } = t
        const id = crypto.getRandomValues(new Uint32Array(1))[0]

        app.vue.data.toasts = [...(app.vue.data.toasts || []), { id, message, ...rest }]

        if (duration) {
          setTimeout(() => app.helpers.toast.remove(id), duration)
        }

        return id
      },
      remove(id) {
        app.vue.data.toasts = id ? app.vue.data.toasts.filter(t => t.id !== id) : []
      },
      success(message, t) {
        return app.helpers.toast.add(message, { ...t, type: 'success' })
      },
      error(message, t) {
        return app.helpers.toast.add(message, { ...t, type: 'error' })
      },
    },
  );

  app.helpers.mountUiHelpers = function () {
    app.helpers.updateBreakpoints();

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
      app.helpers.checkClueOverflow();

      if (app.config.zoom?.el && !app.pinchZoom) {
        const el = document.querySelector(app.config.zoom.el);
        if (el) {
          app.pinchZoom = new DmPinchZoom(el);
          app.pinchZoom.init();
        }
      }
    });

    app.helpers.hideSpinner();
  };

  app.helpers.attachGridSwipeDirection = function () {
    const SWIPE_MIN_DELTA = 30;
    const SWIPE_MAX_DURATION = 600;
    let start = null;
    let aborted = false;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || !e.target.closest?.('#pinch-zoom-image')) {
        start = null;
        aborted = true;
        return;
      }
      aborted = false;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, time: Date.now() };
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) aborted = true;
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
      start = null;
      aborted = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const s = start;
      start = null;

      if (aborted || !s) return;
      if (app.pinchZoom?.settings?.scale_current > 1) return;
      if (!app.vue?.data?.modes?.grid) return;

      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - s.time;

      if (dt > SWIPE_MAX_DURATION) return;

      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx < SWIPE_MIN_DELTA && ady < SWIPE_MIN_DELTA) return;

      const direction = adx > ady ? 'across' : 'down';

      if (app.vue.data.active.direction === direction) return;

      if (app.vue.methods.manuallySetClueDirection(direction)) {
        app.helpers.saveActiveState?.();
      }
    }, { passive: true });
  };

  app.helpers.attachGridSwipeDirection();
})();
