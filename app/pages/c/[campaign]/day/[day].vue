<script setup>
import Archive from '@/api/Archive.js'
import {PuzzleChannel} from '@/lib/puzzleChannel'
import {canPlay} from '@/lib/campaign/schedule'
import {countsAsDone, percentDone, solveSeconds} from '@/lib/campaign/completion'

const campaign = await useCampaign()
const route = useRoute()
const {t, locale} = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const text = useCampaignText(campaign)
const p = useCampaignPlayer(campaign)

const day = Number(route.params.day)
const homePath = localePath(`/c/${campaign.id}`)
const puzzle = computed(() => p.track.value?.puzzles[day - 1] ?? null)
const state = computed(() => p.progress.value?.days[day - 1]?.state ?? null)
const ready = ref(false)
const puzzleUrl = computed(() => puzzle.value ? Archive.getPuzzleUrl(puzzle.value, locale.value, 'light', config.public.buildVersion) : null)

const releaseWindowChannel = claimWindowChannel()
let channel = null
let mounted = false

watchEffect(() => {
    if (!p.loaded.value || ready.value) return
    if (!puzzle.value || !canPlay(state.value)) {
        navigateTo(homePath, {replace: true})
        return
    }
    setPuzzleAppData()
    ready.value = true
    if (mounted) nextTick(openChannel)
})

function setPuzzleAppData() {
    const back = {
        title: text('title'),
        url: new URL(homePath, window.location.origin).href,
        link_text: t('campaign.backTo', {name: text('title')}),
        image: Archive.getPuzzleImageUrl(puzzle.value, null, 'light'),
        target: '_parent',
    }
    window.puzzleApp = {
        completion: {
            correct: {links: [back], subtitle: t('campaign.completedDay', {day}), title: t('campaign.wellDone'), view_all_url: back.url},
            incorrect: {links: [back], subtitle: t('campaign.notQuite'), title: t('campaign.keepTrying'), view_all_url: back.url},
        },
        related: null,
        leaderboard: null,
        multiplayer: null,
        stats: null,
        assists: null,
        trophies: null,
        user: null,
    }
}

function openChannel() {
    const frame = document.getElementById('puzzle-frame')?.contentWindow
    if (!frame || channel) return
    channel = new PuzzleChannel(frame, new URL(puzzleUrl.value, window.location.href).origin, {events: {bubble: true, forward: false}})
    channel.on('puzzlecomplete', message => onComplete(fromChannel(message)))
    channel.on('puzzleprogress', message => onProgress(fromChannel(message)))
}

function fromChannel(message) {
    const content = message?.content
    const snapshot = content?.node === 'all' ? content.data : content?.node ? null : content
    const user = content?.node === 'user' ? content.data : snapshot?.user
    return {status: message?.status ?? snapshot?.status, user}
}

//  Older gameplay builds post {type, payload} messages instead of using the channel.
function onMessage(e) {
    if (e.source !== document.getElementById('puzzle-frame')?.contentWindow) return
    const result = {status: e.data?.payload?.status, user: e.data?.payload}
    if (e.data?.type === 'puzzlecomplete') onComplete(result)
    if (e.data?.type === 'puzzleprogress') onProgress(result)
}

function onProgress(result) {
    p.notePercent(day, percentDone(result))
}

function onComplete(result) {
    if (!countsAsDone(result)) return
    p.complete(day, puzzle.value.slug, solveSeconds(result)).catch(e => console.error('Saving the day failed', e))
}

onMounted(() => {
    mounted = true
    window.addEventListener('message', onMessage)
    if (ready.value) nextTick(openChannel)
})
onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    channel?.dispose()
    channel = null
    releaseWindowChannel()
    delete window.puzzleApp
})
</script>

<template>
    <div class="campaign-play" :style="useCampaignTheme(campaign)">
        <Title>{{ t('campaign.dayN', {day}) }} · {{ text('title') }}</Title>
        <NuxtLink :to="homePath" class="campaign-play__back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{{ t('campaign.back') }}</span>
        </NuxtLink>
        <PuzzleFrame v-if="ready" :url="puzzleUrl" />
        <p v-else class="campaign-play__loading">{{ t('campaign.loading') }}</p>
    </div>
</template>

<style>
body:has(.campaign-play) {
    --body-padding: 0;
}
</style>

<style scoped>
.campaign-play {
    display: flex;
    flex-direction: column;
    min-block-size: 100dvh;
    background: var(--app-bg);
    color: var(--text-colour);
}

.campaign-play__back {
    position: fixed;
    inset-block-start: .8rem;
    inset-inline-start: .8rem;
    z-index: 51;
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: 0 1.4rem;
    block-size: 3.6rem;
    border-radius: 9999px;
    background: var(--primary);
    color: var(--text-on-primary);
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
    }
}

.campaign-play__loading {
    margin: auto;
}
</style>
