var app = window.app || {}
var vm = window.vm || {}
;(function () {
	'use strict'

  app.vue.data.print.hasGridTextSize = true;

  app.vue.data.print.gridTextSizeSelector = '.board__clue';

  app.vue.computed.isCompletedWithoutErrors = function () {
    var correct = app.helpers.getUserAnswerString(this.puzzle) === app.vue.data.source.copy.settings.solution;

    return correct;
  };

  app.vue.methods.wrapperClicked = function (e) {
    if (app.vue.data.state.suppressWrapperClick) return;

    app.vue.data.state.suppressWrapperClick = true;

    if (app.vue.data.reveal.grid) {
      app.vue.data.reveal.grid = false;
    }

    const visibleModals = app.vue.data.modals.visible;

    if (visibleModals.length) {
      const modalNodes = visibleModals.map((modal) => app.vue.model.$refs[modal]);

      if (!modalNodes.includes(e.target) && !modalNodes.some((modal) => modal?.contains(e.target))) {
        app.vue.methods.resetActions();

        if (!app.vue.model.isCompletedWithoutErrors) {
          app.vue.methods.hideModal('hintsMenu');
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

  app.vue.methods.resetGrid = function () {
    app.helpers.resetUserState();
    app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());
    app.vue.methods.setActiveClue(1);

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
      app.helpers.saveUserTime();
    }

    app.vue.methods.hideModal();
  };

  app.vue.methods.shareResult = function () {
    const url = app.vue.data.links.share;
    let { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

    const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
    const text = `⏱️ I completed ${title} in ${this.timerDisplay}`;

    const shareObject = { title, text, url };

    if (!navigator.share) {
      console.warn('navigator.share not defined, falling back', shareObject);

      app.vue.methods.copyToClipboard(`${text} ${url}`);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });

      return;
    }

    navigator
      .share(shareObject)
      .then(() => {
        console.log('Thanks for sharing!');
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
      })
      .catch((err) => {
        app.vue.methods.copyToClipboard(`${text} ${url}`);
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        console.error(err);
      });
  };

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

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.status.admired = true;
  };

  app.vue.computed.cluesOverflowingClass = function () {
    return app.vue.data.user.cluesOverflowing ? 'clues-overflowing' : '';
  };

  app.vue.methods.deleteCurrentLetter = function () {
    app.emitter.emit('keydown-delete', null, null);
  };

  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };

  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize;
  };

  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
  };

  app.vue.methods.id = function () {
    return Vue.useId();
  };

  app.vue.methods.resizeGrid = function () {
    app.helpers.resizeGrid();
  };

  app.vue.methods.toggleLayout = function () {
    app.vue.data.modes.grid = !app.vue.data.modes.grid;

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
    });
  };

	app.vue.data.settings = {
		lives: 3,
	}

	app.vue.data.celebrating = false

	app.vue.data.user.lives = app.vue.data.settings.lives
	app.vue.data.user.wrongAnswers = 0
	app.vue.data.user.reveals = 0
	app.vue.data.user.livesLostPerAnswer = {}
	app.vue.data.user.revealedAnswers = {}
	app.vue.data.check.cell = null
	app.vue.data.state.translate = 0
	app.vue.data.state.isAdmired = false
	app.vue.data.state.allowSafeCompletion = false
	app.vue.data.state.suppressCompletionWatcher = false
	app.vue.data.state.isNotepadActive = false

	app.vue.data.keyboard = [
		[
			'1',
			'2',
			'3',
			'4',
			'5',
			!app.vue.data.state.breakpoints.lg
				? {
						code: 8,
						display: `
                    <svg class="icon" data-size="24" aria-hidden="true">
                        <use href="#iconDelete"></use>
                    </svg>
                    <span class="sr-only">Delete</span>
                `,
						event: 'delete',
					}
				: null,
			'6',
			'7',
			'8',
			'9',
			app.vue.data.state.breakpoints.lg
				? {
						code: 8,
						display: `
                <svg class="icon" data-size="24" aria-hidden="true">
                    <use href="#iconDelete"></use>
                </svg>
                <span class="sr-only">Delete</span>
            `,
						event: 'delete',
					}
				: '0',
			app.vue.data.state.breakpoints.lg ? '0' : null,
			{
				code: 13,
				display: `
                <svg class="icon" data-size="24" aria-hidden="true">
                    <use href="#iconEnter"></use>
                </svg>
                <span class="sr-only">Enter</span>
            `,
				event: 'enter',
			},
		],
	]

	app.vue.computed.isCompleted = function () {
		return this.isCompletedWithoutErrors || this.isCompletedWithErrors
	}

	app.vue.computed.isSafelyCompleted = function () {
		return this.isCompleted && app.vue.data.state.allowSafeCompletion
	}

	app.vue.computed.isCompletedWithErrors = function () {
		return false
	}

	app.vue.computed.isCompletedWithoutErrors = function () {
		return this.userString === app.puzzle.stringSol
	}

	app.vue.computed.keys = function () {
		var keyboard = this.keyboard.map(k => k.filter(Boolean))
		var keys = []

		for (var r = 0; r < keyboard.length; r++) {
			var rowkeys = []
			for (var c = 0; c < keyboard[r].length; c++) {
				var item
				if (typeof keyboard[r][c] === 'string') {
					item = {
						code: keyboard[r][c].charCodeAt(0),
						display: keyboard[r][c],
						tooltip: keyboard[r][c],
					}
				} else {
					item = keyboard[r][c]
				}
				rowkeys.push(item)
			}
			keys.push(rowkeys)
		}

		return keys
	}

	app.vue.computed.listCellsError = function () {
		var cells = this.$root.puzzle.cells,
			errors = []

		for (var i = 1, cellsLen = cells.length; i < cellsLen; i++) {
			if (
				!cells[i].isBlank &&
				this.user.answers['cell_' + (i - 1)] !== this.source.settings.solution[i - 1]
			) {
				errors.push(i)
			}
		}
		return errors
	}

	app.vue.computed.totalCellsCompleted = function () {
		return Object.keys(this.$root.user.answers).length
	}

	app.vue.computed.totalCellsPercent = function () {
		return (this.$root.totalCellsCompleted / 10) * 100
	}

	app.vue.computed.userString = function () {
		var string = ''

		for (var i = 0; i < 10; i++) {
			string += this.user.answers[i] ? this.user.answers[i] : ''
		}

		return string
	}

	app.vue.computed.isChecking = function () {
		return app.vue.data.check.cell !== null
	}

	app.vue.computed.currentRank = function () {
		return this.isCompletedWithoutErrors && app.vue.data.state.allowSafeCompletion
			? app.puzzle.cluedata.length
			: app.vue.data.active.cell
	}

	app.vue.computed.isWorumber = function () {
		return app.puzzle.isOperator
	}

	app.vue.computed.isHeadCoach = function () {
		return !app.puzzle.isOperator
	}

	app.vue.computed.isHint = function () {
		return app.puzzle.isHint
	}

	app.vue.computed.activeHint = function () {
		return this.isHint && app.puzzle.hintText[this.active.cell + 1]
	}

	app.vue.methods.checkSimilarity = function (str1, str2) {
		var equivalency = 0
		var minLength = str1.length > str2.length ? str2.length : str1.length
		var str1count = 0

		for (var s = 0; s < str1.length; s++) {
			if (str1.charAt(s) !== ' ') {
				str1count++
			}
		}

		for (var i = 0; i < minLength; i++) {
			if (str1.charAt(i) !== ' ' || str2.charAt(i) !== ' ') {
				if (str1.charAt(i) === str2.charAt(i)) {
					equivalency++
				}
			}
		}

		var weight = equivalency / str1count
		return weight * 100
	}

	app.vue.methods.deleteClicked = function () {
		const curr = app.vue.data.user.answers[app.vue.data.active.cell]
			? '' + app.vue.data.user.answers[app.vue.data.active.cell]
			: ''

		if (!app.vue.model.isSafelyCompleted && curr.length > 0) {
			if (curr.length < 2) {
				delete app.vue.data.user.answers[app.vue.data.active.cell]
				return
			}

			app.helpers.setUserAnswer(app.vue.data.active.cell, +curr.slice(0, -1))
		}
	}

	app.vue.methods.trackWrongAnswer = function (id) {
		app.vue.data.user.wrongAnswers = (app.vue.data.user.wrongAnswers || 0) + 1
		app.vue.data.user.livesLostPerAnswer[id] = (app.vue.data.user.livesLostPerAnswer[id] || 0) + 1

		// A second miss on the same question points to Hints, once.
		if (app.vue.data.user.livesLostPerAnswer[id] >= 2) app.helpers.guideTip?.('hints')
	}

	app.vue.methods.trackReveal = function (id) {
		app.vue.data.user.reveals = (app.vue.data.user.reveals || 0) + 1
		app.vue.data.user.cellsRevealed = (app.vue.data.user.cellsRevealed || 0) + 1
		if (!app.vue.data.user.revealedAnswers) app.vue.data.user.revealedAnswers = {}
		app.vue.data.user.revealedAnswers[id] = true
	}

	app.vue.methods.decreaseLife = function (id) {
		app.vue.methods.trackWrongAnswer(id)
	}

	app.vue.methods.getPuzzleObject = function () {
		var puzzle = app.vue.data.source
		var puzzleIdx = Math.floor(Math.random() * puzzle.cluedata.length)

		var obj = {
			cells: [],
			counts: {
				cells: {
					active: 0,
				},
			},
			cluedata: puzzle.cluedata,
			clues: [],
			puzzle: puzzle.cluedata[puzzleIdx],
			total: puzzle.cluedata[puzzleIdx].start,
			numberOfClues: 0,
			name: puzzle.meta.type.charAt(0).toUpperCase() + puzzle.meta.type.slice(1).toLowerCase(),
			solution: puzzle.settings.solution,
			clueText: ['Start with'],
			operatorText: [],
			hintText: [],
			isHint: null,
			isOperator: null,
			stringSol: '',
		}

		obj.clues = obj.puzzle.data
		obj.numberOfClues = obj.clues.length

		for (var c = 0; c < obj.numberOfClues; c++) {
			obj.cluedata[c] = {
				id: c,
				clue: obj.clues[c].clue,
				result: obj.clues[c].result,
				classes: [],
			}
		}
		obj.isHint = 'hint' in obj.clues[0]
		obj.isOperator = 'operator' in obj.clues[0]

		for (var i = 0; i < obj.numberOfClues; i++) {
			obj.clueText[i + 1] = this.formatClue(obj.clues[i].clue)
			obj.operatorText[i + 1] = obj.clues[i].operator
			obj.hintText[i + 1] = obj.clues[i].hint
		}

		var string = ''

		for (var s = 0; s < obj.cluedata.length; s++) {
			string += obj.cluedata[s].result
		}

		obj.stringSol = string

		return obj
	}

	app.vue.methods.formatClue = function (clue) {
		clue = clue.replace(/^\//, '&divide;')
		clue = clue.replace(/^\*/, '&times;')
		clue = clue.replace(/([0-9])\/([0-9])/, '<sup>$1</sup>&frasl;<sub>$2</sub>')

		return clue
	}

	app.vue.methods.numberClicked = function (number) {
		if (!app.vue.model.isCompleted) {
			const curr = (app.vue.data.user.answers[app.vue.data.active.cell] ?? '') + ''

			if (curr.length >= 4) return

			app.helpers.setUserAnswer(app.vue.data.active.cell, +(curr + number))
		}
	}

	app.vue.methods.enterClicked = function () {
		if (!app.vue.model.isSafelyCompleted) {
			const curr = app.vue.data.active.cell

			if (app.vue.data.user.answers[curr]) {
				app.vue.data.check.cell = curr
			}
		}
	}

	app.vue.methods.checkCell = function (id) {
		if (id !== app.vue.data.active.cell) {
			app.vue.data.check.cell = null
			return false
		}

		const userAnswer = app.vue.data.user.answers[id]
		const { result } = app.puzzle.cluedata[id]

		if (userAnswer !== result) {
			app.vue.methods.trackWrongAnswer(id)
			app.vue.methods.resetCell(id)
		} else {
			if (app.vue.model.isCompletedWithoutErrors) {
				app.vue.data.state.allowSafeCompletion = true
			} else {
				app.vue.methods.setActiveCell(id + 1)

				if (app.vue.data.state.isNotepadActive) {
					app.emitter.emit('notepad:dispose')

					requestAnimationFrame(() => {
						app.emitter.emit('notepad:adjust')
					})
				}
			}
		}

		app.helpers.calcTranslate()

		setTimeout(() => {
			app.vue.data.check.cell = null
		}, 1000)

		return userAnswer === result
	}

	app.vue.methods.resetCell = function (id) {
		app.vue.data.user.answers[id] = ''
		app.helpers.saveUserState()
	}

	app.vue.methods.resetGrid = function () {
		app.helpers.resetUserState()
		app.status = app.helpers.getDefaultUserPlayStatus()
		app.vue.data.state.isAdmired = false
		app.vue.data.state.allowSafeCompletion = false
		app.vue.data.check.cell = null
		app.vue.data.user.lives = app.vue.data.settings.lives
		app.vue.data.user.wrongAnswers = 0
		app.vue.data.user.reveals = 0
		app.vue.data.user.livesLostPerAnswer = {}
		app.vue.data.user.revealedAnswers = {}
		app.vue.methods.setActiveCell(0)
		app.helpers.calcTranslate()
		app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all())

		if (app.vue.data.config.hasTimer) {
			app.timer.restart()
		}

		app.vue.methods.hideModal()
	}

	app.vue.methods.setActiveCell = function (id) {
		app.vue.data.active.cell = id
		app.helpers.saveActiveState()
	}

	app.vue.methods.shareResult = async function () {
		const url = app.vue.data.links.share
		let { variant, numberLabel, difficulty } = app.vue.model.formattedMeta

		const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ')
		const prefix = app.vue.model.isCompletedWithoutErrors
			? 'I completed'
			: `I reached level ${app.vue.model.currentRank} of`
		const text = `⏱️ ${prefix} ${title.trim()} in ${
			this.timerDisplay
		} ${app.helpers.generateEmojiStr()}`

		let file = null
		try {
			const blob = app.helpers.generateShareImage && (await app.helpers.generateShareImage())
			if (blob) file = new File([blob], `${title}.png`, { type: 'image/png' })
		} catch (err) {
			console.warn('share image failed', err)
		}

		if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
			try {
				await navigator.share({ files: [file], title, text })
				app.helpers.dispatchEvent('puzzleshare', { data: {} })
				return
			} catch (err) {
				if (err && err.name === 'AbortError') return
				console.error(err)
			}
		}

		if (file) {
			const link = document.createElement('a')
			link.href = URL.createObjectURL(file)
			link.download = `${title}.png`
			document.body.appendChild(link)
			link.click()
			link.remove()
			setTimeout(() => URL.revokeObjectURL(link.href), 1000)
			app.helpers.dispatchEvent('puzzleshare', { data: {} })
			return
		}

		if (!navigator.share) {
			app.vue.methods.copyToClipboard(`${text} ${url}`)
			app.helpers.dispatchEvent('puzzleshare', { data: {} })
			return
		}

		navigator
			.share({ title, text, url })
			.then(() => {
				app.helpers.dispatchEvent('puzzleshare', { data: {} })
			})
			.catch(err => {
				app.vue.methods.copyToClipboard(`${text} ${url}`)
				app.helpers.dispatchEvent('puzzleshare', { data: {} })
				console.error(err)
			})
	}

	app.vue.methods.clickAdmire = function () {
		app.vue.methods.hideModal()
		app.status.admired = true
		app.vue.data.state.translate = 0
		app.vue.data.state.isAdmired = true
	}

	app.vue.methods.wrapperClicked = function (e) {
		if (app.vue.data.state.suppressWrapperClick || app.vue.methods.stateModal('help')) {
			return
		}

		app.vue.data.state.suppressWrapperClick = true
		const visibleModals = app.vue.data.modals.visible

		if (visibleModals.length) {
			const modalNodes = visibleModals.map(modal => app.vue.model.$refs[modal])

			if (!modalNodes.includes(e.target) && !modalNodes.some(modal => modal?.contains(e.target))) {
				app.vue.methods.resetActions()

				if (!app.vue.model.isCompletedWithoutErrors) {
					app.vue.methods.hideModal('hintsMenu')
					app.vue.methods.hideModal('layoutMenu')
					app.vue.methods.hideModal('settings')
				} else {
					app.vue.methods.hideModal()
				}
			}
		}

		setTimeout(() => {
			app.vue.data.state.suppressWrapperClick = false
		}, 0)
	}

	app.vue.mounted = function () {
		app.helpers.initTheme();

		window.addEventListener('keyup', function (e) {
			const code = e.keyCode || e.which

			if (code >= 48 && code <= 57) {
				app.vue.methods.numberClicked(code - 48)
			}

			if (code >= 96 && code <= 105) {
				app.vue.methods.numberClicked(code - 96)
			}

			if (code === 8) {
				app.vue.methods.deleteClicked()
			}

			if (code === 46) {
				app.vue.methods.deleteClicked()
			}

			if (code === 13) {
				app.vue.methods.enterClicked()
			}
		})

		app.helpers.mountUiHelpers()
		app.emitter.emit('mounted')
		app.helpers.mounted(this)
	}

	app.vue.watch.userSettings = function (newValue, oldValue) {
		app.helpers.savePuzzleState()
	}

	app.vue.watch.isSafelyCompleted = function (val) {
		if (!val) return
		if (app.vue.data.state.suppressCompletionWatcher) return

		if (this.isCompletedWithoutErrors) {
			const stepMs = 90
			const flashMs = 500
			const boardCount = document.querySelectorAll('.board:not(#bstart)').length

			app.vue.data.celebrating = true
			setTimeout(() => {
				app.vue.data.celebrating = false
				app.helpers.puzzleCompletedSuccessfully()
			}, boardCount * stepMs + flashMs)
		} else {
			app.helpers.puzzleCompletedUnsuccessfully()
		}
	}

	app.vue.watch.isChecking = function (val) {
		if (val) {
			app.vue.methods.checkCell(app.vue.data.check.cell)
		}
	}

	app.vue.watch['active.cell'] = function () {
		app.helpers.calcTranslate()
	}
})()
