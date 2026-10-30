import {describe, expect, test} from 'vitest'
import {addDays, dateIn, daysBetween, isIsoDate} from '../../app/lib/campaign/dates.js'
import {canPlay, dayState, joinWindow, lastChance, phase, progress, sampleRun, startDateFor, validateCampaign} from '../../app/lib/campaign/schedule.js'

const puzzles = (n) => Array.from({length: n}, (_, i) => ({slug: `p-${i + 1}`, name: `Puzzle ${i + 1}`, type: 'sudoku', url: `https://x/p-${i + 1}.json`}))

const advent = {
    id: 'advent',
    account: 'optional',
    schedule: {mode: 'fixed', days: 24, start: '2026-12-01', late: {until: '2026-12-31'}},
    tracks: [{id: 'main', puzzles: puzzles(24)}],
}
const charity = {
    id: 'charity',
    account: 'required',
    schedule: {mode: 'rolling', days: 30, startFrom: '2027-01-01', startUntil: '2027-06-30', late: true},
    tracks: [{id: 'logic', puzzles: puzzles(30)}, {id: 'words', puzzles: puzzles(30)}],
}

describe('dates', () => {
    test('a moment falls on the date in the campaign time zone, not UTC', () => {
        expect(dateIn('Europe/London', new Date('2027-06-30T23:30:00Z'))).toBe('2027-07-01')
        expect(dateIn('Europe/London', new Date('2027-01-31T23:30:00Z'))).toBe('2027-01-31')
        expect(dateIn('America/New_York', new Date('2027-01-01T03:00:00Z'))).toBe('2026-12-31')
    })
    test('adding days crosses months, years and clock changes', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(addDays('2027-03-27', 2)).toBe('2027-03-29')
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
        expect(daysBetween('2027-01-01', '2027-01-30')).toBe(29)
    })
    test('only real dates count as dates', () => {
        expect(isIsoDate('2027-02-28')).toBe(true)
        expect(isIsoDate('2027-02-30')).toBe(false)
        expect(isIsoDate('1/2/2027')).toBe(false)
    })
})

describe('when players can join', () => {
    test('rolling: between startFrom and startUntil', () => {
        expect(phase(charity, '2026-12-31')).toBe('upcoming')
        expect(phase(charity, '2027-01-01')).toBe('open')
        expect(phase(charity, '2027-06-30')).toBe('open')
        expect(phase(charity, '2027-07-01')).toBe('ended')
    })
    test('fixed: from the first day until the last catch-up date', () => {
        expect(joinWindow(advent)).toEqual({from: '2026-12-01', until: '2026-12-31'})
        expect(phase(advent, '2026-11-30')).toBe('upcoming')
        expect(phase(advent, '2026-12-28')).toBe('open')
        expect(phase(advent, '2027-01-01')).toBe('ended')
    })
    test('fixed with no late limit never ends', () => {
        const forever = {...advent, schedule: {...advent.schedule, late: true}}
        expect(phase(forever, '2030-01-01')).toBe('open')
    })
})

describe('day 1', () => {
    test('fixed campaigns share the calendar, whenever the player joined', () => {
        expect(startDateFor(advent, '2026-12-10')).toBe('2026-12-01')
    })
    test('rolling campaigns start on the day the player joined', () => {
        expect(startDateFor(charity, '2027-03-14')).toBe('2027-03-14')
    })
})

describe('day states', () => {
    const today = '2027-03-10'
    test('future days are locked, today is today', () => {
        expect(dayState(charity, {due: '2027-03-11', today})).toBe('locked')
        expect(dayState(charity, {due: today, today})).toBe('today')
    })
    test('played on its day is done; played later is late', () => {
        expect(dayState(charity, {due: '2027-03-08', today, completedOn: '2027-03-08'})).toBe('done')
        expect(dayState(charity, {due: '2027-03-08', today, completedOn: '2027-03-09'})).toBe('late')
    })
    test('missed days follow the late setting', () => {
        const withLate = (late) => ({...charity, schedule: {...charity.schedule, late}})
        expect(dayState(withLate(true), {due: '2027-01-01', today})).toBe('catchup')
        expect(dayState(withLate(false), {due: '2027-03-09', today})).toBe('missed')
        expect(dayState(withLate({days: 2}), {due: '2027-03-08', today})).toBe('catchup')
        expect(dayState(withLate({days: 2}), {due: '2027-03-07', today})).toBe('missed')
        expect(dayState(withLate({until: '2027-03-10'}), {due: '2027-03-01', today})).toBe('catchup')
        expect(dayState(withLate({until: '2027-03-09'}), {due: '2027-03-01', today})).toBe('missed')
    })
    test('a catch-up date earlier than a day\'s own date still lets it be played on its day', () => {
        expect(lastChance(advent, '2026-12-24')).toBe('2026-12-31')
        expect(lastChance({...advent, schedule: {...advent.schedule, late: {until: '2026-12-20'}}}, '2026-12-24')).toBe('2026-12-24')
    })
    test('only past, current and completed days can be played', () => {
        expect(['locked', 'today', 'catchup', 'missed', 'done', 'late'].filter(canPlay)).toEqual(['today', 'catchup', 'done', 'late'])
    })
})

describe('progress', () => {
    test('advent: a mix of on-time, late, catch-up and locked days', () => {
        const p = progress(advent, {
            startDate: '2026-12-01',
            today: '2026-12-05',
            completions: {1: '2026-12-01', 2: '2026-12-04', 5: '2026-12-05'},
        })
        expect(p.days.slice(0, 6).map(d => d.state)).toEqual(['done', 'late', 'catchup', 'catchup', 'done', 'locked'])
        expect(p).toMatchObject({onTime: 2, late: 1, missed: 0, completed: 3, finished: false, perfect: false, currentDay: 5})
    })
    test('a perfect run has every day on its day', () => {
        const completions = Object.fromEntries(Array.from({length: 30}, (_, i) => [i + 1, addDays('2027-02-01', i)]))
        const p = progress(charity, {startDate: '2027-02-01', today: '2027-03-15', completions})
        expect(p).toMatchObject({finished: true, perfect: true, over: true, late: 0, currentDay: 31})
    })
    test('finishing with late days is finished but not perfect', () => {
        const completions = Object.fromEntries(Array.from({length: 30}, (_, i) => [i + 1, '2027-03-15']))
        const p = progress(charity, {startDate: '2027-02-01', today: '2027-03-15', completions})
        expect(p).toMatchObject({finished: true, perfect: false, onTime: 0, late: 30})
    })
    test('once catch-up closes, unplayed days are missed and the run is over', () => {
        const p = progress(advent, {startDate: '2026-12-01', today: '2027-01-01', completions: {1: '2026-12-01'}})
        expect(p).toMatchObject({completed: 1, missed: 23, over: true, finished: false})
    })
    test('before day 1 nothing is playable', () => {
        const p = progress(advent, {startDate: '2026-12-01', today: '2026-11-20'})
        expect(p.currentDay).toBe(0)
        expect(p.days.every(d => d.state === 'locked')).toBe(true)
    })
})

describe('validating a campaign', () => {
    test('the sample shapes are valid', () => {
        expect(validateCampaign(advent)).toEqual([])
        expect(validateCampaign(charity)).toEqual([])
    })
    test('reports each problem', () => {
        const broken = {
            id: 'Bad Id',
            account: 'sometimes',
            timezone: 'Mars/Olympus',
            schedule: {mode: 'rolling', days: 3, startFrom: '2027-02-01', startUntil: '2027-01-01', late: {days: 0}},
            tracks: [{id: 'a', puzzles: puzzles(2)}, {id: 'a', puzzles: [...puzzles(2), {slug: 'x'}]}],
        }
        expect(validateCampaign(broken)).toEqual([
            'id must be lowercase letters, numbers and hyphens',
            'schedule.startUntil is before schedule.startFrom',
            'schedule.late must be true, false, {"days": n} or {"until": "YYYY-MM-DD"}',
            'timezone "Mars/Olympus" isn\'t a known time zone',
            'account must be "required" or "optional"',
            'track "a" has 2 puzzles but the campaign runs for 3 days',
            'track "a" is listed twice',
            'track "a", day 3: puzzle is missing "name"',
            'track "a", day 3: puzzle is missing "type"',
            'track "a", day 3: puzzle is missing "url"',
        ])
    })
})

describe('sample runs for previewing the finale', () => {
    const run = (campaign, kind) => {
        const r = sampleRun(campaign, kind)
        return progress(campaign, {startDate: startDateFor(campaign, r.startedOn), today: r.today, completions: r.completions})
    }
    test('a perfect run', () => {
        expect(run(charity, 'perfect')).toMatchObject({finished: true, perfect: true, over: true})
        expect(run(advent, 'perfect')).toMatchObject({finished: true, perfect: true})
    })
    test('a finished run with some days late', () => {
        expect(run(charity, 'finished')).toMatchObject({finished: true, perfect: false, late: 2})
    })
    test('a run that ended with days missed', () => {
        expect(run(advent, 'ended')).toMatchObject({finished: false, over: true, completed: 15, missed: 9})
    })
})
