import Archive from '@/api/Archive.js'
import {longestRun} from '@/lib/lifetime'

//  Reactive personal-stats derivation over the completions log. Consumed by
//  PuzzleStatistics.vue, Achievements.vue, and the challenges plugin.
export function usePuzzleStats() {
    const challenges = useChallengesStore()

    const totals = computed(() => challenges.lifetimeTotals)

    const totalPuzzles         = computed(() => totals.value.total)
    const uniqueVariants       = computed(() => Object.keys(totals.value.byVariant).length)
    const daysPlayed           = computed(() => totals.value.days.size)
    const challengesCompleted  = computed(() => challenges.challengesCompleted ?? 0)
    const totalVariants        = computed(() => Object.keys(Archive.getVariants() ?? {}).length)
    const cleanSolves          = computed(() => totals.value.clean)
    const longestStreak        = computed(() => longestRun(totals.value.days))

    return {
        totalPuzzles,
        uniqueVariants,
        daysPlayed,
        challengesCompleted,
        totalVariants,
        longestStreak,
        cleanSolves,
    }
}
