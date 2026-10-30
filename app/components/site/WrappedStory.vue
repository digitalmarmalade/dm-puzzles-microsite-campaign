<script setup>
import {variantLook} from '@/lib/variantLook'
import {themeClass} from '@/lib/utils'
import {renderShareCard, resolveColor} from '@/lib/shareCard'
import {assistKind} from '@/lib/assists'
import logoSource from '@/components/site/Logo.vue?raw'

const SLIDE_MS = 5500
const SWIPE_PX = 40
const HOLD_MS = 250

const {t, te} = useI18n()
const dateLocale = useDateLocale()
const localePath = useLocalePath()
const {data, monthDate, wrappedKey, open, previewing} = useWrapped()
const preferences = usePreferencesStore()

const index = ref(0)
const paused = ref(false)
const sharing = ref(false)
const closeButton = ref(null)
const stage = ref(null)
let returnFocus = null

const monthName = computed(() => new Intl.DateTimeFormat(dateLocale.value, {month: 'long'}).format(monthDate))
const prevMonthName = computed(() => new Intl.DateTimeFormat(dateLocale.value, {month: 'long'})
    .format(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)))

const slides = computed(() => {
    const d = data.value
    return [
        {id: 'intro'},
        {id: 'solved'},
        perfect.value ? {id: 'perfect'} : {id: 'days'},
        d.minutes > 0 && {id: 'minutes'},
        d.top && {id: 'top', shift: d.top, look: variantLook(d.top.variant)},
        d.rising && {id: 'rising', shift: d.rising, look: variantLook(d.rising.variant)},
        d.falling && {id: 'falling', shift: d.falling, look: variantLook(d.falling.variant)},
        d.improved && {id: 'improved', look: variantLook(d.improved.variant)},
        d.help && {id: `help-${d.help.direction}`},
        d.assists && {id: 'assists', look: variantLook(d.assists.variant)},
        d.challenges && {id: 'challenges'},
        d.medal?.tier && {id: 'medal'},
        {id: 'outro'},
    ].filter(Boolean)
})
const slide = computed(() => slides.value[index.value])
const perfect = computed(() => data.value.days.length >= calendar.value.total)

const BACKDROPS = {
    intro: {pattern: 'honeycomb', fade: 'bottom', intensity: 0.5},
    solved: {pattern: 'tiles', fade: 'bottom'},
    days: {pattern: 'rays', fade: 'bottom', intensity: 0.8},
    perfect: {pattern: 'confetti', fade: 'radial', intensity: 1},
    minutes: {pattern: 'clock', fade: 'radial'},
    top: {pattern: 'pulse', fade: 'radial'},
    rising: {pattern: 'chevronsUp', fade: 'bottom'},
    falling: {pattern: 'chevronsDown', fade: 'top'},
    improved: {pattern: 'speed', fade: 'left'},
    'help-less': {pattern: 'constellation', fade: 'top'},
    'help-more': {pattern: 'bubbles', fade: 'bottom'},
    assists: {pattern: 'letters', fade: 'radial', intensity: 0.7},
    challenges: {pattern: 'rays', fade: 'radial', intensity: 0.7},
    medal: {pattern: 'confetti', fade: 'radial', intensity: 1},
    outro: {pattern: 'confetti', fade: 'top'},
}
const backdrop = computed(() => BACKDROPS[slide.value.id] ?? BACKDROPS.intro)

const calendar = computed(() => {
    const y = monthDate.getFullYear()
    const m = monthDate.getMonth()
    const total = new Date(y, m + 1, 0).getDate()
    const offset = (new Date(y, m, 1).getDay() + 6) % 7
    const played = new Set(data.value.days)
    return {
        total,
        cells: [
            ...Array.from({length: offset}, (_, i) => ({key: `e${i}`, empty: true})),
            ...Array.from({length: total}, (_, i) => ({key: `d${i + 1}`, played: played.has(i + 1)})),
        ],
    }
})

const shiftKey = (s) => {
    if (s.id === 'rising' && !s.shift.prev) return 'new'
    if (s.id === 'falling' && !s.shift.count) return 'none'
    return 'body'
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const voiced = (key, ...args) => t(te(`wrapped.share.voice.${key}`) ? `wrapped.share.voice.${key}` : `wrapped.${key}`, ...args)

const improvedFor = (tr) => {
    const i = data.value.improved
    if (!i) return {headline: '', body: ''}
    const params = {month: prevMonthName.value}
    if (i.metric === 'time') {
        params.saved = fmtTime(i.before - i.now)
        params.now = fmtTime(i.now)
        params.before = fmtTime(i.before)
    } else {
        params.saved = i.now - i.before
        params.now = i.now
        params.before = i.before
    }
    return {
        headline: tr(`improved.${i.metric}.headline`, params),
        body: tr(`improved.${i.metric}.${i.source}`, params),
    }
}

const improvedText = computed(() => improvedFor((key, params) => t(`wrapped.${key}`, params)))

const assistValue = (n) => assistKind(data.value.assists?.type) === 'letters' ? String(n) : `${n}%`

const tierName = computed(() => data.value.medal?.tier ? t(`achievements.tiers.${data.value.medal.tier}`) : '')
const monthShort = computed(() => new Intl.DateTimeFormat(dateLocale.value, {month: 'short'}).format(monthDate))

const hours = computed(() => ({h: Math.floor(data.value.minutes / 60), m: data.value.minutes % 60}))

const shareCard = computed(() => {
    const d = data.value
    const s = slide.value
    const shareImproved = d.improved ? improvedFor(voiced) : {}
    const shiftBody = () => s.id === 'top'
        ? voiced('top.body', {count: s.shift.count}, s.shift.count)
        : voiced(`${s.id}.${shiftKey(s)}`, {count: s.shift.count, prev: s.shift.prev, month: prevMonthName.value}, s.shift.count)
    switch (s.id) {
        case 'solved': return {kicker: voiced('solved.kicker'), big: String(d.puzzles), unit: voiced('solved.unit', d.puzzles)}
        case 'days': return {kicker: voiced('days.kicker'), big: String(d.days.length), bigSize: 220, unit: voiced('days.unit', {total: calendar.value.total, month: monthName.value}, d.days.length), calendar: calendar.value.cells}
        case 'perfect': return {kicker: voiced('perfect.kicker'), big: voiced('perfect.title'), bigSize: 150, body: voiced('perfect.body', {month: monthName.value}), calendar: calendar.value.cells}
        case 'minutes': return {kicker: voiced('minutes.kicker'), big: String(d.minutes), unit: voiced('minutes.unit', d.minutes), body: hours.value.h ? voiced('minutes.hours', {hours: hours.value.h, minutes: hours.value.m}) : ''}
        case 'top':
        case 'rising':
        case 'falling': return {kicker: voiced(`${s.id}.kicker`), icon: s.look.icon, big: s.shift.variant, bigSize: 130, body: shiftBody()}
        case 'improved': return {kicker: voiced(`improved.${d.improved.metric}.kicker`), icon: s.look.icon, big: d.improved.variant, bigSize: 130, unit: shareImproved.headline, body: shareImproved.body}
        case 'assists': return {kicker: voiced(`assists.${d.assists.type}.${d.assists.change}.kicker`), icon: s.look.icon, big: d.assists.variant, bigSize: 130, unit: `${assistValue(d.assists.from)} → ${assistValue(d.assists.to)}`, body: voiced(`assists.${d.assists.type}.${d.assists.change}.body`, {from: d.assists.from, to: d.assists.to, month: monthName.value})}
        case 'challenges': return {kicker: voiced('challenges.kicker'), big: String(d.challenges.total), unit: voiced('challenges.unit', d.challenges.total)}
        case 'medal': return {kicker: voiced('medal.kicker'), medal: {tier: d.medal.tier, label: monthShort.value}, big: voiced('medal.title', {tier: tierName.value, month: monthName.value}), bigSize: 110, unit: voiced('medal.solved', {count: d.medal.puzzles}, d.medal.puzzles)}
        case 'intro':
        case 'outro': return null
        default: {
            const dir = d.help.direction
            return {kicker: voiced(`help.${dir}.kicker`), big: `${d.help.pct}%`, unit: voiced(`help.${dir}.unit`), body: voiced(`help.${dir}.body`, {prev: d.help.prev, month: prevMonthName.value})}
        }
    }
})

async function share() {
    if (sharing.value || !stage.value || !shareCard.value) return
    sharing.value = true
    try {
        const style = getComputedStyle(stage.value)
        const colors = {
            a: resolveColor(stage.value, style.getPropertyValue('--stage-a')),
            b: resolveColor(stage.value, style.getPropertyValue('--stage-b')),
        }
        const month = new Intl.DateTimeFormat(dateLocale.value, {month: 'long', year: 'numeric'}).format(monthDate)
        const blob = await renderShareCard({...shareCard.value}, {
            colors,
            logoSvg: logoSource.match(/<svg[\s\S]*<\/svg>/)[0],
            month,
            footer: t('wrapped.share.footer', {host: location.host}),
        })
        const file = new File([blob], `sticky-puzzles-${wrappedKey}-${slide.value.id}.png`, {type: 'image/png'})
        const text = t('wrapped.share.text', {month: monthName.value})
        let method = 'download'
        if (navigator.canShare?.({files: [file]})) {
            method = 'share'
            await navigator.share({files: [file], title: text, text: `${text} ${location.origin}`})
        } else {
            const url = URL.createObjectURL(blob)
            const link = Object.assign(document.createElement('a'), {href: url, download: file.name})
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
        trackFunnel('sp_wrapped_share', {slide: slide.value.id, method})
    } catch (e) {
        if (e?.name !== 'AbortError') console.error(e)
    } finally {
        sharing.value = false
    }
}

function next() {
    if (index.value < slides.value.length - 1) index.value += 1
}
function prev() {
    if (index.value > 0) index.value -= 1
}
function close() {
    open.value = false
}
function seeStats() {
    close()
    navigateTo(localePath('/stats'))
}

let downAt = 0
let downX = 0
function onPointerDown(e) {
    downAt = Date.now()
    downX = e.clientX
    paused.value = true
}
function onPointerUp(e) {
    paused.value = false
    if (e.target.closest('button, a')) return
    const dx = e.clientX - downX
    if (Math.abs(dx) > SWIPE_PX) return dx < 0 ? next() : prev()
    if (Date.now() - downAt > HOLD_MS) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left < rect.width / 3) prev()
    else next()
}

function onKey(e) {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'ArrowLeft') prev()
}

watch(open, async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
        index.value = 0
        if (!previewing.value && preferences.recapWatchedMonth !== wrappedKey) preferences.set('recapWatchedMonth', wrappedKey)
        returnFocus = document.activeElement
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', onKey)
        await nextTick()
        closeButton.value?.focus()
    } else {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', onKey)
        returnFocus?.focus?.()
        returnFocus = null
    }
}, {immediate: true})

onBeforeUnmount(() => {
    if (!import.meta.client) return
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKey)
})
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="wrapped" role="dialog" aria-modal="true" :aria-label="t('wrapped.story.label', {month: monthName})" @click.self="close">
            <div
                ref="stage"
                class="wrapped__stage"
                :class="[`wrapped__stage--${slide.id}`, slide.id === 'medal' ? `wrapped__stage--medal-${data.medal.tier}` : '', slide.look ? themeClass(slide.look.theme) : '']"
                @pointerdown="onPointerDown"
                @pointerup="onPointerUp"
                @pointercancel="paused = false"
            >
                <AmbientField :key="slide.id" :pattern="backdrop.pattern" :fade="backdrop.fade" :intensity="backdrop.intensity ?? 0.85" />

                <div class="wrapped__progress" aria-hidden="true">
                    <span v-for="(s, i) in slides" :key="s.id" class="wrapped__segment">
                        <span
                            class="wrapped__fill"
                            :class="{'wrapped__fill--done': i < index, 'wrapped__fill--active': i === index, 'wrapped__fill--paused': paused || sharing}"
                            :style="{'--slide-ms': `${SLIDE_MS}ms`}"
                            @animationend="i === index && next()"
                        ></span>
                    </span>
                </div>

                <button v-if="shareCard" type="button" class="wrapped__share" :disabled="sharing" :aria-label="t('wrapped.share.button')" @click="share">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
                </button>

                <button ref="closeButton" type="button" class="wrapped__close" :aria-label="t('wrapped.story.close')" @click="close">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>

                <div :key="slide.id" class="wrapped__slide" aria-live="polite">
                    <p class="sr-only">{{ t('wrapped.story.slideOf', {n: index + 1, total: slides.length}) }}</p>

                    <template v-if="slide.id === 'intro'">
                        <p class="wrapped__kicker">{{ t('wrapped.banner.kicker') }}</p>
                        <h2 class="wrapped__headline">{{ t('wrapped.banner.title', {month: monthName}) }}</h2>
                        <p class="wrapped__body">{{ t('wrapped.intro.body') }}</p>
                    </template>

                    <template v-else-if="slide.id === 'solved'">
                        <p class="wrapped__kicker">{{ t('wrapped.solved.kicker') }}</p>
                        <p class="wrapped__number"><CountUp :value="data.puzzles" :duration="1200" /></p>
                        <p class="wrapped__unit">{{ t('wrapped.solved.unit', data.puzzles) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'days'">
                        <p class="wrapped__kicker">{{ t('wrapped.days.kicker') }}</p>
                        <p class="wrapped__number wrapped__number--small"><CountUp :value="data.days.length" :duration="900" /></p>
                        <p class="wrapped__unit">{{ t('wrapped.days.unit', {total: calendar.total, month: monthName}, data.days.length) }}</p>
                        <div class="wrapped__calendar" aria-hidden="true">
                            <span
                                v-for="(cell, i) in calendar.cells"
                                :key="cell.key"
                                class="wrapped__day"
                                :class="{'wrapped__day--empty': cell.empty, 'wrapped__day--played': cell.played}"
                                :style="{'--i': i}"
                            ></span>
                        </div>
                    </template>

                    <template v-else-if="slide.id === 'perfect'">
                        <p class="wrapped__kicker">{{ t('wrapped.perfect.kicker') }}</p>
                        <h2 class="wrapped__headline wrapped__headline--perfect">{{ t('wrapped.perfect.title') }}</h2>
                        <p class="wrapped__body">{{ t('wrapped.perfect.body', {month: monthName}) }}</p>
                        <div class="wrapped__calendar wrapped__calendar--perfect" aria-hidden="true">
                            <span
                                v-for="(cell, i) in calendar.cells"
                                :key="cell.key"
                                class="wrapped__day"
                                :class="{'wrapped__day--empty': cell.empty, 'wrapped__day--played': cell.played}"
                                :style="{'--i': i}"
                            ></span>
                        </div>
                    </template>

                    <template v-else-if="slide.id === 'minutes'">
                        <p class="wrapped__kicker">{{ t('wrapped.minutes.kicker') }}</p>
                        <p class="wrapped__number"><CountUp :value="data.minutes" :duration="1400" /></p>
                        <p class="wrapped__unit">{{ t('wrapped.minutes.unit', data.minutes) }}</p>
                        <p v-if="hours.h" class="wrapped__body">{{ t('wrapped.minutes.hours', {hours: hours.h, minutes: hours.m}) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'top' || slide.id === 'rising' || slide.id === 'falling'">
                        <p class="wrapped__kicker">{{ t(`wrapped.${slide.id}.kicker`) }}</p>
                        <span class="wrapped__tile" :class="`wrapped__tile--${slide.id}`" aria-hidden="true">
                            <PuzzleIcon :icon="slide.look.icon" :status="{completed: true}" :show-home-icon="false" />
                        </span>
                        <h2 class="wrapped__name">{{ slide.shift.variant }}</h2>
                        <p class="wrapped__body">
                            {{ slide.id === 'top'
                                ? t('wrapped.top.body', {count: slide.shift.count}, slide.shift.count)
                                : t(`wrapped.${slide.id}.${shiftKey(slide)}`, {count: slide.shift.count, prev: slide.shift.prev, month: prevMonthName}, slide.shift.count) }}
                        </p>
                    </template>

                    <template v-else-if="slide.id === 'improved'">
                        <p class="wrapped__kicker">{{ t(`wrapped.improved.${data.improved.metric}.kicker`) }}</p>
                        <span class="wrapped__tile wrapped__tile--rising" aria-hidden="true">
                            <PuzzleIcon :icon="slide.look.icon" :status="{completed: true}" :show-home-icon="false" />
                        </span>
                        <h2 class="wrapped__name">{{ data.improved.variant }}</h2>
                        <p class="wrapped__unit">{{ improvedText.headline }}</p>
                        <p class="wrapped__body">{{ improvedText.body }}</p>
                    </template>

                    <template v-else-if="slide.id.startsWith('help-')">
                        <p class="wrapped__kicker">{{ t(`wrapped.help.${data.help.direction}.kicker`) }}</p>
                        <p class="wrapped__number"><CountUp :value="data.help.pct" :duration="1200" />%</p>
                        <p class="wrapped__unit">{{ t(`wrapped.help.${data.help.direction}.unit`) }}</p>
                        <p class="wrapped__body">{{ t(`wrapped.help.${data.help.direction}.body`, {prev: data.help.prev, month: prevMonthName}) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'assists'">
                        <p class="wrapped__kicker">{{ t(`wrapped.assists.${data.assists.type}.${data.assists.change}.kicker`) }}</p>
                        <span class="wrapped__tile" aria-hidden="true">
                            <PuzzleIcon :icon="slide.look.icon" :status="{completed: true}" :show-home-icon="false" />
                        </span>
                        <h2 class="wrapped__name">{{ data.assists.variant }}</h2>
                        <p class="wrapped__shift" aria-hidden="true">
                            <span>{{ assistValue(data.assists.from) }}</span>
                            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                            <span>{{ assistValue(data.assists.to) }}</span>
                        </p>
                        <p class="wrapped__body">{{ t(`wrapped.assists.${data.assists.type}.${data.assists.change}.body`, {from: data.assists.from, to: data.assists.to, month: monthName}) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'challenges'">
                        <p class="wrapped__kicker">{{ t('wrapped.challenges.kicker') }}</p>
                        <p class="wrapped__number"><CountUp :value="data.challenges.total" :duration="1200" /></p>
                        <p class="wrapped__unit">{{ t('wrapped.challenges.unit', data.challenges.total) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'medal'">
                        <p class="wrapped__kicker">{{ t('wrapped.medal.kicker') }}</p>
                        <span class="stamp-holder wrapped__medal" aria-hidden="true">
                            <span class="stamp stamp--won" :class="`stamp--tier-${data.medal.tier}`">{{ monthShort }}</span>
                        </span>
                        <h2 class="wrapped__headline">{{ t('wrapped.medal.title', {tier: tierName, month: monthName}) }}</h2>
                        <p class="wrapped__body">{{ t('wrapped.medal.solved', {count: data.medal.puzzles}, data.medal.puzzles) }}</p>
                    </template>

                    <template v-else-if="slide.id === 'outro'">
                        <h2 class="wrapped__headline wrapped__headline--outro">{{ t('wrapped.outro.title', {month: monthName}) }}</h2>
                        <p class="wrapped__body">{{ t('wrapped.outro.body') }}</p>
                        <div class="wrapped__actions">
                            <button type="button" class="wrapped__button wrapped__button--primary" @click="seeStats">{{ t('wrapped.outro.cta') }}</button>
                            <button type="button" class="wrapped__button" @click="index = 0">{{ t('wrapped.outro.replay') }}</button>
                        </div>
                    </template>
                </div>

                <div class="wrapped__nav">
                    <button type="button" class="wrapped__arrow" :disabled="index === 0" :aria-label="t('wrapped.story.prev')" @click="prev">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <button type="button" class="wrapped__arrow" :disabled="index === slides.length - 1" :aria-label="t('wrapped.story.next')" @click="next">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.wrapped {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    background: rgba(10, 6, 20, .85);
    backdrop-filter: blur(6px);
}

.wrapped__stage {
    --stage-a: #2b1747;
    --stage-b: #6a2a6e;
    position: relative;
    display: flex;
    flex-direction: column;
    inline-size: min(100vw, 46rem);
    block-size: min(100dvh, 82rem);
    overflow: hidden;
    background:
        radial-gradient(circle at 80% 10%, rgba(255, 255, 255, .16), transparent 45%),
        linear-gradient(160deg, var(--stage-a), var(--stage-b));
    color: #fff;
    touch-action: pan-y;
    user-select: none;
    transition: background .5s ease;

    @media (width >= 560px) {
        border-radius: 2rem;
        box-shadow: 0 3rem 6rem rgba(0, 0, 0, .45);
    }
}

.wrapped__stage--solved {
    --stage-a: color-mix(in srgb, var(--primary, #f17b2d) 85%, black);
    --stage-b: var(--primary, #f17b2d);
}

.wrapped__stage--days {
    --stage-a: #0f3b4a;
    --stage-b: #1c7c7d;
}

.wrapped__stage--minutes {
    --stage-a: #1b2459;
    --stage-b: #4256c9;
}

.wrapped__stage--top,
.wrapped__stage--rising,
.wrapped__stage--improved,
.wrapped__stage--assists {
    --stage-a: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 55%, black);
    --stage-b: rgb(var(--puzzle-tile-shadow));
}

.wrapped__stage--help-less {
    --stage-a: #123d2c;
    --stage-b: #2f9e6e;
}

.wrapped__stage--help-more {
    --stage-a: #4a2a12;
    --stage-b: #c9852e;
}

.wrapped__stage--falling {
    --stage-a: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 30%, #1a1a24);
    --stage-b: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 55%, #3a3a48);
}

.wrapped__stage--medal-1 {
    --stage-a: #3d2210;
    --stage-b: #a8662f;
}
.wrapped__stage--medal-2 {
    --stage-a: #262c35;
    --stage-b: #7b8796;
}
.wrapped__stage--medal-3 {
    --stage-a: #6a3c00;
    --stage-b: #d29a12;
}
.wrapped__medal {
    --stamp-size: clamp(11rem, 32vmin, 16rem);
    margin: 1.2rem 0 1.6rem;
    animation: wrapped-medal-in .7s cubic-bezier(.3, 1.4, .5, 1) .15s both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}
@keyframes wrapped-medal-in {
    from { opacity: 0; transform: scale(.6); }
    to { opacity: 1; transform: none; }
}
.wrapped__stage--perfect {
    --stage-a: #7a4300;
    --stage-b: #f2a900;
}

.wrapped__headline--perfect {
    font-size: clamp(4rem, 13vw, 6rem);
    text-wrap: balance;
    text-shadow: 0 .4rem 2rem rgba(122, 67, 0, .5);
    animation: wrapped-headline-in .6s cubic-bezier(.2, .7, .2, 1) .1s both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

@keyframes wrapped-headline-in {
    from {
        opacity: 0;
        transform: translateY(1.6rem) scale(.9);
    }
}

.wrapped__stage--outro {
    --stage-a: #2b1747;
    --stage-b: color-mix(in srgb, var(--primary, #f17b2d) 70%, #6a2a6e);
}

.wrapped__progress {
    position: relative;
    z-index: 1;
    display: flex;
    gap: .4rem;
    padding: 1.4rem 1.4rem 0;
}

.wrapped__segment {
    flex: 1;
    block-size: .3rem;
    border-radius: .3rem;
    background: rgba(255, 255, 255, .3);
    overflow: hidden;
}

.wrapped__fill {
    display: block;
    block-size: 100%;
    inline-size: 0;
    background: #fff;
}

.wrapped__fill--done {
    inline-size: 100%;
}

.wrapped__fill--active {
    animation: wrapped-progress var(--slide-ms) linear forwards;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
        inline-size: 100%;
        opacity: .6;
    }
}

.wrapped__fill--paused {
    animation-play-state: paused;
}

.wrapped__close {
    position: absolute;
    z-index: 2;
    inset-block-start: 2.6rem;
    inset-inline-end: 1.2rem;
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, .2);
    color: #fff;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        fill: none;
    }
}

.wrapped__share {
    position: absolute;
    z-index: 2;
    inset-block-start: 2.6rem;
    inset-inline-end: 6.2rem;
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, .2);
    color: #fff;
    cursor: pointer;
    transition: opacity .2s ease;

    svg {
        inline-size: 1.9rem;
        block-size: 1.9rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
    }

    &:disabled {
        opacity: .5;
        cursor: progress;
    }
}

.wrapped__slide {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 4rem 3.2rem;
    text-align: center;

    > * {
        animation: wrapped-rise .6s cubic-bezier(.2, .8, .2, 1) both;

        @media (prefers-reduced-motion: reduce) {
            animation: none;
        }
    }

    > :nth-child(3) { animation-delay: .08s; }
    > :nth-child(4) { animation-delay: .16s; }
    > :nth-child(5) { animation-delay: .24s; }
    > :nth-child(6) { animation-delay: .32s; }
}

.wrapped__kicker {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .14rem;
    opacity: .85;
}

.wrapped__headline {
    margin: 0;
    font-size: clamp(5rem, 16vw, 7.2rem);
    font-weight: 800;
    line-height: .95;
    letter-spacing: -.2rem;
}

.wrapped__headline--outro {
    font-size: clamp(3.6rem, 11vw, 4.8rem);
    letter-spacing: -.1rem;
    text-wrap: balance;
}

.wrapped__number {
    margin: 0;
    font-size: clamp(9rem, 30vw, 14rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.4rem;
}

.wrapped__number--small {
    font-size: clamp(6.4rem, 20vw, 9rem);
}

.wrapped__unit {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    text-wrap: balance;
}

.wrapped__body {
    margin: .4rem 0 0;
    max-inline-size: 32rem;
    font-size: 1.7rem;
    line-height: 1.4;
    opacity: .9;
    text-wrap: balance;
}

.wrapped__name {
    margin: 0;
    font-size: clamp(3.6rem, 11vw, 5rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
}

.wrapped__tile {
    --card-icon-size: 14rem;
    display: grid;
    place-items: center;
    margin-block: 1.6rem;
    filter: drop-shadow(0 2rem 3rem rgba(0, 0, 0, .3));
}

.wrapped__shift {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin: .4rem 0 0;
    font-size: 4rem;
    font-weight: 800;
    letter-spacing: -.1rem;

    svg {
        inline-size: 3rem;
        block-size: 3rem;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        opacity: .7;
    }

    :dir(rtl) & svg {
        transform: scaleX(-1);
    }
}

.wrapped__tile--rising {
    animation: wrapped-up 1s cubic-bezier(.2, .8, .2, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.wrapped__tile--falling {
    opacity: .85;
    animation: wrapped-down 1s cubic-bezier(.2, .8, .2, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.wrapped__calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: .7rem;
    inline-size: min(100%, 30rem);
    margin-block-start: 2rem;
}

.wrapped__day {
    aspect-ratio: 1;
    border-radius: .8rem;
    background: rgba(255, 255, 255, .14);
    animation: wrapped-pop .4s cubic-bezier(.34, 1.56, .64, 1) both;
    animation-delay: calc(var(--i) * 25ms + .3s);

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.wrapped__day--empty {
    visibility: hidden;
}

.wrapped__calendar--perfect {
    margin-block-start: 2.4rem;

    .wrapped__day--played {
        box-shadow: 0 0 1.8rem rgba(255, 236, 170, .8);
    }
}

.wrapped__day--played {
    background: #fff;
    box-shadow: 0 0 1.4rem rgba(255, 255, 255, .45);
}

.wrapped__actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    inline-size: min(100%, 28rem);
    margin-block-start: 2.4rem;
}

.wrapped__button {
    padding: 1.2rem 2rem;
    border: 2px solid rgba(255, 255, 255, .7);
    border-radius: 3rem;
    background: transparent;
    color: #fff;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06rem;
    cursor: pointer;
}

.wrapped__button--primary {
    border-color: #fff;
    background: #fff;
    color: #2b1747;
}

.wrapped__nav {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    padding: 0 1.4rem 1.6rem;

    @media (pointer: coarse) {
        display: none;
    }
}

.wrapped__arrow {
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, .2);
    color: #fff;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
    }

    &:disabled {
        opacity: .3;
        cursor: default;
    }
}

@keyframes wrapped-progress {
    from { inline-size: 0; }
    to   { inline-size: 100%; }
}

@keyframes wrapped-rise {
    from { opacity: 0; transform: translateY(2rem); }
    to   { opacity: 1; transform: none; }
}

@keyframes wrapped-pop {
    from { opacity: 0; transform: scale(.4); }
    to   { opacity: 1; transform: scale(1); }
}

@keyframes wrapped-up {
    from { opacity: 0; transform: translateY(6rem) rotate(-6deg); }
    to   { opacity: 1; transform: none; }
}

@keyframes wrapped-down {
    from { opacity: 0; transform: translateY(-6rem) rotate(6deg); }
    to   { opacity: .85; transform: none; }
}
</style>
