import Archive from '@/api/Archive.js'

//  Dev demo aid: seed the playStatus store with a spread of started/percent/completed
//  states for every puzzle in the archive. Activate with ?mockStatus=1 in the URL, or
//  call window.__mockPlayStatus() / window.__clearMockPlayStatus() from the console.
//  Does not touch IndexedDB, so a reload without the flag restores real state.

export default defineNuxtPlugin((nuxtApp) => {
    if (!import.meta.client) return

    const seed = () => {
        const ps = usePlayStatusStore()
        const puzzles = Object.keys(Archive.getPuzzles() ?? {})
        if (!puzzles.length) return false
        const map = {...ps.map}
        puzzles.forEach((slug, i) => {
            const mode = i % 3
            if (mode === 0) return
            if (mode === 1) {
                map[slug] = {started: true, completed: false, progress: 15 + ((i * 37) % 70), completedAt: null}
            } else {
                map[slug] = {started: true, completed: true, progress: 100, completedAt: new Date().toISOString()}
            }
        })
        ps.map = map
        return true
    }

    const clear = () => {
        const ps = usePlayStatusStore()
        ps.map = {}
        ps.loadAll()
    }

    window.__mockPlayStatus = seed
    window.__clearMockPlayStatus = clear

    const active = () => new URLSearchParams(window.location.search).get('mockStatus') === '1'

    const trySeed = (attempts = 20) => {
        if (!active()) return
        if (seed()) return
        if (attempts > 0) setTimeout(() => trySeed(attempts - 1), 100)
    }

    nuxtApp.hook('page:finish', () => trySeed())
    trySeed()
})
