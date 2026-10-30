<script setup>
const props = defineProps({
    slug: {type: String, required: true},
    active: {type: Number, default: 0},
})
const emit = defineEmits(['pick'])

const {t, te} = useI18n()
const preferences = usePreferencesStore()
const {steps} = useTutorial(() => props.slug)

const doneSteps = computed(() => preferences.tutorialsDone[props.slug] ?? [])
const lessonLabel = (n) => {
    const key = `tutorial.brief.${props.slug}.${n}.title`
    return te(key) ? t(key) : t('cover.tutorialStep', {step: n})
}
</script>

<template>
    <ol class="tutorial-lessons" :class="{'tutorial-lessons--tabs': active}" :role="active ? 'tablist' : undefined">
        <li v-for="n in steps" :key="n" :role="active ? 'presentation' : undefined">
            <button
                type="button"
                class="tutorial-lessons__lesson"
                :class="{'tutorial-lessons__lesson--done': doneSteps.includes(n)}"
                :role="active ? 'tab' : undefined"
                :aria-selected="active ? n === active : undefined"
                @click="emit('pick', n)"
            >
                <span class="tutorial-lessons__mark" aria-hidden="true">
                    <svg v-if="doneSteps.includes(n)"><use :href="sprite('tick')" /></svg>
                    <template v-else>{{ n }}</template>
                </span>
                <span class="tutorial-lessons__label">{{ lessonLabel(n) }}</span>
                <span v-if="!active" class="tutorial-lessons__action">{{ doneSteps.includes(n) ? t('cover.replay') : t('cover.start') }}</span>
                <span v-if="doneSteps.includes(n)" class="sr-only">{{ t('cover.completed') }}</span>
            </button>
        </li>
    </ol>
</template>

<style scoped>
.tutorial-lessons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: .8rem;
    inline-size: 100%;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (width < 720px) {
        grid-template-columns: none;
        grid-auto-columns: minmax(0, 1fr);
        grid-auto-flow: column;
        gap: .6rem;
    }
}

.tutorial-lessons--tabs {
    grid-template-columns: none;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: .6rem;
}

.tutorial-lessons__lesson {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .6rem;
    inline-size: 100%;
    block-size: 100%;
    padding: 1.4rem 1rem;
    border: 1px solid var(--card-border);

    @media (width < 720px) {
        gap: .5rem;
        padding: 1rem .6rem;
    }

    border-radius: var(--border-radius, 10px);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: center;
    cursor: pointer;
    transition: border-color .15s ease, background .15s ease;

    &:focus-visible {
        outline: 2px solid var(--focus-colour, currentColor);
        outline-offset: 2px;
    }

    &[aria-selected="true"] {
        border-color: rgb(var(--puzzle-tile-shadow));
        background: rgba(var(--puzzle-tile-shadow), .12);
        cursor: default;
    }

    .tutorial-lessons--tabs & {
        flex-direction: row;
        justify-content: center;
        gap: .8rem;
        padding: .8rem 1rem;

        @media (width < 720px) {
            flex-direction: column;
            justify-content: flex-start;
            gap: .5rem;
            padding: .8rem .6rem;
        }
    }

    @media (hover: hover) {
        &:hover {
            border-color: rgb(var(--puzzle-tile-shadow));
            background: rgba(var(--puzzle-tile-shadow), .06);
        }
    }
}

.tutorial-lessons__mark {
    display: grid;
    place-items: center;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    border-radius: 50%;
    border: 2px solid rgb(var(--puzzle-tile-shadow));
    color: var(--puzzle-tile-text);
    font-size: 1.6rem;
    font-weight: 700;
    flex: 0 0 auto;

    @media (width < 720px) {
        inline-size: 2.8rem;
        block-size: 2.8rem;
        font-size: 1.3rem;
    }

    .tutorial-lessons--tabs & {
        inline-size: 2.8rem;
        block-size: 2.8rem;
        font-size: 1.3rem;
    }

    svg {
        inline-size: 1.8rem;
        block-size: 1.8rem;
        fill: currentColor;
    }

    .tutorial-lessons__lesson--done & {
        background: rgb(var(--puzzle-tile-shadow));
        color: #fff;
    }
}

.tutorial-lessons__label {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.25;
    text-wrap: balance;

    @media (width < 720px) {
        font-size: 1.2rem;
    }

    .tutorial-lessons--tabs & {
        font-size: 1.3rem;
        text-align: start;

        @media (width < 720px) {
            font-size: 1.2rem;
            text-align: center;
        }
    }
}

.tutorial-lessons__action {
    margin-block-start: auto;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: .08rem;
    color: var(--text-colour-secondary, #777);

    @media (width < 720px) {
        font-size: 1rem;
    }
}
</style>
