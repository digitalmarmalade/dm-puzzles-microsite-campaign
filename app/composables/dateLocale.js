//  Returns the BCP-47 language tag (e.g. 'en-GB') for the active i18n locale,
//  not the bare code ('en') that useI18n().locale returns. Pass this to
//  Intl.DateTimeFormat / toLocaleDateString so dates respect regional order
//  (e.g. UK English shows "Monday, 8 September", not "Monday, September 8").
export function useDateLocale() {
    const {locale, locales} = useI18n()
    return computed(() => {
        const found = locales.value.find((l) => l.code === locale.value)
        return found?.language || locale.value
    })
}
