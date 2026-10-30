var app = window.app || {}
var vm = window.vm || {}

;(function () {
	'use strict'

	app.vue = {
		beforeMount: () => {},
		computed: {},
		created: () => {},
		data: Vue.reactive({
			themeMode: 'light',
			active: {},
			blind: {
				letterCorrect: false,
				wordCorrect: false,
				gridCorrect: false,
				gridIncorrect: false,
			},
			check: {
				grid: false,
				letter: null,
				word: null,
			},
			config: {},
			feedback: {},
			keyboard: null,
			locale: {},
			last: {},
			links: {
				share: '',
			},
			modals: {
				visible: [],
			},
			modes: {
				pencil: false,
			},
			print: {
				showSolution: false,
				puzzleState: 'blank',
				clueTextSize: 0,
				gridTextSize: 0,
				gridOpacity: 100,
				// UI flags for the shared print modal — puzzles opt in via their overrides.
				hasGridTextSize: false,
				hasClueTextSize: false,
				gridTextSizeSelector: '.cell-number',
			},
			reveal: {
				grid: false,
			},
			show: {
				hintsMenu: false,
				revealGridConfirm: false,
			},
			source: {},
			state: {
				suppressWrapperClick: false,
				isPaused: false,
				wasAutoPaused: false,
				showTools: true,
				breakpoints: {
					xs: window.matchMedia('(max-width: 399.99px)').matches,
					sm: window.matchMedia('(min-width: 400px and max-width: 719.99px)').matches,
					md: window.matchMedia('(min-width: 720px and max-width: 1023.99px').matches,
					lg: window.matchMedia('(min-width: 1024px)').matches,
				},
				lockScreen: false,
				isPrinting: false,
				theme: 'system',
				themeOptions: ['system', 'light', 'dark'],
				isThemeable: false,
			},
			ts: {},
			user: {
				answers: {},
				notes: {},
				settings: {
					textSize: 0,
					gridResize: 0,
				},
			},
			userPuzzleSettings: {},
		}),
		methods: {},
		mounted: () => {},
		watch: {},
	}

	/*  ---------------------------  */
	/*    Vue Computed Properties    */
	/*  ---------------------------  */

	app.vue.computed.isCompleted = function () {
		return this.$root.totalCellsPercent === 100
	}

	app.vue.computed.isCompletedWithoutErrors = function () {
		var correct = this.userString === app.vue.data.source.copy.settings.solution

		if (correct) {
			app.timer.stop()
		}

		return correct
	}

	app.vue.computed.isCompletionOverlayVisible = function () {
		//  if not completed then definitely do not show overlay
		if (!this.$root.isCompleted) {
			return false
		}
		//  if show corrections mode
		if (this.user.settings.showCorrections) {
			return false // TODO
		}
		//  only if user has entered a letter since closing overlay
		var whenResult = app.helpers.tsThisBeforeThat(
			'hideCompletionOverlay',
			'letterEntered',
		)
		return whenResult === 1 || whenResult === true
	}

	app.vue.computed.lang = function () {
		return this.locale?.lexemes ?? {}
	}

	app.vue.computed.keys = function () {
		var keyboard = this.keyboard || []
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
				this.user.answers['cell_' + (i - 1)] !== this.source.copy.settings.solution[i - 1]
			) {
				errors.push(i)
			}
		}
		return errors
	}

	app.vue.computed.puzzle = function () {
		return app.puzzle
	}

	app.vue.computed.statHighlight = function () {
		const time = app.vue.data.time
		const reveals = app.vue.data.user.cellsRevealed || 0

		const stats = (app.puzzle && app.puzzle.stats) || this.getMockStats()
		if (!stats) return ''

		const t = stats.time
		if (t) {
			if (t.ever != null && time <= t.ever)
				return this.lang.completion_stat_time_bestEver || ''
			if (t.week != null && time <= t.week)
				return this.lang.completion_stat_time_bestWeek || ''
			if (t.last != null && time < t.last) {
				return (this.lang.completion_stat_time_better || '').replaceAll(
					'[[delta]]',
					this.formatDuration(t.last - time),
				)
			}
		}

		const r = stats.reveals
		if (r && r.last != null && reveals < r.last) {
			const delta = r.last - reveals
			const key =
				delta === 1
					? 'completion_stat_reveals_better_one'
					: 'completion_stat_reveals_better_other'
			return (this.lang[key] || '').replaceAll('[[delta]]', delta)
		}

		return ''
	}

	//  Display form of a puzzle number ("No. 12"), per locale; '' when there's no number.
	app.helpers.numberLabel = function (number) {
		if (!number) return ''

		const lexemes = (app.vue.data.locale && app.vue.data.locale.lexemes) || {}

		return (lexemes.general_number_label || 'No. [[number]]').replaceAll(
			'[[number]]',
			number,
		)
	}

	app.vue.computed.formattedMeta = function () {
		let {
			variant = '',
			title = '',
			number = '',
			difficulty = '',
		} = app.vue.data.source.meta

		//  meta.number can arrive as a number; the "No " checks below need a string.
		number = number == null ? '' : String(number)

		const pattern = /\d+/
		const match = pattern.exec(title)
		const noStr = 'No '

		if (match) {
			const [numberInTitle] = match
			const numberIndex = match.index
			const numberPreceededByNo = title.slice(numberIndex - 3, numberIndex) === noStr
			const difficultySupercedesNumber = title
				.substring(numberIndex + numberInTitle.length)
				.trim()

			title = title.slice(0, numberPreceededByNo ? numberIndex - 3 : numberIndex)
			number = String(number) || numberInTitle
			difficulty = difficulty || difficultySupercedesNumber
		}

		const strExistsInNumber = number.slice(0, 3) === noStr

		if (strExistsInNumber) {
			number = number.slice(3, number.length)
		}

		return {
			variant,
			title,
			number,
			numberLabel: app.helpers.numberLabel(number),
			difficulty,
		}
	}

	app.vue.computed.themeOptions = function () {
		return [
			{ label: 'Light', value: 'light' },
			{ label: 'Dark', value: 'dark' },
			{ label: 'System', value: 'system' },
		]
	}

	app.vue.computed.textSizeClass = function () {
		return 'font-size-' + app.vue.data.userPuzzleSettings.textSize
	}

	app.vue.computed.timerDisplay = function () {
		var duration = app.vue.data.time

		var days = Math.floor(duration / (60 * 60 * 24))
		duration -= days * (60 * 60 * 24)

		var hours = Math.floor(duration / (60 * 60))
		duration -= hours * (60 * 60)

		var minutes = Math.floor(duration / 60)
		duration -= minutes * 60

		var seconds = duration

		var pad = function (n) {
			return n < 10 ? '0' + n : '' + n
		}

		if (days > 0) return days + ':' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
		if (hours > 0) return hours + ':' + pad(minutes) + ':' + pad(seconds)
		return minutes + ':' + pad(seconds)
	}

	app.vue.computed.hintsUsed = function () {
		return (
			(app.vue.data.user.cellsRevealed || 0) > 0 ||
			(app.vue.data.user.checksUsed || 0) > 0
		)
	}

	app.vue.computed.hintsSummary = function () {
		var reveals = app.vue.data.user.cellsRevealed || 0
		var checks = app.vue.data.user.checksUsed || 0
		var parts = []
		if (reveals > 0)
			parts.push(
				(
					this.lang[
						reveals === 1
							? 'modal_completed_correct_hints_reveals_one'
							: 'modal_completed_correct_hints_reveals_other'
					] || ''
				).replaceAll('[[n]]', reveals),
			)
		if (checks > 0)
			parts.push(
				(
					this.lang[
						checks === 1
							? 'modal_completed_correct_hints_checks_one'
							: 'modal_completed_correct_hints_checks_other'
					] || ''
				).replaceAll('[[n]]', checks),
			)
		return parts.join(', ')
	}

	app.vue.computed.relatedGame = function () {
		var sent = null
		try {
			sent =
				window.parent !== window && window.parent.puzzleApp
					? window.parent.puzzleApp.related
					: null
		} catch (e) {}

		var game = null
		if (sent && sent.url && sent.title) {
			game = {
				heading: sent.heading || '',
				url: sent.url,
				title: sent.title,
				icon: sent.icon || '',
				theme: String(sent.theme || '')
					.toLowerCase()
					.replace(/[^a-z0-9]/g, ''),
				target: sent.target || '_parent',
			}
		} else {
			var links =
				this.puzzle &&
				this.puzzle.feedback &&
				this.puzzle.feedback.correct &&
				this.puzzle.feedback.correct.links
			var link = links && links[1]
			if (!link || !link.url) return null

			game = {
				heading: '',
				url: link.url,
				title: link.link_text || link.title || '',
				icon: link.image || '',
				theme: '',
				target: link.target || '_self',
			}
		}

		game.iconMask = game.icon ? 'url(' + JSON.stringify(game.icon) + ')' : ''
		return game
	}

	app.vue.computed.totalCellsCompleted = function () {
		const answers = app.vue.data.user.answers

		return Object.keys(answers)
			.map(item => answers[item])
			.join('')
			.replace(/\s/g, '').length
	}

	app.vue.computed.totalCellsPercent = function () {
		return (this.$root.totalCellsCompleted / this.$root.puzzle.counts.cells.active) * 100
	}

	app.vue.computed.userSettings = function () {
		return JSON.stringify(this.$root.userPuzzleSettings)
	}

	app.vue.computed.userString = function () {
		var rows = this.puzzle.grid.length,
			cols = this.puzzle.grid.length,
			string = ''

		for (var i = 0; i < rows * cols; i++) {
			string += this.user.answers['cell_' + i]
		}

		return string
	}

	app.vue.computed.overlayState = function () {
		const visibleModals = app.vue.data.modals.visible

		if (!visibleModals.length) {
			return 'hidden'
		}

		return 'showing'
	}

	/*  ----------------------  */
	/*    Vue Initialisation    */
	/*  ----------------------  */

	app.vue.init = function (el) {
		app.vue.model = vm.mount(el ?? '#app')
		app.emitter.emit('init')
	}

	/*  ----------------------  */
	/*    Vue Global Methods    */
	/*  ----------------------  */

	app.vue.methods.changePrintPuzzleState = function (value) {
		app.vue.data.print.puzzleState = value
	}

	app.vue.methods.changePrintGridOpacity = function (value) {
		app.vue.data.print.gridOpacity = value
	}

	// Shared print modal state control. Drives both print.html contracts at once:
	// showSolution (boolean) for grid puzzles, puzzleState (enum) for block puzzles.
	app.vue.methods.changePrintState = function (value) {
		app.vue.data.print.puzzleState = value
		app.vue.data.print.showSolution = value === 'solution'
	}

	app.vue.methods.decreasePrintGridTextSize = function () {
		if (app.vue.data.print.gridTextSize === 0) {
			return
		}

		app.vue.data.print.gridTextSize--
	}

	app.vue.methods.increasePrintGridTextSize = function () {
		if (app.vue.data.print.gridTextSize === 2) {
			return
		}

		app.vue.data.print.gridTextSize++
	}

	app.vue.methods.decreasePrintClueTextSize = function () {
		if (app.vue.data.print.clueTextSize === 0) {
			return
		}

		app.vue.data.print.clueTextSize--
	}

	app.vue.methods.increasePrintClueTextSize = function () {
		if (app.vue.data.print.clueTextSize === 2) {
			return
		}

		app.vue.data.print.clueTextSize++
	}

	app.vue.methods.checkGrid = function () {
		app.vue.data.check.grid = true
		app.helpUsed('check', 'grid')
	}

	app.vue.methods.checkLetter = function () {
		app.vue.data.check.letter = app.vue.data.active.cell
		app.helpUsed('check', 'cell')
	}

	app.vue.methods.checkWord = function () {
		app.vue.data.check.word = app.vue.model.activeWord
		app.helpUsed('check', 'word')
	}

	app.vue.methods.getEventData = function (item, type) {
		return {
			detail: {
				item,
				type,
			},
		}
	}

	app.vue.methods.getPuzzleObject = function () {
		return app.vue.data.source
	}

	app.vue.methods.hideBlind = function () {
		app.vue.data.blind.letterCorrect = false
		app.vue.data.blind.wordCorrect = false
		app.vue.data.blind.gridCorrect = false
		app.vue.data.blind.gridIncorrect = false
	}

	app.vue.methods.getTitlePuzzleObject = function (puzzle) {
		return puzzle
	}

	app.vue.methods.hideCompletionOverlay = function () {
		app.helpers.tsSet('hideCompletionOverlay')
	}

	app.vue.methods.hideModal = function (modal) {
		if (modal === 'help' || app.vue.data.modals.visible.indexOf('help') >= 0) {
			/* start() with no argument would reset the count to zero. */
			app.timer?.start(app.vue.data.time)
		}

		if (modal === undefined) {
			app.vue.data.modals.visible = []
		}

		if (app.vue.data.modals.visible.indexOf(modal) >= 0) {
			app.vue.data.modals.visible.splice(app.vue.data.modals.visible.indexOf(modal), 1)
		}
	}

	app.vue.methods.toggleModal = function (modal) {
		app.vue.data.state.suppressWrapperClick = true
		app.vue.methods.resetActions()

		if (app.vue.data.modals.visible.indexOf(modal) >= 0) {
			app.vue.methods.hideModal(modal)
		} else {
			app.vue.methods.hideModal()
			app.vue.methods.showModal(modal, false)
		}

		setTimeout(() => {
			app.vue.data.state.suppressWrapperClick = false
		}, 0)
	}

	app.vue.methods.modeSet = function (item, value) {
		app.vue.data.modes[item] = value
		app.vue.methods.resetActions()
	}

	app.vue.methods.resetActions = function (exclude) {
		if (exclude !== 'check.grid') {
			app.vue.data.check.grid = false
		}

		if (exclude !== 'check.letter') {
			app.vue.data.check.letter = null
		}

		if (exclude !== 'check.word') {
			app.vue.data.check.word = null
		}

		if (exclude !== 'reveal.grid') {
			app.vue.data.reveal.grid = false
		}
	}

	app.vue.methods.resetGrid = function () {
		app.helpers.resetUserState()
		app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all())

		app.vue.methods.setActiveClue(1)

		if (app.vue.data.config.hasTimer) {
			app.timer.restart()
		}

		app.vue.methods.hideModal()
	}

	app.vue.methods.revealGrid = function () {
		app.vue.data.reveal.grid = true
		app.helpUsed('reveal', 'grid')
	}

	app.vue.methods.revealLetter = function () {
		app.helpers.revealCell(app.vue.data.active.cell)
		app.helpUsed('reveal', 'cell')
		app.helpers.tsSet('letterEntered')
	}

	app.vue.methods.revealWord = function () {
		const cells = app.puzzle.words[app.vue.model.activeWord].cells
		app.helpUsed('reveal', 'word')

		for (let r = 0; r < cells.length; r++) {
			app.helpers.revealCell(cells[r].id)
		}

		app.helpers.tsSet('letterEntered')
	}

	app.vue.methods.setSource = function (data) {
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

	app.vue.methods.setShareLink = function (data) {
		app.vue.data.links.share = document.referrer

		try {
			app.vue.data.links.share = window.top.location.href
		} catch (e) {}
	}

	app.vue.methods.showModal = function (modal, resetActions = false) {
		if (!app.vue.methods.stateModal(modal)) {
			app.vue.data.modals.visible.push(modal)
		}

		if (resetActions) {
			app.vue.methods.resetActions()
		}
	}

	app.vue.methods.stateModal = function (modal) {
		return app.vue.data.modals.visible.includes(modal)
	}

	app.vue.methods.showModalHelp = function () {
		app.timer.pause()
		app.helpers.saveUserTime()
		app.vue.methods.showModal('help', false)
	}

	app.vue.methods.canPause = function () {
		if (app.status.completed || app.vue.data.state.isPaused) return false
		if (app.vue.methods.stateModal('help')) return false
		if (app.vue.data.config.hasTimer) return app.timer?.status === 'active'
		return !!app.status.started
	}

	app.vue.methods.pauseGame = function (isAuto = false) {
		if (!app.vue.methods.canPause()) return

		app.vue.data.state.isPaused = true
		app.vue.data.state.wasAutoPaused = isAuto

		if (app.timer) {
			app.timer.pause()
			app.helpers.saveUserTime()
		}

		app.vue.methods.resetActions()
		app.vue.methods.showModal('paused', false)
	}

	app.vue.methods.resumeGame = function () {
		if (!app.vue.data.state.isPaused) return

		app.vue.data.state.isPaused = false
		app.vue.data.state.wasAutoPaused = false
		app.vue.methods.hideModal('paused')

		if (app.vue.data.config.hasTimer && !app.status.completed && app.timer) {
			app.timer.resume()
			app.helpers.saveUserTime()
		}
	}

	app.vue.methods.togglePause = function () {
		if (app.vue.data.state.isPaused) {
			app.vue.methods.resumeGame()
		} else {
			app.vue.methods.pauseGame()
		}
	}

	app.vue.methods.startGame = function (modal) {
		app.helpers.puzzleStart()
		app.vue.methods.hideModal('help')
		app.vue.data.show.settings = false
	}

	app.vue.methods.hideHelp = function () {
		this.hideModal('help')
	}

	app.vue.methods.createEmail = function () {
		const {
			variant = '',
			numberLabel = '',
			difficulty = '',
		} = app.vue.model.formattedMeta
		const subject = [variant, numberLabel, difficulty].filter(Boolean).join(' ')
		const body = `${window.location.hostname}${window.location.pathname
			.split('/')
			.slice(0, -1)
			.join('/')}/print.html?convert=true`

		window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
	}

	app.vue.methods.getMockStats = function () {
		const raw = new URLSearchParams(window.location.search).get('mockStats')
		if (!raw) return null
		const presets = {
			best: {
				time: { week: 9999, ever: 9999, last: 9999 },
				checks: { week: 99, ever: 99, last: 99 },
				reveals: { week: 99, ever: 99, last: 99 },
			},
			worse: {
				time: { week: 0, ever: 0, last: 0 },
				checks: { week: 0, ever: 0, last: 0 },
				reveals: { week: 0, ever: 0, last: 0 },
			},
			demo: {
				time: { week: 600, ever: 300, last: 240 },
				checks: { week: 5, ever: 2, last: 4 },
				reveals: { week: 10, ever: 3, last: 1 },
			},
		}
		if (presets[raw]) return presets[raw]
		try {
			const parsed = JSON.parse(raw)
			return parsed && typeof parsed === 'object' ? parsed : presets.demo
		} catch (e) {
			return presets.demo
		}
	}

	app.vue.methods.formatDuration = function (secs) {
		secs = Math.max(0, Math.round(secs || 0))
		const m = Math.floor(secs / 60)
		const s = secs % 60
		return m + ':' + (s < 10 ? '0' + s : s)
	}

	app.vue.methods.langReplace = function (lexeme) {
		let string = this.lang[lexeme]

		string = string.replaceAll('[[difficulty]]', this.formattedMeta.difficulty)
		string = string.replaceAll('[[number]]', this.formattedMeta.numberLabel)
		string = string.replaceAll(
			'[[timer]]',
			'<span class="completion__timer">' + this.timerDisplay + '</span>',
		)
		string = string.replaceAll('[[variant]]', this.formattedMeta.variant)

		return string
	}

	app.vue.methods.handlePrint = function () {
		const rootElement = document.querySelector(app.config.el)
		const printFrame = document.getElementById('printFrame')

		if (printFrame) {
			rootElement.removeChild(printFrame)
		}

		const hiddenFrame = document.createElement('iframe')
		const paramsString = new URLSearchParams(app.vue.data.print).toString()
		const src = 'print.html?print=true&' + paramsString

		hiddenFrame.onload = () => {
			hiddenFrame.contentWindow.onafterprint = () => {
				rootElement.removeChild(hiddenFrame)
			}
		}

		hiddenFrame.id = 'printFrame'
		hiddenFrame.hidden = true
		hiddenFrame.src = src

		rootElement.appendChild(hiddenFrame)
		app.vue.methods.hideModal('printOptions')
	}

	app.vue.methods.wrapperClicked = function (e) {
		if (app.vue.data.state.suppressWrapperClick || app.vue.methods.stateModal('help')) {
			return
		}

		app.vue.data.state.suppressWrapperClick = true

		if (app.vue.data.reveal.grid) {
			app.vue.data.reveal.grid = false
		}

		const visibleModals = app.vue.data.modals.visible

		if (visibleModals.length) {
			const modalNodes = visibleModals.map(modal => app.vue.model.$refs[modal])

			if (
				!modalNodes.includes(e.target) &&
				!modalNodes.some(modal => modal?.contains(e.target))
			) {
				app.vue.methods.resetActions()

				if (!this.isCompletedWithoutErrors) {
					app.vue.methods.hideModal('hintsMenu')
					app.vue.methods.hideModal('revealGridConfirm')
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

	app.vue.methods.shareResult = async function () {
		const url = app.vue.data.links.share
		const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta

		const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ')
		const text = `⏱️ I completed ${title} in ${this.timerDisplay} having made ${this.blocksUsed} moves`

		let file = null
		try {
			const blob =
				app.helpers.generateShareImage && (await app.helpers.generateShareImage())
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

	app.vue.methods.fallbackCopyTextToClipboard = function (text) {
		const textArea = document.createElement('textarea')

		textArea.value = text
		document.body.appendChild(textArea)
		textArea.focus()
		textArea.select()

		try {
			if (document.execCommand('copy')) {
				app.vue.methods.showModal('copiedToClipboard')

				console.log('fallbackCopyToClipboard: Copying to clipboard was successful!')

				setTimeout(() => {
					app.vue.methods.hideModal('copiedToClipboard')
				}, 2000)
			} else {
				console.error('Fallback: Oops, unable to copy')
			}
		} catch (err) {
			console.error(err)
		}

		document.body.removeChild(textArea)
	}

	app.vue.methods.copyToClipboard = function (text) {
		if (!navigator.clipboard) {
			app.vue.methods.fallbackCopyTextToClipboard(text)

			return
		}

		try {
			navigator.clipboard.writeText(text)
			app.vue.methods.showModal('copiedToClipboard')

			console.log('copyToClipboard: Copying to clipboard was successful!')

			setTimeout(() => {
				app.vue.methods.hideModal('copiedToClipboard')
			}, 2000)
		} catch (err) {
			app.vue.methods.fallbackCopyTextToClipboard(text)
			console.error(err)
		}
	}

	app.vue.methods.historyGoBack = function () {
		history.go(-1)
	}

	/*  --------------------  */
	/*    Vue Mounted Hook    */
	/*  --------------------  */

	app.vue.mounted = function () {
		app.helpers.initTheme()

		window.addEventListener('keyup', function (e) {
			const code = e.keyCode || e.which

			if (code === 8) {
				app.emitter.emit('keyup-delete', e, code)
			}

			if (code === 13) {
				app.emitter.emit('keyup-enter', e, code)
			}

			if (code >= 37 && code <= 40) {
				app.emitter.emit(
					'keyup-arrow',
					e,
					code,
					['left', 'up', 'right', 'down'][code - 37],
				)
			}

			if (code === 46) {
				app.emitter.emit('keyup-delete', e, code)
			}

			if (code >= 65 && code <= 90) {
				app.emitter.emit('keyup-az', e, code, String.fromCharCode(code))
			}

			app.emitter.emit('keyup', code)
		})

		window.addEventListener('keydown', function (e) {
			const code = e.keyCode || e.which

			if (code === 9) {
				app.emitter.emit('keyup-enter', e, code)
				e.preventDefault()
			}
		})

		app.helpers.mountUiHelpers()
		app.emitter.emit('mounted')
		app.helpers.mounted(this)
	}

	app.vue.watch.userSettings = function () {
		app.helpers.savePuzzleState()
	}
})()
