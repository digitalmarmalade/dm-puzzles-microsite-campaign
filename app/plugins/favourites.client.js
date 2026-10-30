//  load favourited variants from localStorage on app start
export default defineNuxtPlugin(() => {
    useFavouritesStore().load()
})
