import {dateHelpers} from '@/lib/challenges'
import {isGlobalCleanSolve, lifetimeTotals, longestRun, monthKey} from '@/lib/lifetime'

const DAY_MS = 24 * 60 * 60 * 1000

export const ACHIEVEMENTS = [
    {id: 'puzzles-1',    category: 'puzzles',    target: 1,     tier: 1},
    {id: 'puzzles-10',   category: 'puzzles',    target: 10,    tier: 1},
    {id: 'puzzles-50',   category: 'puzzles',    target: 50,    tier: 2},
    {id: 'puzzles-100',  category: 'puzzles',    target: 100,   tier: 3},
    {id: 'puzzles-250',  category: 'puzzles',    target: 250,   tier: 3},
    {id: 'puzzles-500',  category: 'puzzles',    target: 500,   tier: 3},
    {id: 'puzzles-1000', category: 'puzzles',    target: 1000,  tier: 3},
    {id: 'puzzles-2500', category: 'puzzles',    target: 2500,  tier: 3},

    {id: 'challenges-1',   category: 'challenges', target: 1,   tier: 1},
    {id: 'challenges-10',  category: 'challenges', target: 10,  tier: 2},
    {id: 'challenges-50',  category: 'challenges', target: 50,  tier: 3},
    {id: 'challenges-100', category: 'challenges', target: 100, tier: 3},

    {id: 'clean-10',  category: 'clean', target: 10,  tier: 1},
    {id: 'clean-50',  category: 'clean', target: 50,  tier: 2},
    {id: 'clean-100', category: 'clean', target: 100, tier: 3},
    {id: 'clean-250', category: 'clean', target: 250, tier: 3},
    {id: 'clean-500', category: 'clean', target: 500, tier: 3},
    {id: 'clean-1000', category: 'clean', target: 1000, tier: 3},

    {id: 'variety-3',   category: 'variety', target: 3,      tier: 1},
    {id: 'variety-5',   category: 'variety', target: 5,      tier: 2},
    {id: 'variety-all', category: 'variety', target: 'all',  tier: 3},

    {id: 'streak-3',    category: 'streak', target: 3,       tier: 1},
    {id: 'streak-7',    category: 'streak', target: 7,       tier: 2},
    {id: 'streak-30',   category: 'streak', target: 30,      tier: 3},
    {id: 'streak-100',  category: 'streak', target: 100,     tier: 3},
    {id: 'streak-365',  category: 'streak', target: 365,     tier: 3},

    {id: 'days-7',      category: 'days',   target: 7,       tier: 1},
    {id: 'days-30',     category: 'days',   target: 30,      tier: 3},
    {id: 'days-100',    category: 'days',   target: 100,     tier: 3},
    {id: 'days-365',    category: 'days',   target: 365,     tier: 3},
    {id: 'days-1000',   category: 'days',   target: 1000,    tier: 3},

    {id: 'anniversary-1m', category: 'anniversary', target: 30,   tier: 1},
    {id: 'anniversary-6m', category: 'anniversary', target: 182,  tier: 2},
    {id: 'anniversary-1y', category: 'anniversary', target: 365,  tier: 3},
    {id: 'anniversary-2y', category: 'anniversary', target: 730,  tier: 3},
    {id: 'anniversary-3y', category: 'anniversary', target: 1095, tier: 3},
    {id: 'anniversary-5y', category: 'anniversary', target: 1826, tier: 3},

    {id: 'medals-3',   category: 'medals', target: 3,  tier: 1},
    {id: 'medals-12',  category: 'medals', target: 12, tier: 2},
    {id: 'medals-24',  category: 'medals', target: 24, tier: 3},

    {id: 'golds-1',    category: 'golds',  target: 1,  tier: 2},
    {id: 'golds-6',    category: 'golds',  target: 6,  tier: 3},
    {id: 'golds-12',   category: 'golds',  target: 12, tier: 3},

    {id: 'archive-10',  category: 'archive', target: 10,     tier: 1},
    {id: 'archive-50',  category: 'archive', target: 50,     tier: 2},
    {id: 'archive-100', category: 'archive', target: 100,    tier: 3},
    {id: 'archive-250', category: 'archive', target: 250,    tier: 3},
    {id: 'archive-500', category: 'archive', target: 500,    tier: 3},

    {id: 'bests-5',     category: 'bests',  target: 5,       tier: 1},
    {id: 'bests-25',    category: 'bests',  target: 25,      tier: 2},
    {id: 'bests-50',    category: 'bests',  target: 50,      tier: 3},
    {id: 'bests-100',   category: 'bests',  target: 100,     tier: 3},

    {id: 'climber-1',   category: 'climber', target: 1,          tier: 2},
    {id: 'climber-all', category: 'climber', target: 'families', tier: 3},
]

export const TRACKS = ['puzzles', 'streak', 'days', 'anniversary', 'clean', 'variety', 'medals', 'golds', 'archive', 'bests', 'climber', 'challenges']

export function achievementTarget(achievement, stats) {
    if (achievement.target === 'all') return Math.max(1, stats.totalVariants || 1)
    if (achievement.target === 'families') return Math.max(1, stats.familyCount || 1)
    return achievement.target
}

export function isAvailable(achievement, stats) {
    return achievement.target !== 'families' || (stats.familyCount ?? 0) > 1
}

export function achievementProgress(achievement, stats) {
    let current = 0
    switch (achievement.category) {
        case 'puzzles':    current = stats.totalPuzzles;         break
        case 'challenges': current = stats.challengesCompleted;  break
        case 'variety':    current = stats.uniqueVariants;       break
        case 'streak':     current = stats.longestStreak;        break
        case 'days':       current = stats.daysPlayed;           break
        case 'clean':      current = stats.cleanSolves;          break
        case 'archive':    current = stats.archiveSolves;        break
        case 'bests':      current = stats.personalBests;        break
        case 'climber':    current = stats.familiesClimbed;      break
        case 'anniversary': current = stats.daysSinceFirst;      break
        case 'medals':     current = stats.medalMonths;          break
        case 'golds':      current = stats.goldMonths;           break
    }
    current = current ?? 0
    const target = achievementTarget(achievement, stats)
    return {current, target, complete: current >= target}
}

export function isUnlocked(achievement, stats) {
    return isAvailable(achievement, stats) && achievementProgress(achievement, stats).complete
}

export const TITLE_KEYS = {
    'puzzles-1':    'achievements.titlePuzzles1',
    'puzzles-10':   'achievements.titlePuzzles10',
    'puzzles-50':   'achievements.titlePuzzles50',
    'puzzles-100':  'achievements.titlePuzzles100',
    'challenges-1':   'achievements.titleChallenges1',
    'challenges-10':  'achievements.titleChallenges10',
    'challenges-50':  'achievements.titleChallenges50',
    'challenges-100': 'achievements.titleChallenges100',
    'clean-10':  'achievements.titleClean10',
    'clean-50':  'achievements.titleClean50',
    'clean-100': 'achievements.titleClean100',
    'variety-3':    'achievements.titleVariety3',
    'variety-5':    'achievements.titleVariety5',
    'variety-all':  'achievements.titleVarietyAll',
    'streak-3':     'achievements.titleStreak3',
    'streak-7':     'achievements.titleStreak7',
    'streak-30':    'achievements.titleStreak30',
    'days-7':       'achievements.titleDays7',
    'days-30':      'achievements.titleDays30',
    'archive-10':   'achievements.titleArchive10',
    'archive-50':   'achievements.titleArchive50',
    'archive-100':  'achievements.titleArchive100',
    'bests-5':      'achievements.titleBests5',
    'bests-25':     'achievements.titleBests25',
    'climber-1':    'achievements.titleClimber1',
    'climber-all':  'achievements.titleClimberAll',
    'puzzles-250':  'achievements.titlePuzzles250',
    'puzzles-500':  'achievements.titlePuzzles500',
    'puzzles-1000': 'achievements.titlePuzzles1000',
    'puzzles-2500': 'achievements.titlePuzzles2500',
    'clean-250':    'achievements.titleClean250',
    'clean-500':    'achievements.titleClean500',
    'clean-1000':   'achievements.titleClean1000',
    'streak-100':   'achievements.titleStreak100',
    'streak-365':   'achievements.titleStreak365',
    'days-100':     'achievements.titleDays100',
    'days-365':     'achievements.titleDays365',
    'days-1000':    'achievements.titleDays1000',
    'archive-250':  'achievements.titleArchive250',
    'archive-500':  'achievements.titleArchive500',
    'bests-50':     'achievements.titleBests50',
    'bests-100':    'achievements.titleBests100',
    'anniversary-1m': 'achievements.titleAnniversary1m',
    'anniversary-6m': 'achievements.titleAnniversary6m',
    'anniversary-1y': 'achievements.titleAnniversary1y',
    'anniversary-2y': 'achievements.titleAnniversary2y',
    'anniversary-3y': 'achievements.titleAnniversary3y',
    'anniversary-5y': 'achievements.titleAnniversary5y',
    'medals-3':     'achievements.titleMedals3',
    'medals-12':    'achievements.titleMedals12',
    'medals-24':    'achievements.titleMedals24',
    'golds-1':      'achievements.titleGolds1',
    'golds-6':      'achievements.titleGolds6',
    'golds-12':     'achievements.titleGolds12',
}

export function descKeyFor(achievement) {
    if (achievement.id === 'variety-all') return 'achievements.descVarietyAll'
    if (achievement.id === 'puzzles-1')    return 'achievements.descPuzzles1'
    if (achievement.id === 'challenges-1') return 'achievements.descChallenges1'
    if (achievement.id === 'climber-1')    return 'achievements.descClimber1'
    if (achievement.id === 'climber-all')  return 'achievements.descClimberAll'
    if (achievement.id === 'golds-1')      return 'achievements.descGolds1'
    if (achievement.category === 'anniversary') return `achievements.descAnniversary${achievement.id.slice(12)}`
    switch (achievement.category) {
        case 'puzzles':    return 'achievements.descPuzzles'
        case 'challenges': return 'achievements.descChallenges'
        case 'variety':    return 'achievements.descVariety'
        case 'streak':     return 'achievements.descStreak'
        case 'days':       return 'achievements.descDays'
        case 'clean':      return 'achievements.descClean'
        case 'archive':    return 'achievements.descArchive'
        case 'bests':      return 'achievements.descBests'
        case 'medals':     return 'achievements.descMedals'
        case 'golds':      return 'achievements.descGolds'
    }
    return ''
}

export function doneKeyFor(achievement) {
    return descKeyFor(achievement).replace('achievements.desc', 'achievements.done')
}

export const SECRETS = [
    {id: 'secret-night-owl',  key: 'nightOwl'},
    {id: 'secret-early-bird', key: 'earlyBird'},
    {id: 'secret-comeback',   key: 'comeback'},
    {id: 'secret-lifeline',   key: 'lifeline'},
    {id: 'secret-full-house', key: 'fullHouse'},
    {id: 'secret-ghost',         key: 'ghost'},
    {id: 'secret-perfectionist', key: 'spotless'},
    {id: 'secret-weekend',       key: 'weekend'},
    {id: 'secret-christmas',     key: 'christmas'},
]

export const MONTHLY = [
    {goal: 'puzzles', tiers: [20, 50, 100]},
    {goal: 'days',    tiers: [10, 20, 'all']},
    {goal: 'variety', tiers: ['all']},
    {goal: 'clean',   tiers: [5, 15, 30]},
]

const emptyMonth = () => ({total: 0, clean: 0, variants: new Set(), days: new Set()})

function monthStats(lifetime, completions) {
    const months = {}
    for (const [key, b] of Object.entries(lifetime?.months ?? {})) {
        months[key] = {
            total: b.total ?? 0,
            clean: b.clean ?? 0,
            variants: new Set(Object.keys(b.byVariant ?? {})),
            days: new Set(b.days ?? []),
        }
    }
    for (const c of completions) {
        const m = months[monthKey(c.at)] ??= emptyMonth()
        m.total += 1
        if (isGlobalCleanSolve(c)) m.clean += 1
        m.variants.add(c.variant)
        m.days.add(dateHelpers.dayKey(c.at))
    }
    return months
}

let dayIndexCache = {source: null, counts: null}
function puzzlesPerDay(allPuzzles, now) {
    if (dayIndexCache.source === allPuzzles) return dayIndexCache.counts
    const counts = {}
    for (const p of Object.values(allPuzzles ?? {})) {
        if (!p?.date || new Date(p.date).getTime() > now) continue
        const key = dateHelpers.dayKey(p.date)
        counts[key] = (counts[key] ?? 0) + 1
    }
    dayIndexCache = {source: allPuzzles, counts}
    return counts
}

function hourOf(at) {
    return new Date(at).getHours()
}

function streakTimeline(dayKeys) {
    const days = [...dayKeys].sort()
    const reached = []
    let run = 0
    let prev = null
    for (const day of days) {
        const next = prev ? new Date(`${prev}T12:00:00`) : null
        next?.setDate(next.getDate() + 1)
        run = next && dateHelpers.dayKey(next) === day ? run + 1 : 1
        if (run > reached.length) reached.push(`${day}T12:00:00`)
        prev = day
    }
    return reached
}

function firstNew(sorted, keyOf, seen) {
    const out = []
    const known = new Set(seen)
    for (const c of sorted) {
        const k = keyOf(c)
        if (known.has(k)) continue
        known.add(k)
        out.push(c.at)
    }
    return out
}

export function achievementStats({
    completions = [],
    lifetime = null,
    frozenDays = [],
    challengesCompleted = 0,
    challengeLog = [],
    variantNames = [],
    families = [],
    allPuzzles = null,
    now = Date.now(),
}) {
    const totals = lifetimeTotals(lifetime, completions)
    const puzzleOf = (slug) => allPuzzles?.[slug] ?? null
    const sorted = [...completions].sort((a, b) => new Date(a.at) - new Date(b.at))
    const older = lifetimeTotals(lifetime, [])

    const archiveAt = []
    const sameDay = {}
    for (const c of sorted) {
        const date = puzzleOf(c.slug)?.date
        if (!date) continue
        const released = dateHelpers.dayKey(date)
        const solved = dateHelpers.dayKey(c.at)
        if (released < solved) archiveAt.push(c.at)
        if (released === solved) (sameDay[solved] ??= {slugs: new Set(), at: c.at}).slugs.add(c.slug)
    }

    const bestsAt = []
    const bestByVariant = {}
    for (const c of sorted) {
        if (typeof c.timeSec !== 'number' || !(c.timeSec > 0)) continue
        const best = bestByVariant[c.variant]
        if (best !== undefined && c.timeSec < best) bestsAt.push(c.at)
        bestByVariant[c.variant] = best === undefined ? c.timeSec : Math.min(best, c.timeSec)
    }

    const climbable = families.filter(f => f.isFamily && f.branches?.length > 1)
    const climbedAt = climbable
        .map(f => {
            const top = new Set(f.branches.at(-1).puzzleSlugs)
            return sorted.find(c => top.has(c.slug))?.at ?? null
        })
        .filter(Boolean)
        .sort()

    const perDay = puzzlesPerDay(allPuzzles, now)
    const fullHouseAt = Object.entries(sameDay)
        .filter(([day, d]) => (perDay[day] ?? 0) >= 2 && d.slugs.size >= perDay[day])
        .map(([day]) => `${day}T12:00:00`)
        .sort()[0] ?? null

    const days = [...totals.days].sort()
    let comebackAt = null
    for (let i = 1; i < days.length && !comebackAt; i++) {
        const gap = (new Date(`${days[i]}T12:00:00`) - new Date(`${days[i - 1]}T12:00:00`)) / DAY_MS
        if (Math.round(gap) >= 30) comebackAt = `${days[i]}T12:00:00`
    }

    const nightOwlAt = sorted.find(c => hourOf(c.at) < 5)?.at ?? null
    const earlyBirdAt = sorted.find(c => hourOf(c.at) >= 5 && hourOf(c.at) < 7)?.at ?? null
    const lifelineAt = [...(frozenDays ?? [])].sort()[0]
    const onDay = (month, date) => sorted.find(c => {
        const d = new Date(c.at)
        return d.getMonth() === month && d.getDate() === date
    })?.at ?? null
    const ghostAt = onDay(9, 31)
    const christmasAt = onDay(11, 25)
    let cleanRun = 0
    const spotlessAt = sorted.find(c => (cleanRun = isGlobalCleanSolve(c) ? cleanRun + 1 : 0) >= 10)?.at ?? null
    const weekends = {}
    const weekendAt = sorted.find(c => {
        const d = new Date(c.at)
        const day = d.getDay()
        if (day !== 0 && day !== 6) return false
        d.setDate(d.getDate() - (day === 0 ? 1 : 0))
        const key = dateHelpers.dayKey(d)
        return (weekends[key] = (weekends[key] ?? 0) + 1) >= 5
    })?.at ?? null
    const challengeDates = (challengeLog ?? []).map(e => e.split(':')[1]).filter(Boolean).sort().map(d => `${d}T12:00:00`)

    const firstDay = days[0] ?? null
    const firstAt = firstDay ? new Date(`${firstDay}T12:00:00`).getTime() : null
    const daysSinceFirst = firstAt ? Math.max(0, Math.floor((now - firstAt) / DAY_MS)) : 0
    const months = monthStats(lifetime, completions)
    const reachedAt = (key, count) => {
        const inMonth = sorted.filter(c => monthKey(c.at) === key)
        return inMonth.at(count - 1)?.at ?? `${key}-28T12:00:00`
    }
    const monthsReaching = count => Object.keys(months).sort()
        .filter(key => months[key].total >= count)
        .map(key => reachedAt(key, count))
        .sort((a, b) => new Date(a) - new Date(b))
    const medalAt = monthsReaching(MONTHLY[0].tiers.at(0))
    const goldAt = monthsReaching(MONTHLY[0].tiers.at(-1))

    const timelines = {
        medals:     {pre: 0, events: medalAt},
        golds:      {pre: 0, events: goldAt},
        anniversary: {pre: 0, events: []},
        puzzles:    {pre: older.total, events: sorted.map(c => c.at)},
        clean:      {pre: older.clean, events: sorted.filter(isGlobalCleanSolve).map(c => c.at)},
        days:       {pre: older.days.size, events: firstNew(sorted, c => dateHelpers.dayKey(c.at), older.days)},
        variety:    {pre: Object.keys(older.byVariant).length, events: firstNew(sorted, c => c.variant, Object.keys(older.byVariant))},
        streak:     {pre: 0, events: streakTimeline(totals.days)},
        archive:    {pre: 0, events: archiveAt},
        bests:      {pre: 0, events: bestsAt},
        climber:    {pre: 0, events: climbedAt},
        challenges: {pre: Math.max(0, challengesCompleted - challengeDates.length), events: challengeDates},
    }

    const archiveVariants = new Set(variantNames)
    const stats = {
        totalPuzzles: totals.total,
        uniqueVariants: Object.keys(totals.byVariant).length,
        daysPlayed: totals.days.size,
        challengesCompleted,
        totalVariants: variantNames.length,
        longestStreak: longestRun(totals.days),
        cleanSolves: totals.clean,
        archiveSolves: archiveAt.length,
        personalBests: bestsAt.length,
        familiesClimbed: climbedAt.length,
        familyCount: climbable.length,
        daysSinceFirst,
        medalMonths: medalAt.length,
        goldMonths: goldAt.length,
        secrets: {
            nightOwl: !!nightOwlAt,
            earlyBird: !!earlyBirdAt,
            comeback: !!comebackAt,
            lifeline: !!lifelineAt,
            fullHouse: !!fullHouseAt,
            ghost: !!ghostAt,
            spotless: !!spotlessAt,
            weekend: !!weekendAt,
            christmas: !!christmasAt,
        },
        months,
        archiveVariants,
        now,
    }

    const earnedAt = {
        'secret-night-owl': nightOwlAt,
        'secret-early-bird': earlyBirdAt,
        'secret-comeback': comebackAt,
        'secret-lifeline': lifelineAt ? `${lifelineAt}T12:00:00` : null,
        'secret-full-house': fullHouseAt,
        'secret-ghost': ghostAt,
        'secret-perfectionist': spotlessAt,
        'secret-weekend': weekendAt,
        'secret-christmas': christmasAt,
        challenge: challengeDates.at(-1) ?? null,
    }
    for (const a of ACHIEVEMENTS) {
        const target = achievementTarget(a, stats)
        if (a.category === 'anniversary') {
            earnedAt[a.id] = firstAt && daysSinceFirst >= target ? new Date(firstAt + target * DAY_MS).toISOString() : null
            continue
        }
        const line = timelines[a.category]
        earnedAt[a.id] = target > line.pre ? line.events[target - line.pre - 1] ?? null : null
    }
    return {...stats, earnedAt}
}

export function daysInMonth(key) {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m, 0).getDate()
}

export function currentMonthKey(now = Date.now()) {
    return monthKey(now)
}

function goalValue(goal, m, stats) {
    if (goal === 'puzzles') return m.total
    if (goal === 'days') return m.days.size
    if (goal === 'clean') return m.clean
    if (goal === 'variety') return [...m.variants].filter(v => stats.archiveVariants.has(v)).length
    return 0
}

function goalTarget(goal, tier, key, stats) {
    if (tier !== 'all') return tier
    return goal === 'days' ? daysInMonth(key) : Math.max(1, stats.totalVariants)
}

export function monthGoals(key, stats) {
    const m = stats.months[key] ?? emptyMonth()
    return MONTHLY.map(({goal, tiers}) => {
        const value = goalValue(goal, m, stats)
        const levels = tiers.map((tier, i) => {
            const target = goalTarget(goal, tier, key, stats)
            return {label: String(tier), target, tier: tiers.length === 1 ? 3 : i + 1, reached: value >= target}
        })
        return {goal, value, levels, next: levels.find(l => !l.reached) ?? null}
    })
}

export function stampTier(key, stats) {
    return monthGoals(key, stats).find(g => g.goal === 'puzzles').levels.filter(l => l.reached).length
}

export function monthKeyFor(key, goal, label) {
    return `month:${key}:${goal}-${label}`
}

export function earnedKeys(stats) {
    const out = []
    for (const a of ACHIEVEMENTS) {
        if (isUnlocked(a, stats)) out.push({key: a.id, kind: 'tier', achievement: a})
    }
    for (const s of SECRETS) {
        if (stats.secrets[s.key]) out.push({key: s.id, kind: 'secret', secret: s})
    }
    for (const month of Object.keys(stats.months)) {
        for (const g of monthGoals(month, stats)) {
            for (const level of g.levels) {
                if (level.reached) out.push({key: monthKeyFor(month, g.goal, level.label), kind: 'month', month, goal: g.goal, level})
            }
        }
    }
    return out
}

export function medalFor(puzzles) {
    const levels = MONTHLY[0].tiers.map(target => ({target, reached: puzzles >= target}))
    return {tier: levels.filter(l => l.reached).length, puzzles, levels}
}
