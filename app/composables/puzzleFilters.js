const CATEGORY_ORDER = ['words', 'numbers', 'logic', 'quiz']

export function usePuzzleFilters(families) {
    const {t} = useI18n()
    const active = ref('all')
    const categoryOf = (slug) => getPuzzleMeta(slug)?.type ?? null
    const categories = CATEGORY_ORDER.filter(c => families.some(f => categoryOf(f.slug) === c))
    const hasQuick = families.some(f => isQuick(f.slug))

    const options = computed(() => [
        {value: 'all', label: t('home.categories.all')},
        ...categories.map(c => ({value: c, label: t(`home.categories.${c}`)})),
        ...(hasQuick ? [{value: 'quick', label: t('home.categories.quick')}] : []),
    ])

    function matches(slug) {
        if (active.value === 'all') return true
        if (active.value === 'quick') return isQuick(slug)
        return categoryOf(slug) === active.value
    }

    return {active, options, matches}
}
