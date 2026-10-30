//  When the local date has rolled over since the page was loaded (typically
//  because the tab or PWA was left open overnight), flip `refreshing` true so
//  an overlay can show, then reload to fetch today's fresh content. Detection
//  runs on visibility change (cheap, catches the common wake-up case) and via
//  a one-minute fallback interval while the tab is visible.

const RELOAD_DELAY_MS = 600

const todayKey = () => {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function useDayRefresh() {
    const refreshing = useState('dayRefresh:refreshing', () => false)
    if (!import.meta.client) return {refreshing}

    //  Preview: ?showRefresh=1 (or window.__showRefresh()) keeps the overlay
    //  visible without reloading so it can be styled.
    const previewMode = new URLSearchParams(window.location.search).get('showRefresh') === '1'
    window.__showRefresh = () => { refreshing.value = true }
    window.__hideRefresh = () => { refreshing.value = false }
    if (previewMode) refreshing.value = true

    const initialKey = todayKey()
    let triggered = false
    let intervalId = null

    const trigger = () => {
        if (triggered || previewMode) return
        triggered = true
        refreshing.value = true
        setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    }

    const check = () => {
        if (todayKey() !== initialKey) trigger()
    }

    const onVisibility = () => {
        if (document.visibilityState === 'visible') check()
    }

    document.addEventListener('visibilitychange', onVisibility)
    intervalId = setInterval(check, 60_000)

    onBeforeUnmount(() => {
        document.removeEventListener('visibilitychange', onVisibility)
        if (intervalId) clearInterval(intervalId)
    })

    return {refreshing}
}
