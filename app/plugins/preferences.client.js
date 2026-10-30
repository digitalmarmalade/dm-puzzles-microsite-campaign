export default defineNuxtPlugin(() => {
    usePreferencesStore().load()
})
