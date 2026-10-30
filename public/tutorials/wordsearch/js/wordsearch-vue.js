var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.vue.methods.changeGridResize = function (value) {
    if (value < 0 || value > 5) {
      return;
    }

    app.vue.data.userPuzzleSettings.gridResize = value;

    setTimeout(() => {
      app.helpers.resizeGrid();
    }, 0);
  };

  app.vue.methods.changeTextSize = function (value) {
    if (value < 0 || value > 5) {
      return;
    }

    app.vue.data.userPuzzleSettings.textSize = value;

    setTimeout(() => {
      app.helpers.resizeGrid();
    }, 100);
  };

  app.vue.methods.deleteCurrentLetter = function () {
    app.emitter.emit('keyup-delete', null, null);
  };

  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };

  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize ?? 0;
  };

  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
  };

  app.vue.methods.resizeGrid = function () {
    app.helpers.resizeGrid();
  };

  app.vue.computed.isCompletionOverlayVisible = function () {
    if (!this.$root.isCompleted) {
      return false;
    }
    if (this.userPuzzleSettings.showCorrections) {
      return false;
    }
    var whenResult = app.helpers.tsThisBeforeThat('hideCompletionOverlay', 'letterEntered');
    return whenResult === 1 || whenResult === true;
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
      const modalNodes = visibleModals.map((modal) => app.vue.model.$refs[modal]);

      if (!modalNodes.includes(e.target) && !modalNodes.some((modal) => modal?.contains(e.target))) {
        app.vue.methods.resetActions();

        if (!this.isCompletedWithoutErrors) {
          app.vue.methods.hideModal('checkMenu');
          app.vue.methods.hideModal('revealMenu');
          app.vue.methods.hideModal('revealGridConfirm');
          app.vue.methods.hideModal('layoutMenu');
          app.vue.methods.hideModal('settings');
        } else {
          app.vue.methods.hideModal();
        }
      }
    }

    setTimeout(() => {
      app.vue.data.state.suppressWrapperClick = false;
    }, 0);
  };

  app.vue.methods.shareResult = async function () {
    const url = app.vue.data.links.share;
    const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

    const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
    const total = ((app.vue.model.puzzle && app.vue.model.puzzle.words) || []).length;
    const text = `🔍 I completed ${title} in ${this.timerDisplay}, finding all ${total} words`;

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

  delete app.vue.data.last;
  delete app.vue.data.modes;
  delete app.vue.computed.isCompletedWithoutErrors;
  delete app.vue.computed.keys;
  delete app.vue.computed.listCellsError;
  delete app.vue.computed.totalCellsCompleted;
  delete app.vue.computed.totalCellsPercent;

  app.vue.data.active.block = null;
  app.vue.data.active.highlightedLetter = null;
  app.vue.data.state.isHighlightedLetterHintConfirmed = false;
  app.vue.data.state.isAdmired = false;
  app.vue.data.themeMode = 'light';


  app.vue.computed.isCompleted = function () {
    return Object.values(app.vue.data.user.answers).every(a => a.isFound);
  };

  app.vue.computed.mp_body_classes = function () {
    return [];
  };

  app.vue.computed.mp_data_game = function () {
    return null;
  };

  app.vue.computed.shortestWordLength = function () {
    return app.vue.data.source.cluedata.split(',').sort((a, b) => a.length - b.length)[0].length;
  };


  app.vue.methods.getPuzzleObject = function () {
    const source = app.vue.data.source;

    let obj = {
      grid: [],
      words: [],
    };

    let idx = 0;

    for (var r = 0; r < source.settings.rowCount; r++) {
      obj.grid[r] = [];

      for (var c = 0; c < source.settings.colCount; c++) {
        obj.grid[r][c] = {
          letter: source.celldata[idx],
          id: idx,
        };

        idx++;
      }
    }

    const answers = source.settings.solution.split(';');
    const clues = source.cluedata.split(',');

    obj.words = [];

    for (let idx = 0; idx < answers.length; ++idx) {
      let cells = answers[idx].split(',');
      let wordObj = app.helpers.getWordFromStartEndCells(cells[0] - 1, cells[1] - 1);

      wordObj.start.cell = cells[0] - 1;
      wordObj.end.cell = cells[1] - 1;
      wordObj.word = clues[idx];

      obj.words.push(wordObj);
    }

    return {
      ...obj,
      words: obj.words.map(w => ({
        ...w,
        start: {
          x: w.start.y,
          y: w.start.x,
        },
        end: {
          x: w.end.y,
          y: w.end.x,
        },
      })),
    };
  };

  app.vue.methods.resetGrid = function () {
    app.helpers.resetUserState();
    app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
    }

    app.vue.methods.hideModal();
  };

  app.vue.methods.revealHighlightedLetterHint = function () {
    app.vue.methods.hideModal('highlighted-letter-hint');

    setTimeout(() => {
      app.vue.data.state.isHighlightedLetterHintConfirmed = true;
    }, 500);
  };

  app.vue.methods.revealRandomHint = async function () {
    const words = app.vue.model.puzzle.words.filter(
      (_, idx) => !app.vue.data.user.answers[idx].isFound
    );
    const { word, start } = words[Math.floor(Math.random() * words.length)];

    app.vue.data.active.highlightedLetter = {
      block: start,
      word,
      isPending: false,
    };

    await app.vue.model.$nextTick();
    await Promise.allSettled(
      document
        .getElementById('highlightedLetter')
        .getAnimations({ subtree: true })
        .map(a => a.finished)
    );

    app.vue.data.active.highlightedLetter = null;
  };

  ['revealGrid', 'revealLetter', 'revealWord'].forEach(function (name) {
    app.vue.methods[name] = (function (existing) {
      return function () {
        const result = existing.apply(this, arguments);
        app.helpers.recordCellsRevealed(1);
        return result;
      };
    })(app.vue.methods[name]);
  });

  app.vue.methods.langReplace = (function (existing) {
    return function (lexeme) {
      const string = existing.call(this, lexeme);

      return string.replaceAll(
        '[[word]]',
        '<span style="color: var(--primary); text-transform: uppercase">' +
          this.active?.highlightedLetter?.word +
          '</span>'
      );
    };
  })(app.vue.methods.langReplace);

  app.vue.data.celebrating = false;

  app.vue.watch.isCompleted = {
    handler(val) {
      if (!val) return;

      if (!app.status.completed) {
        if (app.vue.data.config.hasTimer) app.timer.stop();

        const stepMs = 110;
        const flashMs = 650;
        const wordCount = Object.values(app.vue.data.user.answers).filter(a => a?.block).length;

        app.vue.data.celebrating = true;
        setTimeout(() => {
          app.vue.data.celebrating = false;
          app.helpers.puzzleCompletedSuccessfully();
        }, Math.max(0, wordCount - 1) * stepMs + flashMs);
      } else {
        app.helpers.puzzleCompletedSuccessfully();
      }
    },
  };
  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.status.admired = true;
    app.vue.data.state.isAdmired = true;
  };

  app.vue.mounted = (function (existing) {
    return function () {
      app.helpers.initTheme();

      if (typeof existing === 'function') existing.call(this);
    };
  })(app.vue.mounted);
})();
