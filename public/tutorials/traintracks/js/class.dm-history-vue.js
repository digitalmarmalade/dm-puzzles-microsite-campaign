/**
 The DM history class for use with VueJS
 **/

var DMHistoryVue

;(function () {
	'use strict'

	DMHistoryVue = function (vm, userSettings) {
		this.vm = vm
		this.userSettings = userSettings || {}

		this.data = []
		this.idx = -1
		this.length = 0
		this.hasPrev = false
		this.hasNext = false

		this.defaultSettings = {
			eventPrefix: 'puzzlehistory',
			limit: -1,
			props: [],
		}

		this.settings = JSON.parse(JSON.stringify(this.defaultSettings))

		for (let p in this.userSettings) {
			this.settings[p] = this.userSettings[p]
		}
	}

	DMHistoryVue.prototype.constructor = DMHistoryVue

	DMHistoryVue.prototype.back = function () {
		if (this.data.length < 1) {
			return false
		}

		if (this.idx < 0) {
			return false
		}

		if (this.idx === this.data.length) {
			this.idx--
		}

		this.idx--
		this.setItem()
	}

	DMHistoryVue.prototype.broadcast = function () {
		document.dispatchEvent(
			new CustomEvent(`${this.settings.eventPrefix}change`, {
				detail: {
					history: {
						data: this.data.slice(),
						length: this.length,
						hasPrev: this.hasPrev,
						hasNext: this.hasNext,
					},
				},
			}),
		)
	}

	DMHistoryVue.prototype.forward = function () {
		this.idx++

		if (this.idx >= this.data.length) {
			return false
		}

		this.setItem()
	}

	DMHistoryVue.prototype.go = function (offset) {
		if (idx + offset < 0) {
			return false
		}

		if (idx + offset >= this.data.length) {
			return false
		}

		this.idx = this.idx + offset
		this.setItem()
	}

	DMHistoryVue.prototype.push = function () {
		this.data = this.data.slice(0, this.idx + 1)

		if (this.settings.limit > -1 && this.data.length >= this.settings.limit - 1) {
			this.data = this.data.slice((this.settings.limit - 1) * -1)
		}

		var newItem = {}

		for (let p in this.settings.props) {
			const prop = this.settings.props[p]
			newItem[prop] = JSON.parse(JSON.stringify(this.vm[prop]))
		}

		this.data.push(newItem)
		this.idx = this.data.length - 1

		this.update()
		this.broadcast()
	}

	DMHistoryVue.prototype.setItem = function () {
		const thisItem = this.data.slice()[this.idx]

		for (let p in this.settings.props) {
			const prop = this.settings.props[p]
			this.vm[prop] = JSON.parse(JSON.stringify(thisItem[prop]))
		}

		this.update()
		this.broadcast()
	}

	DMHistoryVue.prototype.show = function (idx) {
		if (idx < 0) {
			return false
		}

		if (idx >= this.data.length) {
			return false
		}

		this.idx = idx
		this.setItem()
	}

	DMHistoryVue.prototype.update = function () {
		this.length = this.data.length
		this.hasPrev = this.idx > 0
		this.hasNext = this.idx < this.data.length - 1
	}

	DMHistoryVue.prototype.reset = function () {
		this.data = []
		this.idx = -1
		this.length = 0
		this.hasPrev = false
		this.hasNext = false
	}
})()
