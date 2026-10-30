<script setup>
import Archive from '@/api/Archive.js'
import {resultPct} from '@/lib/wordStats'

const props = defineProps({
    completions: {type: Array, default: () => []},
    lines: {type: Array, default: () => ['time', 'checks', 'reveals', 'hints', 'mistakes', 'guesses', 'wordsFound', 'score']},
})

const {t} = useI18n()
const dateLocale = useDateLocale()

const isNum = (v) => typeof v === 'number' && !Number.isNaN(v)
const showLine = (key) => props.lines.includes(key)

//  Oldest → newest of the last 7 completions that carry any of the metrics.
const last7 = computed(() =>
    [...props.completions]
        .filter(c => isNum(c.timeSec) || isNum(c.checksUsed) || isNum(c.cellsRevealed) || isNum(c.hintsShown) || isNum(c.wrongAnswers) || isNum(c.guesses) || resultPct(c) !== null)
        .sort((a, b) => new Date(a.at) - new Date(b.at))
        .slice(-7))

const series = computed(() => ({
    time:     last7.value.map(c => (isNum(c.timeSec) ? c.timeSec : null)),
    checks:   last7.value.map(c => (isNum(c.checksUsed) ? c.checksUsed : null)),
    reveals:  last7.value.map(c => (isNum(c.cellsRevealed) ? c.cellsRevealed : null)),
    hints:    last7.value.map(c => (isNum(c.hintsShown) ? c.hintsShown : null)),
    mistakes: last7.value.map(c => (isNum(c.wrongAnswers) ? c.wrongAnswers : null)),
    guesses:  last7.value.map(c => (isNum(c.guesses) ? c.guesses : null)),
}))
const pct = computed(() => last7.value.map(resultPct))

const hasData = (arr) => arr.some(v => v !== null)
const usePct = computed(() => showLine('wordsFound') || showLine('score'))
const pctLabel = computed(() => (showLine('score') ? t('archive.stats.score') : t('archive.stats.wordsFound')))
const countLine = (key) => showLine(key) && hasData(series.value[key])
const hasCount = computed(() => countLine('checks') || countLine('reveals') || countLine('hints') || countLine('mistakes') || countLine('guesses'))
const countKeys = computed(() => ['checks', 'reveals', 'hints', 'mistakes', 'guesses'].filter(countLine))
const countAxisClass = computed(() => countKeys.value.length === 1 ? `cc__axis--${countKeys.value[0]}` : 'cc__axis--mixed')
const showChart = computed(() => last7.value.length >= 2 &&
    (hasData(series.value.time) || hasCount.value || hasData(pct.value)))

const VIEW_W = 720
const VIEW_H = 270
const AXIS_H = 34
const viewH = ref(VIEW_H)
const PLOT = reactive({l: 54, r: 662, t: 18, b: VIEW_H - AXIS_H})
const plotEl = ref(null)
let plotObserver = null

watch(plotEl, (el) => {
    plotObserver?.disconnect()
    plotObserver = null
    if (!el) return
    plotObserver = new ResizeObserver(([entry]) => {
        const {width, height} = entry.contentRect
        if (!width || !height) return
        viewH.value = Math.max(VIEW_H, Math.round((VIEW_W * height) / width))
        PLOT.b = viewH.value - AXIS_H
    })
    plotObserver.observe(el)
})
onBeforeUnmount(() => plotObserver?.disconnect())
const xFor = (i, n) => (n <= 1 ? (PLOT.l + PLOT.r) / 2 : PLOT.l + (i * (PLOT.r - PLOT.l)) / (n - 1))

//  All-time average time for this type (all completions, not just the plotted 7) —
//  matches the "Average time" tile and reads as a baseline against the last 7.
const avgTime = computed(() => {
    const all = props.completions.map(c => c.timeSec).filter(isNum)
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null
})
const avgPct = computed(() => {
    const all = props.completions.map(resultPct).filter(v => v !== null)
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null
})
const maxTime = computed(() =>
    Math.max(1, ...series.value.time.filter(v => v !== null), avgTime.value ?? 0))
const maxCount = computed(() =>
    Math.max(1, ...['checks', 'reveals', 'hints', 'mistakes', 'guesses'].filter(showLine).flatMap(k => series.value[k]).filter(v => v !== null)))
const yTime = (v) => PLOT.b - (v / maxTime.value) * (PLOT.b - PLOT.t)
const yCount = (v) => PLOT.b - (v / maxCount.value) * (PLOT.b - PLOT.t)
const yPct = (v) => PLOT.b - (v / 100) * (PLOT.b - PLOT.t)

const linePoints = (arr, yFn) => {
    const n = arr.length
    return arr
        .map((v, i) => (v === null ? null : `${xFor(i, n).toFixed(1)},${yFn(v).toFixed(1)}`))
        .filter(Boolean)
        .join(' ')
}
const markers = (arr, yFn) => {
    const n = arr.length
    return arr
        .map((v, i) => (v === null ? null : {x: xFor(i, n), y: yFn(v), v, i}))
        .filter(Boolean)
}

const fmtTime = (s) => (s === null || s === undefined ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`)
const fmtPct = (v) => (v === null || v === undefined ? '–' : `${Math.round(v)}%`)

const checkPts = computed(() => linePoints(series.value.checks, yCount))
const revealPts = computed(() => linePoints(series.value.reveals, yCount))
const hintPts = computed(() => linePoints(series.value.hints, yCount))
const mistakePts = computed(() => linePoints(series.value.mistakes, yCount))
const guessPts = computed(() => linePoints(series.value.guesses, yCount))
const checkMarks = computed(() => markers(series.value.checks, yCount))
const revealMarks = computed(() => markers(series.value.reveals, yCount))
const hintMarks = computed(() => markers(series.value.hints, yCount))
const mistakeMarks = computed(() => markers(series.value.mistakes, yCount))
const guessMarks = computed(() => markers(series.value.guesses, yCount).map(m => ({...m, lost: last7.value[m.i]?.solved === false})))
const hasLost = computed(() => showLine('guesses') && guessMarks.value.some(m => m.lost))

const primaryPts = computed(() => (usePct.value ? linePoints(pct.value, yPct) : linePoints(series.value.time, yTime)))
const primaryMarks = computed(() => (usePct.value ? markers(pct.value, yPct) : markers(series.value.time, yTime)))
const primaryAvg = computed(() => (usePct.value ? avgPct.value : avgTime.value))
const hasPrimary = computed(() => (usePct.value ? hasData(pct.value) : hasData(series.value.time)))
const yPrimary = (v) => (usePct.value ? yPct(v) : yTime(v))
const fmtPrimary = (v) => (usePct.value ? fmtPct(v) : fmtTime(v))
const primaryTop = computed(() => (usePct.value ? '100%' : fmtTime(maxTime.value)))
const primaryBottom = computed(() => (usePct.value ? '0%' : '0:00'))
const primaryLabel = computed(() => (usePct.value ? pctLabel.value : t('archive.stats.time')))
const chartTitle = computed(() => (usePct.value ? t('archive.stats.chartTitlePlays') : t('archive.stats.chartTitle')))

const puzzleDate = (c) => (c.slug && Archive.getPuzzles(c.slug)?.date) || c.at
const xLabels = computed(() =>
    last7.value.map(c => new Date(puzzleDate(c)).toLocaleDateString(dateLocale.value, {day: 'numeric', month: 'short'})))

</script>

<template>
    <div v-if="showChart" class="cc">
        <p class="cc__title">{{ chartTitle }}</p>

        <div ref="plotEl" class="cc__plot">
        <svg class="cc__svg" :viewBox="`0 0 ${VIEW_W} ${viewH}`" role="img" :aria-label="chartTitle" preserveAspectRatio="none">
            <!--  Frame lines (top + baseline)  -->
            <line :x1="PLOT.l" :y1="PLOT.t" :x2="PLOT.r" :y2="PLOT.t" class="cc__grid" />
            <line :x1="PLOT.l" :y1="PLOT.b" :x2="PLOT.r" :y2="PLOT.b" class="cc__grid" />

            <!--  Average — dotted reference line, labelled on the left axis  -->
            <template v-if="primaryAvg !== null">
                <line :x1="PLOT.l" :y1="yPrimary(primaryAvg)" :x2="PLOT.r" :y2="yPrimary(primaryAvg)" class="cc__avg-line" />
                <text :x="PLOT.l - 8" :y="yPrimary(primaryAvg) + 4" text-anchor="end" class="cc__axis cc__axis--time cc__axis--avg">{{ fmtPrimary(primaryAvg) }}</text>
            </template>

            <!--  Left axis: found-words % or time  -->
            <text :x="PLOT.l - 8" :y="PLOT.t + 6" text-anchor="end" class="cc__axis cc__axis--time">{{ primaryTop }}</text>
            <text :x="PLOT.l - 8" :y="PLOT.b" text-anchor="end" class="cc__axis cc__axis--time">{{ primaryBottom }}</text>

            <!--  Right axis: uses (checks / reveals / wrong)  -->
            <template v-if="hasCount">
                <text :x="PLOT.r + 8" :y="PLOT.t + 6" text-anchor="start" class="cc__axis" :class="countAxisClass">{{ maxCount }}</text>
                <text :x="PLOT.r + 8" :y="PLOT.b" text-anchor="start" class="cc__axis" :class="countAxisClass">0</text>
            </template>

            <polyline v-if="primaryPts" :points="primaryPts" class="cc__line cc__line--time" />
            <polyline v-if="showLine('checks') && checkPts" :points="checkPts" class="cc__line cc__line--checks" />
            <polyline v-if="showLine('reveals') && revealPts" :points="revealPts" class="cc__line cc__line--reveals" />
            <polyline v-if="showLine('hints') && hintPts" :points="hintPts" class="cc__line cc__line--hints" />
            <polyline v-if="showLine('mistakes') && mistakePts" :points="mistakePts" class="cc__line cc__line--mistakes" />
            <polyline v-if="showLine('guesses') && guessPts" :points="guessPts" class="cc__line cc__line--guesses" />

            <circle v-for="m in primaryMarks" :key="`p-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--time">
                <title>{{ primaryLabel }}: {{ fmtPrimary(m.v) }}</title>
            </circle>
            <template v-if="showLine('checks')">
                <circle v-for="m in checkMarks" :key="`c-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--checks">
                    <title>{{ t('archive.stats.checks') }}: {{ m.v }}</title>
                </circle>
            </template>
            <template v-if="showLine('reveals')">
                <circle v-for="m in revealMarks" :key="`r-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--reveals">
                    <title>{{ t('archive.stats.reveals') }}: {{ m.v }}</title>
                </circle>
            </template>
            <template v-if="showLine('hints')">
                <circle v-for="m in hintMarks" :key="`h-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--hints">
                    <title>{{ t('archive.stats.hints') }}: {{ m.v }}</title>
                </circle>
            </template>
            <template v-if="showLine('mistakes')">
                <circle v-for="m in mistakeMarks" :key="`m-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--mistakes">
                    <title>{{ t('archive.stats.mistakes') }}: {{ m.v }}</title>
                </circle>
            </template>
            <template v-if="showLine('guesses')">
                <circle v-for="m in guessMarks" :key="`g-${m.i}`" :cx="m.x" :cy="m.y" r="10" class="cc__dot cc__dot--guesses" :class="{'cc__dot--lost': m.lost}">
                    <title>{{ t('archive.stats.guesses') }}: {{ m.v }}{{ m.lost ? ` (${t('archive.stats.notSolved')})` : '' }}</title>
                </circle>
            </template>

            <text
                v-for="(label, i) in xLabels"
                :key="`x-${i}`"
                :x="xFor(i, xLabels.length)"
                :y="viewH + 5"
                text-anchor="middle"
                class="cc__x-label"
            >{{ label }}</text>
        </svg>
        </div>

        <ul class="cc__legend">
            <li v-if="hasPrimary" class="cc__legend-item cc__legend-item--time">
                <span class="cc__swatch"></span>{{ primaryLabel }}
            </li>
            <li v-if="primaryAvg !== null" class="cc__legend-item cc__legend-item--average">
                <span class="cc__swatch"></span>{{ t('archive.stats.average') }}
            </li>
            <li v-if="countLine('checks')" class="cc__legend-item cc__legend-item--checks">
                <span class="cc__swatch"></span>{{ t('archive.stats.checks') }}
            </li>
            <li v-if="countLine('reveals')" class="cc__legend-item cc__legend-item--reveals">
                <span class="cc__swatch"></span>{{ t('archive.stats.reveals') }}
            </li>
            <li v-if="countLine('hints')" class="cc__legend-item cc__legend-item--hints">
                <span class="cc__swatch"></span>{{ t('archive.stats.hints') }}
            </li>
            <li v-if="countLine('mistakes')" class="cc__legend-item cc__legend-item--mistakes">
                <span class="cc__swatch"></span>{{ t('archive.stats.mistakes') }}
            </li>
            <li v-if="countLine('guesses')" class="cc__legend-item cc__legend-item--guesses">
                <span class="cc__swatch"></span>{{ t('archive.stats.guesses') }}
            </li>
            <li v-if="hasLost" class="cc__legend-item cc__legend-item--lost">
                <span class="cc__swatch"></span>{{ t('archive.stats.notSolved') }}
            </li>
        </ul>
    </div>
</template>

<style scoped>
.cc {
    container-type: inline-size;
    --c-time: var(--puzzle-tile-text);
    --c-average: var(--text-colour);
    --c-checks: oklch(from var(--c-time) l calc(c + 0.08) calc(h + 120));
    --c-reveals: oklch(from var(--c-time) l calc(c + 0.08) calc(h - 120));
    --c-mistakes: oklch(from var(--c-time) l calc(c + 0.08) calc(h + 180));
    --c-guesses: oklch(from var(--c-time) l calc(c + 0.08) calc(h + 60));
    --c-hints: oklch(from var(--c-time) l calc(c + 0.08) calc(h - 60));

    display: flex;
    flex-direction: column;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    padding: 1.4rem 1.6rem 1.2rem;
}
.cc__title {
    margin: 0 0 .6rem;
    font-size: 1.15rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}
.cc__plot {
    position: relative;
    flex: 1 0 auto;
    aspect-ratio: 720 / 270;
}
.cc__svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    display: block;
    overflow: visible;
}
.cc__grid {
    stroke: var(--card-border);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}
.cc__avg-line {
    stroke: var(--c-average);
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
    opacity: .6;
    vector-effect: non-scaling-stroke;
}

.cc__axis {
    font-size: 2.2rem;
    font-variant-numeric: tabular-nums;
}
.cc__axis--time { fill: var(--c-time); }
.cc__axis--avg { 
    fill: var(--c-average);
}
.cc__axis--checks { fill: var(--c-checks); }
.cc__axis--reveals { fill: var(--c-reveals); }
.cc__axis--hints { fill: var(--c-hints); }
.cc__axis--mistakes { fill: var(--c-mistakes); }
.cc__axis--guesses { fill: var(--c-guesses); }
.cc__axis--mixed { fill: var(--text-colour-secondary, #777); }
.cc__line {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
}
.cc__line--time { stroke: var(--c-time); }
.cc__line--checks { stroke: var(--c-checks); }
.cc__line--reveals { stroke: var(--c-reveals); }
.cc__line--hints { stroke: var(--c-hints); }
.cc__line--mistakes { stroke: var(--c-mistakes); }
.cc__line--guesses { stroke: var(--c-guesses); }
.cc__dot {
    r: 10px;
    stroke: var(--card-background, #fff);
    stroke-width: 2;
}
.cc__dot--time { fill: var(--c-time); }
.cc__dot--checks { fill: var(--c-checks); }
.cc__dot--reveals { fill: var(--c-reveals); }
.cc__dot--hints { fill: var(--c-hints); }
.cc__dot--mistakes { fill: var(--c-mistakes); }
.cc__dot--guesses { fill: var(--c-guesses); }
.cc__dot--lost {
    fill: var(--card-background, #fff);
    stroke: var(--c-guesses);
    stroke-width: 3;
}
.cc__x-label {
    font-size: 2.2rem;
    fill: var(--text-colour-secondary, #777);
}

.cc__legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.4rem;
    padding: 0;
    margin: 1rem 0 0;
    list-style: none;
    font-size: 1.3rem;
    color: var(--text-colour-secondary, #777);
}
.cc__legend-item {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
}
.cc__swatch {
    inline-size: 1.6rem;
    block-size: .3rem;
    border-radius: 2px;
}
.cc__legend-item--time .cc__swatch { background: var(--c-time); }
.cc__legend-item--checks .cc__swatch { background: var(--c-checks); }
.cc__legend-item--reveals .cc__swatch { background: var(--c-reveals); }
.cc__legend-item--hints .cc__swatch { background: var(--c-hints); }
.cc__legend-item--mistakes .cc__swatch { background: var(--c-mistakes); }
.cc__legend-item--guesses .cc__swatch { background: var(--c-guesses); }
.cc__legend-item--lost .cc__swatch {
    inline-size: .9rem;
    block-size: .9rem;
    border: 2px solid var(--c-guesses);
    border-radius: 50%;
}
.cc__legend-item--average .cc__swatch {
    background: repeating-linear-gradient(to right, var(--c-average) 0 2px, transparent 2px 5px);
}

@container (width < 420px) {
    .cc__axis,
    .cc__x-label { font-size: 2.2rem; }
    .cc__dot { r: 10px; }
}
@container (width >= 560px) {
    .cc__axis,
    .cc__x-label { font-size: 1.4rem; }
    .cc__dot { r: 6px; }
}
</style>
