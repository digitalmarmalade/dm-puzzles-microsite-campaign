class DmPinchZoom {
	constructor(el, options = {}) {
		this.el = el
		this.hammertime = new Hammer(this.el)

		this.options = options
		this.defaults = {
			panable: true,
			pinchable: true,
			scale_initial: 1,
			scale_max: 2,
			scale_min: 1,
			tapable: true,
			x_initial: 0,
			y_initial: 0,
			dwell: 200,
		}
		this.settings = { ...this.defaults, ...this.options }

		this.listeners = {}
		this.timers = {}
		this.timeouts = {}
		this.values = {
			action: null,
		}
	}

	init() {
		this.reset()
		this.initialise()
	}

	initialise() {
		this.values.element_w_init = this.hammertime.element.clientWidth
		this.values.element_h_init = this.hammertime.element.clientHeight
		this.values.element_w = this.values.element_w_init
		this.values.element_h = this.values.element_h_init

		this.hammertime.get('pinch').set({ enable: true })
		this.hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL })
		this.hammertime.get('tap').set({ enable: true, taps: 2, posThreshold: 50 })

		this.hammertime.on('pinchstart', e => {
			if (!this.canPinch()) {
				return false
			}

			this.settings.scale_start = this.settings.scale_current
			this.settings.scale_center = {
				x: e.center.x,
				y: e.center.y,
			}

			this.values.offset_x = this.values.offset_x ?? 0
			this.values.offset_y = this.values.offset_y ?? 0

			this.setAction('pinch')
		})

		this.hammertime.on('pinchmove', e => {
			if (!this.canPinch()) {
				return false
			}

			this.events.pinching()
			if (this.settings.scale_start * e.scale <= this.settings.scale_max) {
				this.handlePinch(this.settings.scale_start * e.scale, e.center)
			}
		})

		this.hammertime.on('pinchend pinchcancel', () => {
			this.timers.end = this.getTime()
			this.timers.endPinch = this.timers.end

			this.setAction(null)
		})

		this.hammertime.on('panstart', e => {
			if (!this.canPan()) {
				return false
			}

			this.settings.x_start = this.settings.x_current
			this.settings.y_start = this.settings.y_current

			this.setAction('pan')
		})

		this.hammertime.on('panmove', e => {
			if (!this.canPan()) {
				return false
			}
      
			this.values.pan_x = e.deltaX
			this.values.pan_y = e.deltaY

			this.events.panning()
			this.handlePan(this.settings.x_start + e.deltaX, this.settings.y_start + e.deltaY)
		})

		this.hammertime.on('panend pancancel', () => {
			this.timers.end = this.getTime()
			this.timers.endPan = this.timers.end
			this.setAction(null)
		})

		this.hammertime.on('tap', e => {
			if (!this.canTap()) {
				return false
			}
      
			this.events.tapping()
			this.handleTap()
		})

		this.listeners.wheel = this.listeners.wheel ?? this.addListenerWheel()
	}

	addListenerWheel() {
		return this.el.addEventListener('wheel', e => {
			e.preventDefault()
			e.stopPropagation()

			if (!this.canWheel()) {
				return false
			}

			this.events.pinching()

			const factor = e.wheelDelta > 0 ? 0.25 : 0.2 * -1

			const elBoundingRect = this.el.getBoundingClientRect()
			const srcBoundingRect = e.srcElement.getBoundingClientRect()

			this.settings.scale_center = {
				x: e.offsetX + srcBoundingRect.x - elBoundingRect.x,
				y: e.offsetY + srcBoundingRect.y - elBoundingRect.y,
			}

			if (this.settings.scale_current * (1 + factor) <= this.settings.scale_max) {
				this.handlePinch(this.settings.scale_current * (1 + factor), this.settings.scale_center)
			}

			this.setAction('wheel')

			clearTimeout(this.timeouts.wheel)

			this.timeouts.wheel = setTimeout(() => {
				this.setAction(null)
			}, this.settings.dwell)
		})
	}

	canPan() {
		if (!this.settings.panable) {
			return false
		}

		if (this.timers.end + this.settings.dwell > this.getTime()) {
			return false
		}

		if (this.values.action !== null && this.values.action !== 'pan') {
			return false
		}

		if (this.settings.scale_current < 1) {
			return false
		}

		return true
	}

	canPinch() {
		if (!this.settings.pinchable) {
			return false
		}

		if (this.timers.end + this.settings.dwell > this.getTime()) {
			return false
		}

		if (this.values.action !== null && this.values.action !== 'pinch') {
			return false
		}

		return true
	}

	canTap() {
		if (!this.settings.tapable) {
			return false
		}

		return true
	}

	canWheel() {
		if (!this.settings.pinchable) {
			return false
		}

		if (this.timers.end + this.settings.dwell > this.getTime()) {
			return false
		}

		return true
	}

	events = {
		boundaryExceeded() {
			//  overwrite this
		},
		updated(data) {
			//  overwrite this
		},
		panning() {
			//  overwrite this
		},
		pinching() {
			//  overwrite this
		},
		tapping() {
			//  overwrite this
		},
	}

	getTime() {
		return Date.now()
	}

	handlePan(x, y) {
		this.settings.x_current = x
		this.settings.y_current = y

		this.setParamsWithinLimits()
		this.update()
	}

	handlePinch(scale, center) {
		//  work out x% and y% of pointer inside image
		const pinchImageXpc = (center.x / this.values.element_w_init) * 100
		const pinchImageYpc = (center.y / this.values.element_h_init) * 100

		//  work out x% and y% of pointer inside holder
		const offset_x = (this.values.offset_x_max || 0) - this.values.offset_x
		const pinchHolderXpx = this.values.element_w * (pinchImageXpc / 100) - offset_x
		const pinchHolderXpc = (pinchHolderXpx / this.values.element_w_init) * 100
		const offset_y = (this.values.offset_y_max || 0) - this.values.offset_y
		const pinchHolderYpx = this.values.element_h * (pinchImageYpc / 100) - offset_y
		const pinchHolderYpc = (pinchHolderYpx / this.values.element_h_init) * 100

		this.settings.scale_current = scale

		const newW = this.values.element_w_init * this.settings.scale_current
		const newH = this.values.element_h_init * this.settings.scale_current

		const newImageX = (newW / 100) * pinchImageXpc
		const newImageY = (newH / 100) * pinchImageYpc

		this.settings.x_current = center.x - newImageX + (newW - this.values.element_w_init) / 2
		this.settings.y_current = center.y - newImageY + (newH - this.values.element_h_init) / 2

		const diffXpx = center.x - pinchHolderXpx
		const diffYpx = center.y - pinchHolderYpx

		this.settings.x_current -= diffXpx
		this.settings.y_current -= diffYpx

		if (this.setParamsWithinLimits()) {
			this.update()
		}
	}

	handleTap() {
		this.settings.scale_current = this.settings.scale_current > 1 ? 1 : 2
		this.settings.x_current = 0
		this.settings.y_current = 0
		this.setParamsWithinLimits()
		this.update()
	}

	reset() {
		this.settings.scale_start = this.settings.scale_initial
		this.settings.scale_current = this.settings.scale_start

		this.settings.x_start = this.settings.x_initial
		this.settings.x_current = this.settings.x_start

		this.settings.y_start = this.settings.y_initial
		this.settings.y_current = this.settings.y_start

		this.update()
	}

	setAction(action) {
		this.values.action = action
	}

	setParamsWithinLimits() {
		if (this.settings.scale_current < this.settings.scale_min) {
			this.settings.scale_current = this.settings.scale_min
			this.events.boundaryExceeded()

			return false
		}

		if (this.settings.scale_current > this.settings.scale_max) {
			this.settings.scale_current = this.settings.scale_max
			this.events.boundaryExceeded()

			return false
		}

		const offset_x_max =
			(this.hammertime.element.clientWidth / 2) * (this.settings.scale_current - 1)

		if (this.settings.scale_current >= 1) {
			if (this.settings.x_current < offset_x_max * -1) {
				this.settings.x_current = offset_x_max * -1
				this.events.boundaryExceeded()
			}
			if (this.settings.x_current > offset_x_max) {
				this.settings.x_current = offset_x_max
				this.events.boundaryExceeded()
			}
		}

		const offset_y_max =
			(this.hammertime.element.clientHeight / 2) * (this.settings.scale_current - 1)

		if (this.settings.scale_current >= 1) {
			if (this.settings.y_current < offset_y_max * -1) {
				this.settings.y_current = offset_y_max * -1
				this.events.boundaryExceeded()
			}
			if (this.settings.y_current > offset_y_max) {
				this.settings.y_current = offset_y_max
				this.events.boundaryExceeded()
			}
		}

		this.values.offset_x_max = Number.parseFloat(offset_x_max.toFixed(4))
		this.values.offset_y_max = Number.parseFloat(offset_y_max.toFixed(4))

		this.values.element_w = this.hammertime.element.clientWidth * this.settings.scale_current
		this.values.element_h = this.hammertime.element.clientHeight * this.settings.scale_current

		return true
	}

	update() {
		const x = this.settings.x_current || 0
		const y = this.settings.y_current || 0
		const s = this.settings.scale_current || 1
		const transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
    
		this.el.style.transform = transform
		this.el.style.WebkitTransform = transform

		this.values.offset_x = Number.parseFloat(x.toFixed(2))
		this.values.offset_y = Number.parseFloat(y.toFixed(2))

		this.events.updated(this.values)
	}
}
