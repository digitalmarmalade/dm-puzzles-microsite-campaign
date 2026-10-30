import Archive from '@/api/Archive.js'
import {gameConfig} from '@/lib/gameConfig'
import {resultCounts} from '@/lib/wordStats'

export function wordsPercentFor(variant, slug, status, completions = []) {
    if (gameConfig(variant).cardResult !== 'words') return null
    const latest = completions
        .filter(c => c.slug === slug && resultCounts(c))
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0]
    const counts = resultCounts(status) ?? resultCounts(latest)
    if (counts) return Math.round((counts.found / counts.total) * 100)
    return typeof status?.progress === 'number' ? status.progress : null
}

export function isPuzzleDone(slug, playStatus, completions = [], variant = Archive.getPuzzles(slug)?.variant) {
    const status = playStatus.statusFor(slug)
    if (status?.completed) return true
    const pct = wordsPercentFor(variant, slug, status, completions)
    return pct !== null && pct >= gameConfig(variant).wordsComplete
}

export function usePuzzleProgress(variant, slug) {
    const playStatus = usePlayStatusStore()
    const challenges = useChallengesStore()

    const status = computed(() => playStatus.statusFor(toValue(slug)))
    const progress = computed(() => status.value?.progress ?? null)
    const hasPercent = computed(() => typeof progress.value === 'number')
    const wordsPct = computed(() => wordsPercentFor(toValue(variant), toValue(slug), status.value, challenges.completions ?? []))
    const completed = computed(() => isPuzzleDone(toValue(slug), playStatus, challenges.completions ?? [], toValue(variant)))
    const wordsPartial = computed(() => completed.value && wordsPct.value !== null && wordsPct.value < 100)
    const iconStatus = computed(() => completed.value ? {...status.value, completed: status.value?.completed || true} : status.value)

    const resultLabelKey = computed(() =>
        gameConfig(toValue(variant)).measure === 'points' ? 'archive.stats.score' : 'archive.stats.wordsFound')

    return {status, progress, hasPercent, wordsPct, completed, wordsPartial, iconStatus, resultLabelKey}
}
