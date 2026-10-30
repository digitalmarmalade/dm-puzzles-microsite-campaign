import {collection, doc, onSnapshot, serverTimestamp, setDoc} from 'firebase/firestore'
import {signInAnonymously} from 'firebase/auth'
import {loadCampaign} from '@/lib/campaign/registry'
import {dateIn, isIsoDate} from '@/lib/campaign/dates'
import {phase, progress as progressOf, startDateFor, timezoneOf, trackOf} from '@/lib/campaign/schedule'
import {cleanProfile} from '@/lib/campaign/profile'

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
    } catch {
        //
    }
    const today = read()
    return {today: isIsoDate(today) ? today : null}
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

export function saveCampaignProfile(campaign, uid, profile) {
    const {$firestore} = useNuxtApp()
    return setDoc(doc($firestore, `campaigns/${campaign.id}/profiles/${uid}`), {...cleanProfile(campaign, profile), updatedAt: serverTimestamp()})
}

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
        profile.value = state.profile ?? (campaign.preview?.name ? cleanProfile(campaign, campaign.preview) : null)
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
        await saveCampaignProfile(campaign, user.value.uid, changes)
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
