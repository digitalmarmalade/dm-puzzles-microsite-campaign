import {getPuzzleMeta} from '@/composables/puzzle'

export function useTutorial(slug) {
    const {locale} = useI18n()
    const {theme} = useTheme()

    const steps = computed(() => getPuzzleMeta(toValue(slug))?.tutorial ?? 0)

    function frameSrc(step) {
        const type = toValue(slug)
        const params = new URLSearchParams({
            json: `/tutorials/${type}/${type}-${step}.json`,
            tutorial: '1',
            lang: locale.value,
            theme: theme.value,
        })
        return `/tutorials/${type}/index.html?${params}`
    }

    return {steps, frameSrc}
}
