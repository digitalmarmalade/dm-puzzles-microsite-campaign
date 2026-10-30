import {defineStore} from 'pinia'

//  Drives the "please log in" experience for logged-out visitors:
//  - `modalOpen`  whether the login modal is showing
//  - `reason`     contextual { key, params } message shown in the modal/notice
//  - `blocked`    true when the current route's protected content must stay
//                 hidden behind the prompt (set by the auth middleware)
export const useLoginGate = defineStore('loginGate', {
    state: () => ({
        modalOpen: false,
        reason: null,
        blocked: false,
    }),
    actions: {
        //  gate a protected route: hide its content. `openModal` controls whether
        //  the login modal pops straight away (e.g. puzzles) or whether we just
        //  show the notice and let the visitor open the modal themselves.
        block(reason = null, openModal = false) {
            this.reason = reason
            this.blocked = true
            this.modalOpen = openModal
        },
        //  open the prompt without blocking a route (e.g. from the banner)
        open(reason = null) {
            this.reason = reason
            this.modalOpen = true
        },
        //  dismiss the prompt but keep any route block in place
        closeModal() {
            this.modalOpen = false
        },
        //  fully clear — public route, or after a successful login
        reset() {
            this.modalOpen = false
            this.blocked = false
            this.reason = null
        },
    },
})
