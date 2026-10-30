import Archive from '@/api/Archive.js'
import {achievementStats} from '@/lib/achievements'

export function useAchievementStats() {
    const challenges = useChallengesStore()
    const archiveTick = useState('achievements:archive', () => Archive.loaded)

    if (import.meta.client && !Archive.loaded) {
        Archive.load(useRuntimeConfig().public.archiveFile).then(() => { archiveTick.value = true })
    }

    return computed(() => {
        if (!archiveTick.value || !Archive.loaded) return null
        return achievementStats({
            completions: challenges.completions ?? [],
            lifetime: challenges.lifetime,
            frozenDays: challenges.frozenDays ?? [],
            challengesCompleted: challenges.challengesCompleted ?? 0,
            challengeLog: challenges.challengeLog ?? [],
            variantNames: Object.keys(Archive.getVariants() ?? {}),
            families: Archive.getVariantFamilies() ?? [],
            allPuzzles: Archive.getPuzzles(),
        })
    })
}
