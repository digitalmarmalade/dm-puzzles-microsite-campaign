var app = window.app ?? {}

/** @type {Window['vm']} */ // oxlint-disable-next-line no-unused-vars
var vm = window.vm ?? {}

;(function () {
	const logger = new Logger(
		'Channel',
		window.location.host === '' ||
			window.location.host.slice(0, 5) === 'local' ||
			window.location.host.slice(0, 4) === 'test' ||
			window.location.host.startsWith('localhost')
			? 'debug'
			: 'warn',
	)

	let origin = '*'

	try {
		origin = window.parent.location.origin
	} catch {}

	app.channel = app.helpers.isMicrosite()
		? new PuzzleChannel(window.parent, origin, {
				events: {
					forward: false,
					bubble: false,
				},
			})
		: null

	// construct the progress buffer, which will handle caching and batching
	// of progress updates to the parent window
	app.progress = app.channel
		? new PuzzleProgressBuffer(app.channel, app, {
				name: 'puzzleprogress',
				handlers: {
					status: () => app.helpers.deproxy(app.status),
					time: () => app.helpers.deproxy(app.vue.data.time),
					user: () => app.helpers.deproxy(app.helpers.getUserState()),
					// we could optionally pass an 'active' handler here,
					// but it's not needed for this puzzle type
				},
				payload: {
					transform: p => app.helpers.toFormattedOutgoingMessage(p),
				},
				// time events will be sent every 10 seconds
				timeStep: 10_000,
				flush: {
					// set zero default, all events will flush immediately
					delay: 0,
					progressSteps: [50],
				},
			})
		: null

	const params = new URLSearchParams(window.location.search)

	const PUZZLE_APP_EVENTS = [
		'puzzleready',
		'puzzlestart',
		//'puzzleprogress', // progress events are dispatched using app.progress
		'puzzlecomplete',
		//'puzzleincomplete',
		'puzzleshare',
		'puzzlereset',
		//'puzzlehint',
		//'puzzlehelp',
		// 'getdata' is a request/response, handled via app.channel.request()
		'puzzlecreate',
		'puzzlejoin',
		'puzzleinvite',
		'puzzledifficulty',
		'puzzleassists',
	]

	document.addEventListener(
		'DOMContentLoaded',
		() => {
			for (const name of PUZZLE_APP_EVENTS) {
				document.addEventListener(name, e => {
					app.channel?.send(name, app.helpers.toFormattedOutgoingMessage(e.detail))
				})
			}
		},
		{ once: true },
	)

	/**
	 * Handle incoming user data.
	 * @param {UserDataPayload | null | undefined} payload - The user data.
	 */
	app.helpers.onUserData = function (payload) {
		logger.info('Received user data from parent', Logger.print(payload))

		// payload is null when the parent has no stored data (e.g. a new user)
		const user = payload ?? {}
		user.answers = app.helpers.expandDataUserAnswers(user.answers)
		app.vue.data.user = { ...app.helpers.getDefaultUserState(), ...user }
	}

	/**
	 * Handle incoming status data.
	 * @param {StatusPayload | null | undefined} payload - The status payload.
	 */
	app.helpers.onStatusData = function (payload) {
		logger.info('Received status data from parent', Logger.print(payload))

		app.status = { ...app.helpers.getDefaultUserPlayStatus(), ...payload }
		app.status.last = Date.now()
	}

	/**
	 * Handle incoming time data.
	 * @param {number | null | undefined} payload - The time payload.
	 */
	app.helpers.onTimeData = function (payload) {
		logger.info('Received time data from parent', Logger.print(payload))

		app.vue.data.time = payload
	}

	/**
	 * Format an outgoing message to the parent window with the appropriate metadata.
	 * @param {unknown} content
	 */
	app.helpers.toFormattedOutgoingMessage = function (content) {
		return {
			dt: Date.now(),
			puzzle: {
				variant: params.get('variant') ?? app.config?.variantSlug,
				id: params.get('id') ?? app.config?.id,
				slug: params.get('slug') ?? app.config?.slug,
			},
			content: app.helpers.deproxy(content),
			status: app.helpers.deproxy(app.status),
		}
	}
})()
