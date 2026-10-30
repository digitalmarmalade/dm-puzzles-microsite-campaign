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

	// src/lib/puzzle-progress-buffer.ts
	var DEFAULT_OPTS = {
		cache: true,
		timeStep: 60000,
		flush: {
			delay: 4000,
			progressSteps: [50],
		},
		name: 'progress',
	}

	class PuzzleProgressBuffer {
		#channel
		#app
		#data = new Map()
		#timer = null
		#achievedProgressSteps = new Set()
		#nodes
		opts
		handlers
		constructor(channel, app, opts) {
			this.#channel = channel
			this.#app = app
			this.#nodes = Object.keys(opts.handlers)
			const progressSteps = [
				...new Set(
					(opts.flush?.progressSteps ?? DEFAULT_OPTS.flush.progressSteps ?? []).filter(
						Number.isFinite,
					),
				),
			].toSorted((l, r) => l - r)
			this.opts = {
				...DEFAULT_OPTS,
				...opts,
				flush: {
					...DEFAULT_OPTS.flush,
					...opts.flush,
					progressSteps,
				},
				handlers: opts.handlers,
			}
			this.handlers = {
				...opts.handlers,
				all: () =>
					Object.fromEntries(
						this.#nodes.map(node => [node, this.handlers[node]?.(this.#channel)]),
					),
			}
		}
		update(node, data) {
			if (data === undefined) {
				data = this.handlers[node]?.(this.#channel)
			}
			if (node === 'time') {
				const seconds = Number(data)
				if (!Number.isFinite(seconds) || (seconds * 1000) % this.opts.timeStep !== 0) {
					return false
				}
			}
			const progressSteps = this.opts.flush.progressSteps ?? []
			const progress = this.#app?.status?.progress ?? 0
			const admire =
				Boolean(this.#app?.status?.completed) && Boolean(this.#app?.status?.admired)
			let flush = false
			for (const step of progressSteps) {
				if (progress < step) break
				if (this.#achievedProgressSteps.has(step)) continue
				this.#achievedProgressSteps.add(step)
				flush = true
			}
			if (!this.opts.cache) {
				this.#send(this.opts.name, {
					node,
					data: clone(data),
				})
				if (flush || admire) {
					this.flush(this.opts.name)
				}
				return true
			}
			this.#buffer(node, data)
			if (flush || admire) {
				this.flush(this.opts.name)
				return true
			}
			this.#schedule()
			return true
		}
		flush(name = this.opts.name) {
			if (this.#timer) {
				clearTimeout(this.#timer)
				this.#timer = null
			}
			if (!this.#data.size) return this
			this.#process(name, this.#data)
			return this
		}
		merge(snapshot) {
			if (!snapshot) return this
			for (const node of this.#nodes) {
				const value = snapshot?.[node]
				if (value === undefined) continue
				this.#buffer(node, value)
			}
			return this
		}
		clear() {
			this.#data.clear()
			this.#achievedProgressSteps.clear()
			if (this.#timer) {
				clearTimeout(this.#timer)
				this.#timer = null
			}
		}
		#process(name, data) {
			if (!data.size) return
			if (this.#nodes.length === data.size && this.#nodes.every(n => data.has(n))) {
				this.#send(name, {
					node: 'all',
					data: Object.fromEntries(data),
				})
				data.clear()
				return
			}
			while (data.size) {
				const isLast = data.size === 1
				const first = data.keys().next().value
				if (!first) return
				this.#send(isLast ? name : this.opts.name, {
					node: first,
					data: data.get(first),
				})
				data.delete(first)
			}
		}
		#send(name, payload) {
			const data = this.opts.payload?.transform
				? this.opts.payload.transform(payload)
				: payload
			this.#channel.send(name, data, { batch: false })
			this.#app?.storagePuzzle?.set?.('_firebase', Date.now())
		}
		#schedule() {
			if (this.#timer) return
			this.#timer = setTimeout(() => {
				this.flush(this.opts.name)
			}, this.opts.flush.delay)
		}
		#buffer(node, data) {
			this.#data.set(node, clone(data))
		}
	}

	// src/lib/puzzle-progress-buffer.global.ts
	Object.assign(globalThis, { PuzzleProgressBuffer })
})()

//# debugId=7916D96739AA0CB764756E2164756E21
//# sourceMappingURL=puzzle-progress-buffer.global.js.map
