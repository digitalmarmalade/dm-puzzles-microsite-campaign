import {getPuzzleMeta} from '@/composables/puzzle'
import {slugify} from '@/lib/utils'

const CAT_ID = {numbers: 'numberCruncher', words: 'wordsmith', logic: 'logicBuff', quiz: 'quizzer'}

export function profileFor(summary, completions) {
    if (!summary?.puzzles) return null
    const total = summary.puzzles
    const days = summary.days
    const streak = summary.longestRun
    const sortedV = Object.entries(summary.byVariant).sort((a, b) => b[1] - a[1])
    const [topVName, topVCount] = sortedV[0] ?? [null, 0]
    const pack = (id, vars = {}, variantName = topVName) => ({id, vars, variantName, key: [id, ...Object.values(vars)].join(':')})

    if (total < 5 || days < 3) return pack('newbie')

    if (topVCount >= 10 && topVCount / total >= 0.5) return pack('fanatic', {variant: topVName})

    const catCounts = {}
    const catVariants = {}
    for (const [v, n] of sortedV) {
        const cat = getPuzzleMeta(slugify(v))?.type ?? null
        if (!cat) continue
        catCounts[cat] = (catCounts[cat] ?? 0) + n
        ;(catVariants[cat] ??= []).push(v)
    }
    const [topCat, topCatCount] = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0] ?? []
    if (topCat && CAT_ID[topCat] && topCatCount / total >= 0.6 && catVariants[topCat].length >= 2) {
        const [v1, v2] = catVariants[topCat]
        return pack(CAT_ID[topCat], {v1, v2}, v1)
    }

    if (days >= 20 || streak >= 7) return pack('dailyDevotee')

    const timed = completions.length
    const weekend = completions.filter(c => [0, 6].includes(new Date(c.at).getDay())).length
    if (timed && weekend / timed > 0.6) return pack('weekendWarrior')

    let early = 0, night = 0
    for (const c of completions) {
        const h = new Date(c.at).getHours()
        if (h < 9) early++
        else if (h >= 21) night++
    }
    if (timed && early / timed > 0.6) return pack('earlyBird')
    if (timed && night / timed > 0.6) return pack('nightOwl')

    return pack('allRounder')
}
