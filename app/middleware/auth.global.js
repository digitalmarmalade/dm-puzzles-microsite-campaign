import Archive from '@/api/Archive.js'
import {themeClass} from '@/lib/utils'
import {variantLook} from '@/lib/variantLook'

function stripLocale(path) {
    return path.replace(/^\/(fr|it|de|es|hu|pl)(?=\/|$)/, '') || '/'
}

function disabledFeatureRedirect(path, features) {
    if (!features.friends && (path === '/friends' || path.startsWith('/friends/'))) return '/'
    if (!features.stats && path === '/stats') return '/'
    if (!features.account && (path === '/account' || path.startsWith('/account/'))) return '/'
    return null
}

function gateReason(to, path) {

    if (path === '/account/login' || path === '/account/register') return null


    if (path.startsWith('/puzzle/')) {
        const puzzle = Archive.getPuzzles(to.params.id)
        const variant = puzzle?.variant
        const name = variant || puzzle?.name || ''
        const look = variantLook(variant)
        return {
            key: 'auth.loginToPlay',
            params: {name},
            icon: look.icon,
            theme: look.theme ? themeClass(look.theme) : null,
        }
    }

    if (path === '/friends' || path.startsWith('/friends/')) return {key: 'auth.loginToFriends'}
    if (path === '/account' || path.startsWith('/account/')) return {key: 'auth.loginToAccount'}
    if (path === '/stats') return {key: 'auth.loginToStats'}

    return null
}

export default defineNuxtRouteMiddleware((to) => {
    const gate = useLoginGate()
    const features = useFeatures()
    const path = stripLocale(to.path)

    const redirect = disabledFeatureRedirect(path, features)
    if (redirect) {
        gate.reset()
        return navigateTo(redirect, {replace: true})
    }

    //  No account required for this microsite
    if (!features.requireAccount) {
        gate.reset()
        return
    }

    const userCookie = useCookie('user')
    if (userCookie.value) {
        gate.reset()
        return
    }

    //  One free puzzle a day for anonymous visitors; the rest prompt sign-in.
    if (path.startsWith('/puzzle/')) {
        const freePlay = useFreePlayStore()
        const slug = to.params.id
        if (freePlay.canPlay(slug)) {
            if (freePlay.available) {
                freePlay.claim(slug)
                trackFreePlayClaim(slug)
            }
            gate.reset()
            return
        }
        trackFreePlayWall(slug)
        gate.block({...gateReason(to, path), key: 'auth.freePlayUsed'}, false)
        return
    }

    const reason = gateReason(to, path)
    if (!reason) {
        gate.reset()
        return
    }

    gate.block(reason, reason.immediate === true)
})
