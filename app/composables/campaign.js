import {collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch} from 'firebase/firestore'
import {EmailAuthProvider, createUserWithEmailAndPassword, linkWithCredential, signInAnonymously} from 'firebase/auth'
import {loadCampaign} from '@/lib/campaign/registry'
import {dateIn, isIsoDate} from '@/lib/campaign/dates'
import {SAMPLE_RUNS, phase, progress as progressOf, sampleRun, sampleSeconds, startDateFor, timezoneOf, trackOf} from '@/lib/campaign/schedule'
import {cleanProfile, handleCandidates, handleFrom, profileSettings} from '@/lib/campaign/profile'

export async function useCampaign() {
    const route = useRoute()
    const campaign = await loadCampaign(route.params.campaign)
    if (!campaign) throw createError({statusCode: 404, statusMessage: 'Campaign not found', fatal: true})
    return campaign
}

export const sampleFundraising = (campaign, previewing) => previewing || campaign.sampleFundraising ? campaign.preview?.fundraising ?? null : null

export function useMoney(currency = 'GBP') {
    const dateLocale = useDateLocale()
    return (amount) => new Intl.NumberFormat(dateLocale.value, {style: 'currency', currency, maximumFractionDigits: 0}).format(amount)
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
        '--button-primary-hover': t.primary && `color-mix(in srgb, ${t.primary} 82%, #000)`,
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
        const sample = route.query.sample ?? route.query.finale
        if (SAMPLE_RUNS.includes(sample)) previewSampleRun(campaign, sample, key)
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
    store.save({...state, player: {track, startedOn: run.startedOn}, completions: run.completions, times: run.times})
    Object.keys(localStorage).filter(k => k.startsWith(`campaign-finale-seen:${campaign.id}:`)).forEach(k => localStorage.removeItem(k))
    localStorage.removeItem(`campaign-milestones-seen:${campaign.id}:preview`)
}

function previewStore(campaign) {
    const key = `campaign-preview-progress:${campaign.id}`
    return {
        load() {
            try {
                return JSON.parse(sessionStorage.getItem(key)) ?? {player: null, completions: {}, times: {}, profile: null}
            } catch {
                return {player: null, completions: {}, times: {}, profile: null}
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

export async function saveCampaignProfile(campaign, uid, profile, currentHandle = null) {
    const {$firestore} = useNuxtApp()
    const {handle: _, ...details} = cleanProfile(campaign, profile)
    const stamped = {...details, updatedAt: serverTimestamp()}
    const base = `campaigns/${campaign.id}`
    const write = async (handle) => {
        const batch = writeBatch($firestore)
        if (handle) batch.set(doc($firestore, `${base}/public/${handle}`), {ownerUid: uid, ...stamped})
        batch.set(doc($firestore, `${base}/profiles/${uid}`), {...stamped, handle})
        await batch.commit()
        return handle
    }
    if (!profileSettings(campaign).publicPage) return write(null)
    if (currentHandle) return write(currentHandle)
    for (const handle of handleCandidates(details.name)) {
        const owner = await handleOwner(campaign, handle)
        if (owner && owner !== uid) continue
        try {
            return await write(handle)
        } catch (e) {
            if (e.code !== 'permission-denied') throw e
        }
    }
    throw new Error('No free page address')
}

export const useCampaignSignup = (campaign) => useState(`campaignSignup:${campaign.id}`, () => null)

export async function joinCampaign(campaign, uid, profile, trackId = null) {
    const {$firestore} = useNuxtApp()
    const existing = (await getDoc(doc($firestore, `campaigns/${campaign.id}/profiles/${uid}`))).data()
    await saveCampaignProfile(campaign, uid, profile, existing?.handle)
    if (!trackId) return
    const player = doc($firestore, `campaigns/${campaign.id}/players/${uid}`)
    if (!(await getDoc(player)).exists()) await setDoc(player, {track: trackId, startedAt: serverTimestamp()})
}

export async function registerPlayer(campaign, {email, password}, profile, trackId = null) {
    const {$auth} = useNuxtApp()
    const current = $auth.currentUser
    if (current?.isAnonymous) {
        await linkWithCredential(current, EmailAuthProvider.credential(email, password))
        await current.reload()
        useState('campaignUser').value = {uid: current.uid, isAnonymous: false, email: current.email}
        return joinCampaign(campaign, current.uid, profile, trackId)
    }
    const {user} = await createUserWithEmailAndPassword($auth, email, password)
    return joinCampaign(campaign, user.uid, profile, trackId)
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
    const times = ref({})
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
        times.value = {...Object.fromEntries(Object.keys(state.completions ?? {}).map(day => [day, sampleSeconds(+day)])), ...state.times}
        profile.value = state.profile ?? (campaign.preview?.name ? previewProfile(campaign) : null)
        loaded.value = true
    } else {
        watch(() => user.value ? user.value.uid : user.value, (uid) => {
            unsubscribe()
            player.value = null
            completions.value = {}
            times.value = {}
            profile.value = null
            if (!uid) {
                loaded.value = user.value === null
                return
            }
            loaded.value = false
            const seen = new Set()
            const ready = (source) => {
                seen.add(source)
                if (seen.size === 3) loaded.value = true
            }
            const base = `campaigns/${campaign.id}/players/${uid}`
            stop.push(onSnapshot(doc($firestore, base), (snap) => {
                const data = snap.data({serverTimestamps: 'estimate'})
                player.value = data ? {track: data.track, startedOn: dateIn(tz, data.startedAt.toDate())} : null
                ready('player')
            }, () => ready('player')))
            stop.push(onSnapshot(collection($firestore, `${base}/days`), (snap) => {
                const docs = snap.docs.map(d => [d.id, d.data({serverTimestamps: 'estimate'})])
                completions.value = Object.fromEntries(docs.map(([id, data]) => [id, dateIn(tz, data.completedAt.toDate())]))
                times.value = Object.fromEntries(docs.filter(([, data]) => typeof data.seconds === 'number').map(([id, data]) => [id, data.seconds]))
                ready('days')
            }, () => ready('days')))
            stop.push(onSnapshot(doc($firestore, `campaigns/${campaign.id}/profiles/${uid}`), (snap) => {
                profile.value = snap.data() ?? null
                ready('profile')
            }, () => ready('profile')))
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
        if (store || user.value) return
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

    async function complete(day, slug, seconds = null) {
        if (!player.value || completions.value[day]) return
        if (store) {
            completions.value = {...completions.value, [day]: today.value}
            times.value = {...times.value, [day]: seconds ?? sampleSeconds(+day)}
            store.save({...store.load(), completions: completions.value, times: times.value})
            return
        }
        const record = {slug, completedAt: serverTimestamp()}
        if (seconds) record.seconds = seconds
        await setDoc(doc($firestore, `campaigns/${campaign.id}/players/${user.value.uid}/days/${day}`), record)
    }

    async function saveProfile(changes) {
        if (store) {
            profile.value = cleanProfile(campaign, {...changes, handle: changes.handle ?? profile.value?.handle ?? handleFrom(changes.name)})
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

    return {user, today, player, track, progress, profile, times, percents, loaded, needsAccount, previewing: !!preview.today, ensureUser, start, complete, saveProfile, notePercent}
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
    const times = ref({})
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
            times.value = {}
            if (!data) {
                loaded.value = true
                return
            }
            const base = `campaigns/${campaign.id}/players/${data.ownerUid}`
            const seen = new Set()
            const ready = (source) => {
                seen.add(source)
                if (seen.size === 2) loaded.value = true
            }
            stop.push(onSnapshot(doc($firestore, base), (s) => {
                const p = s.data({serverTimestamps: 'estimate'})
                player.value = p ? {track: p.track, startedOn: dateIn(tz, p.startedAt.toDate())} : null
                ready('player')
            }, () => ready('player')))
            stop.push(onSnapshot(collection($firestore, `${base}/days`), (s) => {
                const docs = s.docs.map(d => [d.id, d.data({serverTimestamps: 'estimate'})])
                completions.value = Object.fromEntries(docs.map(([id, data]) => [id, dateIn(tz, data.completedAt.toDate())]))
                times.value = Object.fromEntries(docs.filter(([, data]) => typeof data.seconds === 'number').map(([id, data]) => [id, data.seconds]))
                ready('days')
            }, () => ready('days')))
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

    const solveTimes = computed(() => own.previewing ? own.times.value : times.value)

    return {loaded, profile: details, track, progress, times: solveTimes, isOwner, previewing: own.previewing, today: own.today}
}
