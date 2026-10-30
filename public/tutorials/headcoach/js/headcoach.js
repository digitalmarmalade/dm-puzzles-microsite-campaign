var app = window.app || {}
var vm = window.vm || {}
//
;(function () {
	'use strict'

  //  HeadCoach's helpUsed intentionally does NOT increment checksUsed (base does).
  app.helpUsed = function (cat, subcat) {
    'use strict';

    app.vue.data.user.help = app.vue.data.user.help || {};
    app.vue.data.user.help[cat] = app.vue.data.user.help[cat] || {};
    app.vue.data.user.help[cat][subcat] = app.vue.data.user.help[cat][subcat] || 0;
    app.vue.data.user.help[cat][subcat]++;
    app.helpers.saveUserState();
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

  app.helpers.mountUiHelpers = function () {
    app.helpers.updateBreakpoints();

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
    });

    app.helpers.hideSpinner();
  };

  app.helpers.addEventListeners = function () {
    document.addEventListener(
      'cellclick',
      (e) => {
        app.handlers.cellClick(e.detail.item, e);
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

  app.handlers.onEscKeydown = function (e) {
    if (
      !app.vue.data.modals.visible.length ||
      (['TEXTAREA', 'INPUT'].some((t) => t === (e?.target).tagName) && ++app.vue.data.state.keys.esc.presses < 2)
    ) {
      return;
    }

    app.vue.data.state.keys.esc.presses = 0;
    app.vue.methods.hideModal();
  };

  app.helpers.toast = Object.assign((t) => app.helpers.toast.add({ ...t, type: 'default' }), {
    add(t) {
      const { duration = 7000, ...rest } = t;
      const id = crypto.getRandomValues(new Uint32Array(1))[0];

      app.vue.data.toasts = [...app.vue.data.toasts, { id, ...rest }];

      if (duration && duration !== Number.POSITIVE_INFINITY) {
        setTimeout(() => app.helpers.toast.remove(id), duration);
      }

      return id;
    },
    remove(id) {
      app.vue.data.toasts = app.vue.data.toasts.filter((t) => t.id !== id);
    },
    removeAll() {
      app.vue.data.toasts = [];
    },
    success(t) {
      return app.helpers.toast.add({ ...t, type: 'success' });
    },
    error(t) {
      return app.helpers.toast.add({ ...t, type: 'error' });
    },
  });

  app.helpers.wait = function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  app.helpers.waitForAnimations = function (el) {
    return Promise.allSettled(el?.getAnimations({ subtree: true }).map((a) => a.finished));
  };

  app.helpers.withTransition = function (fn) {
    if (!document.startViewTransition) {
      return fn();
    }

    return document.startViewTransition(fn);
  };

	app.helpers.getCellIdFromColRow = function (col, row) {
		'use strict'

		var o = this,
			cellId = row * (app.vue.data.source.settings.colCount * 2 - 1) + col

		return cellId
	}

	app.helpers.getColRowFromCellId = function (id) {
		'use strict'

		var o = this,
			colRow = {}

		colRow.row = Math.floor(id / (app.vue.data.source.settings.colCount * 2 - 1))
		colRow.col = Math.floor(id - colRow.row * (app.vue.data.source.settings.colCount * 2 - 1))

		return colRow
	}

	app.helpers.getDefaultActiveState = function () {
		return {
			cell: 0,
		}
	}

	app.helpers.getDefaultUserState = function () {
		return {
			answers: {},
			livesLostPerAnswer: {},
			revealedAnswers: {},
			/* Must live on the default so loads and resets leave them 0 rather than undefined. */
			wrongAnswers: 0,
			reveals: 0,
			cellsRevealed: 0,
			checksUsed: 0,
			settings: {
				timer: true,
			},
			time: 0,
			lives: 3,
		}
	}

	/*app.helpers.puzzleCompletedSuccessfully = function () {
		if (app.vue.data.config.hasTimer) {
			app.timer.stop()
		}

		app.status.completed = Date.now()
		app.helpers.saveUserPlayStatus()

		confetti.maxCount = 300
		confetti.alpha = 0.8
		confetti.start(1000)

		app.vue.model.showModal('completeSuccess')
	}*/

	app.helpers.puzzleStart = function (vm) {
		if (!app.status.completed && app.vue.data.config.hasTimer) {
			app.timer.start(app.vue.data.time)
			app.helpers.saveUserTime()
		}

		if (app.vue.model.isCompletedWithoutErrors) {
			/* Rehydrate the latch: without it a reload leaves isSafelyCompleted false and the overlay dismissable. */
			app.vue.data.state.suppressCompletionWatcher = true
			app.vue.data.state.allowSafeCompletion = true
			app.helpers.puzzleCompletedSuccessfully(true)
			app.vue.model.showModal('completeSuccess')
			setTimeout(() => {
				app.vue.data.state.suppressCompletionWatcher = false
			}, 0)
		}
	}

	app.helpers.revealCell = function (id) {
		const { result } = app.puzzle.cluedata[id]

		app.vue.methods.trackReveal(id)
		app.vue.data.user.answers[id] = result
		app.vue.methods.enterClicked()
		app.helpers.saveUserState()
		document.querySelector('[data-key=enter]')?.focus()
	}

	app.helpers.setUserAnswer = function (cell, answer) {
		app.vue.data.user.answers[cell] = +answer
		app.helpers.updateProgress()
		app.helpers.checkStartedStatus()
		app.helpers.saveUserState()
		app.helpers.saveUserPlayStatus()
	}

	app.helpers.updateProgress = function () {
		app.status.progress = Math.floor(app.vue.model.totalCellsPercent)
	}

	app.helpers.timerUpdate = function (count) {
		app.vue.data.time = count
		app.helpers.saveUserTime()
	}

	app.helpers.getDOMValue = function (selector, value) {
		const node = document.querySelector(selector)

		if (!node) return null

		return getComputedStyle(node)[value]
	}

	app.helpers.mountUiHelpers = function () {
		app.helpers.updateBreakpoints()

		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
			app.helpers.calcTranslate()
		})

		app.helpers.hideSpinner()
		document.title = app.puzzle.isOperator ? 'Worumber' : 'Head Coach'
	}

	app.helpers.calcTranslate = function () {
		const g = document.getElementById('grid')
		const c = document.getElementById(`b${app.vue.data.active.cell}`)

		if (!g || !c || app.status.admired) return

		requestAnimationFrame(() => {
			/* scrollIntoView would walk the ancestor chain and clip the desktop header. */
			const target =
				c.offsetTop - g.clientHeight / 2 + c.clientHeight / 2

			g.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
		})
	}

	app.helpers.generateEmojiStr = function () {
		const s = '✅'
		const f = '❤'
		const b = '⬛'

		let str = ''

		const livesLostPerAnswer = app.vue.data.user.livesLostPerAnswer
		const livesLostTotal = Object.values(livesLostPerAnswer).reduce((a, b) => a + b, 0)
		const answers = app.vue.data.user.answers
		const answersTotal = Object.keys(answers).length
		const offset = app.puzzle.cluedata.length - answersTotal - livesLostTotal

		for (let i = 0; i < answersTotal + livesLostTotal + offset; i++) {
			if (answers[i] === undefined) {
				str += b
			} else if (answers[i] === app.puzzle.cluedata[i].result) {
				if (livesLostPerAnswer[i]) {
					for (let j = 0; j < livesLostPerAnswer[i]; j++) {
						str += f
					}
				}
				str += s
			} else {
				for (let j = 0; j < livesLostPerAnswer[i]; j++) {
					str += f
				}
			}
		}

		return str
	}

	app.handlers.letterEntered = function (component) {
		if (!app.vue.model.isCompleted) {
			app.vue.methods.numberClicked(component.item.display)
		}
	}

	app.handlers.onResize = function () {
		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
			app.helpers.screenOrientation()
			app.helpers.updateBreakpoints()
			app.helpers.calcTranslate()
		})
	}

	app.handlers.onOrientationChange = function () {
		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
			app.helpers.screenOrientation()
			app.helpers.updateBreakpoints()
			app.helpers.calcTranslate()
		})
	}
})()
