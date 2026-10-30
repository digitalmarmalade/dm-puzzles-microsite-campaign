import Archive from '@/api/Archive.js'
import {makeBranchResolver} from '@/lib/branches'
import {buildTasteModel, familyLean, recentCategoryCounts} from '@/lib/tasteModel'
import {assistsActive} from '@/lib/assists'
import {gameConfig} from '@/lib/gameConfig'
import {getPuzzleMeta} from '@/composables/puzzle'

const NUDGE_MIN_PLAYS = 3
const NUDGE_MIN_SHARE = 0.4
const LEVEL_WINDOW_DAYS = 30
const LEVEL_MIN_PLAYS = 3
const LEVEL_TRIED_PLAYS = 2

export function useTasteModel() {
    const {tm, rt} = useI18n()
    const challenges = useChallengesStore()
    const favourites = useFavouritesStore()
    const preferences = usePreferencesStore()
    const hidden = useHiddenVariantsStore()
    const assists = useAssistsStore()

    const families = Archive.getVariantFamilies()
    const {familyOf, branchFor} = makeBranchResolver(families)
    const categoryOf = (family) => getPuzzleMeta(family.slug)?.type ?? null
    const tagsFor = (slug) => {
        const raw = tm(`tags.${slug}`)
        return Array.isArray(raw) ? raw.map(item => typeof item === 'string' ? item : rt(item)) : []
    }
    const resolveBranch = (c) => branchFor(Archive.getPuzzles(c.slug) ?? {variant: c.variant, slug: c.slug})

    const model = computed(() => buildTasteModel({
        families,
        completions: challenges.completions ?? [],
        resolveBranch,
        categoryOf,
        tagsFor,
        favourites: favourites.slugs,
        boostedCategories: preferences.boostedCategories,
        selectedCategories: preferences.onboardingSelectedCategories,
        selectedTags: preferences.onboardingSelectedTags,
        dismissed: preferences.dismissedInsights,
    }))

    const leads = (category) => {
        let inside = 0, outside = 0
        for (const f of families) {
            for (const b of f.branches) {
                const score = model.value.scoreFor(b.slug)
                if (categoryOf(f) === category) inside = Math.max(inside, score)
                else outside = Math.max(outside, score)
            }
        }
        return inside > outside
    }

    const levelCue = computed(() => {
        const cutoff = Date.now() - LEVEL_WINDOW_DAYS * 24 * 60 * 60 * 1000
        const recent = (challenges.completions ?? []).filter(c => new Date(c.at).getTime() >= cutoff)
        for (const family of families) {
            if (family.branches.length < 2) continue
            const famCompletions = recent.filter(c => resolveBranch(c).family?.slug === family.slug)
            if (preferences.dismissedInsights.includes(`lean:${family.slug}`)) continue
            if (familyLean(famCompletions, gameConfig(family.branches[0].variantName)) !== 'harder') continue
            const playsOn = (branch) => famCompletions.filter(c => resolveBranch(c).branch?.slug === branch.slug).length
            for (let i = 0; i < family.branches.length - 1; i++) {
                const from = family.branches[i]
                const to = family.branches[i + 1]
                const sample = Archive.getPuzzles(from.puzzleSlugs[0])
                if (playsOn(from) < LEVEL_MIN_PLAYS || playsOn(to) >= LEVEL_TRIED_PLAYS) continue
                if (favourites.isFavourite(to.slug) || hidden.isHidden(to.slug)) continue
                if (preferences.answeredLevels.includes(to.slug)) continue
                if (assistsActive(sample?.type, assists.forTag(sample?.tag))) continue
                return {family, from, to, name: family.isFamily ? `${family.name} ${to.label}` : family.name}
            }
        }
        return null
    })

    return {
        families,
        familyOf,
        branchFor,
        resolveBranch,
        categoryOf,
        scoreFor: (slug) => model.value.scoreFor(slug),
        confidence: computed(() => model.value.confidence),
        model,
        leads,
        categoryCounts: computed(() => recentCategoryCounts({completions: challenges.completions ?? [], resolveBranch, categoryOf})),
        nudgeThresholds: {minPlays: NUDGE_MIN_PLAYS, minShare: NUDGE_MIN_SHARE},
        levelCue,
    }
}
