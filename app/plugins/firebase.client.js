import {initializeApp} from 'firebase/app'
import {getAuth, onAuthStateChanged} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'

export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    const user = useState('campaignUser', () => undefined)

    const firebaseConfig = config.public.firebaseConfigFile
        ? await fetch(config.public.firebaseConfigFile).then(r => r.json())
        : config.public.firebaseConfig

    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    onAuthStateChanged(auth, (u) => {
        user.value = u ? {uid: u.uid, isAnonymous: u.isAnonymous, email: u.email} : null
    })

    return {
        provide: {
            firebase: app,
            auth,
            firestore: getFirestore(app),
        },
    }
})
