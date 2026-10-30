var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.vue.data.active.block = null;
  app.vue.data.celebrating = false;
  app.vue.data.admired = false;

  app.vue.computed.gridBorderWidth = function () {
    return 10;
  };

  app.vue.computed.gridBorderOffset = function () {
    return this.blockInset * 100 - 2 + this.gridBorderWidth / 2;
  };

  app.vue.computed.gridPadding = function () {
    return this.gridBorderOffset + this.gridBorderWidth / 2 + 0.5;
  };

  app.vue.computed.blockInset = function () {
    return 0.07;
  };

  app.vue.computed.blockRadius = function () {
    return 10;
  };

  app.vue.computed.activeClueMagnet = function () {
    const block = app.vue.data.active.block;

    if (!block) return null;

    const count = block.width * block.height;

    if (count < 2) return null;

    const numberCell = app.helpers.getBlockNumberCell(block);

    if (!numberCell || numberCell.number !== count) return null;

    return {
      cellId: numberCell.y * app.puzzle.width + numberCell.x,
      dx: (block.x + block.width / 2) * 100 - (numberCell.x * 100 + 50),
      dy: (block.y + block.height / 2) * 100 + 22 - (numberCell.y * 100 + 72),
    };
  };

  app.vue.computed.totalCellsCompleted = function () {
    var count = 0;

    Object.values(app.vue.data.user.answers).forEach(block => {
      count += block.width * block.height;
    });

    return count;
  };

  app.vue.computed.userString = function () {
    const answers = app.vue.data.user.answers ? app.vue.data.user.answers : {};
    const ids = Object.keys(answers).sort((a, b) => a - b);
    const solution = [];

    ids.forEach(id => {
      solution.push(app.helpers.getCellsInBlock(answers[id]).join(','));
    });

    return solution.join(';');
  };

  app.vue.computed.isCompletedWithoutErrors = function () {
    return this.userString === app.puzzle.solution;
  };

  app.vue.computed.isCompletedWithErrors = function () {
    return !this.isCompletedWithoutErrors && this.isCompleted;
  };

  app.vue.computed.blocksUsed = function () {
    return app.vue.data.user.blocksUsed;
  };

  app.vue.computed.userAnswers = function () {
    return app.vue.data.user.answers;
  };

  app.vue.methods.checkGrid = function () {
    app.vue.data.check.grid = true;
    app.helpers.recordCheckUsed();

    const userString = app.vue.model.userString.trim();
    const blockIds = Object.keys(app.vue.data.user.answers);

    if (!userString || ['', ' '].includes(userString)) return;

    const userAnswers = userString.split(';');
    const solutionAnswers = app.puzzle.solution.split(';');

    const incorrectAnswers = userAnswers.filter(block => !solutionAnswers.includes(block));
    const correctAnswers = userAnswers.filter(block => solutionAnswers.includes(block));

    blockIds.forEach(id => {
      const block = app.vue.data.user.answers[id];
      const cellsInBlock = app.helpers.getCellsInBlock(block).join(',');

      if (incorrectAnswers.includes(cellsInBlock)) {
        app.vue.data.puzzle.checkedIncorrectBlocks.push(block);
      }

      if (correctAnswers.includes(cellsInBlock)) {
        app.vue.data.puzzle.checkedCorrectBlocks.push(block);
      }
    });

    if (!incorrectAnswers.length) {
      app.vue.data.blind.gridCorrect = true;
    }

    setTimeout(() => {
      app.vue.methods.resetActions('check.grid');
      app.vue.data.blind.gridCorrect = false;
    }, 2000);
  };

  app.vue.methods.wrapperClicked = function (e) {
    if (app.vue.data.state.suppressWrapperClick || app.vue.methods.stateModal('help')) {
      return;
    }

    app.vue.data.state.suppressWrapperClick = true;

    if (app.vue.data.reveal.grid) {
      app.vue.data.reveal.grid = false;
    }

    const visibleModals = app.vue.data.modals.visible;

    if (visibleModals.length) {
      const modalNodes = visibleModals.map(modal => app.vue.model.$refs[modal]);

      if (!modalNodes.includes(e.target) && !modalNodes.some(modal => modal?.contains(e.target))) {
        app.vue.methods.resetActions();

        if (!this.isCompletedWithoutErrors) {
          app.vue.methods.hideModal('hintsMenu');
          app.vue.methods.hideModal('revealGridConfirm');
          app.vue.methods.hideModal('layoutMenu');
          app.vue.methods.hideModal('settings');
        } else {
          app.vue.methods.hideModal();
        }
      }
    }

    if (
      app.vue.data.puzzle.checkedIncorrectBlocks.length ||
      app.vue.data.puzzle.checkedCorrectBlocks.length
    ) {
      app.vue.methods.clearCheckedBlocks();
    }

    setTimeout(() => {
      app.vue.data.state.suppressWrapperClick = false;
    }, 0);
  };


  app.vue.methods.revealGrid = function () {
    app.helpers.recordCellsRevealed(
      app.vue.model.puzzle.counts.cells.active - app.vue.model.totalCellsCompleted,
    );
    app.vue.data.reveal.grid = true;
    app.vue.methods.hideModal();

    setTimeout(() => {
      app.vue.methods.resetActions('reveal.grid');
    }, 0);
  };

  app.vue.methods.blockKey = function (block) {
    return block.id + ':' + block.width + 'x' + block.height;
  };

  app.vue.methods.isRevealedBlock = function (block) {
    return (app.vue.data.user.revealedBlocks || []).includes(app.vue.methods.blockKey(block));
  };

  app.vue.methods.isMissingBlock = function (block) {
    return !Object.values(app.vue.data.user.answers || {}).some(
      answer => answer && answer.x === block.x && answer.y === block.y && answer.width === block.width && answer.height === block.height
    );
  };

  app.vue.methods.revealedBlockPath = function (block) {
    const inset = app.vue.computed.blockInset();
    const right = (block.x + block.width - inset) * 100 - 6;
    const bottom = (block.y + block.height - inset) * 100 - 6;
    return 'M ' + right + ' ' + (bottom - 20) + ' V ' + bottom + ' H ' + (right - 20) + ' Z';
  };

  app.vue.methods.revealBlock = function () {
    if (app.vue.model.isCompletedWithoutErrors) return;

    const userString = app.vue.model.userString.trim();
    const userAnswers = userString.split(';');
    const solutionAnswers = app.puzzle.solution.split(';');
    const correctAnswers = userAnswers.filter(block => solutionAnswers.includes(block));

    const nextBlock = solutionAnswers.find(block => !correctAnswers.includes(block));
    const cells = nextBlock.split(',').map(Number);
    const id = cells[0];
    const x = (id - 1) % app.vue.model.puzzle.width;
    const y = Math.floor((id - 1) / app.vue.model.puzzle.height);
    let maxX = x;
    let maxY = y;

    for (let i = 1; i < cells.length; i++) {
      const currX = (cells[i] - 1) % app.vue.model.puzzle.width;
      const currY = Math.floor((cells[i] - 1) / app.vue.model.puzzle.height);

      maxX = Math.max(maxX, currX);
      maxY = Math.max(maxY, currY);
    }

    app.helpers.setUserAnswer(id, {
      id,
      width: maxX - x + 1,
      height: maxY - y + 1,
      x,
      y,
    });

    const user = app.vue.data.user;
    const key = app.vue.methods.blockKey({ id, width: maxX - x + 1, height: maxY - y + 1 });
    if (!user.revealedBlocks) user.revealedBlocks = [];
    if (!user.revealedBlocks.includes(key)) user.revealedBlocks = user.revealedBlocks.concat(key);

    app.helpers.recordCellsRevealed((maxX - x + 1) * (maxY - y + 1));
  };

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.status.admired = true;
    app.vue.data.admired = true;
  };

  app.vue.methods.checkSimilarity = function (str1, str2) {
    var equivalency = 0;
    var minLength = Math.min(str1.length, str2.length);
    var str1count = 0;

    for (var s = 0; s < str1.length; s++) {
      if (str1.charAt(s) !== ' ') {
        str1count++;
      }
    }

    for (var i = 0; i < minLength; i++) {
      if (str1.charAt(i) !== ' ' || str2.charAt(i) !== ' ') {
        if (str1.charAt(i) === str2.charAt(i)) {
          equivalency++;
        }
      }
    }

    var weight = equivalency / str1count;

    return weight * 100;
  };

  app.vue.methods.clearCheckedBlocks = function () {
    app.vue.data.puzzle.checkedCorrectBlocks = [];
    app.vue.data.puzzle.checkedIncorrectBlocks = [];
  };

  app.vue.methods.getPuzzleObject = function () {
    var puzzle = app.vue.data.source;
    var obj = {
      allowedValues: puzzle.settings.allowedValues,
      width: puzzle.settings.colCount,
      height: puzzle.settings.rowCount,
      cells: [],
      blocks: {},
      checkedCorrectBlocks: [],
      checkedIncorrectBlocks: [],
      clashingBlocks: [],
      counts: {
        cells: {
          active: puzzle.settings.rowCount * puzzle.settings.colCount,
          given: 0,
          total: puzzle.settings.rowCount * puzzle.settings.colCount,
        },
      },
      meta: puzzle.meta,
      solution: puzzle.settings.solution,
    };
    var numberCells = app.vue.methods.setSolutionBlocks(obj, puzzle.celldata);
    var id = 0;

    for (var y = 1; y <= obj.height; y++) {
      for (var x = 1; x <= obj.width; x++) {
        obj.cells[y] = obj.cells[y] || [];
        obj.cells[y][x] = {
          id: id,
          x: x,
          y: y,
          number: numberCells[id] || '',
        };
        id++;
      }
    }

    return obj;
  };

  app.vue.methods.setSolutionBlocks = function (obj, celldata) {
    var blocks = obj.solution.split(';');
    var numberCells = [];

    blocks.forEach(blockString => {
      var cells = blockString
        .split(',')
        .map(Number)
        .sort((a, b) => a - b);

      var startCellId = cells[0] - 1;
      var endCellId = cells[cells.length - 1] - 1;
      var numberCellId = startCellId;
      var x = startCellId % obj.width;
      var y = Math.floor(startCellId / obj.width);

      cells.forEach(cellId => {
        if (celldata[cellId - 1] !== ' ') {
          numberCellId = cellId - 1;
        }
      });

      numberCells[numberCellId] = cells.length;
      obj.blocks[startCellId] = {
        x,
        y,
        width: (endCellId % obj.width) - x + 1,
        height: Math.floor(endCellId / obj.width) - y + 1,
        value: cells.length,
      };
    });

    Object.keys(obj.blocks).forEach((key) => {
      obj.blocks[key].i = app.helpers.blockColour(obj.blocks[key]);
    });

    return numberCells;
  };

  app.vue.methods.resetGrid = function () {
    app.helpers.resetUserState();
    app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
    }

    app.vue.methods.hideModal();
  };

  app.vue.methods.handleClashingBlocks = function (blocks) {
    let a = [];

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (app.helpers.isBlockClashing(blocks[i], blocks[j])) {
          a.push(blocks[i]);
          a.push(blocks[j]);
        }
      }
    }

    app.vue.data.puzzle.clashingBlocks = a;
    app.helpers.saveUserState();
  };

  app.vue.watch.userAnswers = {
    handler(val) {
      app.vue.methods.handleClashingBlocks(Object.values(val));
    },
    deep: true,
  };

  app.vue.watch.isCompletedWithoutErrors = function (val) {
    if (val !== true) return;

    var isFreshCompletion = !app.status.completed;

    if (!isFreshCompletion) {
      app.helpers.puzzleCompletedSuccessfully();
      return;
    }

    if (app.vue.data.config.hasTimer && app.timer) app.timer.stop();

    var w = (app.puzzle && app.puzzle.width) || 7;
    var h = (app.puzzle && app.puzzle.height) || 7;
    var stepMs = 60;
    var cellMs = 400;
    var totalMs = ((w - 1) + (h - 1)) * stepMs + cellMs + 150;

    app.vue.data.celebrating = true;

    if (app.celebrateTimeout) clearTimeout(app.celebrateTimeout);
    app.celebrateTimeout = setTimeout(function () {
      app.vue.data.celebrating = false;
      app.helpers.puzzleCompletedSuccessfully();
    }, totalMs);
  };

  app.vue.watch.isCompletedWithErrors = function (val) {
    if (val === true) {
      app.helpers.puzzleCompletedUnsuccessfully();
    }
  };
})();
