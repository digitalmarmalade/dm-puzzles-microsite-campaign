<script setup>
import {CONSONANTS, VOWELS, letterPicks} from '@/lib/assists'
import {themeClass} from '@/lib/utils'

const props = defineProps({
    puzzle: {type: Object, required: true},
    icon: {type: String, default: ''},
    theme: {type: String, default: ''},
    level: {type: Number, required: true},
    remembered: {type: Array, default: () => []},
})
const emit = defineEmits(['start', 'skip'])

const {t} = useI18n()
const picks = computed(() => letterPicks(props.level))

const initial = () => {
    const consonants = props.remembered.filter(l => CONSONANTS.includes(l)).slice(0, picks.value.consonants)
    const vowels = props.remembered.filter(l => VOWELS.includes(l)).slice(0, picks.value.vowels)
    return [...consonants, ...vowels]
}
const chosen = ref(initial())

const chosenConsonants = computed(() => chosen.value.filter(l => CONSONANTS.includes(l)))
const chosenVowels = computed(() => chosen.value.filter(l => VOWELS.includes(l)))

function toggle(letter) {
    if (chosen.value.includes(letter)) {
        chosen.value = chosen.value.filter(l => l !== letter)
        return
    }
    const vowel = VOWELS.includes(letter)
    const max = vowel ? picks.value.vowels : picks.value.consonants
    const group = vowel ? chosenVowels.value : chosenConsonants.value
    if (!max) return
    const drop = group.length >= max ? group[0] : null
    chosen.value = [...chosen.value.filter(l => l !== drop), letter]
}

const full = (vowel) => (vowel ? chosenVowels.value.length >= picks.value.vowels : chosenConsonants.value.length >= picks.value.consonants)
</script>

<template>
    <div class="letter-picker" :class="themeClass(theme)">
        <section class="letter-picker__card" aria-labelledby="letter-picker-title">
            <PuzzleIcon :icon="icon" :show-home-icon="true" />
            <h1 id="letter-picker-title" class="letter-picker__title">{{ t('letters.title') }}</h1>

            <div class="letter-picker__group">
                <p class="letter-picker__label">
                    {{ t('letters.consonants') }}
                    <span class="letter-picker__count" :class="{'letter-picker__count--met': full(false)}">
                        <svg v-if="full(false)" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                        {{ t('letters.count', {n: chosenConsonants.length, max: picks.consonants}) }}
                    </span>
                </p>
                <div class="letter-picker__tiles">
                    <button
                        v-for="letter in CONSONANTS"
                        :key="letter"
                        type="button"
                        class="letter-picker__tile"
                        :class="{'letter-picker__tile--on': chosen.includes(letter)}"
                        :aria-pressed="chosen.includes(letter)"
                        @click="toggle(letter)"
                    >{{ letter }}</button>
                </div>
            </div>

            <div v-if="picks.vowels" class="letter-picker__group">
                <p class="letter-picker__label">
                    {{ t('letters.vowels') }}
                    <span class="letter-picker__count" :class="{'letter-picker__count--met': full(true)}">
                        <svg v-if="full(true)" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                        {{ t('letters.count', {n: chosenVowels.length, max: picks.vowels}) }}
                    </span>
                </p>
                <div class="letter-picker__tiles">
                    <button
                        v-for="letter in VOWELS"
                        :key="letter"
                        type="button"
                        class="letter-picker__tile"
                        :class="{'letter-picker__tile--on': chosen.includes(letter)}"
                        :aria-pressed="chosen.includes(letter)"
                        @click="toggle(letter)"
                    >{{ letter }}</button>
                </div>
            </div>

            <div class="letter-picker__actions">
                <Button icon="right-arrow" @click.prevent="emit('start', chosen)">
                    <template #text><span>{{ t('letters.play') }}</span></template>
                </Button>
                <TextButton colour="primary" @click.prevent="emit('skip')">
                    <template #text><span>{{ t('letters.skip') }}</span></template>
                </TextButton>
            </div>
        </section>
    </div>
</template>

<style scoped>
.letter-picker {
    --card-icon-size: 6rem;
    flex-grow: 1;
    display: grid;
    place-items: safe center;
    min-block-size: 100dvh;
    padding: 10rem 1.6rem;
    background: var(--app-bg);
}

.letter-picker__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    inline-size: 100%;
    max-inline-size: 48rem;
    padding: 3.2rem 2.4rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    background: var(--card-background, #fff);
    box-shadow: var(--card-shadow);
    text-align: center;
}

.letter-picker__title {
    margin: 0;
    font-size: var(--page-h2-size, 2.8rem);
}

.letter-picker__group {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    inline-size: 100%;
    padding: 1.4rem;
    border-radius: var(--border-radius, 10px);
    background: rgba(var(--puzzle-tile-shadow), .08);
}

.letter-picker__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: .08rem;
    text-transform: uppercase;
}

.letter-picker__count {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .3rem .8rem;
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    transition: background .15s ease, color .15s ease;

    svg {
        inline-size: 1.1rem;
        block-size: 1.1rem;
        fill: currentColor;
    }

    &.letter-picker__count--met {
        background: var(--primary);
        color: var(--text-on-primary, #fff);
    }
}

.letter-picker__tiles {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .6rem;
}

.letter-picker__tile {
    display: grid;
    place-items: center;
    inline-size: 3.8rem;
    block-size: 3.8rem;
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: .8rem;
    background: var(--card-background, #fff);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.6rem;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, transform .15s ease;

    &.letter-picker__tile--on {
        border-color: rgb(var(--puzzle-tile-shadow));
        background: rgb(var(--puzzle-tile-shadow));
        color: #fff;
        transform: scale(1.06);
    }

    &:focus-visible {
        outline: 2px solid rgb(var(--puzzle-tile-shadow));
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:not(.letter-picker__tile--on):hover {
            border-color: rgb(var(--puzzle-tile-shadow));
        }
    }

    @media (width < 720px) {
        inline-size: 3.4rem;
        block-size: 3.4rem;
        font-size: 1.4rem;
    }
}

.letter-picker__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
}
</style>
