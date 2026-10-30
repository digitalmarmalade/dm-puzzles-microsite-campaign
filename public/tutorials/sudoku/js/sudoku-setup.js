var app = window.app || {}
// oxlint-disable-next-line no-unused-vars
var vm = window.vm || {}
//
;(function () {
	'use strict'

	const params = new URLSearchParams(window.location.search)

	app.setup = app.setup || {
		debug: false, //location.host.substr(0,5) === 'local',
	}

  app.guide = {
    slides: function () {
      var base = './assets/onboarding/';
      var set = app.vue.computed.isKiller() ? ['killer_', 'killer1.svg']
        : (app.puzzle && app.puzzle.isColour) ? ['colour_', 'colour-1.svg']
        : app.vue.computed.isMini() ? ['mini_', 'mini1.svg']
        : ['', 'slide-1.svg'];
      return [
        { text: 'modal_onboarding_' + set[0] + 'slide_01', image: base + set[1] },
        { text: 'modal_onboarding_' + set[0] + 'slide_02' },
        { text: 'modal_onboarding_' + set[0] + 'slide_03' },
      ];
    },
    tour: function () {
      var colour = !!(app.puzzle && app.puzzle.isColour);
      var hints = '[data-actions=hints]';
      return [
        { target: '#pinch-zoom-image', title: 'guide_tour_grid_title', body: colour ? 'guide_tour_grid_body_colour' : 'guide_tour_grid_body' },
        { target: '#keysContainer', title: colour ? 'guide_tour_keys_title_colour' : 'guide_tour_keys_title', body: colour ? 'guide_tour_keys_body_colour' : 'guide_tour_keys_body' },
        { target: '[data-key=multiSelect]', outline: true, title: 'guide_tour_multi_title', body: 'guide_tour_multi_body' },
        { target: '[data-key=helper]', outline: true, title: 'guide_tour_step_title', body: 'guide_tour_step_body' },
        { target: '[data-action=pencil]', outline: true, title: 'guide_tour_notes_title', body: 'guide_tour_notes_body' },
        { target: '[data-action=undo]', outline: true, title: 'guide_tour_undo_title', body: 'guide_tour_undo_body' },
        { target: '[data-action=hints]', outline: true, title: 'guide_tour_hints_title', body: 'guide_tour_hints_body' },
        { target: [hints + ' .action-popout__header', hints + ' .action-popout__actions:first-child'], requires: '[data-action=hints]', open: 'hintsMenu', title: 'guide_tour_check_title', body: 'guide_tour_check_body' },
        { target: hints + ' .action-popout__actions:nth-child(2)', requires: '[data-action=hints]', open: 'hintsMenu', title: 'guide_tour_reveal_title', body: colour ? 'guide_tour_reveal_body_colour' : 'guide_tour_reveal_body' },
        { target: '[data-action=settings]', outline: true, title: 'guide_tour_more_title', body: 'guide_tour_more_body' },
        { target: '#settings', requires: '[data-action=settings]', open: 'settings', title: 'guide_tour_settings_title', body: 'guide_tour_settings_body' },
        { title: 'guide_tour_ready_title' },
      ];
    },
    tips: {
      check: { target: '[data-action=hints]', text: 'guide_tip_check' },
      step: { target: '[data-key=helper]', text: 'guide_tip_step' },
    },
    idleTip: { tip: 'step', after: 90 },
    events: { letter: 'LetterEntered', cell: 'CellClick' },
    prepare: function () {
      app.helpers.prefillNumbers();
    },
    onLetter: function () {
      app.helpers.guideCheckTip();
    },
  };

	app.setup.init = function (settings = {}) {
		app.setup.log('setup.init')
		app.helpers.processSettings(settings)
		app.helpers.parseUrlParams()

		app.config.puzzleApp = params.has('puzzleApp') ? window.parent.puzzleApp : null

		app.setup.langData()
	}

	app.setup.langData = async function () {
		app.setup.log('setup.langData')

		try {
			let languagesToAttemptToLoad = []

			// 1. use language in URL if set
			if (location.params.lang) {
				languagesToAttemptToLoad.push(location.params.lang)
			}

			// 2. use the preferred language of the user, usually the language of the browser UI
			if (typeof navigator !== 'undefined' && navigator.language) {
				languagesToAttemptToLoad.push(navigator.language.substring(0, 2))
			}

			// 3. default to English
			languagesToAttemptToLoad.push('en')
			languagesToAttemptToLoad = [...new Set(languagesToAttemptToLoad)]

			let res

			for (const lidx in languagesToAttemptToLoad) {
				const lang = languagesToAttemptToLoad[lidx]
				res = await fetch(`locale-${lang}.json`)

				if (res.ok) {
					app.vue.data.locale = await res
						.text()
						.then(JSON.parse)
						.catch(() => {
							throw new Error(
								`Failed to parse locales: ${res.status} (${res.statusText})`,
							)
						})

					return app.setup.langDataDone()
				} else {
					console.log(
						`Failed to fetch locale-${lang}.json: ${res.status} (${res.statusText})`,
					)
					if (lidx >= languagesToAttemptToLoad.length - 1) {
						throw new Error(`Failed to fetch locales: ${res.status} (${res.statusText})`)
					}
				}
			}
		} catch (err) {
			app.helpers.error(err)
		}
	}

	app.setup.langDataDone = function () {
		app.setup.log('setup.langDataDone')
		app.setup.gameData()
	}

	app.setup.getGameDataFromLocalJson = async function () {
		const url = params.has('json') ? params.get('json') : 'data.json'
		const res = await fetch(url)

		if (!res.ok) {
			app.helpers.error(`Failed to fetch data.json: ${res.status} (${res.statusText})`)
		}

		return res.json()
	}

	app.setup.gameData = async function () {
		app.setup.log('setup.gameData')

		if (app.config.puzzleApp && !params.has('json')) {
			try {
				const data = await app.channel?.request(
					'getdata',
					app.helpers.toFormattedOutgoingMessage({ type: 'puzzle' }),
					{
						batch: false,
					},
				)

				if (!data) throw new Error('No puzzle data received from parent window')

				if (typeof data !== 'object' || data === null || !('json' in data)) {
					throw new TypeError('Malformed puzzle data response from parent')
				}

				app.setup.gameDataDone(data.json)
			} catch (err) {
				app.setup.log(Logger.print(err))

				// try recover with local data?
				app.setup.gameDataDone(await app.setup.getGameDataFromLocalJson())
			}
		} else {
			app.setup.gameDataDone(await app.setup.getGameDataFromLocalJson())
		}
	}

	app.setup.gameDataDone = function (json) {
		app.setup.log('setup.gameDataDone')
		app.vue.data.json = json
		app.json = json
		app.setup.puzzleObject()
	}

	app.setup.puzzleObject = async function () {
		app.setup.log('setup.puzzleObject')
		app.vue.methods.setSource(app.vue.data.json)
		app.puzzle = app.vue.methods.getPuzzleObject()
		app.setup.puzzleObjectDone()
	}

	app.setup.puzzleObjectDone = function () {
		app.setup.log('setup.puzzleObjectDone')
		app.setup.storageObjects()
	}

	app.setup.storageObjects = function () {
		app.setup.log('setup.storageObjects')
		app.idbUserRequest = indexedDB.open('DMPuzzlesUserData', Date.now())

		app.idbUserRequest.onupgradeneeded = e => {
			const db = e.target.result
			const puzzleStore = app.config.type + '-' + app.config.id
			const variantStore = app.config.type

			if (!db.objectStoreNames.contains(puzzleStore)) {
				db.createObjectStore(puzzleStore, { keyPath: 'id' })
			}
			if (!db.objectStoreNames.contains(variantStore)) {
				db.createObjectStore(variantStore, { keyPath: 'id' })
			}
			// onsuccess fires after this transaction completes and continues setup
		}

		app.idbUserRequest.onsuccess = () => {
			app.idbUserRequest.result.onversionchange = () => {
				app.idbUserRequest.result.close()
			}
			app.storagePuzzle = new StorageIdb(
				app.config.type + '-' + app.config.id,
				app.idbUserRequest,
			)
			app.storageVariant = new StorageIdb(app.config.type, app.idbUserRequest)
			app.setup.storageObjectsDone()
		}
	}

	app.setup.storageObjectsDone = function () {
		app.setup.log('setup.storageObjectsDone')
		app.setup.userData()
	}

	app.setup.userData = async function () {
		app.setup.log('setup.userData')

		if (app.config.puzzleApp) {
			try {
				// batch and request the user data and stats

				// @todo: we should just omit the type here and fetch all of them in one
				// request???

				const userDataP = app.channel?.request(
					'getdata',
					app.helpers.toFormattedOutgoingMessage({ type: 'user' }),
					{ batch: true },
				)

				const statusDataP = app.channel?.request(
					'getdata',
					app.helpers.toFormattedOutgoingMessage({ type: 'status' }),
					{
						batch: true,
					},
				)

				const timeDataP = app.channel?.request(
					'getdata',
					app.helpers.toFormattedOutgoingMessage({ type: 'time' }),
					{
						batch: true,
					},
				)

				// flush the batched requests to process the queue without waiting
				// for the next auto flush
				app.channel?.flush()

				// get the responses in parallel
				const [userData, statusData, timeData] = await Promise.all([
					userDataP,
					statusDataP,
					timeDataP,
				])

				app.helpers.onUserData(userData)
				app.helpers.onStatusData(statusData)
				app.helpers.onTimeData(timeData)

				app.setup.userDataDone()
			} catch (err) {
				app.setup.log('Error getting user data', Logger.print(err))
			}
		} else {
			app.helpers.loadPuzzleState().then(app.setup.userDataDone)
		}
	}

	app.setup.userDataDone = function () {
		app.setup.log('setup.userDataDone')
		app.helpers.applyParentAssists && app.helpers.applyParentAssists()
		app.setup.puzzleCompletionData()
	}

	app.setup.getCompletionDataFromArchive = async function () {
		app.setup.log('setup.getCompletionDataFromArchive')
		try {
			const res = await fetch(app.vue.data.source.meta.archive)

			if (!res.ok) {
				throw new Error(`Failed to fetch archive: ${res.status} (${res.statusText})`)
			}

			const json = await res
				.text()
				.then(JSON.parse)
				.catch(() => {
					throw new Error(`Failed to parse archive: ${res.status} (${res.statusText})`)
				})

			app.puzzle.feedback = app.helpers.getFeedbackLinksObject(json)
		} catch (err) {
			console.error(err)
		}
	}

	app.setup.getCompletionDataFromParent = function () {
		app.setup.log('setup.getCompletionDataFromParent')
		app.puzzle.feedback = window.parent.puzzleApp.completion
		app.puzzle.stats = window.parent.puzzleApp.stats || null
	}

	app.setup.puzzleCompletionData = async function () {
		app.setup.log('setup.puzzleCompletionData')

		// Check if we get completion data from parent. If not then load an archive
		if (window.parent.puzzleApp?.completion) {
			app.setup.getCompletionDataFromParent()
		} else if (app.vue.data.source.meta.archive) {
			await app.setup.getCompletionDataFromArchive()
		}
		app.setup.puzzleCompletionDataDone()
	}

	app.setup.puzzleCompletionDataDone = async function () {
		app.setup.log('setup.puzzleCompletionDataDone')
		app.setup.vue()
	}

	app.setup.vue = function () {
		app.setup.log('setup.vue')
		app.vue.init(app.config.el)
		app.setup.vueDone()
	}

	app.setup.vueDone = function () {
		app.setup.log('setup.vueDone')
		app.helpers.initPuzzle()
		app.helpers.addEventListeners()

		if (app.vue.data.config.hasTimer) {
			app.timer = new DMTimer()
			app.timer.callback = app.helpers.timerUpdate
		}

		app.setup.analytics()
	}

	app.setup.analytics = function () {
		app.setup.log('setup.analytics')

		if (app.marmalytics) {
			app.helpers.initialiseAnalytics()
			app.marmalytics.init()
			app.marmalytics.pageLoad()
		}

		app.setup.analyticsDone()
	}

	app.setup.analyticsDone = function () {
		app.setup.log('setup.analyticsDone')
		app.setup.done()
	}

	app.setup.done = function () {
		app.setup.log('setup.done')
		app.helpers.showPuzzleOrStart()
		app.helpers.dispatchEvent('puzzleready')

		return false
	}

	app.setup.log = function (message) {
		if (this.debug) {
			console.log(message)
		}
	}
})()
