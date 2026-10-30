const STORAGE_KEY = 'sp-last-seen-changelog'
const MODAL_ID = 'modal-changelog'

let checkedThisSession = false

export function useChangelog() {
    return useState('changelog:entries', () => [])
}

export async function checkChangelog() {
    if (!import.meta.client || checkedThisSession) return
    checkedThisSession = true

    let list = []
    try {
        const res = await fetch('/changelog.json', {cache: 'no-store'})
        if (!res.ok) return
        list = await res.json()
    } catch {
        return
    }
    if (!Array.isArray(list) || !list.length) return

    const newestId = list[0].id
    let lastSeen = null
    try { lastSeen = localStorage.getItem(STORAGE_KEY) } catch {}

    //  First visit — no prior baseline, don't interrupt with old notes.
    if (!lastSeen) {
        try { localStorage.setItem(STORAGE_KEY, newestId) } catch {}
        return
    }
    if (lastSeen === newestId) return

    const cutoff = list.findIndex(e => e.id === lastSeen)
    const fresh = cutoff === -1 ? list : list.slice(0, cutoff)
    if (!fresh.length) return

    useChangelog().value = fresh
    useModalStore().open(MODAL_ID)
}

export function dismissChangelog() {
    const entries = useChangelog()
    if (entries.value.length && entries.value[0].id !== 'preview') {
        try { localStorage.setItem(STORAGE_KEY, entries.value[0].id) } catch {}
    }
    useModalStore().close(MODAL_ID)
    entries.value = []
}

export {MODAL_ID as CHANGELOG_MODAL_ID}
