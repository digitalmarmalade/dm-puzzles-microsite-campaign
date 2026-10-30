var app = window.app || {}
var vm = window.vm || {}

;(function () {
	'use strict'


	app.vue.data.history = {}

	app.vue.data.blind = {
		gridIncorrect: false,
		letterCorrect: false,
	}

	app.vue.data.pendingCheckCell = false
	app.vue.data.pendingRevealCell = false
	app.vue.data.pickerCellId = null

	app.helpers.pieceSvgPath = function (piece, x, y, s) {
		const h = s / 2
		switch (piece) {
			case 'X': {
				const pad = Math.round(s * 0.4)
				return `M ${x + pad},${y + pad} L ${x + s - pad},${y + s - pad} M ${x + s - pad},${y + pad} L ${x + pad},${y + s - pad}`
			}
			case 'LR': return `M ${x},${y + h} H ${x + s}`
			case 'TB': return `M ${x + h},${y} V ${y + s}`
			case 'LT': return `M ${x},${y + h} Q ${x + h},${y + h} ${x + h},${y}`
			case 'RT': return `M ${x + s},${y + h} Q ${x + h},${y + h} ${x + h},${y}`
			case 'LB': return `M ${x},${y + h} Q ${x + h},${y + h} ${x + h},${y + s}`
			case 'RB': return `M ${x + s},${y + h} Q ${x + h},${y + h} ${x + h},${y + s}`
			default: return ''
		}
	}

	app.vue.data.puzzleSubmitted = false

	app.vue.computed.variantClass = function () {
		return app.config.variant.replace(/\s+/g, '-').toLowerCase()
	}


	app.vue.computed.isCompleted = function () {

		if (!this.puzzleSubmitted) return false
		if (!app.puzzle?.cells) return false
		const answers = app.vue.data.user.answers
		const rowCount = app.vue.data.source?.copy?.settings?.rowCount
		const colCount = app.vue.data.source?.copy?.settings?.colCount
		const solutionParts = app.puzzle?.solution?.split(',')
		if (!rowCount || !colCount || !solutionParts) return false

		for (let r = 1; r <= rowCount; r++) {
			for (let c = 1; c <= colCount; c++) {
				const cell = app.puzzle.cells[r]?.[c]
				if (!cell) continue
				
				const expected = solutionParts[cell.id] || ''
				if (expected === '') continue
				if (cell.given !== '') continue 
				const ans = answers[cell.id] ?? ''
				if (ans === '') return false
			}
		}
		return true
	}

	app.vue.computed.isCompletedWithErrors = function () {
		if (!this.puzzleSubmitted) return false
		return this.isCompleted && !this.isCompletedWithoutErrors
	}

	app.vue.computed.isCompletedWithoutErrors = function () {
		if (!this.puzzleSubmitted) return false
		if (!this.isCompleted) return false
		return this.userString === app.puzzle.solution
	}

	app.vue.computed.isCompletedReadOnly = function () {
		return this.puzzleSubmitted
	}

	app.vue.computed.totalCellsCompleted = function () {
		if (!app.puzzle?.cells) return 0
		const answers = app.vue.data.user.answers
		const rowCount = app.vue.data.source?.copy?.settings?.rowCount
		const colCount = app.vue.data.source?.copy?.settings?.colCount
		const solutionParts = app.puzzle?.solution?.split(',')
		if (!rowCount || !colCount) return 0
		let count = 0
		for (let r = 1; r <= rowCount; r++) {
			for (let c = 1; c <= colCount; c++) {
				const cell = app.puzzle.cells[r]?.[c]
				if (!cell || cell.given !== '') continue
				if (answers[cell.id] && answers[cell.id] !== '') count++
			}
		}
		return count
	}

	app.vue.computed.totalCellsPercent = function () {
		const active = app.puzzle?.counts?.cells?.active
		return active > 0 ? (this.totalCellsCompleted / active) * 100 : 0
	}

	app.vue.computed.userString = function () {
		const answers = app.vue.data.user.answers || {}
		const givens = app.vue.data.source?.cluedata?.split(',') || []
		const combined = []

		for (let i = 0; i < givens.length; i++) {
			if (givens[i] !== '') {
				combined.push(givens[i])
			} else {
				const ans = answers[i] ?? ''
				// 'X' is a visual "no track here" marker — normalise to '' for solution comparison
				combined.push(ans === 'X' ? '' : ans)
			}
		}

		return combined.join(',')
	}

	app.vue.methods.pickPiece = function (piece) {
		const cellId = app.vue.data.pickerCellId
		if (cellId == null) return
		app.helpers.setUserAnswer(cellId, piece)
		app.helpers.historySave()
		app.vue.data.pickerCellId = null
		app.helpers.dispatchEvent('trackplaced')
	}

	app.vue.methods.closePicker = function () {
		app.vue.data.pickerCellId = null
	}

	app.vue.methods.showModal = (function (base) {
		return function (modal, resetActions) {
			app.vue.data.pickerCellId = null
			return base(modal, resetActions)
		}
	})(app.vue.methods.showModal)

	app.vue.methods.deleteClicked = function () {
		app.vue.methods.resetActions()
		const cellId = app.vue.data.active.cell
		if (cellId === undefined || cellId === null) return
		app.helpers.setUserAnswer(cellId, '')
	}

	/**
	 * Build the puzzle object from source data.
	 * Creates a 2D cells array indexed [row][col] (1-based).
	 */
	app.vue.methods.getPuzzleObject = function () {
		const puzzle = app.vue.data.source

		const obj = {
			cells: [],
			counts: {
				cells: { active: 0, given: 0, total: 0 },
			},
			meta: puzzle.meta,
			solution: puzzle.copy.settings.solution,
			rowClues: puzzle.copy.settings.rowClues || [],
			colClues: puzzle.copy.settings.colClues || [],
			stations: puzzle.copy.settings.stations || [],
		}

		const givens = puzzle.cluedata.split(',')
		const rows = puzzle.copy.settings.rowCount
		const cols = puzzle.copy.settings.colCount

		let id = 0
		for (let r = 1; r <= rows; r++) {
			obj.cells[r] = obj.cells[r] || []
			for (let c = 1; c <= cols; c++) {
				const cell = {
					id,
					r,
					c,
					given: givens[id] ?? '',
				}

				obj.cells[r][c] = cell

				if (givens[id] === '') {
					obj.counts.cells.active++
				} else {
					obj.counts.cells.given++
				}
				obj.counts.cells.total++
				id++
			}
		}

		return obj
	}

	app.vue.methods.historyUndo = function () {
		if (!app.vue.model.isCompletedWithoutErrors) {
			app.helpers.historyUndo()
		}
	}

	app.vue.methods.historyRedo = function () {
		if (!app.vue.model.isCompletedWithoutErrors) {
			app.helpers.historyRedo()
		}
	}

	app.vue.methods.resetGrid = function () {
		app.vue.data.puzzleSubmitted = false
		app.helpers.resetUserState()
		app.helpers.dispatchEvent('puzzlereset', app.status)

		if (app.vue.data.config.hasTimer) {
			app.timer.restart()
			app.helpers.saveUserTime()
		}

		app.vue.methods.hideModal()
	}

	app.vue.methods.setActiveClue = function (id) {
		app.vue.methods.setActiveItem('cell', id)
	}

	app.vue.methods.setActiveItem = function (key, id) {
		app.vue.methods.resetActions()
		app.vue.data.active[key] = id
		app.helpers.saveActiveState()
	}

	app.vue.methods.setSource = function (data) {
		if (data.dimensions === undefined) {
			data.dimensions = {
				width: data.copy.settings.colCount,
				height: data.copy.settings.rowCount,
			}
		}

		app.vue.data.source = data

		if (!app.vue.data.source.meta.title) {
			app.vue.data.source.meta.title =
				app.vue.data.source.copy.title || app.vue.data.source.meta.variant
		}

		if (!app.vue.data.source.meta.number) {
			app.vue.data.source.meta.number = app.vue.data.source.copy.number ?? ''
		}

		if (!app.vue.data.source.meta.difficulty) {
			app.vue.data.source.meta.difficulty = app.vue.data.source.copy.difficulty ?? ''
		}

		app.config.id = data.meta.id
		app.config.slug = data.meta.slug
		app.config.type = data.type || data.meta.type
		app.config.variant = data.meta.variant
		app.config.variantSlug = app.config.variant.split(' ').join('-').toLowerCase()
		app.config.related = data.meta.related || ''
		app.vue.methods.setShareLink(data)
	}

	app.vue.methods.checkCell = function (cellId) {
		if (cellId == null) {
			if (app.vue.data.active.cell == null) {
				app.vue.data.pendingRevealCell = false
				app.vue.data.pendingCheckCell = true
				return
			}
			cellId = app.vue.data.active.cell
			app.vue.data.pickerCellId = null
		}

		app.helpUsed('check', 'cell')
		app.vue.data.check.letter = cellId

		const expected = (app.puzzle?.solution?.split(',') || [])[cellId] || ''
		const userAnswer = app.vue.data.user.answers[cellId] || ''
		// 'X' is the visual "no track here" marker — equivalent to '' in the solution.
		const normUser = userAnswer === 'X' ? '' : userAnswer

		if (normUser === expected && userAnswer !== '') {
			app.vue.data.blind.letterCorrect = true
			setTimeout(() => { app.vue.data.blind.letterCorrect = false }, 2000)
		}
	}

	app.vue.methods.checkGrid = function () {
		app.vue.data.check.grid = true
		app.helpUsed('check', 'grid')

		const solutionParts = app.puzzle.solution.split(',')
		const givens = app.vue.data.source?.cluedata?.split(',') || []
		const answers = app.vue.data.user.answers
		let wrongGuesses = 0
		let attempted = 0

		for (let i = 0; i < solutionParts.length; i++) {
			if (givens[i] !== '') continue // givens are always correct
			const userPiece = answers[i] ?? ''
			if (userPiece === '') continue // skip empties — checking them would give away the route
			const expected = solutionParts[i] || ''
			const normUser = userPiece === 'X' ? '' : userPiece
			attempted++
			if (normUser !== expected) wrongGuesses++
		}

		if (wrongGuesses === 0 && attempted > 0) {
			app.vue.data.blind.gridCorrect = true
			setTimeout(() => { app.vue.data.blind.gridCorrect = false }, 2000)
		}

		setTimeout(() => { app.vue.methods.resetActions('check.grid') }, 0)
	}

	app.vue.computed.checkErrors = function () {
		if (!app.vue.data.check.grid || !app.puzzle?.cells) return []

		const solution = app.puzzle.solution.split(',')
		const answers = app.vue.data.user.answers
		return app.puzzle.cells.flat().filter(Boolean)
			.filter(cell => {
				const piece = answers[cell.id] || ''
				return cell.given === '' && piece !== '' && (piece === 'X' ? '' : piece) !== (solution[cell.id] || '')
			})
			.map(cell => cell.id)
	}

	app.vue.computed.removeErrorsShown = function () {
		return this.checkErrors.length > 0 && !this.puzzleSubmitted
	}

	app.vue.methods.removeErrors = function () {
		app.vue.model.checkErrors.forEach(id => app.helpers.setUserAnswer(id, ''))
		app.helpers.historySave()
		app.vue.methods.hideBlind()
		app.vue.methods.resetActions()
	}

	app.vue.methods.revealLetter = function (cellId) {
		if (cellId == null) {
			if (app.vue.data.active.cell == null) {
				app.vue.data.pendingCheckCell = false
				app.vue.data.pendingRevealCell = true
				return
			}
			cellId = app.vue.data.active.cell
			app.vue.data.pickerCellId = null
		}

		app.helpers.revealCell(cellId)
		app.helpers.tsSet('letterEntered')
	}

	app.vue.methods.revealGrid = function () {
		app.helpUsed('reveal', 'grid')

		app.vue.data.reveal.snapshot = JSON.parse(JSON.stringify(app.vue.data.user.answers))

		const solutionParts = app.puzzle.solution.split(',')
		const rowCount = app.vue.data.source.copy.settings.rowCount
		const colCount = app.vue.data.source.copy.settings.colCount
		let revealed = 0

		for (let r = 1; r <= rowCount; r++) {
			for (let c = 1; c <= colCount; c++) {
				const cell = app.puzzle.cells[r]?.[c]
				if (!cell || cell.given !== '') continue
				const sol = solutionParts[cell.id] || ''
				if (sol !== '') {
					if (app.vue.data.user.answers[cell.id] !== sol) revealed++
					app.vue.data.user.answers[cell.id] = sol
				}
			}
		}

		if (revealed) app.helpers.recordCellsRevealed(revealed)
		app.vue.data.reveal.grid = true
	}

	app.vue.watch['reveal.grid'] = function (newVal) {
		if (!newVal) {
			app.helpers.restoreRevealSnapshot()
		}
	}

	app.vue.methods.completePuzzle = function () {

		if (app.vue.data.puzzleSubmitted) {
			app.timer?.stop()
			app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus())
		}
	}

	app.vue.methods.submitPuzzle = function () {

		const isCorrect = app.vue.model.userString === app.puzzle.solution
		if (isCorrect) {

			app.vue.data.puzzleSubmitted = true
			app.status.progress = 100
			app.vue.methods.hideModal()

			const animated = app.helpers.startTrainAnimation(() => {
				app.vue.methods.completePuzzle()
			})
			if (!animated) {
				app.vue.methods.completePuzzle()
			}
		} else {
			app.helpers.puzzleCompletedUnsuccessfully()
		}
	}

	app.vue.mounted = function () {
		app.helpers.initTheme()

		window.addEventListener('keyup', e => {
			
			if (app.vue.data.puzzleSubmitted) return

			const code = e.keyCode || e.which

			if (code === 37) app.helpers.prevCell(app.vue.data.active.cell)
			if (code === 38) app.helpers.cellUp(app.vue.data.active.cell)
			if (code === 39) app.helpers.nextCell(app.vue.data.active.cell)
			if (code === 40) app.helpers.cellDown(app.vue.data.active.cell)

			if (code === 8 || code === 46) app.vue.methods.deleteClicked()
			if (code === 13) app.vue.methods.submitPuzzle()

			if (code === 32) {
				e.preventDefault()
				const cellId = app.vue.data.active.cell
				if (cellId === undefined || cellId === null) return
				const pieces = ['X', 'TB', 'LT', 'LR', 'LB', 'RB', 'RT', '']
				const current = app.vue.data.user.answers[cellId] || ''
				const idx = pieces.indexOf(current)
				const next = pieces[(idx + 1) % pieces.length]
				app.helpers.setUserAnswer(cellId, next)
				app.helpers.historySave()
				app.helpers.dispatchEvent('trackplaced')
			}
		})

		app.helpers.mountUiHelpers()
		app.emitter.emit('mounted')
		app.helpers.mounted(this)
		//app.helpers.showPuzzleOrStart()
	}
  app.vue.data.show.settings = false;
  app.vue.data.admired = false;

  app.vue.computed.isCompletionOverlayVisible = function () {
    //  if not completed then definitely do not show overlay
    if (!this.$root.isCompleted) {
      return false;
    }
    //  if show corrections mode
    if (this.userPuzzleSettings.showCorrections) {
      return false; // TODO
    }
    //  only if user has entered a letter since closing overlay
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

    setTimeout(() => {
      app.vue.data.state.suppressWrapperClick = false;
    }, 0);
  };


  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize ?? 0;
  };


  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
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


  app.vue.methods.changePrintShowSolution = function (value) {
    app.vue.data.print.showSolution = !!Number(value);
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
    app.vue.data.admired = true;
  };


  app.vue.methods.deleteCurrentLetter = function () {
    app.emitter.emit('keyup-delete', null, null);
  };


  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };


  app.vue.methods.resizeGrid = function () {
    app.helpers.resizeGrid();
  };

})()
