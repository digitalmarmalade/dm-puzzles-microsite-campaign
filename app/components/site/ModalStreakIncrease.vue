<script setup>
const {t} = useI18n()
const state = useStreakModalState()
const modals = useModalStore()
const animated = ref(false)

//  Preview: ?showStreak=day|week (or window.__showStreak(type, prev, next))
if (import.meta.client) {
    window.__showStreak = (type = 'day', prev = 2, next = 3) => showStreakModal(type, prev, next)
    window.__hideStreak = () => closeStreakModal()
    const previewType = new URLSearchParams(window.location.search).get('showStreak')
    if (previewType === 'day' || previewType === 'week') {
        onMounted(() => showStreakModal(previewType, 2, 3))
    }
}

const active = computed(() => {
    if (!state.value) return 0
    return animated.value ? state.value.next : state.value.prev
})

const dots = computed(() => {
    if (!state.value) return []
    const start = Math.max(1, state.value.next - 2)
    return [0, 1, 2, 3, 4].map(i => start + i)
})

const activeIndex = computed(() => dots.value.indexOf(active.value))

const trackStyle = computed(() => ({
    transform: `translateX(calc((2 - ${activeIndex.value}) * var(--streak-dot-step)))`,
}))

const title = computed(() => {
    if (!state.value) return ''
    return state.value.type === 'week'
        ? t('streakModal.weekTitle', {n: state.value.next})
        : t('streakModal.dayTitle', {n: state.value.next})
})

const body = computed(() => {
    if (!state.value) return ''
    return state.value.type === 'week'
        ? t('streakModal.weekBody')
        : t('streakModal.dayBody')
})

watch(state, (s) => {
    if (!s) return
    animated.value = false
    setTimeout(() => { animated.value = true }, 1400)
})

watch(() => modals.isOpen(STREAK_MODAL_ID), (open) => {
    if (!open && state.value) closeStreakModal()
})
</script>

<template>
    <Modal :id="STREAK_MODAL_ID" size="sm" :hide-title="true" classes-modal="sp-modal streak-dialog" :title="title">
        <div v-if="state" class="streak-modal" :class="`streak-modal--${state.type}`">
            <div class="streak-strip" :class="`streak-strip--${state.type}`" aria-hidden="true">
                <div class="streak-strip__track" :style="trackStyle">
                    <div
                        v-for="n in dots"
                        :key="n"
                        class="streak-dot"
                        :class="{
                            'streak-dot--achieved': n <= active,
                            'streak-dot--active': n === active,
                            'streak-dot--celebrate': animated && n === active,
                        }"
                    >{{ n }}</div>
                </div>
            </div>
            <h2 class="streak-modal__title">{{ title }}</h2>
            <p class="streak-modal__body">{{ body }}</p>
        </div>
        <template #footer>
            <ButtonGroup>
                <Button icon="right-arrow" @click.prevent="closeStreakModal">
                    <template #text>
                        <span>{{ $t('streakModal.continue') }}</span>
                    </template>
                </Button>
            </ButtonGroup>
        </template>
    </Modal>
</template>

<style scoped>
    .streak-modal {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.6rem;
        text-align: center;
    }
    .streak-modal__title {
        margin: 0;
        color: var(--streak-on);
        font-size: 2.4rem;
        line-height: 1.2;
        text-wrap: balance;
    }
    .streak-modal__body {
        margin: 0;
        color: var(--streak-on);
        font-size: 1.6rem;
        line-height: 1.5;
        text-wrap: balance;
        opacity: .8;
    }
</style>

