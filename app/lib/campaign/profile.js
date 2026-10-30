export const NAME_MAX = 40
export const REASON_MAX = 280

export const DEFAULT_AVATARS = [
    'allRounder', 'dailyDevotee', 'earlyBird', 'fanatic', 'logicBuff', 'newbie',
    'nightOwl', 'numberCruncher', 'quizzer', 'weekendWarrior', 'wordsmith',
].map(name => `/img/profiles/${name}.svg`)

export function profileSettings(campaign) {
    const p = campaign.profile ?? {}
    return {
        avatars: p.avatars ?? DEFAULT_AVATARS,
        reason: p.reason ?? true,
    }
}

export function cleanProfile(campaign, {name, avatar, reason} = {}) {
    const settings = profileSettings(campaign)
    return {
        name: (name ?? '').trim().slice(0, NAME_MAX),
        avatar: settings.avatars.includes(avatar) ? avatar : null,
        reason: settings.reason ? (reason ?? '').trim().slice(0, REASON_MAX) : '',
    }
}

export function validateProfileSettings(profile) {
    if (profile === undefined) return []
    const errors = []
    if (typeof profile !== 'object' || profile === null) return ['profile must be an object']
    if (profile.avatars !== undefined && (!Array.isArray(profile.avatars) || !profile.avatars.length || profile.avatars.some(a => typeof a !== 'string' || a.length > 200))) {
        errors.push('profile.avatars must list at least one image path')
    }
    if (profile.reason !== undefined && typeof profile.reason !== 'boolean') errors.push('profile.reason must be true or false')
    return errors
}
