let claims = 0

export function claimWindowChannel() {
    if (!import.meta.client) return () => {}
    claims++
    window.channel ??= {status: 'created'}
    let released = false
    return () => {
        if (released) return
        released = true
        claims--
        if (!claims) delete window.channel
    }
}
