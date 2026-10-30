//  load hidden variants from localStorage on app start
export default defineNuxtPlugin(() => {
    useHiddenVariantsStore().load()
})
