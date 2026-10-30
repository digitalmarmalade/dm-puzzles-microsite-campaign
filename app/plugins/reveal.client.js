const SEEN_KEY = 'sp-intro-seen'
const GROUPS = '.puzzle-card-grid, .variant-card-grid, .achievements__grid, .home-banners, .tutorial-lessons'
const STAGGER = 0.07
const INTRO_STAGGER = 0.1
const GRID_STAGGER = 0.06
const FAST_GRID_STAGGER = 0.01
const FAST_GRIDS = '.archive-main .puzzle-card-grid'
const INTRO_DELAY_MS = 350
const MAX_INTRO_DELAY = 1.6
const ROW_TOLERANCE = 48
const MAX_DEPTH = 4
const PENDING_MAX_MS = 4000
const gridItems = new WeakMap()
const fadeItems = new WeakSet()
const SPLASH_POLL_MS = 100
const SPLASH_MAX_MS = 6000
const MAX_STAGGER = 6
const SETTLE_MS = 900

function seenPaths() {
    try {
        return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'))
    } catch {
        return new Set()
    }
}

function markSeen(paths, path) {
    paths.add(path)
    try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...paths]))
    } catch {
        //
    }
}

function collect(el, depth, blocks) {
    if (el.matches(GROUPS)) {
        const fast = el.matches(FAST_GRIDS)
        for (const item of el.children) {
            gridItems.set(item, fast ? FAST_GRID_STAGGER : GRID_STAGGER)
            if (fast) fadeItems.add(item)
            blocks.push(item)
        }
        return
    }
    if (depth < MAX_DEPTH && el.querySelector(GROUPS)) {
        for (const child of el.children) collect(child, depth + 1, blocks)
        return
    }
    blocks.push(el)
}

function candidates() {
    const blocks = []
    for (const wrapper of document.querySelectorAll('main .wrapper')) {
        for (const child of wrapper.children) collect(child, 0, blocks)
    }
    return blocks.filter(el => el.getClientRects().length && !el.matches('dialog, script, style'))
}

function afterSplash() {
    return new Promise((resolve) => {
        const started = Date.now()
        const check = () => {
            if (!document.querySelector('.auth-splash') || Date.now() - started > SPLASH_MAX_MS) return resolve()
            setTimeout(check, SPLASH_POLL_MS)
        }
        check()
    })
}

export default defineNuxtPlugin((nuxtApp) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const router = useRouter()
    let observer = null
    let run = 0

    const root = document.documentElement
    let pendingTimer = null
    const pend = () => {
        root.setAttribute('data-reveal-pending', '')
        clearTimeout(pendingTimer)
        pendingTimer = setTimeout(unpend, PENDING_MAX_MS)
    }
    const unpend = () => {
        clearTimeout(pendingTimer)
        root.removeAttribute('data-reveal-pending')
    }

    nuxtApp.hook('page:start', () => {
        if (document.visibilityState === 'visible') pend()
    })

    const clearAll = () => {
        for (const el of document.querySelectorAll('[data-reveal]')) {
            el.removeAttribute('data-reveal')
            el.removeAttribute('data-reveal-fade')
            el.style.removeProperty('--reveal-delay')
        }
    }

    nuxtApp.hook('page:finish', async () => {
        observer?.disconnect()
        clearAll()
        const id = ++run
        if (document.visibilityState !== 'visible') return unpend()
        const route = router.currentRoute.value
        if (String(route.name ?? '').startsWith('index')) markSeen(seenPaths(), route.path)

        const onScreen = (el) => {
            const r = el.getBoundingClientRect()
            return r.top < window.innerHeight && r.bottom > 0
        }
        const elements = candidates().filter(el => fadeItems.has(el))
        for (const el of elements) {
            el.setAttribute('data-reveal', '')
            if (fadeItems.has(el)) el.setAttribute('data-reveal-fade', '')
        }
        unpend()
        if (!elements.length) return

        await afterSplash()
        if (id !== run) return

        const reveal = (el, delay) => {
            el.style.setProperty('--reveal-delay', `${delay.toFixed(2)}s`)
            el.setAttribute('data-reveal', 'in')
            setTimeout(() => {
                el.removeAttribute('data-reveal')
                el.removeAttribute('data-reveal-fade')
                el.style.removeProperty('--reveal-delay')
            }, SETTLE_MS + delay * 1000)
        }

        const current = new IntersectionObserver((entries) => {
            let delay = 0
            for (const entry of entries) {
                if (!entry.isIntersecting) continue
                current.unobserve(entry.target)
                reveal(entry.target, Math.min(delay, MAX_STAGGER * STAGGER))
                delay += Math.min(gridItems.get(entry.target) ?? STAGGER, STAGGER)
            }
        }, {rootMargin: '0px 0px -4% 0px'})
        observer = current

        setTimeout(() => {
            if (id !== run) return
            const visible = []
            for (const el of elements) {
                if (!el.isConnected) continue
                if (!onScreen(el)) {
                    current.observe(el)
                    continue
                }
                const r = el.getBoundingClientRect()
                visible.push({el, top: Math.round(r.top), left: r.left})
            }
            visible.sort((a, b) => a.top - b.top)
            let rowTop = -Infinity
            let row = -1
            for (const item of visible) {
                if (item.top - rowTop > ROW_TOLERANCE) {
                    rowTop = item.top
                    row++
                }
                item.row = row
            }
            visible.sort((a, b) => a.row - b.row || a.left - b.left)
            let delay = 0
            for (const {el} of visible) {
                reveal(el, Math.min(delay, MAX_INTRO_DELAY))
                delay += gridItems.get(el) ?? INTRO_STAGGER
            }
        }, INTRO_DELAY_MS)
    })
})
