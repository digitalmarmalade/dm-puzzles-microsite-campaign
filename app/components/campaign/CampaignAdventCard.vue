<script setup>
import {lastChance} from '@/lib/campaign/schedule'
import {glitterBurst, iconsAround, sparkleAround} from '@/lib/campaign/glitter'

const props = defineProps({
    campaign: {type: Object, required: true},
    day: {type: Object, default: null},
    puzzle: {type: Object, default: null},
    to: {type: String, default: null},
})

const {t} = useI18n()
const text = useCampaignText(props.campaign)
const dateLocale = useDateLocale()

const dialog = ref(null)
const paper = ref(null)
const sparkles = ref(null)
const drift = ref(null)
let stopSparkles = null
let stopIcons = null
let burstTimer = null

const formatDate = (iso) => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long', timeZone: 'UTC'}).format(new Date(`${iso}T12:00:00Z`))
const icon = computed(() => props.puzzle ? props.puzzle.icon ?? (props.puzzle.tag ?? '').replaceAll('-', '') : '')
const completed = computed(() => ['done', 'late'].includes(props.day?.state))
const line = computed(() => {
    if (!props.day) return ''
    return text('days')?.[props.day.day] || t(`campaign.advent.lines.l${props.day.day % 8 + 1}`)
})
const rule = computed(() => {
    const d = props.day
    if (!d) return ''
    if (completed.value) return t('campaign.advent.doneRule')
    if (d.state === 'catchup') {
        const until = lastChance(props.campaign, d.due)
        return until ? t('campaign.advent.catchUpUntil', {date: formatDate(d.due), until: formatDate(until)}) : t('campaign.advent.catchUpAny', {date: formatDate(d.due)})
    }
    return t('campaign.advent.todayRule')
})

async function open(from, {burst} = {}) {
    dialog.value.showModal()
    await nextTick()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    stopSparkles?.()
    stopIcons?.()
    stopSparkles = sparkleAround(sparkles.value, paper.value)
    stopIcons = iconsAround(drift.value, paper.value, sprite(icon.value))
    if (burst) {
        clearTimeout(burstTimer)
        burstTimer = setTimeout(() => glitterBurst(dialog.value.getBoundingClientRect(), {container: dialog.value, at: .5, arc: 2, reach: 1.5, layer: -1}), from ? 300 : 0)
    }
    if (!from) return
    const a = from.getBoundingClientRect()
    const b = paper.value.getBoundingClientRect()
    const dx = a.left + a.width / 2 - (b.left + b.width / 2)
    const dy = a.top + a.height / 2 - (b.top + b.height / 2)
    const scale = Math.min(a.width / b.width, a.height / b.height)
    paper.value.animate([
        {transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-8deg)`, opacity: .4},
        {transform: `translate(${dx * .3}px, ${dy * .3 - 60}px) scale(${.6 + scale * .4}) rotate(6deg)`, opacity: 1, offset: .45},
        {transform: 'translateY(-1.2rem) scale(1.02) rotate(-1.5deg)', offset: .8},
        {transform: 'none'},
    ], {duration: 850, easing: 'cubic-bezier(.2, .7, .3, 1)'})
}

function close() {
    dialog.value?.close()
}

function onClose() {
    clearTimeout(burstTimer)
    stopSparkles?.()
    stopIcons?.()
    stopSparkles = null
    stopIcons = null
}

onBeforeUnmount(onClose)

defineExpose({open})
</script>

<template>
    <dialog ref="dialog" class="advent-card" :aria-label="puzzle ? puzzle.variant || puzzle.name : ''" @click.self="close" @close="onClose">
        <div ref="drift" class="advent-card__drift" aria-hidden="true"></div>
        <div ref="sparkles" class="advent-card__sparkles" aria-hidden="true"></div>
        <article v-if="day && puzzle" ref="paper" class="advent-card__paper">
            <button type="button" class="advent-card__close" :aria-label="t('campaign.card.close')" @click="close">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <p class="advent-card__kicker">{{ t('campaign.advent.kicker', {day: day.day, date: formatDate(day.due)}) }}</p>
            <span class="advent-card__tile" aria-hidden="true">
                <svg><use :href="sprite(icon)" /></svg>
            </span>
            <h2 class="advent-card__title">{{ puzzle.variant || puzzle.name }}</h2>
            <p class="advent-card__line">{{ line }}</p>
            <p class="advent-card__rule">{{ rule }}</p>
            <NuxtLink v-if="to" :to="to" class="advent-card__play">
                {{ completed ? t('campaign.advent.playAgain') : t('campaign.today.play') }}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </NuxtLink>
        </article>
    </dialog>
</template>

<style scoped>
.advent-card {
    inline-size: min(44rem, calc(100vw - 3.2rem));
    max-block-size: calc(100dvh - 3.2rem);
    margin: auto;
    padding: 0;
    overflow: visible;
    border: 0;
    background: none;

    &::backdrop {
        background: rgba(20, 8, 4, .6);
        backdrop-filter: blur(4px);
        animation: advent-card-fade .4s ease both;
    }
}

.advent-card__drift,
.advent-card__sparkles {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;

    &.advent-card__drift {
        z-index: -1;
    }
}

.advent-card__paper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.4rem;
    padding: 3.2rem 2.8rem;
    border-radius: .6rem;
    background: radial-gradient(120% 80% at 50% 0%, #fff9ec, #f3e3c1 70%, #e6cf9f);
    box-shadow:
        inset 0 0 0 .1rem rgba(160, 120, 60, .35),
        inset 0 0 4rem rgba(170, 120, 50, .25),
        0 3rem 6rem rgba(0, 0, 0, .55);
    color: #3b1d14;
    text-align: center;

    &::after {
        content: '';
        position: absolute;
        inset: 1rem;
        border: .2rem solid #b98a3e;
        border-radius: .4rem;
        pointer-events: none;
    }

    @media (width >= 720px) {
        padding: 4rem;
    }
}

.advent-card__close {
    position: absolute;
    z-index: 1;
    inset-block-start: 1.8rem;
    inset-inline-end: 1.8rem;
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(92, 32, 22, .1);
        }
    }
}

.advent-card__kicker {
    margin: 0;
    color: #8a5a1c;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .12rem;
    text-transform: uppercase;
}

.advent-card__tile {
    display: grid;
    place-items: center;
    inline-size: 9.6rem;
    block-size: 9.6rem;
    border-radius: 1.6rem;
    background: linear-gradient(180deg, #9a4b35, #5c2016);
    box-shadow:
        inset 0 .2rem 0 rgba(255, 255, 255, .2),
        0 .8rem 1.6rem rgba(92, 32, 22, .35);
    color: #f0d590;

    svg {
        inline-size: 5.6rem;
        block-size: 5.6rem;
    }
}

.advent-card__title {
    margin: .4rem 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 3.2rem;
    font-style: italic;
    line-height: 1.1;
}

.advent-card__line {
    margin: 0;
    font-size: 1.8rem;
    line-height: 1.45;
}

.advent-card__rule {
    margin: 0;
    padding-block-start: 1.2rem;
    border-block-start: 1px dashed rgba(92, 32, 22, .3);
    font-size: 1.4rem;
    opacity: .8;
}

.advent-card__play {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    margin-block-start: .8rem;
    padding: 1.4rem 3.2rem;
    border-radius: 9999px;
    background: linear-gradient(180deg, #9a4b35, #6b2a1f);
    box-shadow: inset 0 .1rem 0 rgba(255, 255, 255, .25), 0 .6rem 1.4rem rgba(92, 32, 22, .4);
    color: #fff6dc;
    font-size: 1.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: transform .15s ease;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: currentColor;
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
        }
    }
}

@keyframes advent-card-fade {
    from {
        opacity: 0;
    }
}
</style>
