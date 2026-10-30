import {doc, serverTimestamp, setDoc} from 'firebase/firestore'
import AdventBanner from '../components/AdventBanner.vue'
import {adventCollection, useAdvent} from '../composables/advent'
import {DOOR_COUNT, YEAR, presentIcon} from '../lib/advent'

const SYNC_KEY = 'sp-advent-sync'
const messages = import.meta.glob('../../i18n/*.json', {eager: true, import: 'default'})

export default defineNuxtPlugin({
    name: 'advent',
    setup(nuxtApp) {
        if (useRuntimeConfig().public.features?.advent === false) return

        const i18n = nuxtApp.$i18n
        const merge = () => {
            for (const [path, msgs] of Object.entries(messages)) {
                const code = path.match(/([a-z]+)\.json$/)[1]
                if (codes.includes(code)) i18n.mergeLocaleMessage(code, msgs)
            }
        }
        const codes = (i18n.locales.value ?? []).map(l => (typeof l === 'string' ? l : l.code))
        merge()
        nuxtApp.hook('i18n:localeSwitched', merge)
        nuxtApp.hook('app:mounted', merge)

        registerExtra('home-banners', AdventBanner, {order: 10})

        const advent = useAdvent()
        const auth = useAuthStore()

        setInterval(advent.tick, 60 * 1000)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') advent.tick()
        })

        async function push() {
            const uid = auth.user?.uid
            const p = advent.progress.value
            if (!uid || !p || advent.preview.value) return
            if (advent.phase.value !== 'doors') return
            if (p.done < 1) return
            const record = {perfectThrough: p.perfectThrough, done: p.done}
            let last = null
            try {
                last = JSON.parse(localStorage.getItem(SYNC_KEY) ?? 'null')
            } catch {
                //
            }
            if (last?.uid === uid && last.perfectThrough === record.perfectThrough && last.done === record.done) return
            try {
                await setDoc(doc(adventCollection(), uid), {...record, updatedAt: serverTimestamp()})
                localStorage.setItem(SYNC_KEY, JSON.stringify({uid, ...record}))
                advent.refreshCounts(true)
            } catch (e) {
                if (import.meta.dev) console.warn('advent sync', e)
            }
        }

        watch(
            () => [auth.user?.uid, advent.progress.value?.done, advent.progress.value?.perfectThrough, advent.phase.value],
            push,
            {immediate: true},
        )

        let seen = null
        watch(
            () => advent.progress.value?.doors.map(d => d.state).join(),
            () => {
                const p = advent.progress.value
                if (!p || advent.preview.value) return
                const finished = new Set(p.doors.filter(d => d.state === 'done' || d.state === 'late').map(d => d.day))
                const before = seen
                seen = finished
                if (!before || advent.phase.value !== 'doors' || p.perfectThrough === DOOR_COUNT) return
                const door = p.doors.find(d => finished.has(d.day) && !before.has(d.day))
                if (!door) return
                const next = door.day + 1
                const message = door.state === 'late'
                    ? i18n.t('advent.toast.lateBody')
                    : door.day === DOOR_COUNT
                        ? i18n.t('advent.toast.lastBody')
                        : i18n.t(p.stillPerfect ? 'advent.toast.doneBodyPerfect' : 'advent.toast.doneBody', {next})
                useToastStore().achievement(
                    i18n.t(door.state === 'late' ? 'advent.toast.lateTitle' : 'advent.toast.doneTitle', {day: door.day}),
                    message,
                    {iconSrc: presentIcon(door.day), onClick: () => navigateTo(nuxtApp.$localePath ? nuxtApp.$localePath('/advent') : '/advent')},
                )
                trackFunnel('sp_advent_door_done', {day: door.day, late: door.state === 'late'})
            },
            {immediate: true},
        )

        const AWARD_KEY = `sp-advent-award-${YEAR}`
        watch(
            () => [advent.progress.value?.perfectThrough, advent.progress.value?.done, advent.phase.value],
            () => {
                const p = advent.progress.value
                if (!p?.award || advent.preview.value) return
                if (p.perfectThrough !== DOOR_COUNT && advent.phase.value !== 'ended') return
                try {
                    if (localStorage.getItem(AWARD_KEY)) return
                    localStorage.setItem(AWARD_KEY, p.award.key)
                } catch {
                    return
                }
                const key = p.award.key
                useToastStore().achievement(i18n.t(`advent.banner.award.${key}`), key === 'perfect'
                    ? i18n.t('advent.banner.awardPerfect')
                    : i18n.t('advent.banner.awardDone', {done: p.done, total: DOOR_COUNT}))
                trackFunnel('sp_advent_award', {award: key})
            },
            {immediate: true},
        )
    },
})
