// @ts-check

;(() => {
	const LEVELS = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3,
		fatal: 4,
	}

	/**
	 * @typedef {keyof typeof LEVELS} Level
	 */

	/**
	 * Log messages with different severity levels
	 */
	class Logger {
		/** @type {Level} */
		static #defaultLevel = 'info'

		/** @type {string} */
		name
		/** @type {Level} */
		#level

		/**
		 * @param {string} name
		 * @param {Level} level
		 */
		constructor(name, level) {
			this.name = name
			this.#level = level
		}

		/**
		 * Set the default logging level for all Logger instances that do not have an explicitly set level
		 * @param {Level} level - The minimum severity level to log (debug, info, warn, error, fatal)
		 */
		static set defaultLevel(/** @type {Level} */ level) {
			Logger.#defaultLevel = level
		}

		/**
		 * Get the default logging level for all Logger instances that do not have an explicitly set level
		 * @returns {Level} The default logging level
		 */
		static get defaultLevel() {
			return Logger.#defaultLevel
		}

		/**
		 * Convert a value to an Error instance
		 * @param {unknown} err - The value to convert
		 * @returns {Error} An Error instance representing the input value
		 */
		static toError(err) {
			return err instanceof Error ? err : new Error(String(err), { cause: err })
		}

		/**
		 * Stringify the error for logging
		 * @param {unknown} err - The error to stringify
		 * @returns {string} A string representation of the error, including message and
		 * stack if available
		 */
		static print(err) {
			if (err instanceof Error) {
				return err.message + (err.stack ? `\n${err.stack}` : '')
			}

			// for plain objects, attempt to stringify with indentation
			// for readability
			if (typeof err === 'object' && err !== null) {
				try {
					return JSON.stringify(err, null, 2)
				} catch {
					// if stringify fails (e.g. circular reference), fall back
					// to basic string conversion
					return String(err)
				}
			}

			return String(err)
		}

		/**
		 * Set the logging level for this logger instance. Messages with a severity
		 * below this level will be ignored
		 * @param {Level} level - The minimum severity level to log (debug, info, warn, error, fatal)
		 */
		set level(/** @type {Level} */ level) {
			this.#level = level
		}

		/**
		 * Get the current logging level for this logger instance, or the default level
		 * if not set
		 * @returns {Level} The current logging level
		 */
		get level() {
			return this.#level ?? Logger.#defaultLevel
		}

		/**
		 * Log a message with a specific level
		 * @param {Level} level - The severity level of the log
		 * @param {string} message - The message to log
		 * @param {Error} [error] - An optional error object or value to include in the log
		 * (for 'error' and 'fatal' levels)
		 */
		log(/** @type {Level} */ level, message, error) {
			if (LEVELS[level] < LEVELS[this.level]) return

			/** @type {{ ts: number; level: Level; message: string; error?: Error }} */
			const entry = {
				ts: Date.now(),
				level,
				message,
			}

			if (level === 'error' || level === 'fatal') {
				entry.error = error ? Logger.toError(error) : new Error(message)
			}

			const line = `[${`${this.name ?? ''}`}] [${entry.ts}] [${level.toUpperCase()}] ${message}`
			const extra = entry.error ? `\n${Logger.print(entry.error)}` : ''

			if (level === 'warn') {
				console.warn(line, extra)
				return
			}

			if (level === 'error' || level === 'fatal') {
				console.error(line, extra)
				return
			}

			console.log(line, extra)
		}

		/**
		 * Log a debug message
		 * @param {...string} messages - The debug messages to log
		 */
		debug(...messages) {
			this.log('debug', messages.join(' '))
		}

		/**
		 * Log an info message
		 * @param {...string} messages - The info messages to log
		 */
		info(...messages) {
			this.log('info', messages.join(' '))
		}

		/**
		 * Log a warning message
		 * @param {...string} messages - The warning messages to log
		 */
		warn(...messages) {
			this.log('warn', messages.join(' '))
		}

		/**
		 * Log an error message
		 * @param {string} message - The error message to log
		 * @param {Error} [error] - An optional error object or value to include in the log
		 */
		error(message, error) {
			this.log('error', message, error === undefined ? undefined : Logger.toError(error))
		}

		/**
		 * Log a fatal error message
		 * @param {string} message - The error message to log
		 * @param {Error} [error] - An optional error object or value to include in the log
		 */
		fatal(message, error) {
			this.log('fatal', message, error === undefined ? undefined : Logger.toError(error))
		}
	}

	Object.assign(globalThis, { Logger })
})()
