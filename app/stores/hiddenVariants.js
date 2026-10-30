import {defineStore} from 'pinia'

const KEY = 'sp-hidden-variants'

export const useHiddenVariantsStore = defineStore('hiddenVariants', {
    state: () => ({
        //  hidden variant slugs (e.g. 'headcoach')
        slugs: [],
    }),
    getters: {
        isHidden: (state) => (slug) => state.slugs.includes(slug),
        count: (state) => state.slugs.length,
    },
    actions: {
        load() {
            if (typeof localStorage === 'undefined') return
            try {
                const raw = localStorage.getItem(KEY)
                this.slugs = raw ? JSON.parse(raw) : []
            } catch {
                this.slugs = []
            }
        },
        persist() {
            if (typeof localStorage === 'undefined') return
            localStorage.setItem(KEY, JSON.stringify(this.slugs))
        },
        toggle(slug) {
            if (!slug) return
            const i = this.slugs.indexOf(slug)
            if (i >= 0) this.slugs.splice(i, 1)
            else this.slugs.push(slug)
            this.persist()
        },
    },
})
