import {defineStore} from 'pinia'
import {clampAssists, nextAssists, stepAssists, suggestAssists} from '@/lib/assists'
import {monthKey} from '@/lib/lifetime'

const KEY = 'sp-assists'
const OFFERS_KEY = 'sp-assist-offers'
const HISTORY_KEY = 'sp-assist-history'
const LETTERS_KEY = 'sp-assist-letters'
const DECLINE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

const fromStarterLetters = (value, tag) => {
    if (tag !== 'crossword' || typeof value?.prefillPercent !== 'number' || 'letterLevel' in value) return value
    const percent = value.prefillPercent
    return {letterLevel: percent <= 0 ? 0 : percent <= 12 ? 2 : percent <= 20 ? 3 : percent <= 30 ? 4 : 5}
}

export const useAssistsStore = defineStore('assists', {
    state: () => ({byTag: {}, offers: {}, history: {}, letters: {}}),
    getters: {
        forTag: (state) => (tag) => fromStarterLetters(state.byTag[tag] ?? null, tag),
    },
    actions: {
        load() {
            if (typeof localStorage === 'undefined') return
            try {
                this.byTag = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
            } catch {
                this.byTag = {}
            }
            this.byTag = Object.fromEntries(Object.entries(this.byTag).map(([tag, value]) => [tag, fromStarterLetters(value, tag)]))
            try {
                this.offers = JSON.parse(localStorage.getItem(OFFERS_KEY) || '{}') || {}
            } catch {
                this.offers = {}
            }
            try {
                this.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}') || {}
            } catch {
                this.history = {}
            }
            try {
                this.letters = JSON.parse(localStorage.getItem(LETTERS_KEY) || '{}') || {}
            } catch {
                this.letters = {}
            }
            this.snapshot()
        },
        snapshot(tags = Object.keys(this.byTag)) {
            const month = monthKey(new Date())
            const current = this.history[month] ?? {}
            const missing = tags.filter(tag => !(tag in current))
            if (this.history[month] && !missing.length) return
            const entries = missing.map(tag => [tag, {from: this.byTag[tag] ?? null, to: this.byTag[tag] ?? null}])
            this.history = {...this.history, [month]: {...current, ...Object.fromEntries(entries)}}
            this.persist()
        },
        record(tag, before) {
            const month = monthKey(new Date())
            const entry = this.history[month]?.[tag] ?? {from: before}
            this.history = {...this.history, [month]: {...this.history[month], [tag]: {...entry, to: this.byTag[tag] ?? null}}}
        },
        persist() {
            if (typeof localStorage === 'undefined') return
            try {
                localStorage.setItem(KEY, JSON.stringify(this.byTag))
                localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history))
            } catch {
                //
            }
        },
        save(tag, next) {
            if (!tag || next === (this.byTag[tag] ?? null)) return next
            const before = this.byTag[tag] ?? null
            this.byTag = {...this.byTag, [tag]: next}
            this.record(tag, before)
            this.persist()
            return next
        },
        clear(tag) {
            if (!(tag in this.byTag)) return
            const {[tag]: before, ...rest} = this.byTag
            this.byTag = rest
            this.record(tag, before)
            this.persist()
        },
        applyRating(tag, type, payload) {
            return this.save(tag, nextAssists(type, this.byTag[tag], payload))
        },
        applyDirection(tag, type, direction) {
            const next = stepAssists(type, this.byTag[tag], direction)
            return next ? this.save(tag, next) : this.forTag(tag)
        },
        offerFor(tag, type, recent, now = Date.now()) {
            const offer = suggestAssists(type, this.byTag[tag], recent)
            const seen = this.offers[tag]
            if (!offer || seen?.basedOn === offer.basedOn) return null
            if (seen?.accepted === false && now - seen.at < DECLINE_COOLDOWN_MS) return null
            return offer
        },
        answerOffer(tag, offer, accepted) {
            this.offers = {...this.offers, [tag]: {basedOn: offer.basedOn, accepted, at: Date.now()}}
            try {
                localStorage.setItem(OFFERS_KEY, JSON.stringify(this.offers))
            } catch {
                //
            }
            return accepted ? this.save(tag, offer.next) : this.forTag(tag)
        },
        rememberLetters(tag, letters) {
            this.letters = {...this.letters, [tag]: letters}
            try {
                localStorage.setItem(LETTERS_KEY, JSON.stringify(this.letters))
            } catch {
                //
            }
        },
        applySetting(tag, type, assists) {
            const next = clampAssists(type, assists)
            return next ? this.save(tag, next) : this.forTag(tag)
        },
    },
})
