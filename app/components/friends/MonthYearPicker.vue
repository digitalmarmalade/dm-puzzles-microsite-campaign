<script setup>
const {locale} = useI18n()

const {modelValue, min, max, placeholder, active} = defineProps({
    //  selected month 'YYYY-MM' (or '' for none)
    modelValue: {type: String, default: ''},
    //  earliest selectable month 'YYYY-MM'; earlier months are disabled
    min: {type: String, default: ''},
    //  latest selectable month 'YYYY-MM'; later months are disabled
    max: {type: String, default: ''},
    //  trigger label when nothing is selected / used as the button text
    placeholder: {type: String, default: 'Date'},
    //  render the trigger in its active (dark) state
    active: {type: Boolean, default: false},
})

const emit = defineEmits(['update:modelValue'])

const pad = (n) => String(n).padStart(2, '0')

const open = ref(false)
const root = ref(null)

//  on narrow screens the trigger can sit anywhere in the filter row, so anchor
//  the panel to the viewport (fixed + clamped) instead of the trigger to keep
//  it fully on-screen. null = use the default desktop (absolute) positioning.
const panelStyle = ref(null)

function positionPanel() {
    panelStyle.value = null
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 599px)').matches) return
    const trigger = root.value?.querySelector('.myp-trigger')
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const margin = 12
    const width = Math.min(340, window.innerWidth - margin * 2)
    //  prefer aligning the panel's right edge to the trigger, then clamp
    let left = r.right - width
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width))
    panelStyle.value = {
        position: 'fixed',
        insetBlockStart: `${Math.round(r.bottom + 8)}px`,
        insetInlineStart: `${Math.round(left)}px`,
        insetInlineEnd: 'auto',
        inlineSize: `${Math.round(width)}px`,
        maxInlineSize: 'none',
    }
}

function reposition() { if (open.value) positionPanel() }

//  year shown in the panel
const initYear = (modelValue || max || '').split('-').map(Number)[0]
const panelYear = ref(initYear || new Date().getFullYear())

const monthNames = computed(() => {
    const fmt = new Intl.DateTimeFormat(locale.value, {month: 'long'})
    return Array.from({length: 12}, (_, i) => fmt.format(new Date(2020, i, 1)))
})

//  "June 2026" for the selected month, for the trigger label
const selectedLabel = computed(() => {
    if (!modelValue) return ''
    const [y, m] = modelValue.split('-').map(Number)
    return new Intl.DateTimeFormat(locale.value, {month: 'long', year: 'numeric'}).format(new Date(y, m - 1, 1))
})

const maxParts = computed(() => (max ? max.split('-').map(Number) : null)) //  [y, m] (m = 1-12)
const minParts = computed(() => (min ? min.split('-').map(Number) : null))
const nextYearDisabled = computed(() => !!maxParts.value && panelYear.value >= maxParts.value[0])
const prevYearDisabled = computed(() => !!minParts.value && panelYear.value <= minParts.value[0])

function isDisabled(monthIdx) {
    const m = monthIdx + 1
    if (maxParts.value) {
        const [my, mm] = maxParts.value
        if (panelYear.value > my || (panelYear.value === my && m > mm)) return true
    }
    if (minParts.value) {
        const [ny, nm] = minParts.value
        if (panelYear.value < ny || (panelYear.value === ny && m < nm)) return true
    }
    return false
}

function isSelected(monthIdx) {
    return modelValue === `${panelYear.value}-${pad(monthIdx + 1)}`
}

function pick(monthIdx) {
    if (isDisabled(monthIdx)) return
    emit('update:modelValue', `${panelYear.value}-${pad(monthIdx + 1)}`)
    open.value = false
}

function toggle() {
    //  jump the panel to the selected year each time it opens
    if (!open.value && modelValue) panelYear.value = Number(modelValue.split('-')[0])
    open.value = !open.value
    if (open.value) positionPanel()
}

function onDocClick(e) {
    if (root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => {
    document.addEventListener('click', onDocClick)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick)
    window.removeEventListener('resize', reposition)
    window.removeEventListener('scroll', reposition, true)
})
</script>

<template>
    <div class="myp" ref="root">
        <button
            type="button"
            class="myp-trigger"
            :class="{'myp-trigger--active': active || open}"
            @click="toggle"
        >
            <span>{{ active && selectedLabel ? selectedLabel : placeholder }}</span>
            <svg class="myp-chev" :class="{'myp-chev--open': open}" aria-hidden="true">
                <use :href="sprite('down-arrow')"/>
            </svg>
        </button>

        <div v-if="open" class="myp-panel" :style="panelStyle">
            <header class="myp-panel__head">
                <button type="button" class="myp-yearnav" :disabled="prevYearDisabled" @click="panelYear--" aria-label="Previous year">
                    <svg><use :href="sprite('left-arrow')"/></svg>
                </button>
                <span class="myp-year">{{ panelYear }}</span>
                <button type="button" class="myp-yearnav" :disabled="nextYearDisabled" @click="panelYear++" aria-label="Next year">
                    <svg><use :href="sprite('right-arrow')"/></svg>
                </button>
            </header>

            <div class="myp-grid">
                <button
                    v-for="(name, i) in monthNames"
                    :key="i"
                    type="button"
                    class="myp-month"
                    :class="{'myp-month--selected': isSelected(i)}"
                    :disabled="isDisabled(i)"
                    @click="pick(i)"
                >
                    {{ name }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.myp {
    position: relative;
    display: inline-block;
}

.myp-trigger {
    display: inline-flex;
    align-items: center;
    gap: .8rem;
    padding: .8rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: var(--card-background, #fff);
    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s ease;
}

.myp-trigger--active {
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    border-color: var(--text-colour, #212121);
}

.myp-chev {
    inline-size: 1.1rem;
    block-size: 1.1rem;
    transition: transform .2s ease;
}

.myp-chev--open {
    transform: rotate(180deg);
}

.myp-panel {
    position: absolute;
    inset-block-start: calc(100% + .8rem);
    inset-inline-start: 0;
    z-index: 20;
    inline-size: 34rem;
    max-inline-size: 90vw;
    padding: 2rem;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    box-shadow: var(--card-shadow, 0 10px 30px rgba(0, 0, 0, .15));
}

.myp-panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 1.5rem;
}

.myp-year {
    font-size: 1.8rem;
    font-weight: 700;
}

.myp-yearnav {
    inline-size: 3.4rem;
    block-size: 3.4rem;
    border-radius: 50%;
    border: 1px solid var(--card-border);
    background: var(--card-background, #fff);
    display: grid;
    place-items: center;
    cursor: pointer;

    > svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
    }

    &:disabled {
        opacity: .3;
        cursor: not-allowed;
    }
}

.myp-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: .8rem;
}

.myp-month {
    padding: 1rem .5rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius-inner, .6rem);
    background: var(--card-background, #fff);
    color: var(--text-colour, #212121);
    font-size: 1.4rem;
    cursor: pointer;
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover:not(:disabled) {
            border-color: var(--primary);
        }
    }

    &:disabled {
        opacity: .4;
        cursor: not-allowed;
    }
}

.myp-month--selected {
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    border-color: var(--text-colour, #212121);
}
</style>
