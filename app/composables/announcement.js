import Archive from '@/api/Archive.js'

const ANNOUNCEMENTS = [
    {id: 'new-takuzu', slug: 'takuzu', variant: 'Takuzu'},
]
const NEW_FOR_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export const ANNOUNCEMENT_TUTORIAL_MODAL_ID = 'announcement-tutorials'

export function useAnnouncement() {
    const preferences = usePreferencesStore()
    const hidden = useHiddenVariantsStore()
    const preview = usePreview()

    const released = (item) => (Archive.getVariants(item.variant) ?? [])
        .map(slug => Archive.getPuzzles(slug))
        .filter(p => p && new Date(p.date).getTime() <= Date.now())

    const announcement = computed(() => {
        const previewing = preview.is('announcement')
        for (const item of ANNOUNCEMENTS) {
            if (previewing) return {...item, latest: released(item)[0] ?? null}
            if (preferences.dismissedAnnouncements.includes(item.id) || hidden.isHidden(item.slug)) continue
            const puzzles = released(item)
            if (!puzzles.length) continue
            const first = new Date(puzzles.at(-1).date).getTime()
            if (Date.now() - first > NEW_FOR_DAYS * DAY_MS) continue
            return {...item, latest: puzzles[0]}
        }
        return null
    })

    const dismiss = () => {
        const item = announcement.value
        if (!item) return
        if (preview.is('announcement')) return preview.hide('announcement')
        preferences.set('dismissedAnnouncements', [...preferences.dismissedAnnouncements, item.id])
        trackFunnel('sp_announcement_dismiss', {id: item.id})
    }

    return {announcement, dismiss}
}
