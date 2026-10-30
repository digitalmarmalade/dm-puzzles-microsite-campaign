import {TITLE_KEYS, achievementTarget, currentMonthKey, descKeyFor, earnedKeys} from '@/lib/achievements'
import Archive from '@/api/Archive.js'
import {evaluateTypeAchievements, tutorialAchievement, tutorialSlugOf} from '@/lib/typeAchievements'
import {slugify} from '@/lib/utils'
import {makeBranchResolver} from '@/lib/branches'
import {challengeProgress, challengeState, copyFor, findTemplate, shouldKeep} from '@/lib/challenges'
import {challengeContext, challengeIcon} from '@/composables/challengeBoard'
import {getPuzzleMeta} from '@/composables/puzzle'
import {variantLook} from '@/lib/variantLook'

export default defineNuxtPlugin((nuxtApp) => {

    useFavouritesStore().load()

    const challenges = useChallengesStore()

    challenges.load()
    challenges.releaseHeldCompletion()

    const toast = useToastStore()
    const t = (key, params) => nuxtApp.$i18n?.t?.(key, params) ?? key

    if (import.meta.client) {
        window.__showStreakToast = (name = 'Sudoku', count = 5) =>
            toast.streak(t('streakToast.title'), t('streakToast.body', {name, count}))
    }

    const achievementStats = useAchievementStats()
    const dateLocale = () => {
        const i18n = nuxtApp.$i18n
        return i18n?.locales?.value?.find(l => l.code === i18n.locale.value)?.language || i18n?.locale?.value || 'en'
    }
    const monthName = (key) => new Intl.DateTimeFormat(dateLocale(), {month: 'long'}).format(new Date(`${key}-15T12:00:00`))
    const toastFor = (item, stats) => {
        if (item.kind === 'tier') {
            const a = item.achievement
            return [t('achievements.unlockedToast'), `${t(TITLE_KEYS[a.id])} — ${t(descKeyFor(a), {target: achievementTarget(a, stats)})}`, {iconSrc: achievementImage(a.id)}]
        }
        if (item.kind === 'secret') {
            const k = item.secret.key
            return [t('achievements.secretToast'), `${t(`achievements.secret.${k}.title`)} — ${t(`achievements.secret.${k}.desc`)}`, {iconSrc: achievementImage(item.secret.id)}]
        }
        return [t('achievements.month.toastTitle'), t('achievements.month.toastBody', {
            goal: t(`achievements.month.goals.${item.goal}`),
            tier: t(`achievements.tiers.${item.level.tier}`),
            month: monthName(item.month),
        }), {}]
    }
    let seenAchievements = null
    watch(achievementStats, (stats) => {
        if (!stats) return
        const earned = earnedKeys(stats)
        if (!seenAchievements) {
            seenAchievements = new Set(challenges.unlockedAchievements)
            const fresh = earned.filter(e => !seenAchievements.has(e.key))
            if (!fresh.length) return
            for (const e of fresh) seenAchievements.add(e.key)
            challenges.unlockedAchievements = [...challenges.unlockedAchievements, ...fresh.map(e => e.key)]
            challenges.persist()
            return
        }
        const fresh = earned.filter(e => !seenAchievements.has(e.key))
        if (!fresh.length) return
        const thisMonth = currentMonthKey()
        for (const e of fresh) {
            seenAchievements.add(e.key)
            if (e.kind === 'month' && e.month !== thisMonth) continue
            toast.achievement(...toastFor(e, stats))
        }
        challenges.unlockedAchievements = [...new Set([...challenges.unlockedAchievements, ...fresh.map(e => e.key)])]
        challenges.persist()
    }, {immediate: true})

    const playStatus = usePlayStatusStore()
    const preferences = usePreferencesStore()
    const typeKey = (v, a) => `type:${v}:${a.id}`
    const seenType = (key) => challenges.unlockedAchievements.includes(key)
    const markTypes = (keys) => {
        if (!keys.length) return
        challenges.unlockedAchievements = [...new Set([...challenges.unlockedAchievements, ...keys])]
        challenges.persist()
    }
    const tutorialVariants = () => Object.keys(Archive.getVariants() ?? {})
        .filter(v => tutorialAchievement(v) && preferences.tutorialsDone[tutorialSlugOf(v)]?.length)
    const evalAllVariants = () =>
        [...new Set([...(challenges.completions ?? []).map((c) => c.variant), ...tutorialVariants()])].flatMap((v) =>
            evaluateTypeAchievements(v, {completions: challenges.completions, playStatusMap: playStatus.map, lifetime: challenges.lifetimeTotals, tutorialsDone: preferences.tutorialsDone})
                .map((a) => ({v, a})))
    let typeReady = false
    const archiveReady = Archive.load(useRuntimeConfig().public.archiveFile)
    Promise.all([archiveReady, playStatus.loadAll()]).then(() => {
        if (!challenges.unlockedAchievements.some(k => k.startsWith('type:'))) {
            markTypes(evalAllVariants().filter(({a}) => a.complete).map(({v, a}) => typeKey(v, a)))
        }
        typeReady = true
    })
    watch(() => challenges.completions, () => playStatus.applyCompletions())
    watch([() => challenges.completions, () => playStatus.map, () => preferences.tutorialsDone], () => {
        if (!typeReady) return
        const fresh = evalAllVariants().filter(({v, a}) => a.complete && !seenType(typeKey(v, a)))
        markTypes(fresh.map(({v, a}) => typeKey(v, a)))
        for (const {v, a} of fresh) {
            toast.achievement(
                t('achievements.unlockedToast'),
                `${t(`archive.typeAchievements.${a.titleKey}`, {name: v})} — ${t(`archive.typeAchievements.${a.descKey}`, {target: a.target, name: v})}`,
                {icon: slugify(v)},
            )
        }
    }, {deep: true})

    const features = useFeatures()
    if (!features.challenges) return

    challenges.rollForward()

    const branches = () => {
        const families = Archive.getVariantFamilies() ?? []
        return {families, ...makeBranchResolver(families)}
    }
    const categoryOf = (family) => getPuzzleMeta(family.slug)?.type ?? null

    function complete(entry) {
        const now = new Date().toISOString()
        challenges.challengesCompleted++
        challenges.recordChallenge(entry.key)
        const copy = copyFor(entry)
        toast.achievement(
            t('challenges.completeToast'),
            t(copy.title, copy.params),
            entry.params?.variant ? {icon: variantLook(entry.params.variant).icon} : {iconSrc: challengeIcon(entry)},
        )
        trackFunnel('sp_challenge_complete', {id: entry.id, key: entry.key})
        return now
    }

    function checkChallenges() {
        const joined = preferences.challengesJoined ?? []
        if (!joined.length) return
        const ctx = challengeContext({...branches(), categoryOf, completions: challenges.completions ?? [], lifetime: challenges.lifetime})
        let changed = false
        const next = joined.map(entry => {
            if (!findTemplate(entry.id) || challengeState(entry) !== 'active') return entry
            if (!challengeProgress(entry, ctx).complete) return entry
            changed = true
            return {...entry, completedAt: complete(entry)}
        }).filter(entry => findTemplate(entry.id) && shouldKeep(entry))
        if (changed || next.length !== joined.length) preferences.set('challengesJoined', next)
    }

    archiveReady.then(() => {
        checkChallenges()
        watch([() => challenges.completions, () => preferences.challengesJoined], checkChallenges)
    })
})
