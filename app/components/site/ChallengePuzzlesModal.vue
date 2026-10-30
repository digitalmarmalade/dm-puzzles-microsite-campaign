<script setup>
import {toEnhancedPuzzle} from '@/composables/puzzle'
import {variantLook} from '@/lib/variantLook'

const props = defineProps({
    card: {type: Object, default: null},
    board: {type: Object, required: true},
    modalId: {type: String, required: true},
})

const {t} = useI18n()
const modals = useModalStore()
const {branchFor} = useTasteModel()

const title = computed(() => props.card ? t(props.card.copy.title, props.card.copy.params) : '')

const puzzles = computed(() => {
    if (!props.card) return []
    return props.board.puzzlesFor(props.card.entry).map(({puzzle, today}) => ({
        puzzle: toEnhancedPuzzle({puzzle: {...puzzle}}),
        look: variantLook(puzzle.variant),
        favourite: branchFor(puzzle).branch?.slug ?? '',
        reason: t(today ? 'challenges.today' : 'challenges.fromArchive'),
    }))
})

function onPick(e, slug) {
    if (e.target.closest('.fav-heart')) return
    trackFunnel('sp_challenge_play', {id: props.card.entry.id, key: props.card.entry.key, slug})
    modals.close(props.modalId)
}
</script>

<template>
    <Modal :id="modalId" size="smmd" :title="t('challenges.aria')" classes-footer="">
        <template #title>{{ title }}</template>
        <div v-if="card" class="challenge-puzzles">
            <p class="challenge-puzzles__intro">{{ t(card.copy.goal, card.copy.params) }} {{ t('challenges.pickIntro') }}</p>
            <div class="challenge-puzzles__grid">
                <PuzzleCard
                    v-for="item in puzzles"
                    :key="item.puzzle.slug"
                    :puzzle="item.puzzle"
                    slim
                    :favourite-slug-override="item.favourite"
                    :reason="item.reason"
                    :icon-override="item.look.icon ?? ''"
                    :theme-override="item.look.theme ?? ''"
                    @click.capture="onPick($event, item.puzzle.slug)"
                />
            </div>
        </div>
    </Modal>
</template>

<style scoped>
.challenge-puzzles {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.challenge-puzzles__intro {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.5rem;
    line-height: 1.4;
}

.challenge-puzzles__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    padding: 1.6rem;
    border-radius: var(--border-radius, 10px);
    background: var(--app-bg);

    @media (width >= 720px) {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
    }

    & :deep(.puzzle-card) {
        @media (width >= 720px) {
            flex: 0 0 15rem;
        }
    }

    & :deep(.puzzle-card--slim > .puzzle-card__play) {
        gap: 1.6rem;
    }
}
</style>
