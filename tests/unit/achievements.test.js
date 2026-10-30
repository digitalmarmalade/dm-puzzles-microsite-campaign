import {expect, test} from 'vitest'
import {milestones, streaks} from '../../app/lib/campaign/achievements.js'
import {msUntilTomorrow} from '../../app/lib/campaign/dates.js'

const run = (...states) => {
    const days = states.map((state, i) => ({day: i + 1, state}))
    return {days, completed: states.filter(s => s === 'done' || s === 'late').length}
}

test('a streak counts on-time days in a row and ignores today until it is played', () => {
    expect(streaks(run('done', 'done', 'done', 'today', 'locked'))).toEqual({current: 3, best: 3})
    expect(streaks(run('done', 'done', 'done', 'done', 'locked'))).toEqual({current: 4, best: 4})
})
test('a late or missed day breaks the streak', () => {
    expect(streaks(run('done', 'done', 'late', 'done', 'today'))).toEqual({current: 1, best: 2})
    expect(streaks(run('done', 'done', 'done', 'catchup', 'today'))).toEqual({current: 0, best: 3})
})
test('milestones unlock with progress', () => {
    const states = Array.from({length: 30}, (_, i) => i < 15 ? 'done' : 'locked')
    const reached = milestones(run(...states)).filter(m => m.reached).map(m => m.id)
    expect(reached).toEqual(['first', 'week', 'half', 'streak'])
    expect(milestones(run(...states)).find(m => m.id === 'finish')).toMatchObject({count: 15, target: 30, reached: false})
})
test('short campaigns skip milestones that do not fit', () => {
    expect(milestones(run('done', 'today', 'locked')).map(m => m.id)).toEqual(['first', 'finish'])
})
test('the countdown runs to midnight in the campaign time zone', () => {
    expect(msUntilTomorrow('Europe/London', new Date('2026-11-12T18:00:00Z'))).toBe(6 * 3600000)
    expect(msUntilTomorrow('America/New_York', new Date('2026-11-12T18:00:00Z'))).toBe(11 * 3600000)
})
