export function streaks(progress) {
    let run = 0
    let best = 0
    for (const day of progress.days) {
        if (day.state === 'done') {
            run++
            best = Math.max(best, run)
        } else if (day.state !== 'today' && day.state !== 'locked') {
            run = 0
        }
    }
    return {current: run, best}
}

export function milestones(progress) {
    const total = progress.days.length
    const done = progress.completed
    const {best} = streaks(progress)
    const half = Math.ceil(total / 2)
    return [
        {id: 'first', count: Math.min(done, 1), target: 1},
        total >= 14 && {id: 'week', count: Math.min(done, 7), target: 7},
        total >= 4 && {id: 'half', count: Math.min(done, half), target: half},
        total >= 7 && {id: 'streak', count: Math.min(best, 7), target: 7},
        {id: 'finish', count: done, target: total},
    ].filter(Boolean).map(m => ({...m, reached: m.count >= m.target}))
}

const iconOf = (puzzle) => puzzle.icon ?? (puzzle.tag ?? '').replaceAll('-', '')

export function solveStats(times, puzzles) {
    const solves = Object.entries(times ?? {})
        .map(([day, seconds]) => ({day: +day, seconds, puzzle: puzzles[day - 1]}))
        .filter(s => s.puzzle && s.seconds > 0)
        .sort((a, b) => a.day - b.day)
    if (!solves.length) return null
    const total = solves.reduce((sum, s) => sum + s.seconds, 0)
    const fastest = solves.reduce((best, s) => s.seconds < best.seconds ? s : best)
    const bests = new Map()
    for (const s of solves) {
        const type = s.puzzle.variant || s.puzzle.name
        if (!bests.has(type) || s.seconds < bests.get(type).seconds) bests.set(type, {type, icon: iconOf(s.puzzle), seconds: s.seconds, day: s.day})
    }
    return {
        count: solves.length,
        total,
        average: Math.round(total / solves.length),
        fastest: {day: fastest.day, seconds: fastest.seconds, type: fastest.puzzle.variant || fastest.puzzle.name},
        bests: [...bests.values()],
    }
}

export function durationParts(seconds) {
    const s = Math.max(0, Math.round(seconds))
    return {h: Math.floor(s / 3600), m: Math.floor(s % 3600 / 60), s: s % 60}
}
