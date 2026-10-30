export function useTasteNudge() {
    const {t} = useI18n()
    const preferences = usePreferencesStore()
    const favourites = useFavouritesStore()
    const toast = useToastStore()
    const features = useFeatures()
    const {levelCue} = useTasteModel()

    const nudge = computed(() => {
        const cue = features.levelNudge ? levelCue.value : null
        if (!cue) return null
        return {
            key: `level:${cue.to.slug}`,
            kind: 'level',
            subject: cue.to.slug,
            prompt: t('nudge.levelPrompt', {family: cue.family.name, name: cue.name}),
            yes: t('nudge.levelYes'),
            done: t('nudge.levelDone', {name: cue.name}),
            cue,
        }
    })

    function answer(n, yes, surface) {
        if (yes && !favourites.isFavourite(n.cue.to.slug)) favourites.toggle(n.cue.to.slug)
        preferences.set('answeredLevels', [...preferences.answeredLevels.filter(s => s !== n.subject), n.subject])
        trackFunnel('sp_nudge_answer', {kind: n.kind, subject: n.subject, answer: yes ? 'yes' : 'no', surface})
    }

    function offerAfterCompletion() {
        const n = nudge.value
        if (!n || preferences.nudgeOffered === n.key) return false
        preferences.set('nudgeOffered', n.key)
        trackFunnel('sp_nudge_show', {kind: n.kind, subject: n.subject, surface: 'completion'})
        toast.add({
            type: 'info',
            message: n.prompt,
            duration: 12000,
            actions: [
                {label: n.yes, primary: true, onClick: () => {
                    answer(n, true, 'completion')
                    toast.success(n.done)
                }},
                {label: t('nudge.no'), onClick: () => answer(n, false, 'completion')},
            ],
        })
        return true
    }

    return {nudge, answer, offerAfterCompletion}
}
