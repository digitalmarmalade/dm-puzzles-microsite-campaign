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
