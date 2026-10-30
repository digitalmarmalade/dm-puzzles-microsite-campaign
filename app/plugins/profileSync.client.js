import {getApps} from 'firebase/app'
import {collection, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc} from 'firebase/firestore'
import {groupByMonth, mergeProfiles, SECTIONS, SYNCED_PREFERENCES} from '@/lib/profileSync'

const META_KEY = 'sp-sync'
const PUSH_DELAY_MS = 2000
const FOCUS_PULL_MIN_MS = 60000
const REMOTE_PULL_DELAY_MS = 1500

function hash(str) {
    let h = 5381
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
    return `${str.length}:${(h >>> 0).toString(36)}`
}

function loadMeta() {
    try {
        return {uid: null, sections: {}, months: {}, ...JSON.parse(localStorage.getItem(META_KEY) || 'null')}
    } catch {
        return {uid: null, sections: {}, months: {}}
    }
}

export default defineNuxtPlugin(() => {
    const features = useFeatures()
    if (!features.account) return

    const auth = useAuthStore()
    const authReady = useState('authReady')
    const favourites = useFavouritesStore()
    const hidden = useHiddenVariantsStore()
    const preferences = usePreferencesStore()
    const assists = useAssistsStore()
    const challenges = useChallengesStore()
    const sample = useState('tasteSample', () => null)

    const meta = loadMeta()
    const saveMeta = () => {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(meta))
        } catch {
            //
        }
    }

    const read = {
        favourites: () => favourites.slugs,
        hidden: () => hidden.slugs,
        preferences: () => Object.fromEntries(SYNCED_PREFERENCES.map(k => [k, preferences[k]])),
        assists: () => assists.byTag,
        assistHistory: () => assists.history,
        frozenDays: () => challenges.frozenDays,
        unlockedAchievements: () => challenges.unlockedAchievements,
        challengeLog: () => challenges.challengeLog,
        completions: () => challenges.completions,
        lifetime: () => challenges.lifetime,
    }

    const snapshot = () => ({
        sections: Object.fromEntries(SECTIONS.map(name => [name, {
            data: JSON.parse(JSON.stringify(read[name]())),
            updatedAt: meta.sections[name] ?? 0,
        }])),
    })

    const lastJson = Object.fromEntries(SECTIONS.map(name => [name, JSON.stringify(read[name]())]))
    let applying = false
    let pushTimer = null
    let lastPull = 0
    let syncing = false
    let pullAgain = false
    let lastPushedAt = 0
    let remoteTimer = null
    let unlisten = null

    function apply(merged) {
        applying = true
        const s = merged.sections
        favourites.slugs = [...s.favourites.data]
        favourites.persist()
        hidden.slugs = [...s.hidden.data]
        hidden.persist()
        for (const key of SYNCED_PREFERENCES) {
            const value = s.preferences.data[key]
            if (value !== undefined && typeof value === typeof preferences[key]) preferences[key] = value
        }
        preferences.persist()
        assists.byTag = {...s.assists.data}
        assists.history = {...s.assistHistory.data}
        assists.snapshot()
        assists.persist()
        challenges.frozenDays = [...s.frozenDays.data]
        challenges.unlockedAchievements = [...s.unlockedAchievements.data]
        challenges.challengeLog = [...s.challengeLog.data]
        challenges.completions = [...s.completions.data]
        challenges.lifetime = s.lifetime.data
        challenges.persist()
        for (const name of SECTIONS) {
            meta.sections[name] = s[name].updatedAt
            lastJson[name] = JSON.stringify(read[name]())
        }
        saveMeta()
        applying = false
    }

    function profileRef(uid) {
        return doc(getFirestore(), 'users', uid, 'settings', 'microsite')
    }

    function historyRef(uid, month) {
        return doc(getFirestore(), 'users', uid, 'history', month)
    }

    async function pushHistory(uid, completions) {
        const months = groupByMonth(completions)
        for (const [month, list] of Object.entries(months)) {
            const json = JSON.stringify(list)
            const h = hash(json)
            if (meta.months[month] === h) continue
            await setDoc(historyRef(uid, month), {completions: JSON.parse(json), updatedAt: Date.now()})
            meta.months[month] = h
        }
        saveMeta()
    }

    async function push() {
        pushTimer = null
        if (sample.value) return
        const uid = auth.user?.uid
        if (!uid || !getApps().length || meta.uid !== uid) return
        try {
            const snap = snapshot()
            const {completions, ...sections} = snap.sections
            await pushHistory(uid, completions.data)
            lastPushedAt = Date.now()
            await setDoc(profileRef(uid), {v: 2, updatedAt: lastPushedAt, sections})
        } catch (e) {
            console.warn('profile sync push failed', e)
        }
    }

    async function readRemote(uid) {
        const [profile, history] = await Promise.all([getDoc(profileRef(uid)), getDocs(collection(getFirestore(), 'users', uid, 'history'))])
        if (!profile.exists() && history.empty) return null
        const sections = {...(profile.exists() ? profile.data().sections : {})}
        const remoteMonths = {}
        const completions = [...(sections.completions?.data ?? [])]
        history.forEach((d) => {
            const list = d.data().completions ?? []
            remoteMonths[d.id] = hash(JSON.stringify(list))
            completions.push(...list)
        })
        sections.completions = {data: completions, updatedAt: 0}
        return {sections, remoteMonths}
    }

    function schedulePush() {
        if (pushTimer) clearTimeout(pushTimer)
        pushTimer = setTimeout(push, PUSH_DELAY_MS)
    }

    async function pull() {
        const uid = auth.user?.uid
        if (!uid || !getApps().length || sample.value) return
        if (syncing) {
            pullAgain = true
            return
        }
        syncing = true
        lastPull = Date.now()
        if (pushTimer) {
            clearTimeout(pushTimer)
            pushTimer = null
        }
        try {
            const remote = await readRemote(uid)
            const mode = meta.uid === uid ? 'sync' : meta.uid ? 'replace' : 'adopt'
            if (mode !== 'sync') meta.months = {}
            if (remote) meta.months = {...meta.months, ...remote.remoteMonths}
            const local = snapshot()
            const merged = remote ? mergeProfiles(local, remote, mode) : local
            if (remote) apply(merged)
            challenges.keepFullLog = true
            meta.uid = uid
            saveMeta()
            if (!remote || JSON.stringify(merged.sections) !== JSON.stringify(remote.sections)) await push()
        } catch (e) {
            console.warn('profile sync pull failed', e)
        } finally {
            syncing = false
            if (pullAgain) {
                pullAgain = false
                pull()
            }
        }
    }

    function listen(uid) {
        unlisten?.()
        unlisten = null
        if (!uid || !getApps().length) return
        let first = true
        unlisten = onSnapshot(profileRef(uid), (snap) => {
            if (first) {
                first = false
                return
            }
            if (snap.metadata.hasPendingWrites || !snap.exists() || snap.data().updatedAt === lastPushedAt) return
            if (remoteTimer) clearTimeout(remoteTimer)
            remoteTimer = setTimeout(pull, REMOTE_PULL_DELAY_MS)
        }, (e) => console.warn('profile sync listen failed', e))
    }

    function onChange() {
        if (applying || sample.value) return
        let changed = false
        for (const name of SECTIONS) {
            const json = JSON.stringify(read[name]())
            if (json === lastJson[name]) continue
            lastJson[name] = json
            meta.sections[name] = Date.now()
            changed = true
        }
        if (!changed) return
        saveMeta()
        if (auth.user?.uid && meta.uid === auth.user.uid) schedulePush()
    }

    for (const store of [favourites, hidden, preferences, assists, challenges]) {
        store.$subscribe(onChange, {detached: true})
    }

    watch(() => [auth.user?.uid, authReady.value], ([uid, ready]) => {
        listen(ready ? uid : null)
        if (uid && ready) pull()
    }, {immediate: true})

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - lastPull > FOCUS_PULL_MIN_MS) pull()
    })
})
