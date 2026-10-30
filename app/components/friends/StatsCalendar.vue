<script setup>
const {locale} = useI18n()

const props = defineProps({
    //  map of 'YYYY-MM-DD' -> { completions: [...], userRank: number|null }
    entries: {type: Object, default: () => ({})},
    //  currently selected date key 'YYYY-MM-DD'
    selected: {type: String, default: ''},
    //  latest selectable date key (today); anything after is disabled
    max: {type: String, default: ''},
    //  optional controlled view month, 'YYYY-MM' (two-way via update:month)
    month: {type: String, default: ''},
})

const emit = defineEmits(['select', 'update:month'])

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

//  month currently in view (initialised from the controlled month, else selected day)
const init = ((props.month ? `${props.month}-01` : props.selected) || props.max || keyOf(new Date())).split('-').map(Number)
const view = reactive({y: init[0], m: init[1] - 1})

const viewMonth = () => `${view.y}-${pad(view.m + 1)}`

//  keep the view in sync when the parent changes the controlled month
watch(() => props.month, (m) => {
    if (!m || m === viewMonth()) return
    const [y, mo] = m.split('-').map(Number)
    view.y = y
    view.m = mo - 1
})

//  Monday-first weekday initials, localised
const weekdays = computed(() => {
    const fmt = new Intl.DateTimeFormat(locale.value, {weekday: 'narrow'})
    //  2024-01-01 is a Monday
    return Array.from({length: 7}, (_, i) => fmt.format(new Date(2024, 0, 1 + i)))
})

const monthLabel = computed(() =>
    new Intl.DateTimeFormat(locale.value, {month: 'long', year: 'numeric'}).format(new Date(view.y, view.m, 1))
)

const cells = computed(() => {
    const first = new Date(view.y, view.m, 1)
    const startOffset = (first.getDay() + 6) % 7 //  0 = Monday
    const dowFmt = new Intl.DateTimeFormat(locale.value, {weekday: 'short'})
    return Array.from({length: 42}, (_, i) => {
        const d = new Date(view.y, view.m, 1 - startOffset + i)
        const key = keyOf(d)
        const entry = props.entries[key]
        return {
            key,
            day: d.getDate(),
            weekdayShort: dowFmt.format(d),
            otherMonth: d.getMonth() !== view.m,
            isToday: key === props.max,
            isSelected: key === props.selected,
            isFuture: key > props.max,
            userRank: entry?.userRank ?? null,
            count: entry?.completions?.length ?? 0,
            hasData: (entry?.completions?.length ?? 0) > 0,
            winner: entry?.completions?.[0]?.label ?? null,
        }
    })
})

//  actual days of the viewed month, for the mobile list
const monthDays = computed(() => cells.value.filter((c) => !c.otherMonth))

const atCurrentMonth = computed(() => {
    const [ty, tm] = props.max.split('-').map(Number)
    return view.y > ty || (view.y === ty && view.m >= tm - 1)
})

function prev() {
    if (view.m === 0) { view.m = 11; view.y-- } else { view.m-- }
    emit('update:month', viewMonth())
}
function next() {
    if (atCurrentMonth.value) return
    if (view.m === 11) { view.m = 0; view.y++ } else { view.m++ }
    emit('update:month', viewMonth())
}
function select(cell) {
    if (cell.isFuture) return
    //  clicking an adjacent-month day jumps the view to that month
    if (cell.otherMonth) {
        const [y, m] = cell.key.split('-').map(Number)
        view.y = y
        view.m = m - 1
        emit('update:month', viewMonth())
    }
    emit('select', cell.key)
}
</script>

<template>
    <div class="cal">
        <div class="cal-scroll">
            <header class="cal-head">
                <button type="button" class="cal-nav" @click="prev" aria-label="Previous month">
                    <svg><use :href="sprite('left-arrow')"/></svg>
                </button>
                <h3 class="cal-title">{{ monthLabel }}</h3>
                <button type="button" class="cal-nav" @click="next" :disabled="atCurrentMonth" aria-label="Next month">
                    <svg><use :href="sprite('right-arrow')"/></svg>
                </button>
            </header>

            <!-- desktop: month grid -->
            <div class="cal-grid cal-weekdays" aria-hidden="true">
                <span v-for="(w, i) in weekdays" :key="i" class="cal-weekday">{{ w }}</span>
            </div>

            <div class="cal-grid cal-days">
                <button
                    v-for="cell in cells"
                    :key="cell.key"
                    type="button"
                    class="cal-cell"
                    :class="{
                        'cal-cell--other': cell.otherMonth,
                        'cal-cell--today': cell.isToday,
                        'cal-cell--selected': cell.isSelected,
                        'cal-cell--future': cell.isFuture,
                        'cal-cell--data': cell.hasData,
                    }"
                    :disabled="cell.isFuture"
                    @click="select(cell)"
                >
                    <div class="call-cell__header">
                        <span class="cal-day">{{ cell.day }}</span>
                    </div>
                    <div class="call-cell__body">
                        <RankBadge :rank="cell.userRank" />
                    </div>
                </button>
            </div>

            <!-- mobile: vertical day list -->
            <ul class="cal-list list-style-none">
                <li v-for="cell in monthDays" :key="cell.key">
                    <button
                        type="button"
                        class="cal-row"
                        :class="{
                            'cal-row--today': cell.isToday,
                            'cal-row--selected': cell.isSelected,
                            'cal-row--future': cell.isFuture,
                        }"
                        :disabled="cell.isFuture"
                        @click="select(cell)"
                    >
                        <span class="cal-row__date">
                            <span class="cal-row__day">{{ cell.day }}</span>
                            <span class="cal-row__dow">{{ cell.weekdayShort }}</span>                            
                        </span>
                        <span class="cal-row__meta">
                            <RankBadge :rank="cell.userRank" />
                            <svg v-if="!cell.isFuture" class="cal-row__chev"><use :href="sprite('right-arrow')"/></svg>
                        </span>
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.cal {
    inline-size: 100%;
}

.cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 1.5rem;
}

.cal-title {
    flex: 1;
    font-size: var(--page-h3-size, 2rem);
    font-weight: 700;
    text-align: center;
}

.cal-nav {
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 50%;
    border: none;
    color: var(--text-colour);
    background-color: transparent;
    border: 1px solid var(--text-colour);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: opacity .2s ease, transform .15s ease;

    > svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
    }

    @media (hover: hover) {
        &:hover:not(:disabled) {
            transform: translateY(-.1rem);
            background-color: var(--puzzle-tile-background);
        }
    }

    &:disabled {
        opacity: .3;
        cursor: not-allowed;
    }
}

.cal-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: .8rem;
}

.cal-weekdays {
    margin: 0 0 .8rem;
}

.cal-weekday {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-colour, #888);
    padding: .4rem 0;
}

.cal-cell {
    position: relative;
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: var(--border-radius-inner, .6rem);
    background: var(--puzzle-tile-background, #fdf3ec);
    color: var(--button-calendar-foreground, #212121);
    font-size: 1.7rem;
    font-weight: 900;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: all .15s ease;
    padding: .5rem .5rem 1.2rem;

    @media (hover: hover) {
        &:hover:not(:disabled) {
            border-color: var(--puzzle-tile-text);
        }
    }
}

.call-cell__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    line-height: 1;
}

.call-cell__body {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.cal-cell--future,
.cal-cell--other {
    background: var(--button-calendar-inactive, #f5f5f5);
    color: var(--text-colour-secondary, #b0b0b0);
    cursor: default;
    
}

.cal-cell--other {
    background-color: transparent;
    border-color: rgba(var(--puzzle-tile-shadow),0.5);
    
    &.cal-cell--future {
        border-color: var(--card-border);
    }
}

.cal-cell--other:not(:disabled) {
    cursor: pointer;
}

.cal-cell--today {
    border-color: var(--puzzle-tile-text, --primary);
    border-width: 2px;
}

.cal-cell--selected {
    background: var(--puzzle-tile-text, #212121);
    color: var(--card-background, #fff);
}

.cal-list {
    display: none;
    margin: 0;
    padding: 0;
}

.cal-row {
    inline-size: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.4rem 1.6rem;
    margin: 0 0 .6rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius-inner, .6rem);
    background: var(--puzzle-tile-background, #fdf3ec);
    color: var(--button-calendar-foreground, #212121);
    font-size: 1.6rem;
    cursor: pointer;
    transition: border-color .15s ease;

    @media (hover: hover) {
        &:hover:not(:disabled) {
            border-color: var(--primary);
        }
    }
}

.cal-row--future {
    background: var(--app-bg-muted, #f1f1f1);
    color: var(--text-colour-secondary, #b0b0b0);
    cursor: default;
}

.cal-row--today {
    border-color: var(--puzzle-tile-text);
    border-width: 2px;
}

.cal-row__date {
    display: flex;
    align-items: baseline;
    gap: .8rem;
}

.cal-row__dow {
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: .7;
}

.cal-row__day {
    font-size: 1.8rem;
    font-weight: 700;
    min-inline-size: 2.4rem;
}

.cal-row__meta {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.cal-row__chev {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    opacity: .5;
}

@media (width < 900px) {
    /* swap grid for the vertical list */
    .cal-grid {
        display: none;
    }
    .cal-list {
        display: block;
    }

    /* scroll the day list inside the card, with sticky month controls */
    .cal-scroll {
        max-block-size: 60vh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }
    .cal-head {
        position: sticky;
        inset-block-start: 0;
        z-index: 3;
        background: var(--card-background, #fff);
        margin: 0;
        padding-block: 1rem 1.5rem;
    }
}
</style>
