import {initializeApp} from 'firebase/app'
import {browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence} from 'firebase/auth'

export default defineNuxtPlugin((nuxtApp) => {

    const features = useFeatures()
    const config = useRuntimeConfig()
    const authReady = useState('authReady', () => false)
    const releaseSplash = () => { authReady.value = true }

    if (features.requireAccount || features.friends) {
        if (config.public.firebaseConfigFile) {
            console.log('Using FIREBASE FILE CONFIG')
            return fetch(config.public.firebaseConfigFile)
                .then(function (response) {
                    return response.json().then(function (json) {
                        return firebaseInit(nuxtApp, json, releaseSplash)
                    });
                })
                .catch((error) => {
                    console.log(error)
                    releaseSplash()
                })
        } else {
            console.log('Using FIREBASE ENV CONFIG')
            return firebaseInit(nuxtApp, config.public.firebaseConfig, releaseSplash)
        }
    } else {
        console.log('NO ACCOUNT CONFIGURED')
    }
})

function firebaseInit(nuxtApp, firebaseConfig, releaseSplash) {
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const authStore = useAuthStore()
    const toast = useToastStore()

    console.log('firebaseInit for project', firebaseConfig.projectId)

    //  Keep the auth session in localStorage so it is shared across tabs
    /*setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn('Firebase setPersistence failed', err)
    })*/

    let initialised = false

    onAuthStateChanged(auth, (user) => {
        console.log('onAuthStateChanged', user?.uid)
        authStore.userStateChanged(user)
        releaseSplash()

        if (initialised) {

            const t = nuxtApp.$i18n?.t ?? ((key) => key)
            if (user) {
                toast.success(t('auth.loggedIn'))
            } else {
                toast.info(t('auth.loggedOut'))
            }
        }
        initialised = true
    })

    return {
        provide: {
            firebase: app,
            auth,
        }
    }
}
