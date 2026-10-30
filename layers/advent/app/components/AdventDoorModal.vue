<script setup>
import {toEnhancedPuzzle} from '@/composables/puzzle'
import {variantLook} from '@/lib/variantLook'
import {ADVENT_DOOR_MODAL, DOOR_COUNT, LAST_CATCH_UP, YEAR} from '../lib/advent'

const {t} = useI18n()
const dateLocale = useDateLocale()
const modals = useModalStore()
const {selected: door, canPlay, today, puzzlesFor} = useAdvent()
const {branchFor} = useTasteModel()

const formatDate = (day) => new Intl.DateTimeFormat(dateLocale.value, {weekday: 'long', day: 'numeric', month: 'long'})
    .format(new Date(YEAR, 11, day))
const finished = computed(() => ['done', 'late'].includes(door.value?.state))

const hint = computed(() => {
    const state = door.value?.state
    if (state === 'done') return t('advent.door.doneHint')
    if (state === 'late') return t('advent.door.lateHint')
    if (state === 'missed') {
        const date = new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long'}).format(new Date(YEAR, 11, LAST_CATCH_UP))
        return t('advent.door.missedHint', {date})
    }
    return t('advent.door.todayHint')
})

const tomorrow = computed(() => (finished.value && today.value < DOOR_COUNT ? today.value + 1 : null))

const puzzles = computed(() => {
    if (!door.value || finished.value || !canPlay.value) return []
    return puzzlesFor(door.value).map(({puzzle, today: isToday}) => ({
        puzzle: toEnhancedPuzzle({puzzle: {...puzzle}}),
        look: variantLook(puzzle.variant),
        favourite: branchFor(puzzle).branch?.slug ?? '',
        reason: t(isToday ? 'advent.door.reasonToday' : 'advent.door.reasonArchive'),
    }))
})

function onPick(e, slug) {
    if (e.target.closest('.fav-heart')) return
    trackFunnel('sp_advent_play', {day: door.value.day, kind: door.value.kind, slug})
    modals.close(ADVENT_DOOR_MODAL)
}
</script>

<template>
    <Teleport to="body">
        <Modal :id="ADVENT_DOOR_MODAL" size="smmd" classes-modal="sp-modal advent-modal" classes-footer="">
            <template #title>
                <AdventSnow :density="2" />
                <span v-if="door" class="advent-modal-title">
                    <span class="advent-modal-title__kicker">{{ formatDate(door.day) }}</span>
                </span>
            </template>
            <div v-if="door" class="advent-door-modal" :class="`advent-door-modal--${door.state}`">
                <div class="advent-door-modal__task">
                    <div class="advent-door-modal__badge">
                        <AdventDoor :door="door" still />
                    </div>
                    <div class="advent-door-modal__copy">
                        <p class="advent-door-modal__title">{{ t(`advent.task.${door.kind}.title`) }}</p>
                        <p class="advent-door-modal__hint">{{ hint }}</p>
                        <p v-if="tomorrow" class="advent-door-modal__hint">{{ t('advent.door.tomorrow', {day: tomorrow}) }}</p>
                    </div>
                </div>

                <div v-if="!canPlay && !finished" class="advent-door-modal__join">
                    <p>{{ t('advent.status.signIn') }}</p>
                    <Button url="/account/register" @click="modals.close(ADVENT_DOOR_MODAL)">
                        <template #text><span>{{ t('advent.status.signUp') }}</span></template>
                    </Button>
                </div>

                <template v-else-if="!finished">
                    <h3 class="advent-door-modal__heading">{{ t('advent.door.eligible') }}</h3>
                    <div v-if="puzzles.length" class="advent-door-modal__grid">
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
                    <div v-else class="advent-door-modal__empty">
                        <p>{{ t('advent.door.noPuzzle') }}</p>
                        <Button url="/" @click="modals.close(ADVENT_DOOR_MODAL)">
                            <template #text><span>{{ t('advent.door.goHome') }}</span></template>
                        </Button>
                    </div>
                </template>
            </div>
        </Modal>
    </Teleport>
</template>

<style scoped>
.advent-modal-title {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.advent-modal-title__kicker {
    color: var(--advent-gold-light);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
}

.advent-door-modal {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.advent-door-modal__task {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 1.6rem;
    border: .2rem dotted rgba(255, 255, 255, .55);
    border-radius: var(--border-radius, 1rem);

    @media (max-width: 480px) {
        flex-direction: column;
        text-align: center;
    }
}

.advent-door-modal__badge {
    flex: none;
    inline-size: 9rem;
}

.advent-door-modal__copy {
    display: flex;
    flex-direction: column;
    gap: .6rem;
}

.advent-door-modal__title {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.25;
}

.advent-door-modal__hint {
    margin: 0;
    color: rgba(255, 255, 255, .8);
}

.advent-door-modal__heading {
    margin: 0;
    color: #fff;
    font-size: 1.6rem;
}

.advent-door-modal__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    padding: 1.6rem;
    border-radius: var(--border-radius, 1rem);
    background: rgba(255, 255, 255, .14);
    color: var(--text-colour);

    @media (width >= 720px) {
        grid-template-columns: repeat(3, 1fr);
    }

    & :deep(.puzzle-card--slim > .puzzle-card__play) {
        gap: 1.6rem;
    }
}

.advent-door-modal__join,
.advent-door-modal__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    text-align: center;

    p {
        margin: 0;
    }
}
</style>
