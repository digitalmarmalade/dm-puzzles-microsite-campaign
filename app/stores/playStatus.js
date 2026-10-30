import {defineStore} from 'pinia'

//  Per-puzzle play state, matching the Astro microsite's mechanism.
//
//  The puzzle iframe postMessages its lifecycle to us — `{date, id, slug, type,
//  payload}` where type is puzzlestart/puzzlecomplete/puzzlereset/… and payload is
//  `{ status: { started, completed, progress, … } }`. We persist that payload
//  per-slug in OUR OWN IndexedDB ('SPMicrositeData' → store 'puzzles', keyed by
//  slug) and read it back to drive the cards.
//
//  This is origin-independent (postMessage crosses origins), so it works whether or
//  not the puzzle is served from the same origin as the microsite.

const DB_NAME = 'SPMicrositeData'
const STORE = 'puzzles'

function openDb() {
    return new Promise((resolve) => {
        if (!import.meta.client || typeof indexedDB === 'undefined') return resolve(null)
        let req
        try { req = indexedDB.open(DB_NAME, 1) } catch { return resolve(null) }
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath: 'slug'})
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
    })
}

function readAll(db) {
    return new Promise((resolve) => {
        if (!db) return resolve([])
        let tx
        try { tx = db.transaction(STORE, 'readonly') } catch { return resolve([]) }
        const req = tx.objectStore(STORE).getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => resolve([])
    })
}

function writeOne(db, slug, data) {
    return new Promise((resolve) => {
        if (!db) return resolve()
        let tx
        try { tx = db.transaction(STORE, 'readwrite') } catch { return resolve() }
        tx.objectStore(STORE).put({slug, data})
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
    })
}

//  stored payload ({status:{…}}) → the shape the cards consume. `progress` stays
//  nullable: the engine sends a number (0 by default), and we only surface it as a
//  real percentage once it's above 0, otherwise the card shows a generic in-progress.
function normalize(data) {
    const status = (data && data.status) || data || null
    const progress = status && typeof status.progress === 'number' ? status.progress : null
    const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null)
    return {
        started: !!(status && status.started),
        startedAt: status && typeof status.started === 'number' ? status.started : null,
        completed: !!(status && status.completed),
        progress: progress && progress > 0 ? progress : null,
        completedAt: status && status.completed ? status.completed : null,
        wordsFound: num(data && data.wordsFound),
        totalWords: num(data && data.totalWords),
        cellsRevealed: num(data && data.cellsRevealed),
        score: num(data && data.score),
        maxScore: num(data && data.maxScore),
    }
}

const KEPT_COUNTS = ['wordsFound', 'totalWords', 'cellsRevealed', 'score', 'maxScore']

function withCompletions(map) {
    let next = null
    for (const c of useChallengesStore().completions ?? []) {
        if (!c?.slug || map[c.slug]?.completed) continue
        next ??= {...map}
        const s = next[c.slug]
        next[c.slug] = {
            started: true,
            startedAt: s?.startedAt ?? null,
            completed: true,
            progress: null,
            completedAt: c.at,
            ...Object.fromEntries(KEPT_COUNTS.map(k => [k, s?.[k] ?? (typeof c[k] === 'number' ? c[k] : null)])),
        }
    }
    return next ?? map
}

export const usePlayStatusStore = defineStore('playStatus', {
    state: () => ({
        map: {},   //  slug -> normalized status
    }),
    getters: {
        statusFor: (state) => (slug) => state.map[slug] || null,
    },
    actions: {
        //  read everything we've persisted (keyed by slug) and merge into the map
        async loadAll() {
            if (!import.meta.client) return
            const db = await openDb()
            const rows = await readAll(db)
            if (db) db.close()
            const next = {...this.map}
            for (const row of rows) next[row.slug] = normalize(row.data)
            this.map = withCompletions(next)
        },
        applyCompletions() {
            this.map = withCompletions(this.map)
        },
        //  pages call loadFor(list); we key by slug so the list isn't needed
        async loadFor() { return this.loadAll() },
        //  persist a payload the puzzle posted, and reflect it immediately
        async save(slug, incoming) {
            if (!import.meta.client || !slug) return
            const previous = this.map[slug]
            const kept = previous
                ? Object.fromEntries(KEPT_COUNTS.filter(k => typeof previous[k] === 'number' && typeof incoming?.[k] !== 'number').map(k => [k, previous[k]]))
                : {}
            const payload = {...incoming, ...kept}
            const db = await openDb()
            await writeOne(db, slug, payload)
            if (db) db.close()
            this.map = {...this.map, [slug]: normalize(payload)}
        },
    },
})
