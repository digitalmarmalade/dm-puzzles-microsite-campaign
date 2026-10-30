<script setup>
import {drawCertificate} from '@/lib/campaign/certificate'

const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    profile: {type: Object, default: null},
    own: {type: Boolean, default: false},
    pageUrl: {type: String, default: null},
    fundraising: {type: Object, default: null},
})

const {t} = useI18n()
const dateLocale = useDateLocale()
const text = useCampaignText(props.campaign)

const root = ref(null)
const fire = ref(0)
const busy = ref(false)
const image = ref(null)

const total = props.campaign.schedule.days
const confetti = [props.campaign.theme?.primary, props.campaign.theme?.secondary, '#ffd166', '#ffffff'].filter(Boolean)
const finished = computed(() => props.progress.finished)
const name = computed(() => props.profile?.name ?? '')
const headline = computed(() => props.track.headline || props.track.name)

const formatDate = (iso) => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${iso}T12:00:00Z`))
const firstDay = computed(() => props.progress.days[0].due)
const lastDay = computed(() => props.progress.days.map(d => d.completedOn).filter(Boolean).sort().at(-1) ?? props.progress.days.at(-1).due)
const dates = computed(() => t('campaign.finale.dates', {from: formatDate(firstDay.value), to: formatDate(lastDay.value)}))

const title = computed(() => {
    if (!finished.value) return t('campaign.finale.endedTitle')
    if (props.own) return text(props.progress.perfect ? 'perfect' : 'finished') || t('campaign.finale.title')
    return t(props.progress.perfect ? 'campaign.public.perfect' : 'campaign.public.finished', {name: name.value})
})
const result = computed(() => props.progress.perfect
    ? t('campaign.finale.perfectRun', {total})
    : t('campaign.finale.onTimeLate', {onTime: props.progress.onTime, late: props.progress.late}))

const seenKey = `campaign-finale-seen:${props.campaign.id}:${props.own ? 'me' : props.profile?.handle ?? ''}`
const canShareFiles = computed(() => !!image.value && typeof navigator !== 'undefined' && !!navigator.canShare?.({files: [image.value]}))

onMounted(() => {
    if (!finished.value) return
    let seen = false
    try {
        seen = localStorage.getItem(seenKey) === '1'
        localStorage.setItem(seenKey, '1')
    } catch {
        //
    }
    if (!seen) nextTick(() => fire.value++)
})

function themeFor(el) {
    const css = getComputedStyle(el)
    const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
    return {
        colours: {
            primary: v('--primary', '#333'),
            secondary: v('--secondary', '#333'),
            background: v('--app-bg', '#f5f5f5'),
            text: v('--text-colour', '#222'),
            tint: `rgba(${v('--primary-rgb', '0, 0, 0')}, .1)`,
        },
        fonts: {display: v('--font-display', 'sans-serif'), body: v('--font-sans', 'sans-serif')},
    }
}

async function makeImage() {
    if (image.value) return image.value
    const blob = await drawCertificate({
        ...themeFor(root.value),
        logo: props.campaign.theme?.logo,
        title: text('title'),
        avatar: props.profile?.avatar,
        initial: name.value.trim().charAt(0).toUpperCase(),
        name: name.value || text('title'),
        completed: t('campaign.finale.imageCompleted', {headline: headline.value}),
        result: result.value,
        dates: dates.value,
        url: props.pageUrl?.replace(/^https?:\/\//, ''),
    })
    image.value = new File([blob], `${props.campaign.id}-${props.profile?.handle ?? 'challenge'}.png`, {type: 'image/png'})
    return image.value
}

async function download() {
    busy.value = true
    try {
        const file = await makeImage()
        const url = URL.createObjectURL(file)
        const a = Object.assign(document.createElement('a'), {href: url, download: file.name})
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
        busy.value = false
    }
}

async function share() {
    try {
        const file = await makeImage()
        await navigator.share({files: [file], title: text('title'), text: title.value, url: props.pageUrl ?? undefined})
    } catch (e) {
        if (e?.name !== 'AbortError') console.error(e)
    }
}

onMounted(() => {
    if (finished.value && props.own) makeImage().catch(e => console.error(e))
})
</script>

<template>
    <section ref="root" class="finale" :class="{'finale--ended': !finished, 'finale--perfect': progress.perfect}">
        <div v-if="finished" class="finale__confetti" aria-hidden="true">
            <ConfettiBurst :fire="fire" :count="180" :colours="confetti" />
        </div>

        <div class="finale__badge" aria-hidden="true">
            <span class="finale__count">{{ progress.completed }}<small>/{{ total }}</small></span>
            <svg v-if="progress.perfect" class="finale__star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
        </div>

        <div class="finale__text">
            <p v-if="finished" class="finale__eyebrow">{{ t(progress.perfect ? 'campaign.finale.perfectEyebrow' : 'campaign.finale.eyebrow') }}</p>
            <h2 class="finale__title">{{ title }}</h2>
            <p v-if="finished" class="finale__result">{{ result }}</p>
            <p v-else class="finale__result">{{ t('campaign.finale.endedText', {completed: progress.completed, total}) }}</p>
            <p class="finale__dates">{{ dates }}</p>

            <div v-if="finished && (own || fundraising?.url)" class="finale__actions">
                <template v-if="own">
                    <button v-if="canShareFiles" type="button" class="campaign-button" @click="share">{{ t('campaign.finale.shareImage') }}</button>
                    <button type="button" class="campaign-button" :class="{'is-secondary': canShareFiles}" :disabled="busy" @click="download">{{ t('campaign.finale.downloadImage') }}</button>
                </template>
                <a v-if="fundraising?.url" :href="fundraising.url" class="campaign-button is-secondary" target="_blank" rel="noopener">
                    {{ t(own ? 'campaign.finale.thankSponsors' : 'campaign.finale.sponsorName', {name}) }}
                </a>
            </div>
        </div>
    </section>
</template>

<style scoped>
.finale {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2.4rem 4rem;
    margin-block-end: 2.4rem;
    padding: 3.2rem 2rem;
    border-radius: var(--border-radius);
    background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--secondary)));
    color: var(--text-on-primary);
    text-align: center;

    @media (width >= 720px) {
        flex-wrap: nowrap;
        justify-content: flex-start;
        padding: 4.8rem 5.6rem;
        text-align: start;
    }

    &.finale--ended {
        background: var(--card-background);
        color: var(--text-colour);
        border: 1px solid var(--card-border);
    }
}

.finale__confetti {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
}

.finale__badge {
    position: relative;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 16rem;
    block-size: 16rem;
    border-radius: 50%;
    background: var(--card-background);
    color: var(--primary);
    box-shadow: 0 0 0 .8rem rgba(255, 255, 255, .25), 0 12px 30px rgba(0, 0, 0, .15);
    animation: finale-pop .6s cubic-bezier(.2, 1.6, .4, 1) both;

    @media (width >= 720px) {
        inline-size: 20rem;
        block-size: 20rem;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    .finale--ended & {
        box-shadow: none;
        border: .4rem solid color-mix(in srgb, var(--primary) 20%, transparent);
    }
}

.finale__count {
    font-family: var(--font-display);
    font-size: 5.2rem;
    font-weight: 700;
    line-height: 1;

    small {
        font-size: .45em;
        opacity: .6;
    }

    @media (width >= 720px) {
        font-size: 6.4rem;
    }
}

.finale__star {
    position: absolute;
    inset-block-start: -.6rem;
    inset-inline-end: -.6rem;
    inline-size: 5.6rem;
    block-size: 5.6rem;
    fill: #ffd166;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, .2));
}

.finale__text {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    min-inline-size: 0;
}

.finale__eyebrow {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .15rem;
    opacity: .85;
}

.finale__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 3rem;
    line-height: 1.15;
    text-wrap: balance;

    @media (width >= 720px) {
        font-size: 4.2rem;
    }
}

.finale__result {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 600;
}

.finale__dates {
    margin: 0;
    opacity: .8;
}

.finale__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin-block-start: 1.2rem;

    @media (width >= 720px) {
        justify-content: flex-start;
    }

    .campaign-button {
        background: var(--card-background);
        color: var(--primary);

        &.is-secondary {
            background: transparent;
            color: inherit;
            box-shadow: inset 0 0 0 2px currentColor;
        }
    }
}

@keyframes finale-pop {
    from {
        transform: scale(.4);
        opacity: 0;
    }
}
</style>
