// https://nuxt.com/docs/api/configuration/nuxt-config
import {readdirSync, readFileSync, watch, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const BUILD_VERSION = process.env.GIT_COMMIT || Date.now().toString()

const CAMPAIGN_ERRORS = []
const CAMPAIGNS = readdirSync('campaigns', {withFileTypes: true})
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
        const file = join('campaigns', d.name, 'campaign.json')
        try {
            const {id, hosts = []} = JSON.parse(readFileSync(file, 'utf8'))
            return [{id, hosts}]
        } catch (e) {
            CAMPAIGN_ERRORS.push(`${file}: ${e.message}`)
            return []
        }
    })

function campaignFiles(_options, nuxt) {
    for (const error of CAMPAIGN_ERRORS) {
        if (!nuxt.options.dev) throw new Error(error)
        console.warn(`Skipping a campaign: ${error}`)
    }
    if (!nuxt.options.dev) return
    let timer = null
    const watcher = watch('campaigns', {recursive: true}, (_event, file) => {
        if (!file?.endsWith('campaign.json')) return
        clearTimeout(timer)
        timer = setTimeout(() => nuxt.callHook('restart'), 300)
    })
    nuxt.hook('close', () => watcher.close())
}

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
    modules: ['@pinia/nuxt', '@nuxtjs/i18n', campaignFiles],
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
            campaigns: CAMPAIGNS,
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
        },
    },
    app: {
        baseURL: '/',
        cdnURL : '/',
        buildAssetsDir: 'assets/',
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
