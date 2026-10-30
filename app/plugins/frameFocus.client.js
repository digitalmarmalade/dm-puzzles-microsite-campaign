const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

function focusFrame(frame) {
    if (!frame.isConnected || document.activeElement?.matches?.(TYPING)) return
    frame.focus({preventScroll: true})
    try {
        frame.contentWindow?.focus()
    } catch {
        //
    }
}

const visible = (el) => el.checkVisibility?.() ?? el.offsetParent !== null

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive('focus-on-load', {
        mounted(el) {
            const state = {pending: false, shown: false}
            const attempt = () => {
                if (!state.shown || !visible(el)) {
                    state.pending = true
                    return
                }
                state.pending = false
                requestAnimationFrame(() => focusFrame(el))
            }
            state.onLoad = attempt
            state.observer = new IntersectionObserver(([entry]) => {
                state.shown = entry.isIntersecting
                if (state.shown && state.pending) attempt()
            })
            state.observer.observe(el)
            el.addEventListener('load', state.onLoad)
            el._focusOnLoad = state
        },
        beforeUnmount(el) {
            const state = el._focusOnLoad
            el.removeEventListener('load', state.onLoad)
            state.observer.disconnect()
        },
    })
})
