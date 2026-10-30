import {baseNameOf} from '@/lib/branches'
import {PUZZLE_META} from '@/lib/config'
import {gameConfig, isCleanSolve} from '@/lib/gameConfig'
import {slugify} from '@/lib/utils'
import {variantAttempts, wordPct} from '@/lib/wordStats'

export const tutorialSlugOf = (variant) => slugify(baseNameOf(variant) ?? '')

export function tutorialAchievement(variant) {
    if (!variant || baseNameOf(variant) !== variant) return null
    const target = PUZZLE_META[tutorialSlugOf(variant)]?.tutorial
    return target ? {id: 'tutorials', titleKey: 'trained', descKey: 'descTrained', tier: 1, metric: 'tutorials', target} : null
}

export function evaluateTypeAchievements(variant, {completions = [], playStatusMap = {}, lifetime = null, tutorialsDone = {}} = {}) {
    const cfg = gameConfig(variant)
    const typeCompletions = completions.filter(c => c.variant === variant)
    const completed = lifetime?.byVariant?.[variant] ?? typeCompletions.length
    const cleanSolves = lifetime?.cleanByVariant?.[variant] ?? typeCompletions.filter(c => isCleanSolve(c, cfg.clean)).length
    const pcts = variantAttempts(variant, playStatusMap).map(wordPct)
    const bestWordsPct = pcts.length ? Math.max(...pcts) : 0

    const tutorials = (tutorialsDone[tutorialSlugOf(variant)] ?? []).length
    const currentFor = (metric) =>
        metric === 'tutorials' ? tutorials
        : metric === 'bestWordsPct' ? bestWordsPct
        : metric === 'clean' ? cleanSolves
        : completed

    return [...cfg.achievements, tutorialAchievement(variant)].filter(Boolean).map(a => {
        const current = currentFor(a.metric)
        return {
            ...a,
            current,
            complete: current >= a.target,
            ratio: Math.min(1, current / a.target),
            descKey: (a.metric === 'clean' && cfg.clean === 'mistakes') ? 'descCleanMistakes' : a.descKey,
        }
    })
}
