var app = window.app || {}
var vm = window.vm || {}
;(function () {
	'use strict'

	// Track piece type constants
	// LR = horizontal (─), TB = vertical (│)
	// LT = left+top corner, RT = right+top corner
	// LB = left+bottom corner, RB = right+bottom corner
	app.TRACK_PIECES = ['LR', 'TB', 'LT', 'RT', 'LB', 'RB']

	app.helpers.addEventListeners = function () {
		document.addEventListener(
			'puzzlehistorychange',
			e => {
				app.vue.data.history = e.detail.history
				app.helpers.saveUserState()
			},
			false,
		)

		var AUTO_RESUME_WITHIN_MS = 3000
		var hiddenAt = null

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				hiddenAt = Date.now()
				app.vue.methods.pauseGame?.(true)
				return
			}

			var awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt
			hiddenAt = null

			if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
				app.vue.methods.resumeGame?.()
			}
		})

		screen.orientation.addEventListener('change', () => {
			app.handlers.onOrientationChange?.()
		})

		window.addEventListener('resize', () => {
			app.handlers.onResize?.()
		})
	}

	app.helpers.timerUpdate = function (count) {
		app.vue.data.time = count
		app.helpers.saveUserTime()
	}

	app.helpers.puzzleCompletedUnsuccessfully = function () {
		app.vue.data.blind.gridIncorrect = true
		// Set directly — checkGrid() would log a check-hint.
		app.vue.data.check.grid = true
		app.helpers.recordAutoCheck(app.vue.model.checkErrors.length)

		setTimeout(() => {
			app.vue.data.blind.gridIncorrect = false
		}, 2000)
	}

	app.helpers.showConfetti = function () {
		confetti.maxCount = 300
		confetti.alpha = 0.8
		confetti.start(2000)
	}

	app.helpers.showCompletionScreen = function () {
		app.vue.model.$nextTick(() => {
			app.helpers.dispatchEvent('puzzleshowcompletion', { data: app.status })
		})

		requestAnimationFrame(() => {
			app.vue.methods.showModal('completeSuccess')
			app.helpers.showConfetti()
		})
	}

	app.helpers.checkCompletedStatus = function () {
		if (app.status.completed === null) {
			app.status.completed = {
				when: Date.now(),
				time: app.vue.model.timerDisplay,
				seconds: app.vue.data.config.hasTimer ? app.timer.get() : null,
			}

			app.helpers.saveUserPlayStatus()
			return true
		}

		return false
	}

	app.helpers.updateProgress = function () {
		app.status.progress = Math.floor(app.vue.model.totalCellsPercent)
	}

	app.helpers.getDefaultUserState = function () {
		const defaultPuzzleSettings = {
			timer: true,
		}

		const userData = {
			answers: {},
			notes: {},
			settings: Object.assign({}, defaultPuzzleSettings),
			revealedCells: [],
			cellsRevealed: 0,
			checksUsed: 0,
		}

		return userData
	}

	app.helpers.getUserState = function () {
		const userState = {...app.vue.data.user};
		userState.answers = app.helpers.reduceDataUserAnswers(userState.answers);
		return JSON.parse(JSON.stringify(userState));
	}

	app.helpers.getColRowFromCellId = function (cellId) {
		const colCount = app.vue.data.source.copy.settings.colCount
		const row = Math.floor(cellId / colCount) + 1
		const col = (cellId % colCount) + 1
		return { row, col }
	}

	app.helpers.getCellIdFromColRow = function (col, row) {
		const colCount = app.vue.data.source.copy.settings.colCount
		return (row - 1) * colCount + (col - 1)
	}

	app.helpers.prevCell = function (cellId) {
		const colCount = app.vue.data.source.copy.settings.colCount
		const rowCount = app.vue.data.source.copy.settings.rowCount
		const totalCells = colCount * rowCount
		const current = app.helpers.getColRowFromCellId(cellId)

		let newCol = current.col - 1
		let newRow = current.row
		if (newCol < 1) {
			newCol = colCount
			newRow = newRow - 1
			if (newRow < 1) newRow = rowCount
		}

		const newId = app.helpers.getCellIdFromColRow(newCol, newRow)
		const cell = app.puzzle.cells[newRow]?.[newCol]
		if (cell && cell.given === '') {
			app.vue.methods.setActiveItem('cell', newId)
		} else if (newId !== cellId) {
			app.helpers.prevCell(newId)
		}
	}

	app.helpers.nextCell = function (cellId) {
		const colCount = app.vue.data.source.copy.settings.colCount
		const rowCount = app.vue.data.source.copy.settings.rowCount
		const current = app.helpers.getColRowFromCellId(cellId)

		let newCol = current.col + 1
		let newRow = current.row
		if (newCol > colCount) {
			newCol = 1
			newRow = newRow + 1
			if (newRow > rowCount) newRow = 1
		}

		const newId = app.helpers.getCellIdFromColRow(newCol, newRow)
		const cell = app.puzzle.cells[newRow]?.[newCol]
		if (cell && cell.given === '') {
			app.vue.methods.setActiveItem('cell', newId)
		} else if (newId !== cellId) {
			app.helpers.nextCell(newId)
		}
	}

	app.helpers.cellUp = function (cellId) {
		const colCount = app.vue.data.source.copy.settings.colCount
		const rowCount = app.vue.data.source.copy.settings.rowCount
		const current = app.helpers.getColRowFromCellId(cellId)

		const newRow = current.row - 1 < 1 ? rowCount : current.row - 1
		const newId = app.helpers.getCellIdFromColRow(current.col, newRow)
		const cell = app.puzzle.cells[newRow]?.[current.col]
		if (cell && cell.given === '') {
			app.vue.methods.setActiveItem('cell', newId)
		} else if (newId !== cellId) {
			app.helpers.cellUp(newId)
		}
	}

	app.helpers.cellDown = function (cellId) {
		const colCount = app.vue.data.source.copy.settings.colCount
		const rowCount = app.vue.data.source.copy.settings.rowCount
		const current = app.helpers.getColRowFromCellId(cellId)

		const newRow = current.row + 1 > rowCount ? 1 : current.row + 1
		const newId = app.helpers.getCellIdFromColRow(current.col, newRow)
		const cell = app.puzzle.cells[newRow]?.[current.col]
		if (cell && cell.given === '') {
			app.vue.methods.setActiveItem('cell', newId)
		} else if (newId !== cellId) {
			app.helpers.cellDown(newId)
		}
	}

	app.helpers.historyInit = function () {
		app.history ??= new DMHistoryVue(app.vue.model, {
			props: ['active', 'user'],
		})
	}

	app.helpers.historyReset = function () {
		app.history?.reset()
	}

	app.helpers.historyRedo = function () {
		app.history?.forward()
		app.analytics?.toggleFeature('redo')
	}

	app.helpers.historySave = function () {
		app.history?.push()
	}

	app.helpers.historyUndo = function () {
		app.history?.back()
		app.analytics?.toggleFeature('undo')
	}

	app.helpers.puzzleStart = function (vm) {
		app.helpers.historyInit()
		app.helpers.historyReset()

		if (!app.status.completed) {

			if (app.vue.data.config.hasTimer) {
				app.timer?.start(app.vue.data.time)
				app.helpers.saveUserTime()
			}

			if (app.vue.data.active.cell === undefined) {
				const rowCount = app.vue.data.source.copy.settings.rowCount
				const colCount = app.vue.data.source.copy.settings.colCount
				for (let r = 1; r <= rowCount; r++) {
					for (let c = 1; c <= colCount; c++) {
						const cell = app.puzzle.cells[r]?.[c]
						if (cell && cell.given === '') {
							app.vue.data.active.cell = cell.id
							break
						}
					}
					if (app.vue.data.active.cell !== undefined) break
				}
			}
		} else {
			app.vue.data.puzzleSubmitted = true
			app.helpers.checkAdmiredStatus(true)
		}

		app.helpers.historySave()
	}

	app.helpers.resetUserState = function () {
		app.vue.data.user = app.helpers.getDefaultUserState()

		app.status.completed = null
		app.status.admired = null
		app.vue.data.admired = false
		app.status.progress = 0

		app.helpers.updateProgress()
		app.helpers.saveUserState()
		app.helpers.saveUserPlayStatus()
	}

	app.helpers.restoreRevealSnapshot = function () {
		const snapshot = app.vue.data.reveal?.snapshot
		if (!snapshot) return
		app.vue.data.user.answers = snapshot
		app.vue.data.reveal.snapshot = null
		app.helpers.updateProgress()
		app.helpers.saveUserState()
	}

	app.helpers.setUserAnswer = function (cell, answer) {
		app.vue.data.user.answers[cell] = answer

		app.helpers.updateProgress()
		app.helpers.checkStartedStatus()
		app.helpers.saveUserState()
		app.helpers.saveUserPlayStatus()

		if (!app.vue.data.puzzleSubmitted && app.helpers.userRouteIsValid()) {
			app.vue.methods.submitPuzzle()
		}
	}

	// Points to Check once a row or column has its full count of track but a piece
	// in it is wrong. Not once the route is complete — that checks itself.
	app.helpers.guideCheckTip = function () {
		const cellId = app.vue.data.active.cell
		if (cellId === null || cellId === undefined || app.helpers.guideTipSeen('check')) return
		if (app.vue.data.puzzleSubmitted || app.helpers.userRouteIsValid()) return

		const cells = app.puzzle.cells
		const answers = app.vue.data.user.answers
		const solution = app.puzzle.solution.split(',')
		const { row, col } = app.helpers.getColRowFromCellId(cellId)
		const pieceAt = cell => cell.given !== '' ? cell.given : (answers[cell.id] || '')
		const isTrack = piece => piece !== '' && piece !== 'X'

		const fullButWrong = (lineCells, clue) => {
			if (lineCells.filter(cell => isTrack(pieceAt(cell))).length !== (parseInt(clue) || 0)) return false
			return lineCells.some(cell => {
				const piece = pieceAt(cell)
				return cell.given === '' && (piece === 'X' ? '' : piece) !== (solution[cell.id] || '')
			})
		}

		const rowCells = cells[row].filter(Boolean)
		const colCells = cells.filter(Boolean).map(r => r[col]).filter(Boolean)

		if (fullButWrong(rowCells, app.puzzle.rowClues[row - 1]) || fullButWrong(colCells, app.puzzle.colClues[col - 1])) {
			app.helpers.guideTip('check')
		}
	}

	app.helpers.revealCell = function (id) {
		const user = app.vue.data.user
		if (!user.revealedCells) user.revealedCells = []
		if (!user.revealedCells.includes(id)) user.revealedCells = user.revealedCells.concat(id)
		app.helpUsed('reveal', 'cell')
		app.helpers.recordCellsRevealed(1)
		const answers = app.puzzle.solution.split(',')
		const value = answers[id] || 'X'
		app.helpers.setUserAnswer(id, value)
		app.helpers.historySave()
	}

	app.helpers.userRouteIsValid = function () {
		const source = app.vue.data.source
		const puzzle = app.puzzle
		if (!source || !puzzle?.cells || !puzzle.stations || puzzle.stations.length < 2) return false

		const rowCount = source.copy.settings.rowCount
		const colCount = source.copy.settings.colCount
		const cells    = puzzle.cells
		const answers  = app.vue.data.user.answers

		const exits = {
			LR: { left: 'right',  right: 'left'   },
			TB: { top:  'bottom', bottom: 'top'   },
			LT: { left: 'top',    top:    'left'  },
			LB: { left: 'bottom', bottom: 'left'  },
			RT: { right:'top',    top:    'right' },
			RB: { right:'bottom', bottom: 'right' },
		}
		const opposite = { left:'right', right:'left', top:'bottom', bottom:'top' }

		function pieceAt(r, c) {
			const cell = cells[r]?.[c]
			if (!cell) return ''
			if (cell.given !== '') return cell.given
			return answers[cell.id] || ''
		}

		const stA = puzzle.stations[0]
		const stB = puzzle.stations[1]
		let r, c, entryEdge
		if      (stA.edge === 'top')    { r = 1;        c = stA.col;  entryEdge = 'top'    }
		else if (stA.edge === 'bottom') { r = rowCount; c = stA.col;  entryEdge = 'bottom' }
		else if (stA.edge === 'left')   { r = stA.row;  c = 1;        entryEdge = 'left'   }
		else                            { r = stA.row;  c = colCount; entryEdge = 'right'  }

		const visited = new Set()
		const maxSteps = rowCount * colCount + 1
		for (let step = 0; step < maxSteps; step++) {
			const cell = cells[r]?.[c]
			if (!cell || visited.has(cell.id)) return false
			visited.add(cell.id)

			const piece   = pieceAt(r, c)
			const exitMap = piece && exits[piece]
			if (!exitMap) return false

			const exitEdge = exitMap[entryEdge]
			if (!exitEdge) return false

			if      (exitEdge === 'right')  c++
			else if (exitEdge === 'left')   c--
			else if (exitEdge === 'bottom') r++
			else                            r--
			entryEdge = opposite[exitEdge]

			if (c < 1 || c > colCount || r < 1 || r > rowCount) {
				// Stepped off the grid — does that match station B?
				let exitedEdge, exitedRow, exitedCol
				if      (c < 1)         { exitedEdge = 'left';   exitedRow = r }
				else if (c > colCount)  { exitedEdge = 'right';  exitedRow = r }
				else if (r < 1)         { exitedEdge = 'top';    exitedCol = c }
				else                    { exitedEdge = 'bottom'; exitedCol = c }

				if (exitedEdge !== stB.edge) return false
				if (stB.edge === 'top' || stB.edge === 'bottom') return exitedCol === stB.col
				return exitedRow === stB.row
			}
		}
		return false
	}

	app.helpers.traceTrackPath = function () {
		const rowCount    = app.vue.data.source.copy.settings.rowCount
		const colCount    = app.vue.data.source.copy.settings.colCount
		const solParts    = app.puzzle.solution.split(',')
		const stations    = app.puzzle.stations
		const cells       = app.puzzle.cells

		// Which edge to exit given entry edge, per piece type
		const exits = {
			LR: { left: 'right',  right: 'left'   },
			TB: { top:  'bottom', bottom: 'top'    },
			LT: { left: 'top',   top:   'left'    },
			LB: { left: 'bottom',bottom: 'left'   },
			RT: { right:'top',   top:   'right'   },
			RB: { right:'bottom',bottom:'right'   },
		}
		const opposite = { left:'right', right:'left', top:'bottom', bottom:'top' }
		const CORNERS   = new Set(['LT','LB','RT','RB'])

		// Determine starting cell and entry edge from station A
		const stA = stations[0]
		let r, c, entryEdge
		if      (stA.edge === 'top')    { r = 1;       c = stA.col; entryEdge = 'top'    }
		else if (stA.edge === 'bottom') { r = rowCount; c = stA.col; entryEdge = 'bottom' }
		else if (stA.edge === 'left')   { r = stA.row;  c = 1;       entryEdge = 'left'   }
		else                            { r = stA.row;  c = colCount; entryEdge = 'right'  }

		const ordered = []
		const visited = new Set()

		while (true) {
			const cell = cells[r]?.[c]
			if (!cell || visited.has(cell.id)) break

			const piece    = solParts[cell.id]
			const exitMap  = piece && exits[piece]
			if (!exitMap) break

			const exitEdge = exitMap[entryEdge]
			if (!exitEdge) break

			ordered.push({ r, c, piece, entryEdge, exitEdge, isCorner: CORNERS.has(piece) })
			visited.add(cell.id)

			if      (exitEdge === 'right')  c++
			else if (exitEdge === 'left')   c--
			else if (exitEdge === 'bottom') r++
			else                            r--

			entryEdge = opposite[exitEdge]
			if (c < 1 || c > colCount || r < 1 || r > rowCount) break
		}

		return ordered
	}

	// ── Train animation icon ──────────────────────────────────────────────────
	// Replace `markup` with any SVG inner content to change the icon.
	// `naturalWidth` / `naturalHeight` must match the viewBox dimensions.
	// `displayHeight` controls the rendered size in grid SVG units (cells = 100).
	// The icon's top edge faces the direction of travel as it moves - commented out line 534
	app.helpers.trainIcon = {
		markup: `
			<path d="M17 19a2 2 0 11-4 0 2 2 0 014 0z" fill="#F17B2D"/>
			<path fill-rule="evenodd" clip-rule="evenodd"
				d="M0 20.03v35.958C0 58.214 1.71 60 3.849 60c2.138 0 3.905-1.786 3.905-4.012V39.941c.029-2.166 1.768-3.923 3.878-3.923 2.138 0 3.905 1.786 3.905 4.011v7.965c0 2.196 1.74 4.012 3.906 4.012 2.138 0 3.906-1.786 3.906-4.012V40c0-2.196 1.739-4.012 3.905-4.012 2.081 0 3.735 1.845 3.878 3.924v.059c0 2.225 1.767 4.04 3.934 4.04 2.166 0 3.934-1.815 3.934-4.04V20C39 8.96 30.276 0 19.529 0 8.78 0 0 8.99 0 20.03zM18 18a4 4 0 11-8 0 4 4 0 018 0zm8 4a4 4 0 100-8 4 4 0 000 8z"
				fill="#F17B2D"/>
			<path d="M29 19a2 2 0 11-4 0 2 2 0 014 0z" fill="#F17B2D"/>`,
		viewBox:       '0 0 39 60',
		naturalWidth:  39,
		naturalHeight: 60,
		displayHeight: 60,   // rendered height in SVG grid units (cells are 100 units)
	}

	app.helpers.startTrainAnimation = function (onComplete) {
		const ordered = app.helpers.traceTrackPath()
		if (ordered.length < 1) return false

		const SVG = document.getElementById('pinch-zoom-image')
		if (!SVG) return false

		const layout = app.gridLayout || { cellSize: 100, originX: 75, originY: 75 }
		const CS = layout.cellSize
		const OX = layout.originX
		const OY = layout.originY

		// SVG coordinate of the midpoint of a cell edge
		function edgePt(r, c, edge) {
			const x = OX + (c - 1) * CS
			const y = OY + (r - 1) * CS
			const h = CS / 2
			if (edge === 'left')   return [x,      y + h]
			if (edge === 'right')  return [x + CS, y + h]
			if (edge === 'top')    return [x + h,  y    ]
			/* bottom */           return [x + h,  y + CS]
		}

		// Build one continuous SVG path that mirrors the rendered track centreline.
		const [sx, sy] = edgePt(ordered[0].r, ordered[0].c, ordered[0].entryEdge)
		let pathD = `M ${sx},${sy}`
		for (const s of ordered) {
			const [ex, ey] = edgePt(s.r, s.c, s.exitEdge)
			if (s.isCorner) {
				// Cell centre — same control point used in trackPath Q curves
				const cx = OX + (s.c - 1) * CS + CS / 2
				const cy = OY + (s.r - 1) * CS + CS / 2
				pathD += ` Q ${cx},${cy} ${ex},${ey}`
			} else {
				pathD += ` L ${ex},${ey}`
			}
		}

		const NS = 'http://www.w3.org/2000/svg'

		const geomPath = document.createElementNS(NS, 'path')
		geomPath.setAttribute('d', pathD)
		geomPath.setAttribute('fill', 'none')
		geomPath.setAttribute('stroke', 'none')
		SVG.appendChild(geomPath)

		const totalLen = geomPath.getTotalLength()
		if (totalLen === 0) { geomPath.remove(); return false }

		// Visible trail — starts invisible, draws itself behind the icon
		const trailPath = document.createElementNS(NS, 'path')
		trailPath.setAttribute('d', pathD)
		trailPath.classList.add('train-tracks-train-trail')
		trailPath.style.strokeDasharray  = totalLen
		trailPath.style.strokeDashoffset = totalLen   // fully hidden initially
		SVG.appendChild(trailPath)

		// ── Build the icon element ─────────────────────────────────────────────
		const icon = app.helpers.trainIcon
		const scale = icon.displayHeight / icon.naturalHeight
		const dw    = icon.naturalWidth  * scale
		const dh    = icon.displayHeight

		const iconSVG = document.createElementNS(NS, 'svg')
		iconSVG.setAttribute('viewBox',  icon.viewBox)
		iconSVG.setAttribute('width',    dw)
		iconSVG.setAttribute('height',   dh)
		iconSVG.setAttribute('x',        -dw / 2)
		iconSVG.setAttribute('y',        -dh / 2)
		iconSVG.setAttribute('overflow', 'visible')
		iconSVG.innerHTML = icon.markup

		const iconGroup = document.createElementNS(NS, 'g')
		iconGroup.classList.add('train-tracks-train-icon')
		iconGroup.appendChild(iconSVG)
		SVG.appendChild(iconGroup)

		function travelAngle(dist) {
			const d1 = Math.min(dist, totalLen - 4)
			const d2 = d1 + 4
			const pa = geomPath.getPointAtLength(d1)
			const pb = geomPath.getPointAtLength(d2)
			
			//if we want the direction of the icon to follow the path
			//return Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI + 270
			
			return Math.atan2(pb.y - pa.y, pb.x - pa.x) / Math.PI
		}

		const duration = Math.max(900, ordered.length * 180)  // ms
		let startTs = null

		function frame(ts) {
			if (!startTs) startTs = ts
			const t    = Math.min((ts - startTs) / duration, 1)
			// Global ease-in-out over the full path length
			const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
			const dist = ease * totalLen

			const pt    = geomPath.getPointAtLength(dist)
			const angle = travelAngle(dist)
			iconGroup.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle})`)

			// Trail reveals exactly as far as the icon has travelled
			trailPath.style.strokeDashoffset = totalLen - dist

			if (t < 1) {
				requestAnimationFrame(frame)
			} else {
				// Snap cleanly to the very end
				const pEnd  = geomPath.getPointAtLength(totalLen)
				const aEnd  = travelAngle(totalLen)
				iconGroup.setAttribute('transform', `translate(${pEnd.x},${pEnd.y}) rotate(${aEnd})`)
				trailPath.style.strokeDashoffset = 0

				setTimeout(() => {
					iconGroup.remove()
					trailPath.remove()
					geomPath.remove()
					if (onComplete) onComplete()
				}, 200)
			}
		}

		requestAnimationFrame(frame)
		return true
	}

	app.helpers.resizeGrid = function () {
		const gameplay = document.getElementById('gameplay')
		const gameplayContainer = document.getElementById('gameplayContainer')

		if (!gameplay || !gameplayContainer) return

		gameplayContainer.removeAttribute('style')
		gameplay.removeAttribute('style')

		const IDEAL_GRID_SIZE = parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue('--ideal-grid-size')
		)

		const pinchZoom = document.getElementById('pinch-zoom-image')
		const COMPUTED_GRID_SIZE = pinchZoom ? pinchZoom.clientHeight : 0

		const { clientHeight: gameplayContainerHeight } = gameplayContainer
		const { clientHeight: gameplayHeight, clientWidth: gameplayWidth } = gameplay

		const needsResizing = gameplayHeight !== gameplayContainerHeight

		if (needsResizing) {
			const heightDifference = gameplayContainerHeight / gameplayHeight
			const adjustedSize = gameplayWidth * heightDifference

			gameplayContainer.style.overflowY = 'hidden'
			gameplay.style.maxInlineSize = IDEAL_GRID_SIZE + 'px'
			gameplay.style.inlineSize = Math.floor(adjustedSize) + 'px'
			gameplay.style.maxBlockSize = IDEAL_GRID_SIZE + 'px'
			gameplay.style.blockSize = Math.floor(adjustedSize) + 'px'
			gameplayContainer.style.maxBlockSize = IDEAL_GRID_SIZE + 'px'
			gameplayContainer.style.blockSize = Math.floor(adjustedSize) + 'px'
		} else {
			gameplay.style.blockSize = COMPUTED_GRID_SIZE + 4 + 'px'
			gameplayContainer.style.blockSize = COMPUTED_GRID_SIZE + 4 + 'px'
		}
	}
  app.helpers.reduceDataUserAnswers = function (data) {
    return data;
  };

  app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
    app.vue.data.admired = !!app.status.admired && !isStart;
    if (app.status.admired && !isStart) {
      app.vue.model.hideModal('completeSuccess');
    } else {
      if (!isStart && sendComplete) {
        app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      }

      app.helpers.showCompletionScreen(isStart);
    }
  };


  app.helpers.puzzleCompletedSuccessfully = function (isStart) {
    if (app.vue.data.config.hasTimer) {
      app.timer.stop();
    }

    app.helpers.saveUserPlayStatus();
    app.helpers.showCompletionScreen(isStart);
    app.helpers.checkAdmiredStatus(isStart, app.helpers.checkCompletedStatus());
  };

  app.helpers.getGridDimensions = function () {
    var obj = {
      rows: app.vue.model.puzzle.grid.length,
      cols: app.vue.model.puzzle.grid[0].length,
    };
    return obj;
  };

  app.helpers.loadActiveState = function () {
    return app.storagePuzzle.get('active').then(data => {
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

    return app.storageVariant.get('settings').then(data => {
      if (data !== null) {
        for (var i in data) {
          if (data !== null) {
            app.vue.data.userPuzzleSettings[i] = data[i];
          } else {
            app.vue.data.userPuzzleSettings[i] = defaultUserState.settings[i];
          }
        }
      } else {
        app.vue.data.userPuzzleSettings = defaultUserState.settings;
      }
    });
  };

  app.helpers.expandDataUserNotes = function (data) {
    var arr = [];
    if (!data) {
      return arr;
    }
    var cellCount = app.puzzle.height * app.puzzle.width;
    for (var cidx = 0; cidx < cellCount; cidx++) {
      var key = 'C_';
      key += cidx < 10 ? '0' : '';
      key += cidx;
      if (data[key]) {
        var arr2 = [];
        for (var i = 1; i <= 9; i++) {
          arr2.push(data[key].indexOf(i) > -1);
        }
        arr.push(arr2);
      } else {
        arr.push([false, false, false, false, false, false, false, false, false]);
      }
    }
    return arr;
  };


  app.helpers.reduceDataUserNotes = function (data) {
    var obj = {};
    for (var cidx = 0; cidx < data.length; cidx++) {
      var key = 'C_';
      key += cidx < 10 ? '0' : '';
      key += cidx;
      for (var nidx = 0; nidx < 9; nidx++) {
        if (data[cidx][nidx] === true) {
          obj[key] = obj[key] || '';
          obj[key] += nidx + 1;
        }
      }
    }
    return obj;
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

})()
