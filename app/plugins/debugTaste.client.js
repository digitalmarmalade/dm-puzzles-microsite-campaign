export default defineNuxtPlugin(() => {
    const debug = useDebugTaste()
    debug.restore()
    window.__debugTaste = (on = true) => debug.set(on)
})
