//  load today's free-play claim from localStorage on app start
export default defineNuxtPlugin(() => {
    useFreePlayStore().load()
})
