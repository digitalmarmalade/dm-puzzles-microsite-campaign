// https://nuxt.com/docs/api/configuration/nuxt-config
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'

const BUILD_VERSION = process.env.GIT_COMMIT || Date.now().toString()
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://games.stickypuzzles.com'
const SITE_NAME = 'Sticky Puzzles'
const SITE_DESCRIPTION = 'A daily puzzle fix from Digital Marmalade.'
const OG_IMAGE = `${SITE_URL}/og-default.png`

//  Every language the site can be built with.
const ALL_LOCALES = [
    {code: 'en', language: 'en-GB', file: 'en.json', name: 'English'},
    {code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français'},
    {code: 'it', language: 'it-IT', file: 'it.json', name: 'Italiano'},
    {code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch'},
    {code: 'es', language: 'es-ES', file: 'es.json', name: 'Español'},
    {code: 'hu', language: 'hu-HU', file: 'hu.json', name: 'Magyar'},
    {code: 'pl', language: 'pl-PL', file: 'pl.json', name: 'Polski'},
]

//  The languages this deploy uses. SITE_LOCALES is a comma-separated list of codes
//  (e.g. `pl` or `pl,en`); unset means all of them
const LOCALES = (() => {
    const codes = (process.env.SITE_LOCALES || '').split(',').map((c) => c.trim()).filter(Boolean)
    if (!codes.length) return ALL_LOCALES
    return codes.map((code) => {
        const locale = ALL_LOCALES.find((l) => l.code === code)
        if (!locale) {
            throw new Error(`SITE_LOCALES: unknown locale "${code}" (known: ${ALL_LOCALES.map((l) => l.code).join(', ')})`)
        }
        return locale
    })
})()

export default defineNuxtConfig({
    ssr: false,
    compatibilityDate: '2025-07-15',
    $production: {
        postcss: {
            plugins: {
                cssnano: {preset: ['default', {calc: false}]},
            },
        },
    },
    hooks: {
        'nitro:build:public-assets': (nitro) => {
            const dir = nitro.options.output.publicDir
            writeFileSync(
                join(dir, 'version.json'),
                JSON.stringify({version: BUILD_VERSION, builtAt: new Date().toISOString()}),
            )
        },
    },
    devtools: {enabled: false},
    nitro: process.env.DM_GAMEPLAY_ORIGIN
        ? {devProxy: {'/gameplay': {target: `${process.env.DM_GAMEPLAY_ORIGIN}/gameplay`, changeOrigin: true}}}
        : {},
    vue: {
        compilerOptions: {
            //  native element used by the customizable-<select> language switcher
            isCustomElement: (tag) => tag === 'selectedcontent',
        },
    },
    components: [
        {
            path: '~/components',
            pathPrefix: false,
        },
        {
            path: '~/components/generic',
            pathPrefix: false,
        },
        {
            path: '~/components/site',
            pathPrefix: false,
        },
    ],
    modules: ['@pinia/nuxt', '@nuxtjs/i18n'],
    i18n: {
        defaultLocale: LOCALES[0].code,
        strategy: 'prefix_except_default',
        locales: LOCALES,
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_locale',
            redirectOn: 'root',
        },
    },
    runtimeConfig: {
        public: {
            buildVersion: BUILD_VERSION,
            archiveFile: process.env.DM_ARCHIVE_FILE || '/archive.json',
            firebaseConfigFile: process.env.FIREBASE_CONFIG_FILE,
            firebaseConfig: {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                databaseURL: process.env.FIREBASE_DATABASE_URL,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID,
                measurementId: process.env.FIREBASE_MEASUREMENT_ID,
            },

            //  Per-deploy feature toggles. Override with NUXT_PUBLIC_FEATURES_* env vars.

            features: {
                requireAccount: true,
                account: true,
                friends: true,
                achievements: true,
                stats: true,
                challenges: true,
                streakFreeze: true,
                changelog: false,
                levelNudge: false,
                installPrompt: true,
            },
        },
    },
    app: {
        baseURL: '/',
        cdnURL : '/',
        buildAssetsDir: 'assets/',
        head: {
            title: SITE_NAME,
            titleTemplate: `%s · ${SITE_NAME}`,
            link: [
                {
                    rel: 'manifest',
                    href: '/webmanifest.json',
                },
                {
                    rel: 'apple-touch-icon',
                    href: '/img/web-app-manifest-192x192.png',
                },
            ],
            meta: [
                {name: 'description', content: SITE_DESCRIPTION},
                {property: 'og:type', content: 'website'},
                {property: 'og:site_name', content: SITE_NAME},
                {property: 'og:title', content: SITE_NAME},
                {property: 'og:description', content: SITE_DESCRIPTION},
                {property: 'og:url', content: SITE_URL},
                {property: 'og:image', content: OG_IMAGE},
                {property: 'og:image:width', content: '1200'},
                {property: 'og:image:height', content: '630'},
                {property: 'og:image:alt', content: SITE_NAME},
                {name: 'twitter:card', content: 'summary_large_image'},
                {name: 'twitter:title', content: SITE_NAME},
                {name: 'twitter:description', content: SITE_DESCRIPTION},
                {name: 'twitter:image', content: OG_IMAGE},
            ],
            script: [
                //  Apply the saved light/dark override before first paint so the
                //  loading splash matches the theme instead of flashing the OS default.
                {
                    innerHTML: `try{var t=localStorage.getItem('sp-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme-status',t)}catch(e){}`,
                    tagPosition: 'head',
                },
            ],
        },
    },
    vite: {
        base: '/',
        optimizeDeps: {
            exclude: [
                'stores',
                'modals'
            ]
        }
    }
})
