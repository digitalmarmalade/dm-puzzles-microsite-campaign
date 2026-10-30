<script setup>
import Archive from '@/api/Archive.js'
import {assistRule} from '@/lib/assists'
import {buildInsights} from '@/lib/insights'

const {t} = useI18n()
const dateLocale = useDateLocale()
const challenges = useChallengesStore()
const preferences = usePreferencesStore()
const assists = useAssistsStore()
const {families, model, resolveBranch} = useTasteModel()

const puzzleForTag = (tag) => Object.values(Archive.getPuzzles() ?? {}).find(p => p.tag === tag) ?? null

const tourPicks = computed(() => [
    ...preferences.onboardingSelectedCategories.map(c => t(`home.categories.${c}`)),
    ...preferences.onboardingSelectedTags,
])

const groups = computed(() => buildInsights({
    families,
    completions: challenges.completions ?? [],
    resolveBranch,
    model: model.value,
    assistsByTag: assists.byTag,
    assistRule,
    puzzleForTag,
    boostedCategories: preferences.boostedCategories,
    tourPicks: tourPicks.value,
    dismissed: preferences.dismissedInsights,
}))

const list = (items) => new Intl.ListFormat(dateLocale.value, {type: 'conjunction'}).format(items)

function textFor(item) {
    if (item.key === 'likes') return t('insights.likes', {name: item.params.name, count: item.params.count}, item.params.count)
    if (item.key === 'time') return t(`insights.time.${item.slot}`, item.params)
    if (item.key === 'tour') return t('insights.tour', {picks: list(item.picks)})
    return t(`insights.${item.key}`, item.params)
}

function remove(item) {
    const [kind, value] = item.id.split(':')
    if (kind === 'assists') return assists.clear(value)
    if (kind === 'boosted') {
        preferences.set('boostedCategories', preferences.boostedCategories.filter(c => c !== value))
        preferences.set('declinedCategories', [...new Set([...preferences.declinedCategories, value])])
        return
    }
    if (kind === 'tour') {
        preferences.set('onboardingSelectedCategories', [])
        preferences.set('onboardingSelectedTags', [])
        return
    }
    preferences.set('dismissedInsights', [...new Set([...preferences.dismissedInsights, item.id])])
}

const removedCount = computed(() => preferences.dismissedInsights.length)

const preview = usePreview()
const hasAnswers = computed(() => preferences.boostedCategories.length > 0 ||
    preferences.declinedCategories.length > 0 || preferences.answeredLevels.length > 0)
const canRemoveAll = computed(() => preview.is('reset') || groups.value.length > 0 || hasAnswers.value)

function removeAll() {
    if (preview.is('reset')) return preview.hide('reset')
    const ids = groups.value.flatMap(g => g.items.map(i => i.id))
        .filter(id => /^(likes|time|lean):/.test(id))
    preferences.set('dismissedInsights', [...new Set([...preferences.dismissedInsights, ...ids])])
    for (const tag of Object.keys(assists.byTag)) assists.clear(tag)
    preferences.set('boostedCategories', [])
    preferences.set('declinedCategories', [])
    preferences.set('answeredLevels', [])
    preferences.set('nudgeOffered', '')
    preferences.set('onboardingSelectedCategories', [])
    preferences.set('onboardingSelectedTags', [])
}
</script>

<template>
    <div class="card card--main learned">
        <h2 class="learned__title">{{ t('insights.title') }}</h2>
        <p class="learned__intro">{{ t('insights.intro') }}</p>

        <div v-for="group in groups" :key="group.group" class="learned__group">
            <h3 class="learned__heading">{{ t(`insights.groups.${group.group}`) }}</h3>
            <ul class="learned__list">
                <li v-for="item in group.items" :key="item.id" class="learned__item">
                    <span class="learned__text">{{ textFor(item) }}</span>
                    <button
                        type="button"
                        class="learned__remove"
                        :aria-label="t('insights.removeLabel', {text: textFor(item)})"
                        @click="remove(item)"
                    >{{ t('insights.remove') }}</button>
                </li>
            </ul>
        </div>

        <p v-if="!groups.length" class="learned__empty">{{ t(removedCount ? 'insights.allRemoved' : 'insights.empty') }}</p>

        <div v-if="canRemoveAll || removedCount" class="learned__actions">
            <Button v-if="canRemoveAll" variant="tertiary" size="sm" @click.prevent="removeAll">
                <template #text>
                    <span>{{ t('insights.removeAll') }}</span>
                </template>
            </Button>
            <Button v-if="removedCount" variant="tertiary" size="sm" @click.prevent="preferences.set('dismissedInsights', [])">
                <template #text>
                    <span>{{ t('insights.restore', removedCount) }}</span>
                </template>
            </Button>
        </div>
    </div>
</template>

<style scoped>
.learned__title {
    font-size: var(--page-h3-size);
    margin: 0;
}

.learned__intro {
    margin: 1.2rem 0 1.6rem;
    font-size: 1.5rem;
    line-height: 1.5;
    color: var(--text-colour-secondary, #777);
}

.learned__group {
    align-self: stretch;
    padding-block: 1.6rem;
    border-block-start: 1px solid var(--card-border);
}

.learned__heading {
    margin: 0 0 1rem;
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08rem;
    color: var(--text-colour-secondary, #777);
}

.learned__list {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.learned__item {
    display: flex;
    align-items: center;
    gap: 1.2rem;
}

.learned__text {
    flex: 1;
    font-size: 1.5rem;
    line-height: 1.4;
}

.learned__remove {
    flex-shrink: 0;
    padding: .5rem 1.2rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: transparent;
    color: var(--text-colour-secondary, #777);
    font-size: 1.3rem;
    cursor: pointer;
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour, #212121);
            color: var(--text-colour, #212121);
        }
    }
}

.learned__empty {
    align-self: stretch;
    margin: 0;
    padding-block: 1.6rem;
    border-block-start: 1px solid var(--card-border);
    font-size: 1.5rem;
    color: var(--text-colour-secondary, #777);
}

.learned__actions {
    align-self: stretch;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    padding-block-start: 1.6rem;
    border-block-start: 1px solid var(--card-border);
}
</style>
