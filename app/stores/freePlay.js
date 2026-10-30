import {defineStore} from 'pinia'
import {dateHelpers} from '@/lib/challenges'

const KEY = 'sp-free-play'

//  Anonymous visitors get one free puzzle a day. We keep the slug they spent it
//  on so they can return to that same puzzle; any other puzzle waits behind
//  sign-in until the next day.
export const useFreePlayStore = defineStore('freePlay', {
    state: () => ({day: null, slug: null}),
    getters: {
        //  the slug today's free play was spent on, or null while it's unused
        claimedSlug: (state) => (state.day === dateHelpers.todayKey() ? state.slug : null),
        available() {
            return this.claimedSlug === null
        },
    },
    actions: {
        load() {
            if (typeof localStorage === 'undefined') return
            try {
                const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
                if (saved) {
                    this.day = saved.day ?? null
                    this.slug = saved.slug ?? null
                }
            } catch {
                //
            }
        },
        canPlay(slug) {
            const claimed = this.claimedSlug
            return claimed === null || claimed === slug
        },
        claim(slug) {
            if (this.claimedSlug !== null) return
            this.day = dateHelpers.todayKey()
            this.slug = slug
            if (typeof localStorage === 'undefined') return
            try {
                localStorage.setItem(KEY, JSON.stringify({day: this.day, slug: this.slug}))
            } catch {
                //
            }
        },
    },
})
