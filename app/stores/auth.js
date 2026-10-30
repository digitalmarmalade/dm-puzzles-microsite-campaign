import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth'
import {getApp} from 'firebase/app'
import {getAnalytics, logEvent, setUserId} from 'firebase/analytics'

export const useAuthStore = defineStore('auth', () => {

    const niceErrors = {
        'auth/email-already-in-use': 'Email address already registered',
        'auth/network-request-failed': 'Could not connect to network',
        'auth/requires-recent-login': 'Please log in again to perform this action',
        'auth/too-many-requests': 'Too many requests!',
        'auth/user-not-found': 'Sorry a matching user could not be found',
        'auth/weak-password': 'Your password is not strong enough',
        'auth/wrong-password': 'Email address and password combination not found.',
    };

    const userCookie = ref(useCookie('user'))

    async function createUser(values) {
        const auth = getAuth()
        return createUserWithEmailAndPassword(auth, values.email, values.password)
            .then((userCredential) => {
                const analytics = getAnalytics(getApp())

                setUserId(analytics, userCredential.user.uid)
                UserStorage.setUid(userCredential.user.uid)
                logEvent(analytics, 'create_user', {method: 'FirebaseAuth', firebase_screen: 'Create User'})
                trackConversion('register')
                useUserStore().createUser(userCredential)
                return userCredential;
            })
            .catch((error) => {
                return new Feedback(
                    useAuthStore().getNiceErrorMessage(error.code),
                    {'type': 'negative'},
                )
            });

    }

    async function signInUser(values) {
        const auth = getAuth()
        return signInWithEmailAndPassword(auth, values.email, values.password)
            .then((userCredential) => {
                const analytics = getAnalytics(getApp())

                setUserId(analytics, userCredential.user.uid)
                UserStorage.setUid(userCredential.user.uid)
                logEvent(analytics, 'login', {method: 'FirebaseAuth', firebase_screen: 'Login'})
                trackConversion('login')
                //  navigation is left to the caller (login page redirects; the
                //  login modal just stays in place once the cookie is set)
                return userCredential;
            })
            .catch((error) => {
                return new Feedback(
                    useAuthStore().getNiceErrorMessage(error.code),
                    {'type': 'negative'},
                )
            });
    }

    async function signOutUser() {
        useUserStore().onSignOut()
        const auth = getAuth()
        await signOut(auth)
        logEvent(getAnalytics(getApp()), 'logout', {method: 'FirebaseAuth', firebase_screen: 'Logout'})
    }

    async function userStateChanged(user) {
        userCookie.value = JSON.parse(JSON.stringify(user));
        if (user) {
            setUserId(getAnalytics(getApp()), user.uid)
            UserStorage.setUid(user.uid)
            useUserStore().onStateChange(user)
        }
    }

    function getNiceErrorMessage(error) {
        return this.niceErrors[error] || error
    }

    return {
        user: userCookie,
        createUser,
        niceErrors,
        getNiceErrorMessage,
        signInUser,
        signOutUser,
        userStateChanged,
    }
}, {
    persist: true,
})
