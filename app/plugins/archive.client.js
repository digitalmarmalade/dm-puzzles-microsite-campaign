import Archive from '@/api/Archive.js'

//  Preload the archive so the global Nav has data on every route, not only the pages that load it themselves.
export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    await Archive.load(config.public.archiveFile)
})
