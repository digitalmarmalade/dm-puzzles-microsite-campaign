import {fileURLToPath} from 'node:url'

export default defineNuxtConfig({
    css: [fileURLToPath(new URL('./app/assets/advent.css', import.meta.url))],
    runtimeConfig: {
        public: {
            features: {
                advent: true,
            },
        },
    },
})
