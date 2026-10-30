// globally scoped build of PuzzleChannel and PuzzleProgressBuffer for use in puzzles repo only
;(() => {
	// src/lib/clone.ts
	function clone(value) {
		if (value === undefined) return value
		if (typeof structuredClone === 'function') {
			try {
				return structuredClone(value)
			} catch (err) {
				console.warn('structuredClone failed, falling back to JSON clone', err)
			}
		} else {
			console.warn('structuredClone unavailable, falling back to JSON clone')
		}
		return JSON.parse(JSON.stringify(value))
	}

	// src/lib/id.ts
	function id() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID()
		}
		return `pc_${Math.random().toString(36).slice(2, 10)}`
	}

	// src/lib/puzzle-channel.ts
	var DEFAULT_OPTS = {
		events: {
			forward: true,
		},
		batch: {
			enabled: true,
			delay: 50,
		},
	}
	function isEventMessage(message) {
		return message.kind === 'event' && typeof message.name === 'string'
	}
	function isRequestMessage(message) {
		return (
			message.kind === 'request' &&
			typeof message.name === 'string' &&
			typeof message.id === 'string'
		)
	}

	class PuzzleChannel {
		#target
		#origin
		#opts
		#disposed = false
		#queue = []
		#timer = null
		handlers = new Map()
		#inFlight = new Map()
		#controller = new AbortController()
		#bubbledEvents = new WeakSet()
		#onMessage = e => {
			this.receive(e).catch(err => {
				console.error('Error handling incoming message', err)
			})
		}
		#remove(name, entry) {
			const current = this.handlers.get(name)
			if (!current) return
			if (entry && current !== entry) return
			if (current.opts?.signal && current.abortHandler) {
				current.opts.signal.removeEventListener('abort', current.abortHandler)
			}
			this.handlers.delete(name)
		}
		#post(message) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			this.#target.postMessage(message, this.#origin)
		}
		#normalise(raw) {
			if (!raw || typeof raw !== 'object') return null
			return raw
		}
		#bubble(e) {
			const bubble = this.#opts.events.bubble
			const incoming = Array.isArray(e.data) ? e.data : [e.data]
			const single = incoming.length === 1 ? this.#normalise(incoming[0]) : null
			if (incoming.length === 1) {
				if (bubble === true) return
				if (
					Array.isArray(bubble) &&
					single &&
					(isEventMessage(single) || isRequestMessage(single)) &&
					bubble.includes(single.name)
				) {
					return
				}
			}
			if (bubble !== true && !Array.isArray(bubble)) {
				e.stopImmediatePropagation()
				return
			}
			e.stopImmediatePropagation()
			for (const raw of incoming) {
				const message = this.#normalise(raw)
				if (!message) continue
				if (!isEventMessage(message) && !isRequestMessage(message)) continue
				if (Array.isArray(bubble) && !bubble.includes(message.name)) continue
				let bubbled
				if (isEventMessage(message)) {
					bubbled = {
						kind: 'event',
						name: message.name,
						data: message.data,
					}
				} else {
					bubbled = {
						kind: 'request',
						id: message.id,
						name: message.name,
						data: message.data,
					}
				}
				const event = new MessageEvent('message', {
					data: bubbled,
					origin: e.origin,
					lastEventId: e.lastEventId,
					source: e.source,
					ports: [...e.ports],
				})
				this.#bubbledEvents.add(event)
				window.dispatchEvent(event)
			}
		}
		constructor(target, origin = '*', opts = {}) {
			this.#target = target
			this.#origin = origin
			this.#opts = {
				events: {
					forward: opts.events?.forward ?? DEFAULT_OPTS.events.forward,
					bubble: opts.events?.bubble ?? DEFAULT_OPTS.events.bubble,
				},
				batch: { ...DEFAULT_OPTS.batch, ...opts.batch },
			}
			window.addEventListener(
				'message',
				e => {
					if (this.#disposed) throw new Error('PuzzleChannel is disposed')
					if (this.#bubbledEvents.has(e)) return
					this.#bubble(e)
					this.#onMessage(e)
				},
				{
					capture: true,
					signal: this.#controller.signal,
				},
			)
		}
		on(name, handler, opts) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			if (this.handlers.has(name)) {
				console.warn(`Overwriting existing handler for message: ${name}`)
				this.#remove(name)
			}
			const entry = {
				handler,
				opts,
			}
			if (opts?.signal) {
				if (opts.signal.aborted) {
					console.warn(
						`Handler for message ${name} registered with already-aborted signal, handler will never be called`,
					)
					return this
				}
				entry.abortHandler = () => {
					this.#remove(name, entry)
				}
				opts.signal.addEventListener('abort', entry.abortHandler, { once: true })
			}
			this.handlers.set(name, entry)
			return this
		}
		off(name) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			this.#remove(name)
			return this
		}
		send(name, data, opts = {}) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			const message = {
				kind: 'event',
				name,
				data: clone(data),
				events: opts.events,
			}
			if (!(opts.batch ?? this.#opts.batch.enabled)) {
				this.#post(message)
				return
			}
			this.#queue.push(message)
			this.#schedule()
		}
		request(name, data, opts = {}) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			const messageId = id()
			const timeout = opts.timeout ?? 1e4
			const message = {
				kind: 'request',
				id: messageId,
				name,
				data: clone(data),
			}
			return new Promise((resolve, reject) => {
				const abortHandler = () => {
					clearTimeout(timeoutId)
					this.#inFlight.delete(messageId)
					reject(new Error(`Request aborted: ${name}`))
				}
				const timeoutId = setTimeout(() => {
					this.#controller.signal.removeEventListener('abort', abortHandler)
					this.#inFlight.delete(messageId)
					reject(new Error(`Request timed out: ${name}`))
				}, timeout)
				this.#controller.signal.addEventListener('abort', abortHandler, { once: true })
				this.#inFlight.set(messageId, {
					resolve,
					reject,
					timeoutId,
					abortHandler,
				})
				if (!(opts.batch ?? this.#opts.batch.enabled)) {
					this.#post(message)
					return
				}
				this.#queue.push(message)
				this.#schedule()
			})
		}
		flush() {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			if (this.#timer) {
				clearTimeout(this.#timer)
				this.#timer = null
			}
			if (!this.#queue.length) return
			const batch = this.#queue.splice(0, this.#queue.length)
			this.#post(batch)
		}
		#schedule() {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			if (this.#timer) return
			this.#timer = setTimeout(() => {
				this.flush()
			}, this.#opts.batch.delay)
		}
		async receive(e) {
			if (this.#disposed) throw new Error('PuzzleChannel is disposed')
			if (e.source !== this.#target) return
			if (this.#origin !== '*' && e.origin !== this.#origin) return
			const incoming = Array.isArray(e.data) ? e.data : [e.data]
			for (const raw of incoming) {
				const message = this.#normalise(raw)
				if (!message) continue
				if (message.kind === 'response') {
					if (typeof message.replyTo !== 'string') continue
					const pending = this.#inFlight.get(message.replyTo)
					if (!pending) continue
					clearTimeout(pending.timeoutId)
					this.#controller.signal.removeEventListener('abort', pending.abortHandler)
					this.#inFlight.delete(message.replyTo)
					if (message.ok) {
						pending.resolve(message.data)
					} else {
						pending.reject(message.error ?? new Error('Request failed'))
					}
					continue
				}
				if (!isEventMessage(message) && !isRequestMessage(message)) continue
				const entry = this.handlers.get(message.name)
				if (!entry) {
					if (isRequestMessage(message)) {
						const response = {
							kind: 'response',
							replyTo: message.id,
							ok: false,
							error: {
								message: `No handler found for request: ${message.name}`,
							},
						}
						if (!this.#opts.batch.enabled) {
							this.#post(response)
						} else {
							this.#queue.push(response)
							this.#schedule()
						}
					} else {
						console.warn(`No handler found for event: ${message.name}`)
						if (!isEventMessage(message)) continue
						const forward = message.events?.forward ?? this.#opts.events.forward
						if (forward) {
							const transform =
								typeof forward === 'object' ? forward.transform : undefined
							this.forward(message, transform)
						}
					}
					continue
				}
				try {
					const result = await Promise.resolve().then(() => entry.handler(message.data))
					if (isRequestMessage(message)) {
						const response = {
							kind: 'response',
							replyTo: message.id,
							ok: true,
							data: clone(result),
						}
						if (!this.#opts.batch.enabled) {
							this.#post(response)
						} else {
							this.#queue.push(response)
							this.#schedule()
						}
					}
				} catch (err) {
					if (isRequestMessage(message)) {
						const response = {
							kind: 'response',
							replyTo: message.id,
							ok: false,
							error: {
								message: err instanceof Error ? err.message : 'Unknown error',
							},
						}
						if (!this.#opts.batch.enabled) {
							this.#post(response)
						} else {
							this.#queue.push(response)
							this.#schedule()
						}
					} else {
						console.error(`Error handling event: ${message.name}`, err)
					}
				} finally {
					if (entry.opts?.once) this.handlers.delete(message.name)
				}
				if (isEventMessage(message)) {
					const forward =
						message.events?.forward ??
						entry.opts?.events?.forward ??
						this.#opts.events?.forward
					if (forward) {
						const transform = typeof forward === 'object' ? forward.transform : undefined
						this.forward(message, transform)
					}
				}
			}
		}
		forward(message, transform) {
			const name = transform ? transform(message.name) : message.name
			window.dispatchEvent(new CustomEvent(name, { detail: message.data }))
		}
		dispose() {
			if (this.#disposed) return
			this.#disposed = true
			if (this.#timer) {
				clearTimeout(this.#timer)
				this.#timer = null
			}
			this.#queue = []
			this.#controller.abort()
			for (const item of this.#inFlight.values()) {
				clearTimeout(item.timeoutId)
			}
			for (const existing of this.handlers.values()) {
				if (existing.opts?.signal && existing.abortHandler) {
					existing.opts.signal.removeEventListener('abort', existing.abortHandler)
				}
			}
			this.#inFlight.clear()
			this.handlers.clear()
		}
		[Symbol.dispose]() {
			this.dispose()
		}
	}

	// src/lib/puzzle-channel.global.ts
	Object.assign(globalThis, { PuzzleChannel })
})()

//# debugId=0BD9BC7E73FC311264756E2164756E21
//# sourceMappingURL=puzzle-channel.global.js.map
