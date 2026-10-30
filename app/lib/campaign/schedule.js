import {DEFAULT_TIMEZONE, addDays, daysBetween, isIsoDate} from './dates.js'
import {validateProfileSettings} from './profile.js'

export const PLAYABLE = ['today', 'catchup', 'done', 'late']

export const timezoneOf = (campaign) => campaign.timezone || DEFAULT_TIMEZONE

export function joinWindow(campaign) {
    const s = campaign.schedule
    if (s.mode === 'rolling') return {from: s.startFrom, until: s.startUntil}
    return {from: s.start, until: lastChance(campaign, addDays(s.start, s.days - 1))}
}

export function phase(campaign, today) {
    const {from, until} = joinWindow(campaign)
    if (today < from) return 'upcoming'
    if (until && today > until) return 'ended'
    return 'open'
}

export function startDateFor(campaign, startedOn) {
    return campaign.schedule.mode === 'fixed' ? campaign.schedule.start : startedOn
}

export const dueDate = (startDate, day) => addDays(startDate, day - 1)

export function lastChance(campaign, due) {
    const late = campaign.schedule.late ?? false
    if (late === true) return null
    if (late?.days) return addDays(due, late.days)
    if (late?.until) return late.until > due ? late.until : due
    return due
}

export function dayState(campaign, {due, today, completedOn = null}) {
    if (completedOn) return completedOn > due ? 'late' : 'done'
    if (today < due) return 'locked'
    if (today === due) return 'today'
    const last = lastChance(campaign, due)
    return last === null || today <= last ? 'catchup' : 'missed'
}

export function progress(campaign, {startDate, today, completions = {}}) {
    const total = campaign.schedule.days
    const days = Array.from({length: total}, (_, i) => {
        const day = i + 1
        const due = dueDate(startDate, day)
        const completedOn = completions[day] ?? null
        return {day, due, completedOn, state: dayState(campaign, {due, today, completedOn})}
    })
    const count = (state) => days.filter(d => d.state === state).length
    const onTime = count('done')
    const late = count('late')
    const missed = count('missed')
    const completed = onTime + late
    return {
        days,
        onTime,
        late,
        missed,
        completed,
        finished: completed === total,
        perfect: completed === total && late === 0,
        over: completed + missed === total,
        currentDay: Math.min(Math.max(daysBetween(startDate, today) + 1, 0), total + 1),
    }
}

export const canPlay = (state) => PLAYABLE.includes(state)

export function trackOf(campaign, trackId) {
    return campaign.tracks.find(t => t.id === trackId) ?? null
}

export function validateCampaign(campaign) {
    const errors = []
    const s = campaign?.schedule
    if (!campaign?.id || !/^[a-z0-9-]+$/.test(campaign.id)) errors.push('id must be lowercase letters, numbers and hyphens')
    if (!s) return [...errors, 'schedule is missing']
    if (!Number.isInteger(s.days) || s.days < 1) errors.push('schedule.days must be a whole number above 0')
    if (s.mode === 'fixed') {
        if (!isIsoDate(s.start)) errors.push('schedule.start must be a YYYY-MM-DD date')
    } else if (s.mode === 'rolling') {
        if (!isIsoDate(s.startFrom)) errors.push('schedule.startFrom must be a YYYY-MM-DD date')
        if (!isIsoDate(s.startUntil)) errors.push('schedule.startUntil must be a YYYY-MM-DD date')
        if (isIsoDate(s.startFrom) && isIsoDate(s.startUntil) && s.startUntil < s.startFrom) errors.push('schedule.startUntil is before schedule.startFrom')
    } else {
        errors.push('schedule.mode must be "fixed" or "rolling"')
    }
    const late = s.late ?? false
    const lateOk = typeof late === 'boolean'
        || (Number.isInteger(late?.days) && late.days > 0 && Object.keys(late).length === 1)
        || (isIsoDate(late?.until) && Object.keys(late).length === 1)
    if (!lateOk) errors.push('schedule.late must be true, false, {"days": n} or {"until": "YYYY-MM-DD"}')
    if (campaign.timezone) {
        try {
            new Intl.DateTimeFormat('en', {timeZone: campaign.timezone})
        } catch {
            errors.push(`timezone "${campaign.timezone}" isn't a known time zone`)
        }
    }
    if (!['required', 'optional'].includes(campaign.account)) errors.push('account must be "required" or "optional"')
    errors.push(...validateProfileSettings(campaign.profile))
    if (campaign.sampleFundraising !== undefined && typeof campaign.sampleFundraising !== 'boolean') errors.push('sampleFundraising must be true or false')
    if (campaign.organisation !== undefined && (typeof campaign.organisation !== 'string' || !campaign.organisation)) errors.push('organisation must be text')
    for (const key of ['logo', 'banner', 'bannerFocus']) {
        const value = campaign.theme?.[key]
        if (value !== undefined && (typeof value !== 'string' || !value)) errors.push(`theme.${key} must be text`)
    }
    for (const [lang, words] of Object.entries(campaign.text ?? {})) {
        const steps = words?.steps
        if (words?.pledge !== undefined && typeof words.pledge !== 'string') errors.push(`text.${lang}.pledge must be text`)
        if (steps !== undefined && (!Array.isArray(steps) || steps.some(st => typeof st?.title !== 'string' || typeof st?.body !== 'string'))) {
            errors.push(`text.${lang}.steps must be a list of {"title", "body"}`)
        }
    }
    if (!Array.isArray(campaign.tracks) || !campaign.tracks.length) return [...errors, 'tracks must list at least one track']
    const ids = new Set()
    for (const track of campaign.tracks) {
        const name = `track "${track.id}"`
        if (!track.id || !/^[a-z0-9-]+$/.test(track.id)) errors.push(`${name}: id must be lowercase letters, numbers and hyphens`)
        if (ids.has(track.id)) errors.push(`${name} is listed twice`)
        ids.add(track.id)
        if (!Array.isArray(track.puzzles) || track.puzzles.length !== s.days) {
            errors.push(`${name} has ${track.puzzles?.length ?? 0} puzzles but the campaign runs for ${s.days} days`)
            continue
        }
        track.puzzles.forEach((p, i) => {
            for (const key of ['slug', 'name', 'type', 'url']) {
                if (!p?.[key]) errors.push(`${name}, day ${i + 1}: puzzle is missing "${key}"`)
            }
        })
    }
    return errors
}

export const SAMPLE_RUNS = ['midway', 'perfect', 'finished', 'ended']

export const sampleSeconds = (day) => 95 + (day * 137) % 640

export function sampleRun(campaign, kind) {
    const s = campaign.schedule
    const startedOn = s.mode === 'fixed' ? s.start : s.startFrom
    const total = s.days
    const dues = Array.from({length: total}, (_, i) => dueDate(startedOn, i + 1))
    const last = dues.at(-1)
    const completions = {}
    const times = {}
    const time = sampleSeconds
    if (kind === 'midway') {
        const today = Math.ceil(total / 2)
        dues.slice(0, today - 1).forEach((due, i) => {
            completions[i + 1] = i + 1 === Math.min(3, today - 1) ? addDays(due, 1) : due
            times[i + 1] = time(i + 1)
        })
        return {startedOn, today: dues[today - 1], completions, times}
    }
    if (kind === 'ended') {
        dues.slice(0, Math.ceil(total * .6)).forEach((due, i) => {
            completions[i + 1] = due
            times[i + 1] = time(i + 1)
        })
        const close = lastChance(campaign, last)
        return {startedOn, today: addDays(close ?? last, 1), completions, times}
    }
    const late = kind === 'finished' && s.late !== false ? [Math.min(4, total - 1), Math.min(9, total - 1)] : []
    dues.forEach((due, i) => {
        completions[i + 1] = late.includes(i + 1) ? addDays(due, 1) : due
        times[i + 1] = time(i + 1)
    })
    return {startedOn, today: addDays(last, 1), completions, times}
}
