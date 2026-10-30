//  Keep the login gate in step with the Firebase auth state.
//  The route middleware decides gating at navigation time, but Firebase resolves
//  the session asynchronously — so a logged-in visitor who hard-reloads a gated
//  page (or logs in via the in-place modal) can end up "logged in" a tick after
//  the gate was raised. Watching the shared auth store lets us clear it as soon
//  as login resolves, no navigation required.
export default defineNuxtPlugin(() => {
    const auth = useAuthStore()
    const gate = useLoginGate()

    watch(() => auth.user, (user) => {
        if (user) gate.reset()
    })
})
