<script setup>
const props = defineProps({
    slug: {type: String, required: true},
    name: {type: String, default: ''},
    icon: {type: String, default: ''},
    surface: {type: String, default: ''},
})

const {t} = useI18n()
const {steps} = useTutorial(() => props.slug)
const active = ref(1)
const plays = ref(0)

function pick(n) {
    if (n === active.value) return
    active.value = n
}

function replay() {
    plays.value++
}

watch(() => props.slug, () => {
    active.value = 1
})
</script>

<template>
    <div class="tutorial-practice">
        <TutorialLessons :slug="slug" :active="active" @pick="pick" />
        <TutorialPlayer
            :key="`${active}-${plays}`"
            :slug="slug"
            :name="name"
            :start="active"
            :icon="icon || slug"
            single
            :surface="surface"
            class="tutorial-practice__player"
        >
            <template #done>
                <Button v-if="active < steps" size="sm" icon="right-arrow" @click.prevent="active++">
                    <template #text>{{ t('tutorial.next') }}</template>
                </Button>
                <Button v-else size="sm" @click.prevent="replay">
                    <template #text>{{ t('cover.replay') }}</template>
                </Button>
            </template>
        </TutorialPlayer>
    </div>
</template>

<style scoped>
.tutorial-practice {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    inline-size: 100%;
}

.tutorial-practice__player {
    flex: 1 1 auto;
    min-block-size: 0;
}
</style>
