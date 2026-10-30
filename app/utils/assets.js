let version = null

export function versioned(path) {
    version ??= useRuntimeConfig().public.buildVersion
    return `${path}?v=${version}`
}

export function spriteFile() {
    return versioned('/img/sprite.svg')
}

export function sprite(id) {
    return `${spriteFile()}#${id}`
}

export function achievementImage(id) {
    return versioned(`/img/achievements/${id}.webp`)
}
