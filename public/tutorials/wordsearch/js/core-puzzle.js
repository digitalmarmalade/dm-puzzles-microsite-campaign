var app = window.app || {}
var vm = window.vm || {}

;(function () {
	'use strict'

	app.config = {
		el: '#app',
		id: null,
	}

	app.emitter = new TinyEmitter()
	app.handlers = app.handlers || {}
	app.helpers = app.helpers || {}

	app.media = {
		items: {},
		supports: {
			audio: document.createElement('audio'),
			video: document.createElement('video'),
		},
	}

	app.device = {
		settings: {},
	}

	//  is this a touch device or not - code does not pass lint but is most efficient cross-browser method (as used by modernizr)
	if (
		'ontouchstart' in window ||
		(window.DocumentTouch && document instanceof DocumentTouch)
	) {
		app.device.settings.isTouch = true
	} else {
		app.device.settings.isTouch = false
	}

	/**
	 * add event listeners to redict events to relevant handler
	 */
	app.helpers.addEventListeners = function () {
		document.addEventListener(
			'CellClick',
			e => {
				app.handlers.cellClick(e.detail.item, e)
			},
			false,
		)
		document.addEventListener(
			'ClueClick',
			e => {
				app.handlers.clueClick(e.detail.item, e)
			},
			false,
		)
		document.addEventListener(
			'LetterEntered',
			e => {
				app.handlers.letterEntered(e.detail.item, e)
			},
			false,
		)
		document.addEventListener(
			'LetterDeleted',
			e => {
				app.handlers.letterDeleted(e.detail.item, e)
			},
			false,
		)
		window.addEventListener('resize', () => {
			app.handlers.onResize()
		})
		var AUTO_RESUME_WITHIN_MS = 3000
		var hiddenAt = null

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				hiddenAt = Date.now()
				app.vue.methods.pauseGame?.(true)
				// flush the full progress snapshot so the host can persist on exit
				app.progress?.merge(app.progress.handlers.all()).flush()
				return
			}

			var awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt
			hiddenAt = null

			if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
				app.vue.methods.resumeGame?.()
			}
		})
		// best-effort final flush if the page is being torn down
		window.addEventListener('pagehide', () => {
			app.progress?.merge(app.progress.handlers.all()).flush()
		})
		screen.orientation.addEventListener('change', () => {
			app.handlers.onOrientationChange()
		})
	}

	app.helpers.dispatchEvent = function (name, data) {
		document.dispatchEvent(
			new CustomEvent(name, {
				detail: data,
			}),
		)
	}

	/**
	 * Get the location (row & col) of the specified (or active if not specifed) cell
	 * @return {object}
	 */
	app.helpers.getCellLocation = function (cell) {
		var dims = this.getGridDimensions()
		cell = cell || app.vue.data.active.cell
		var obj = {
			row: Math.ceil(cell / dims.cols),
			col: cell - (Math.ceil(cell / dims.cols) - 1) * dims.cols,
		}
		return obj
	}

	/**
	 * get the id of a cell at a specified col & row
	 *
	 * @param {int} col - column number
	 * @param {int} row - row number
	 * @returns {int} cellId
	 */
	app.helpers.getCellIdFromColRow = function (col, row) {
		'use strict'

		var o = this,
			cellId = row * app.vue.data.source.settings.colCount + col

		return cellId
	}

	/**
	 * get the ids of all cells in between specified cells
	 *
	 * @param {int} start - id of start cell
	 * @param {int} end - id of end cell
	 * @returns {array} list of cell ids
	 */
	app.helpers.getCellIdsBetweenGivenIds = function (start, end, includeGivens) {
		'use strict'

		includeGivens = includeGivens !== false

		var cells = [],
			cols = app.vue.data.source.settings.colCount,
			startRc = app.helpers.getColRowFromCellId(start),
			endRc = app.helpers.getColRowFromCellId(end)

		if (includeGivens) {
			cells.push(start)
		}

		var dr = startRc.row === endRc.row ? 0 : startRc.row > endRc.row ? -1 : 1
		var dc = startRc.col === endRc.col ? 0 : startRc.col > endRc.col ? -1 : 1

		var r = startRc.row
		var c = startRc.col

		for (var i = 0; i < cols; i++) {
			r += dr
			c += dc
			if (r === endRc.row && c === endRc.col) {
				break
			}
			var thisId = app.helpers.getCellIdFromColRow(c, r)
			cells.push(thisId)
		}

		if (includeGivens) {
			cells.push(end)
		}

		return cells
	}

	/**
	 * get the row and col of a cell with a specified id
	 *
	 * @param {int} id - cell id
	 * @returns {object}
	 */
	app.helpers.getColRowFromCellId = function (id) {
		'use strict'

		var o = this,
			colRow = {}

		colRow.row = Math.floor(id / app.vue.data.source.settings.colCount)
		colRow.col = Math.floor(id - colRow.row * app.vue.data.source.settings.colCount)

		return colRow
	}

	/**
	 * Get the default active state object
	 * @return {object}
	 */
	app.helpers.getDefaultActiveState = function () {
		return {}
	}

	/**
	 * Get the default answer state object
	 * @return {object}
	 */
	app.helpers.getDefaultUserPlayStatus = function () {
		return {
			first: Date.now(),
			last: Date.now(),
			started: null,
			completed: null,
			admired: null,
			progress: 0,
			source: (location.params && location.params.source) || 'unknown',
		}
	}

	/**
	 * Get the default answer state object
	 * @return {object}
	 */
	app.helpers.getDefaultUserState = function () {
		return app.vue.data.user
	}

	app.helpers.parseArchiveBaseUrl = function (url) {
		return url ? new URL(url) : null
	}

	app.helpers.getFeedbackLinksObject = function (archive) {
		return {
			correct: app.helpers.getFeedbackCorrectObject(archive),
			incorrect: app.helpers.getFeedbackIncorrectObject(archive),
		}
	}

	app.helpers.getFeedbackCorrectObject = function (archive) {
		const base =
			app.helpers.parseArchiveBaseUrl(archive.config?.baseUrl) ?? document.referrer

		const obj = {
			links: [],
			subtitle: `You completed the ${app.config.variant.toLowerCase()} in `,
			title: 'Well done!',
			view_all_url:
				base +
				`puzzles/?v=${app.config.variant.replace(/\s+/g, '').toLowerCase().trim()}`,
		}

		const sameLink = app.helpers.getFeedbackLinkObject(app.config.variant, archive)
		const diffLink = app.helpers.getFeedbackLinkObject(app.config.related, archive)

		obj.links.push(sameLink?.title ? sameLink : null)
		obj.links.push(diffLink?.title ? diffLink : null)

		return obj
	}

	app.helpers.getFeedbackIncorrectObject = function (archive) {
		const base =
			app.helpers.parseArchiveBaseUrl(archive.config?.baseUrl) ?? document.referrer

		const obj = {
			links: [],
			subtitle: "It's not quite right yet.",
			title: 'Keep Trying!',
			view_all_url:
				base +
				`puzzles/?v=${app.config.variant.replace(/\s+/g, '').toLowerCase().trim()}`,
		}

		const sameLink = app.helpers.getFeedbackLinkObject(app.config.variant, archive)
		const diffLink = app.helpers.getFeedbackLinkObject(app.config.related, archive)

		obj.links.push(sameLink?.title ? sameLink : null)
		obj.links.push(diffLink?.title ? diffLink : null)

		return obj
	}

	app.helpers.getFeedbackLinkObject = function (variant, archive) {
		const { today, puzzles, variants, config } = archive
		const id = today && variant !== app.config.variant ? today[variant] : undefined
		const base = app.helpers.parseArchiveBaseUrl(config?.baseUrl) ?? document.referrer

		let puzObj = null

		if (!id) {
			const variantSlugs = variants[variant]

			if (!variantSlugs) return null

			const first = variantSlugs[0]
			puzObj = first !== app.config.slug ? puzzles[first] : null

			for (let i = 0; i < variantSlugs.length; i++) {
				if (variantSlugs[i] === app.config.slug && variantSlugs.length > i + 1) {
					puzObj = puzzles[variantSlugs[i + 1]]
					break
				}
			}
		} else {
			puzObj = puzzles[id]
		}

		if (puzObj) {
			const title = puzObj.name ?? puzObj.title

			return {
				title,
				url: `${base}puzzle/?p=${puzObj.slug}`,
				link_text: title,
				image: app.helpers.getFeedbackLinkImagePath(
					puzObj.variant.replace(/\s+/g, '').toLowerCase(),
				),
			}
		}

		return null
	}

	app.helpers.getFeedbackLinkImagePath = function (slug) {
		return 'assets/puzzle-icons/' + slug + '.svg'
	}

	/**
	 * Get the dimensions (rows & cols) of the grid
	 * @return {object}
	 */
	app.helpers.getGridDimensions = function () {
		var obj = {
			rows: app.vue.model.puzzle.grid.length,
			cols: app.vue.model.puzzle.grid.length,
		}
		return obj
	}

	app.helpers.initialiseAnalytics = function () {
		//  puzzle specific analytics code here
	}

	app.helpers.initPuzzle = function () {
		//  puzzle specific init code here
	}

	app.helpers.error = function (err) {
		const node = document.getElementById('err')

		if (node) {
			document.getElementById('innaThaSpinner')?.remove()

			node.textContent = typeof err === 'string' ? err : err.message
			node.style.opacity = 1
			node.style.pointerEvents = 'auto'
		}

		throw err
	}

	app.helpers.toEndpoint = function (url, data) {
		// TODO
	}

	app.helpers.expandDataUserAnswers = function (data) {
		return data ? data : []
	}

	/**
	 * Load active state from storage
	 * If not found then load default active state and save
	 */
	app.helpers.loadActiveState = function () {
		return app.storagePuzzle.get('active').then(data => {
			if (data !== null) {
				app.vue.data.active = data
			} else {
				app.vue.data.active = app.helpers.getDefaultActiveState()
				app.helpers.saveActiveState()
			}

			app.vue.data.last['cell'] = app.vue.data.active.cell
		})
	}

	app.helpers.loadPuzzleSettings = function () {
		var defaultUserState = app.helpers.getDefaultUserState()

		return app.storageVariant.get('settings').then(data => {
			if (data !== null) {
				for (var i in data) {
					if (data !== null) {
						app.vue.data.userPuzzleSettings[i] = data[i]
					} else {
						app.vue.data.userPuzzleSettings[i] = defaultUserState[i]
					}
				}
			} else {
				app.vue.data.userPuzzleSettings = defaultUserState
			}
		})
	}

	/**
	 * Load play status from storage
	 * If not found then load default status and save
	 */
	app.helpers.loadUserPlayStatus = function () {
		if (app.config.puzzleApp) {
			return Promise.resolve(null)
		}

		return app.storagePuzzle.get('status').then(data => {
			app.status = data || app.helpers.getDefaultUserPlayStatus()
			app.status.last = Date.now()
			app.helpers.saveUserPlayStatus()
		})
	}

	/**
	 * Load answer state from storage
	 * If not found then load default answer state and save
	 */
	app.helpers.loadUserState = function () {
		if (app.config.puzzleApp) {
			return Promise.resolve(null)
		}

		return app.storagePuzzle.get('user').then(data => {
			const defaultUserState = app.helpers.getDefaultUserState()

			if (data !== null) {
				app.vue.data.user = { ...defaultUserState, ...data }
				app.vue.data.user.answers = app.helpers.expandDataUserAnswers(
					app.vue.data.user.answers,
				)
			} else {
				app.vue.data.user = defaultUserState
			}
			app.helpers.saveUserState()
		})
	}

	/**
	 * Load time from storage
	 */
	app.helpers.loadUserTime = function () {
		if (app.config.puzzleApp) {
			return Promise.resolve(null)
		}

		return app.storagePuzzle.get('time').then(data => {
			app.vue.data.time = data || 0
		})
	}

	/**
	 * Load puzzle state
	 * Loads active and answer states from storage
	 */
	app.helpers.loadPuzzleState = function () {
		return Promise.all([
			app.helpers.loadActiveState(),
			app.helpers.loadUserPlayStatus(),
			app.helpers.loadPuzzleSettings(),
			app.helpers.loadUserState(),
			app.helpers.loadUserTime(),
		])
	}

	/**
	 * Mounted. Called when Vue has finished initialising
	 */
	app.helpers.mounted = function (vm) {
		//console.log('mounted');
	}

	/* Keep app.vue.data.themeMode in step with the resolved theme: the
	 * data-theme-status attribute wins, matchMedia is the fallback. Idempotent so
	 * puzzles that both wrap the base mounted and call it directly are safe. */
	app.helpers.initTheme = function () {
		if (app._themeInitialised) return
		app._themeInitialised = true

		var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
		var detectThemeMode = function () {
			var attr = document.documentElement.getAttribute('data-theme-status')
			if (attr === 'dark' || attr === 'light') {
				app.vue.data.themeMode = attr
				return
			}
			app.vue.data.themeMode = darkQuery.matches ? 'dark' : 'light'
		}
		detectThemeMode()
		darkQuery.addEventListener('change', detectThemeMode)
		new MutationObserver(detectThemeMode).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme-status'],
		})
	}

	/**
	 * Put URL parameters into an object
	 * source: https://css-tricks.com/snippets/javascript/get-url-variables/
	 * @param  {String} url The URL
	 * @return {Object}     The URL parameters
	 */
	app.helpers.parseUrlParams = function (url) {
		url = url || window.location.href
		var params = {}
		var parser = document.createElement('a')
		parser.href = url
		var query = parser.search.substring(1)
		var vars = query.split('&')
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split('=')
			params[pair[0]] = decodeURIComponent(pair[1])
		}
		location.params = params
		return params
	}

	app.helpers.puzzleCompletedSuccessfully = function (isStart) {
		if (app.vue.data.config.hasTimer) {
			app.timer.stop()
		}

		app.helpers.saveUserPlayStatus()
		app.helpers.showCompletionScreen(isStart)
		app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus())
	}

	app.helpers.showPuzzleOrStart = function () {
		app.storageVariant.get('onboarding').then(data => {
			if (data !== null) {
				app.helpers.puzzleStart()
			} else {
				app.vue.methods.showModalHelp()
				app.storageVariant.set('onboarding', true)
			}
		})
	}

	/**
	 * Process settings.
	 * Place them into correct objects
	 * @return {object}
	 */
	app.helpers.processSettings = function (settings) {
		for (var i in settings.user) {
			app.vue.data.userPuzzleSettings[i] = settings.user[i].default
		}
		for (var i in settings.puzzle) {
			app.vue.data.config[i] = settings.puzzle[i]
		}
	}

	/**
	 * Reset answer state to default
	 */
	app.helpers.resetUserState = function () {
		app.vue.data.user = app.helpers.getDefaultUserState()
		app.helpers.saveUserState()
		app.timer.restart()
		app.vue.data.time = app.timer.get()
		app.helpers.saveUserTime()
		app.helpers.saveUserPlayStatus()
	}

	/**
	 * Reveal the specified cell
	 */
	app.helpers.revealCell = function (id) {
		app.vue.data.user.answers['cell_' + (id - 1)] = app.vue.model.puzzle.cells[id].letter
		app.helpers.saveUserState()
	}

	app.helpUsed = function (cat, subcat) {
		'use strict'

		app.vue.data.user.help = app.vue.data.user.help || {}
		app.vue.data.user.help[cat] = app.vue.data.user.help[cat] || {}
		app.vue.data.user.help[cat][subcat] = app.vue.data.user.help[cat][subcat] || 0
		app.vue.data.user.help[cat][subcat]++
		if (cat === 'check') {
			app.vue.data.user.checksUsed = (app.vue.data.user.checksUsed || 0) + 1
		}
		app.helpers.saveUserState()
	}

	app.helpers.recordCellsRevealed = function (count) {
		app.vue.data.user.cellsRevealed =
			(app.vue.data.user.cellsRevealed || 0) + (count || 1)
		app.helpers.saveUserState()
	}

	app.helpers.recordAutoCheck = function (wrong) {
		if (!wrong) return
		const text = JSON.stringify(app.vue.data.user.answers)
		let hash = 5381
		for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
		if (app.vue.data.user.autoChecked === hash) return
		app.vue.data.user.autoChecked = hash
		app.vue.data.user.checksUsed = (app.vue.data.user.checksUsed || 0) + wrong
		app.helpers.saveUserState()
	}

	app.helpers.recordCheckUsed = function () {
		app.vue.data.user.checksUsed = (app.vue.data.user.checksUsed || 0) + 1
		app.helpers.saveUserState()
	}

	/**
	 * Save active state to storage
	 */
	app.helpers.saveActiveState = function () {
		app.storagePuzzle.set('active', app.vue.data.active)
	}

	/**
	 * Save users puzzle settings to storage
	 */
	app.helpers.savePuzzleState = function () {
		app.storageVariant.set('settings', app.vue.data.userPuzzleSettings)
	}

	/**
	 * Save answer state to storage
	 */
	app.helpers.saveUserPlayStatus = function () {
		app.storagePuzzle.set('status', app.status)
		app.progress?.update('status')
	}

	/**
	 * Get user state for storing or sending
	 */
	app.helpers.getUserState = function () {
		return JSON.parse(JSON.stringify(app.vue.data.user))
	}

	/**
	 * Save answer state to storage
	 */
	app.helpers.saveUserState = function () {
		app.storagePuzzle.set('user', app.helpers.getUserState())
		app.progress?.update('user')
	}

	/**
	 * Save elapsed time to storage
	 */
	app.helpers.saveUserTime = function () {
		app.storagePuzzle.set('time', app.vue.data.time)
		app.progress?.update('time')
	}

	/**
	 * Set analytics config object
	 */
	app.helpers.setAnalyticsConfig = function (cfg) {
		app.analyticsConfig = cfg
	}

	/**
	 * logic to decide whether wrapper click clears actions
	 */
	app.helpers.shouldWrapperClickResetActions = function () {
		if (app.vue.data.show.settings) {
			return false
		}
		return true
	}

	/**
	 * Save timestamp for specified item
	 * @param {string} item
	 */
	app.helpers.tsSet = function (item) {
		app.vue.data.ts[item] = Date.now()
	}

	/**
	 * Check timestamps for specified items to determine which came first
	 * @param {string} whenA
	 * @param {string} whenB
	 * @return {boolean} whether first param timestamp is older than second
	 * @return {integer} -1, 0 or 1 as detailed in comments
	 */
	app.helpers.tsThisBeforeThat = function (whenA, whenB) {
		//  neither param defined; return 0
		if (app.vue.data.ts[whenA] === undefined && app.vue.data.ts[whenB] === undefined) {
			return 0
		}
		//  param 2 not defined; return -1
		if (app.vue.data.ts[whenB] === undefined) {
			return -1
		}
		//  param 1 not defined; return 1
		if (app.vue.data.ts[whenA] === undefined) {
			return 1
		}
		//  return whether param 1 happened before param 2
		return app.vue.data.ts[whenB] - app.vue.data.ts[whenA] > 0
	}

	app.helpers.checkStartedStatus = function () {
		if (app.status.started === null) {
			app.status.started = Date.now()
			app.helpers.dispatchEvent('puzzlestart', app.progress?.handlers.all())
			app.helpers.saveUserPlayStatus()
		}
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

	app.helpers.showConfetti = function () {
		confetti.maxCount = 300
		confetti.alpha = 0.8
		confetti.start(2000)
	}

	app.helpers.showCompletionScreen = function (isStart) {
		if (isStart) {
			app.vue.model.showModal('completeSuccess')
			app.helpers.showConfetti()
		} else if (!app.vue.model.stateModal('completeSuccess')) {
			setTimeout(() => {
				app.vue.model.showModal('completeSuccess')
				app.helpers.showConfetti()
			}, 500)
		}
	}

	app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
		if (app.status.admired && !isStart) {
			app.vue.model.hideModal('completeSuccess')
		} else {
			if (sendComplete) {
				app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all())
			}

			app.helpers.showCompletionScreen(isStart)
		}
	}

	app.helpers.updateBreakpoints = function () {
		app.vue.data.state.breakpoints.xs = window.matchMedia('(max-width: 399.99px)').matches

		app.vue.data.state.breakpoints.sm = window.matchMedia(
			'(min-width: 400px) and (max-width: 719.99px)',
		).matches

		app.vue.data.state.breakpoints.md = window.matchMedia(
			'(min-width: 720px) and (max-width: 1023.99px)',
		).matches

		app.vue.data.state.breakpoints.lg = window.matchMedia('(min-width: 1024px').matches
	}

	/* No-op default; block-based puzzles (CellBlocks) override with a real impl.
	 * Keeps mountUiHelpers safe for puzzles that have no coloured blocks. */
	app.helpers.setPuzzleBlockColours = function () {}

	app.helpers.hideSpinner = function () {
		const hide = () => {
			const spinner = document.getElementById('spinner')
			if (spinner) spinner.style.display = 'none'
		}

		if (!document.fonts || !document.fonts.ready) {
			hide()
			return
		}

		let hidden = false
		const hideOnce = () => {
			if (hidden) return
			hidden = true
			hide()
		}

		/* font-display:swap fonts aren't fetched until text using them is painted,
		 * but the spinner covers that text — so kick the downloads off ourselves
		 * while the spinner is still up, then wait on them. Otherwise fonts.ready
		 * resolves with nothing pending and the swap flashes after the reveal. */
		const faces = []
		try {
			document.fonts.forEach(face => faces.push(face.load().catch(() => {})))
		} catch (e) {
			/* older FontFaceSet without forEach — fall back to fonts.ready only */
		}

		Promise.all(faces)
			.then(() => document.fonts.ready)
			.then(hideOnce)

		/* Never let a stalled font hold the spinner hostage. */
		setTimeout(hideOnce, 2000)
	}

	app.helpers.mountUiHelpers = function () {
		app.helpers.updateBreakpoints()
		app.helpers.setPuzzleBlockColours()

		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
		})

		app.helpers.hideSpinner()
	}

	app.helpers.screenOrientation = function () {
		const sizeQuery = window.matchMedia('(min-width: 720px)')
		const orientationQuery = window.matchMedia('(orientation: landscape)')

		app.vue.data.state.lockScreen = !sizeQuery.matches && orientationQuery.matches
	}

	app.helpers.resizeGrid = function () {}

	app.handlers.onResize = function () {
		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
			app.helpers.screenOrientation()
			app.helpers.updateBreakpoints()
		})
	}

	app.handlers.onOrientationChange = function () {
		requestAnimationFrame(() => {
			app.helpers.resizeGrid()
			app.helpers.screenOrientation()
			app.helpers.updateBreakpoints()
		})
	}

	app.helpers.handleTheme = function (theme) {
		if (theme === 'system') {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
		}

		document.documentElement.setAttribute('data-theme', theme)
	}

	/**
	 * Deeply de-proxy Vue reactive data, producing a plain, JSON-safe copy.
	 *
	 * Applies `Vue.toRaw` at every node and breaks circular back-references so
	 * the result is always safe for `structuredClone`/`JSON.stringify`
	 * crossing the message boundary.
	 *
	 * @param {unknown} value
	 * @param {WeakSet<object>} [seen]
	 * @returns {unknown}
	 */
	app.helpers.deproxy = function (value, seen) {
		// primitives pass straight through
		if (value === null || typeof value !== 'object') return value

		// unwrap Vue refs (they are objects with a .value, not proxies)
		if (Vue.isRef(value)) return app.helpers.deproxy(value.value, seen)

		let raw = value

		try {
			const unwrapped = Vue.toRaw(value)
			if (unwrapped !== value) raw = unwrapped
		} catch {
			// not a Vue proxy / raw not exposable — keep as-is
		}

		// primitives after unwrap don't need recursion
		if (raw === null || typeof raw !== 'object') return raw

		// stop when we meet an object we've already copied. Some data points
		// back to itself, which would loop forever and crash JSON.stringify.
		// The `seen` list remembers what we've visited; if we hit it again,
		// we skip it (return undefined) instead of going round again
		seen = seen || new WeakSet()

		if (seen.has(raw)) return undefined
		seen.add(raw)

		if (Array.isArray(raw)) {
			const arr = Array.from({ length: raw.length })

			for (let i = 0; i < raw.length; i++) {
				arr[i] = app.helpers.deproxy(raw[i], seen)
			}

			return arr
		}

		const keys = Object.keys(raw)
		const out = {}

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			out[key] = app.helpers.deproxy(raw[key], seen)
		}

		return out
	}

	app.helpers.isMicrosite = function () {
		if (app.config.puzzleApp) return true
		if (window.parent === window) return false

		try {
			return !!window.parent.channel
		} catch {
			return false
		}
	}

	/**
	 * Core init method
	 * @param {object} settings
	 */
	app.init = function (settings) {
		app.setup.init(settings)
	}
})()
