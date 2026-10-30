import {collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch} from 'firebase/firestore'
import {signInAnonymously} from 'firebase/auth'
import {loadCampaign} from '@/lib/campaign/registry'
import {dateIn, isIsoDate} from '@/lib/campaign/dates'
import {SAMPLE_RUNS, phase, progress as progressOf, sampleRun, startDateFor, timezoneOf, trackOf} from '@/lib/campaign/schedule'
import {cleanProfile, handleFrom} from '@/lib/campaign/profile'

export async function useCampaign() {
    const route = useRoute()
    const campaign = await loadCampaign(route.params.campaign)
    if (!campaign) throw createError({statusCode: 404, statusMessage: 'Campaign not found', fatal: true})
    return campaign
}

export function useCampaignText(campaign) {
    const {locale} = useI18n()
    return (key) => campaign.text?.[locale.value]?.[key] ?? campaign.text?.en?.[key] ?? ''
}

const rgbOf = (hex) => /^#[0-9a-f]{6}$/i.test(hex ?? '') ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') : null

export function useCampaignTheme(campaign) {
    const t = campaign.theme ?? {}
    const vars = {
        '--primary': t.primary,
        '--primary-rgb': rgbOf(t.primary),
        '--text-on-primary': t.onPrimary,
        '--secondary': t.secondary ?? t.primary,
        '--button-primary': t.primary,
        '--button-primary-foreground': t.onPrimary,
        '--app-bg': t.background,
        '--text-colour': t.text,
        '--campaign-tile-rgb': rgbOf(t.primary),
    }
    return Object.fromEntries(Object.entries(vars).filter(([, v]) => v))
}

export function useCampaignPreview(campaign) {
    const route = useRoute()
    const key = `campaign-preview:${campaign.id}`
    const read = () => {
        try {
            return sessionStorage.getItem(key)
        } catch {
            return null
        }
    }
    const asked = route.query.today
    try {
        if (asked === 'off') sessionStorage.removeItem(key)
        else if (isIsoDate(asked)) sessionStorage.setItem(key, asked)
        if (SAMPLE_RUNS.includes(route.query.finale)) previewSampleRun(campaign, route.query.finale, key)
    } catch {
        //
    }
    const today = read()
    return {today: isIsoDate(today) ? today : null}
}

function previewSampleRun(campaign, kind, todayKey) {
    const run = sampleRun(campaign, kind)
    const store = previewStore(campaign)
    const state = store.load()
    const track = trackOf(campaign, state.player?.track)?.id ?? campaign.tracks[0].id
    sessionStorage.setItem(todayKey, run.today)
    store.save({...state, player: {track, startedOn: run.startedOn}, completions: run.completions})
    Object.keys(localStorage).filter(k => k.startsWith(`campaign-finale-seen:${campaign.id}:`)).forEach(k => localStorage.removeItem(k))
}

function previewStore(campaign) {
    const key = `campaign-preview-progress:${campaign.id}`
    return {
        load() {
            try {
                return JSON.parse(sessionStorage.getItem(key)) ?? {player: null, completions: {}, profile: null}
            } catch {
                return {player: null, completions: {}, profile: null}
            }
        },
        save(state) {
            try {
                sessionStorage.setItem(key, JSON.stringify(state))
            } catch {
                //
            }
        },
    }
}

function percentStore(campaign, previewing) {
    const storage = () => previewing ? sessionStorage : localStorage
    const key = `campaign-${previewing ? 'preview-' : ''}percents:${campaign.id}`
    return {
        load() {
            try {
                return JSON.parse(storage().getItem(key)) ?? {}
            } catch {
                return {}
            }
        },
        save(percents) {
            try {
                storage().setItem(key, JSON.stringify(percents))
            } catch {
                //
            }
        },
    }
}

export function saveCampaignProfile(campaign, uid, profile, previousHandle = null) {
    const {$firestore} = useNuxtApp()
    const {handle, ...details} = cleanProfile(campaign, profile)
    const stamped = {...details, updatedAt: serverTimestamp()}
    const base = `campaigns/${campaign.id}`
    const batch = writeBatch($firestore)
    if (handle) batch.set(doc($firestore, `${base}/public/${handle}`), {ownerUid: uid, ...stamped})
    if (previousHandle && previousHandle !== handle) batch.delete(doc($firestore, `${base}/public/${previousHandle}`))
    batch.set(doc($firestore, `${base}/profiles/${uid}`), {...stamped, handle})
    return batch.commit()
}

export async function handleOwner(campaign, handle) {
    const {$firestore} = useNuxtApp()
    const snap = await getDoc(doc($firestore, `campaigns/${campaign.id}/public/${handle}`))
    return snap.exists() ? snap.data().ownerUid : null
}

export function useCampaignPageUrl(campaign) {
    const localePath = useLocalePath()
    return (handle) => new URL(localePath(`/c/${campaign.id}/${handle}`), window.location.origin).href
}

export const previewProfile = (campaign) => cleanProfile(campaign, {handle: handleFrom(campaign.preview?.name), ...campaign.preview})

export function useCampaignPlayer(campaign) {
    const {$auth, $firestore} = useNuxtApp()
    const user = useState('campaignUser')
    const tz = timezoneOf(campaign)
    const preview = useCampaignPreview(campaign)
    const store = preview.today ? previewStore(campaign) : null

    const today = ref(preview.today ?? dateIn(tz))
    const player = ref(null)
    const completions = ref({})
    const profile = ref(null)
    const loaded = ref(false)
    const percentsStore = percentStore(campaign, !!preview.today)
    const percents = ref(percentsStore.load())

    let stop = []
    const unsubscribe = () => {
        stop.forEach(fn => fn())
        stop = []
    }

    if (store) {
        const state = store.load()
        player.value = state.player
        completions.value = state.completions
        profile.value = state.profile ?? (campaign.preview?.name ? previewProfile(campaign) : null)
        loaded.value = true
    } else {
        watch(() => user.value?.uid, (uid) => {
            unsubscribe()
            player.value = null
            completions.value = {}
            profile.value = null
            if (!uid) {
                loaded.value = user.value === null
                return
            }
            loaded.value = false
            let pending = 3
            const ready = () => {
                if (--pending === 0) loaded.value = true
            }
            const base = `campaigns/${campaign.id}/players/${uid}`
            stop.push(onSnapshot(doc($firestore, base), (snap) => {
                const data = snap.data({serverTimestamps: 'estimate'})
                player.value = data ? {track: data.track, startedOn: dateIn(tz, data.startedAt.toDate())} : null
                ready()
            }, ready))
            stop.push(onSnapshot(collection($firestore, `${base}/days`), (snap) => {
                completions.value = Object.fromEntries(snap.docs.map(d => [d.id, dateIn(tz, d.data({serverTimestamps: 'estimate'}).completedAt.toDate())]))
                ready()
            }, ready))
            stop.push(onSnapshot(doc($firestore, `campaigns/${campaign.id}/profiles/${uid}`), (snap) => {
                profile.value = snap.data() ?? null
                ready()
            }, ready))
        }, {immediate: true})
        onScopeDispose(unsubscribe)
    }

    if (!preview.today) {
        const timer = setInterval(() => {
            today.value = dateIn(tz)
        }, 60000)
        onScopeDispose(() => clearInterval(timer))
    }

    const needsAccount = computed(() => campaign.account === 'required' && (!user.value || user.value.isAnonymous))
    const track = computed(() => player.value ? trackOf(campaign, player.value.track) : null)
    const progress = computed(() => player.value
        ? progressOf(campaign, {startDate: startDateFor(campaign, player.value.startedOn), today: today.value, completions: completions.value})
        : null)

    async function ensureUser() {
        if (user.value) return
        if (campaign.account === 'required') throw new Error('An account is needed for this campaign')
        await signInAnonymously($auth)
        await until(() => user.value?.uid && loaded.value)
    }

    async function start(trackId) {
        if (player.value) return
        if (phase(campaign, today.value) !== 'open') throw new Error('This campaign isn\'t open')
        if (store) {
            player.value = {track: trackId, startedOn: today.value}
            store.save({...store.load(), player: player.value})
            return
        }
        await ensureUser()
        if (player.value) return
        await setDoc(doc($firestore, `campaigns/${campaign.id}/players/${user.value.uid}`), {track: trackId, startedAt: serverTimestamp()})
    }

    async function complete(day, slug) {
        if (!player.value || completions.value[day]) return
        if (store) {
            completions.value = {...completions.value, [day]: today.value}
            store.save({...store.load(), completions: completions.value})
            return
        }
        await setDoc(doc($firestore, `campaigns/${campaign.id}/players/${user.value.uid}/days/${day}`), {slug, completedAt: serverTimestamp()})
    }

    async function saveProfile(changes) {
        if (store) {
            profile.value = cleanProfile(campaign, changes)
            store.save({...store.load(), profile: profile.value})
            return
        }
        await ensureUser()
        await saveCampaignProfile(campaign, user.value.uid, changes, profile.value?.handle)
    }

    function notePercent(day, percent) {
        if (percent === null || percents.value[day] === percent) return
        percents.value = {...percents.value, [day]: percent}
        percentsStore.save(percents.value)
    }

    return {user, today, player, track, progress, profile, percents, loaded, needsAccount, previewing: !!preview.today, start, complete, saveProfile, notePercent}
}

function until(condition) {
    return new Promise((resolve) => {
        const stop = watch(condition, (ok) => {
            if (!ok) return
            queueMicrotask(() => stop())
            resolve()
        }, {immediate: true})
    })
}

export function useCampaignPublicPage(campaign, handle) {
    const {$firestore} = useNuxtApp()
    const user = useState('campaignUser')
    const tz = timezoneOf(campaign)
    const own = useCampaignPlayer(campaign)

    const ownerUid = ref(null)
    const details = ref(null)
    const player = ref(null)
    const completions = ref({})
    const loaded = ref(false)

    let stop = []
    const unsubscribe = () => {
        stop.forEach(fn => fn())
        stop = []
    }
    onScopeDispose(unsubscribe)

    if (own.previewing) {
        watchEffect(() => {
            if (!own.loaded.value) return
            const mine = own.profile.value?.handle === handle
            details.value = mine ? own.profile.value : null
            loaded.value = true
        })
    } else {
        stop.push(onSnapshot(doc($firestore, `campaigns/${campaign.id}/public/${handle}`), (snap) => {
            const data = snap.data()
            details.value = data ?? null
            if (data && data.ownerUid === ownerUid.value) return
            stop.splice(1).forEach(fn => fn())
            ownerUid.value = data?.ownerUid ?? null
            player.value = null
            completions.value = {}
            if (!data) {
                loaded.value = true
                return
            }
            const base = `campaigns/${campaign.id}/players/${data.ownerUid}`
            let pending = 2
            const ready = () => {
                if (--pending === 0) loaded.value = true
            }
            stop.push(onSnapshot(doc($firestore, base), (s) => {
                const p = s.data({serverTimestamps: 'estimate'})
                player.value = p ? {track: p.track, startedOn: dateIn(tz, p.startedAt.toDate())} : null
                ready()
            }, ready))
            stop.push(onSnapshot(collection($firestore, `${base}/days`), (s) => {
                completions.value = Object.fromEntries(s.docs.map(d => [d.id, dateIn(tz, d.data({serverTimestamps: 'estimate'}).completedAt.toDate())]))
                ready()
            }, ready))
        }, () => {
            loaded.value = true
        }))
    }

    const source = computed(() => own.previewing ? {player: own.player.value, today: own.today.value} : {player: player.value, today: own.today.value})
    const track = computed(() => source.value.player ? trackOf(campaign, source.value.player.track) : null)
    const progress = computed(() => {
        const p = source.value.player
        if (!p || !details.value) return null
        if (own.previewing) return own.progress.value
        return progressOf(campaign, {startDate: startDateFor(campaign, p.startedOn), today: source.value.today, completions: completions.value})
    })
    const isOwner = computed(() => own.previewing ? !!details.value : !!user.value && user.value.uid === ownerUid.value)

    return {loaded, profile: details, track, progress, isOwner, previewing: own.previewing, today: own.today}
}
