var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.helpers.getDefaultUserState = function () {
    return {
      answers: {},
      notes: {},
      settings: {},
      blocksUsed: 0,
      cellsRevealed: 0,
      checksUsed: 0,
      revealedBlocks: [],
      timer: true,
    };
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

  app.helpers.commitActiveBlock = function () {
    const activeBlock = app.vue.data.active.block;
    if (!activeBlock) return;

    const cellId = app.helpers.getCellIdFromColRow(activeBlock.x, activeBlock.y);
    const oldBlock = app.helpers.getUserAnswer(cellId);

    if (oldBlock && activeBlock.width === 1 && activeBlock.height === 1) {
      app.helpers.deleteUserAnswer(oldBlock.id);
    } else {
      // A dropped block replaces whatever it lands on: remove every existing
      // block it clashes with, then place it — rather than leaving a clash.
      Object.values(app.vue.data.user.answers).forEach((block) => {
        if (app.helpers.isBlockClashing(activeBlock, block)) {
          app.helpers.deleteUserAnswer(block.id);
        }
      });
      app.helpers.setUserAnswer(cellId, activeBlock);
      app.lastPlacedBlock = activeBlock;
      app.helpers.dispatchEvent('blockplaced');
    }

    app.vue.data.active.block = null;
  };

  document.addEventListener('mouseup', app.helpers.commitActiveBlock);
  document.addEventListener('touchend', app.helpers.commitActiveBlock);

  /**
   * Callback called from timer class
   */
  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

  app.helpers.updateProgress = function () {
    var covered = new Set();
    Object.values(app.vue.data.user.answers || {}).forEach(function (block) {
      if (block) app.helpers.getCellsInBlock(block).forEach(function (id) { covered.add(id); });
    });
    var total = app.vue.model.puzzle.counts.cells.active || covered.size || 1;
    app.status.progress = Math.min(100, Math.floor((covered.size / total) * 100));
  };

  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
    }

    app.vue.data.user.blocksUsed = 0;

    app.status.started = null;
    app.status.completed = null;
    app.status.admired = false;
    app.status.progress = 0;
    app.vue.data.admired = false;

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.tock = function () {
    if (app.media.supports.audio && app.vue.data.userPuzzleSettings.soundskeyboard) {
      new Audio('mp3/tock.mp3').play();
    }
  };

  app.helpers.setUserAnswer = function (cellId, answer) {
    app.vue.data.user.answers[cellId] = answer;
    app.vue.data.user.blocksUsed = ++app.vue.data.user.blocksUsed;

    app.helpers.checkStartedStatus();
    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.getUserAnswer = function (cellId) {
    // Return the block that the cell is in or null
    if (app.vue.data.user.answers[cellId] === undefined) {
      // Search all cells in all blocks
      var ids = Object.keys(app.vue.data.user.answers);
      var block = false;

      ids.forEach(id => {
        if (app.helpers.isCellInBlock(cellId, app.vue.data.user.answers[id])) {
          block = app.vue.data.user.answers[id];
          return app.vue.data.user.answers[id];
        }
      });

      return block;
    }

    return app.vue.data.user.answers[cellId];
  };

  app.helpers.deleteUserAnswer = function (cellId) {
    //app.vue.model.$set(app.vue.data.user.answers, 'cellId', null);
    delete app.vue.data.user.answers[cellId];
    app.vue.data.user.blocksUsed--;

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.saveUserPlayStatus();
  };

  /*app.helpers.getUserState = function () {
    let userState = app.vue.data.user;
    userState.answers = JSON.stringify(userState.answers);
    return JSON.parse(JSON.stringify(userState));
  };*/

  app.helpers.expandDataUserAnswers = function (data) {
    /*if (data && (typeof data.answers === 'string')) {
      data.answers = JSON.parse(data.answers);
    }*/

    return data ? data : [];
  };

  app.helpers.isCellInBlock = function (cellId, block) {
    var cells = app.helpers.getCellsInBlock(block);

    return cells.indexOf(cellId) !== -1;
  };

  app.helpers.getCellsInBlock = function (block) {
    var cells = [];

    for (var y = block.y; y < block.y + block.height; y++) {
      for (var x = block.x; x < block.x + block.width; x++) {
        cells.push(y * app.puzzle.width + x + 1);
      }
    }

    return cells;
  };

  app.helpers.getBlockNumberCell = function (block) {
    var found = null;

    for (var y = block.y; y < block.y + block.height; y++) {
      for (var x = block.x; x < block.x + block.width; x++) {
        /* puzzle.cells is 1-indexed; block coordinates are 0-indexed. */
        var cell = app.vue.data.puzzle.cells?.[y + 1]?.[x + 1];

        if (cell && cell.number !== '' && cell.number !== undefined) {
          if (found) return null;
          found = { x: x, y: y, number: cell.number };
        }
      }
    }

    return found;
  };

  // Points to Check once a block looks finished (one number, the right size) but
  // isn't in the solution. Not on a full grid, which has its own feedback.
  app.helpers.guideCheckTip = function () {
    var block = app.lastPlacedBlock;
    if (!block || app.helpers.guideTipSeen('check') || app.vue.model.isCompleted) return;

    var number = app.helpers.getBlockNumberCell(block);
    if (!number || Number(number.number) !== block.width * block.height) return;

    var cells = app.helpers.getCellsInBlock(block).join(',');
    if (app.puzzle.solution.split(';').indexOf(cells) === -1) app.helpers.guideTip('check');
  };

  app.helpers.isBlockClashing = function (block1, block2) {
    return (
      block1.x < block2.x + block2.width &&
      block1.x + block1.width > block2.x &&
      block1.y < block2.y + block2.height &&
      block1.y + block1.height > block2.y
    );
  };

  app.helpers.puzzleCompletedUnsuccessfully = function () {
    app.vue.data.blind.gridIncorrect = true;
    // Set directly — checkGrid() would log a check-hint.
    app.vue.data.check.grid = true;
    const solution = app.puzzle.solution.split(';');
    app.helpers.recordAutoCheck(
      app.vue.model.userString.trim().split(';').filter(block => block && !solution.includes(block)).length
    );

    setTimeout(() => {
      app.vue.data.blind.gridIncorrect = false;
    }, 2000);
  };

  app.helpers.puzzleStart = function (vm) {
    app.vue.data.admired = false;

    if (!app.status.completed && app.vue.data.config.hasTimer) {
      app.timer.start(app.vue.data.time);
      app.helpers.saveUserTime();
    }

    if (app.vue.model.isCompletedWithoutErrors) {
      app.helpers.puzzleCompletedSuccessfully(true);
    } else if (app.vue.model.isCompletedWithErrors) {
      app.helpers.puzzleCompletedUnsuccessfully();
    }
  };

  app.helpers.blockColour = function (block) {
    return (block.width * block.height - 1) % 12;
  };

  app.helpers.setPuzzleStateFromUserState = function () {
    app.vue.methods.handleClashingBlocks(Object.values(app.vue.data.user.answers));
  };

  /**
   * Load puzzle state
   * Loads active and answer states from storage
   */
  app.helpers.loadPuzzleState = function () {
    return app.helpers
      .loadActiveState()
      .then(app.helpers.loadUserPlayStatus)
      .then(app.helpers.loadPuzzleSettings)
      .then(app.helpers.loadUserState)
      .then(app.helpers.loadUserTime)
      .finally(app.helpers.setPuzzleStateFromUserState);
  };

  /**
   * Resize grid
   */
  app.helpers.resizeGrid = function () {
    const gameplay = document.getElementById('gameplay');
    const gameplayContainer = document.getElementById('gameplayContainer');
    const svg = document.getElementById('pinch-zoom-image');

    gameplayContainer.removeAttribute('style');
    gameplay.removeAttribute('style');
    svg.removeAttribute('style');

    const IDEAL_GRID_SIZE = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ideal-grid-size')
    );

    const COMPUTED_GRID_SIZE = document.getElementById('pinch-zoom-image').clientHeight;

    const { clientHeight: gameplayContainerHeight } = gameplayContainer;
    const { clientHeight: gameplayHeight, clientWidth: gameplayWidth } = gameplay;

    const needsResizing = gameplayHeight > gameplayContainerHeight;

    let adjustedSize;

    if (needsResizing) {
      const heightDifference = gameplayContainerHeight / gameplayHeight;

      adjustedSize = gameplayWidth * heightDifference;

      gameplayContainer.style.overflowY = 'hidden';
      gameplay.style.maxInlineSize = IDEAL_GRID_SIZE + 'px';
      gameplay.style.inlineSize = Math.floor(adjustedSize) + 'px';
      gameplay.style.maxBlockSize = IDEAL_GRID_SIZE + 'px';
      gameplay.style.blockSize = Math.floor(adjustedSize) + 'px';
      gameplayContainer.style.maxBlockSize = IDEAL_GRID_SIZE + 'px';
      gameplayContainer.style.blockSize = Math.floor(adjustedSize) + 'px';
      svg.style.inlineSize = Math.floor(adjustedSize) + 'px';
      svg.style.blockSize = Math.floor(adjustedSize) + 'px';
    } else {
      gameplay.style.blockSize = COMPUTED_GRID_SIZE + 4 + 'px';
      gameplayContainer.style.blockSize = COMPUTED_GRID_SIZE + 4 + 'px';
      svg.style.blockSize = COMPUTED_GRID_SIZE + 4 + 'px';
    }
  };
})();
