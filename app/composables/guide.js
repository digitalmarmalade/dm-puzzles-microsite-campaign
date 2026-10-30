import Archive from '@/api/Archive.js'

const TIP_TIMEOUT_MS = 15000

let tipTimer = null
let settleTimer = null
let retries = 0
const MAX_RETRIES = 10

const TOUR_STEPS = [
    {id: 'yourPuzzles', target: '[data-guide="your-puzzles"]'},
    {id: 'today', target: '[data-guide="today"] > :first-child'},
    {id: 'summary', target: '[data-guide="summary"]'},
    {id: 'all', target: '[data-guide="all"] > :first-child'},
    {id: 'stats', target: '[data-guide="nav-stats"]', outline: true, menu: '[data-guide="nav-menu"]'},
    {id: 'free', target: '[data-guide="free"]'},
    {id: 'ready'},
]

const TIPS = {
    yourPuzzles: '[data-guide="your-puzzles"]',
    challengesOff: '[data-guide="challenges"]',
}

export const guideVisible = (el) => {
    if (!el) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth
}

export function useGuide() {
    const tour = useState('guide:tour', () => ({
        active: false,
        ready: false,
        index: 0,
        steps: [],
        placement: 'below',
        rect: {top: 0, left: 0, width: 0, height: 0},
        tipTop: 0,
        tipLeft: 0,
        arrow: 0,
        press: null,
        next: null,
    }))
    const menuOpen = useState('nav:menuOpen', () => false)
    const tip = useState('guide:tip', () => null)
    const preferences = usePreferencesStore()
    const modals = useModalStore()
    const {model, branchFor} = useTasteModel()
    const hidden = useHiddenVariantsStore()
    const playStatus = usePlayStatusStore()
    const preview = usePreview()

    function recommend() {
        const done = (slug) => !!playStatus.statusFor(slug)?.completed
        const entries = Archive.getTodaysPuzzles()
            .map(puzzle => ({puzzle, slug: branchFor(puzzle).branch?.slug ?? puzzle.icon}))
            .filter(e => !hidden.isHidden(e.slug) && !done(e.puzzle.slug))
        entries.sort((a, b) => model.value.scoreFor(b.slug) - model.value.scoreFor(a.slug))
        return entries[0]?.puzzle ?? null
    }

    function startTour(source = 'direct') {
        closeTip()
        const available = (step) => !step.target
            || guideVisible(document.querySelector(step.target))
            || (step.menu && guideVisible(document.querySelector(step.menu)))
        const steps = TOUR_STEPS.filter(available).flatMap(step =>
            step.menu && !guideVisible(document.querySelector(step.target))
                ? [{id: 'menu', target: step.menu, outline: true}, step]
                : [step])
        tour.value = {...tour.value, active: true, ready: false, index: 0, steps, next: recommend()}
        trackFunnel('sp_feature_tour_start', {source, steps_total: steps.length})
        setTimeout(() => showStep(0), 50)
    }

    function showStep(index) {
        const previous = tour.value.steps[tour.value.index]
        const step = tour.value.steps[index]
        if (!step) return
        if (previous?.menu && previous !== step) menuOpen.value = false
        tour.value.index = index
        tour.value.ready = false
        if (!step.target) {
            tour.value.placement = 'centre'
            tour.value.ready = true
            if (step.id === 'ready') {
                preferences.set('onboardingCompleted', true)
                preview.hide('welcome')
            }
            return
        }
        const needsMenu = step.menu && !guideVisible(document.querySelector(step.target))
        if (!needsMenu) {
            document.querySelector(step.target)?.scrollIntoView({block: 'center', behavior: 'smooth'})
            settle(400)
            return
        }
        const button = document.querySelector(step.menu)
        const r = button?.getBoundingClientRect()
        tour.value.press = r ? {top: r.top + r.height / 2, left: r.left + r.width / 2} : null
        setTimeout(() => {
            tour.value.press = null
            if (!tour.value.active || tour.value.index !== index) return
            menuOpen.value = true
            settle(400)
        }, r ? 450 : 0)
    }

    function settle(delay = 180) {
        clearTimeout(settleTimer)
        if (delay > 200) retries = 0
        settleTimer = setTimeout(position, delay)
    }

    function moving() {
        const t = tour.value
        if (!t.active || !t.steps[t.index]?.target) return
        t.ready = false
        settle()
    }

    function position() {
        const t = tour.value
        const step = t.steps[t.index]
        if (!t.active || !step?.target) return
        const el = document.querySelector(step.target)
        if (!guideVisible(el)) {
            if (step.menu && menuOpen.value && retries++ < MAX_RETRIES) return settle(200)
            t.placement = 'dock'
            t.ready = true
            return
        }
        retries = 0
        const r = el.getBoundingClientRect()
        const pad = 6
        const vh = window.innerHeight
        const vw = window.innerWidth
        const tipHeight = 200
        const tipHalf = Math.min(160, (vw - 32) / 2)
        const gap = pad + 12

        t.rect = {top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2}
        const centreX = (r.left + r.right) / 2
        const centreY = (r.top + r.bottom) / 2
        t.tipLeft = Math.max(16 + tipHalf, Math.min(vw - 16 - tipHalf, (r.left + r.right) / 2))
        t.tipTop = Math.max(16 + tipHeight / 2, Math.min(vh - 16 - tipHeight / 2, (r.top + r.bottom) / 2))

        if (vh - r.bottom - gap >= tipHeight) {
            t.placement = 'below'
            t.tipTop = r.bottom + gap
        } else if (r.top - gap >= tipHeight) {
            t.placement = 'above'
            t.tipTop = r.top - gap
        } else if (vw - r.right - gap >= tipHalf * 2 + 16) {
            t.placement = 'right'
            t.tipLeft = r.right + gap + tipHalf
        } else if (r.left - gap >= tipHalf * 2 + 16) {
            t.placement = 'left'
            t.tipLeft = r.left - gap - tipHalf
        } else {
            t.placement = 'dock'
        }
        t.arrow = ['left', 'right'].includes(t.placement) ? centreY - t.tipTop : centreX - t.tipLeft
        t.ready = true
    }

    function nextStep() {
        if (tour.value.index >= tour.value.steps.length - 1) finishTour('done')
        else showStep(tour.value.index + 1)
    }

    function backStep() {
        if (tour.value.index > 0) showStep(tour.value.index - 1)
    }

    function finishTour(outcome = 'end') {
        const t = tour.value
        trackFunnel('sp_feature_tour_complete', {step: t.steps[t.index]?.id, step_index: t.index, steps_total: t.steps.length, outcome})
        if (t.steps[t.index]?.menu) menuOpen.value = false
        tour.value = {...t, active: false, ready: false, steps: [], press: null}
        preferences.set('onboardingCompleted', true)
        preview.hide('welcome')
    }

    function tipBlocked() {
        return tour.value.active || !!tip.value || modals.openList.length > 0
    }

    function showTip(id, text, action = null) {
        const target = TIPS[id]
        if (!target || preferences.guideTips.includes(id) || tipBlocked()) return false
        const el = document.querySelector(target)
        if (!guideVisible(el)) return false
        preferences.set('guideTips', [...preferences.guideTips, id])
        tip.value = {id, target, text, action, top: 0, left: 0, arrow: 0, rect: null, above: false}
        positionTip()
        el.addEventListener('pointerdown', closeTip, {once: true})
        clearTimeout(tipTimer)
        tipTimer = setTimeout(closeTip, TIP_TIMEOUT_MS)
        return true
    }

    function positionTip() {
        const current = tip.value
        if (!current) return
        const el = document.querySelector(current.target)
        if (!guideVisible(el)) return closeTip()
        const r = el.getBoundingClientRect()
        const vw = window.innerWidth
        const half = Math.min(140, (vw - 32) / 2)
        const centre = (r.left + r.right) / 2
        const pad = 4
        current.rect = {top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2}
        current.above = r.bottom + pad + 10 + 90 > window.innerHeight
        current.top = current.above ? r.top - pad - 10 : r.bottom + pad + 10
        current.left = Math.max(16 + half, Math.min(vw - 16 - half, centre))
        current.arrow = centre - current.left
    }

    function closeTip() {
        clearTimeout(tipTimer)
        tip.value = null
    }

    function reposition() {
        if (tour.value.active) position()
        if (tip.value) positionTip()
    }

    return {tour, tip, startTour, nextStep, backStep, finishTour, showTip, closeTip, reposition, moving, recommend}
}
