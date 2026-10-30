export const NAME_MAX = 40
export const REASON_MAX = 280
export const HANDLE_MAX = 40

const RESERVED = new Set(['profile', 'day', 'days', 'p', 'admin', 'dashboard', 'share', 'public', 'sign-in', 'signin', 'login', 'register', 'settings', 'help', 'about', 'new', 'edit'])

export const DEFAULT_AVATARS = [
    'allRounder', 'dailyDevotee', 'earlyBird', 'fanatic', 'logicBuff', 'newbie',
    'nightOwl', 'numberCruncher', 'quizzer', 'weekendWarrior', 'wordsmith',
].map(name => `/img/profiles/${name}.svg`)

export function profileSettings(campaign) {
    const p = campaign.profile ?? {}
    return {
        avatars: p.avatars ?? DEFAULT_AVATARS,
        reason: p.reason ?? true,
        publicPage: p.publicPage ?? true,
    }
}

export function handleFrom(text) {
    return (text ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, HANDLE_MAX)
        .replace(/^-+|-+$/g, '')
}

export function isValidHandle(handle) {
    return typeof handle === 'string'
        && handle.length <= HANDLE_MAX
        && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(handle)
        && !RESERVED.has(handle)
}

export function handleSuggestions(handle, count = 5) {
    const base = handleFrom(handle).slice(0, HANDLE_MAX - 3).replace(/-+$/, '') || 'player'
    return Array.from({length: count}, (_, i) => `${base}-${i + 2}`)
}

export function cleanProfile(campaign, {name, avatar, reason, handle} = {}) {
    const settings = profileSettings(campaign)
    return {
        handle: settings.publicPage && isValidHandle(handle) ? handle : null,
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
    if (profile.publicPage !== undefined && typeof profile.publicPage !== 'boolean') errors.push('profile.publicPage must be true or false')
    return errors
}
