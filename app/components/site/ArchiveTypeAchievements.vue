<script setup>
import {evaluateTypeAchievements} from '@/lib/typeAchievements'

const props = defineProps({
    variant: {type: String, default: ''},
    name: {type: String, default: ''},
    slug: {type: String, default: ''},
    theme: {type: String, default: ''},
})

const {t} = useI18n()
const challenges = useChallengesStore()
const playStatus = usePlayStatusStore()
const preferences = usePreferencesStore()
const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const evaluated = computed(() =>
    evaluateTypeAchievements(props.variant, {completions: challenges.completions ?? [], playStatusMap: playStatus.map, lifetime: challenges.lifetimeTotals, tutorialsDone: preferences.tutorialsDone})
        .map(a => ({
            ...a,
            progressText: a.metric === 'bestWordsPct'
                ? `${Math.min(Math.round(a.current), a.target)}% / ${a.target}%`
                : `${Math.min(a.current, a.target)} / ${a.target}`,
            title: t(`archive.typeAchievements.${a.titleKey}`, {name: props.name}),
            desc: t(`archive.typeAchievements.${a.descKey}`, {target: a.target, name: props.name}),
        })))

const earned = computed(() =>
    evaluated.value.filter(a => a.complete).sort((x, y) => x.target - y.target))
//  The closest unearned goal — the single "next up" card we reveal ahead of time.
const nextUp = computed(() => {
    const locked = evaluated.value.filter(a => !a.complete)
    if (!locked.length) return null
    return [...locked].sort((x, y) => y.ratio - x.ratio || x.target - y.target)[0]
})
const visible = computed(() => [...earned.value, nextUp.value].filter(Boolean))
//  Locked achievements beyond "next up" stay hidden; we only hint that they exist.
const hiddenCount = computed(() =>
    evaluated.value.filter(a => !a.complete).length - (nextUp.value ? 1 : 0))
</script>

<template>
    <section v-if="!loggedOut && visible.length" class="achievement" :class="theme" :aria-label="t('archive.typeAchievements.heading')">
        <h3 class="achievement__heading">{{ t('archive.typeAchievements.heading') }}</h3>

        <ul class="achievement__shelf">
            <li
                v-for="a in visible"
                :key="a.id"
                class="achievement__item"
                :class="[`achievement__item--tier-${a.tier}`, {'achievement__item--got': a.complete}]"
            >
                <span v-if="a.complete" class="achievement__check" aria-hidden="true">
                    <svg class="achievement__tick"><use :href="sprite('tick')" /></svg>
                </span>
                <span v-else class="achievement__next">{{ t('archive.typeAchievements.nextUp') }}</span>
                <div class="achievement__badge">
                    <svg class="achievement__sprite" viewBox="0 0 100 100" aria-hidden="true">
                        <use :href="sprite(slug)" />
                    </svg>
                    
                </div>

                <div class="achievement__body">
                    <p class="achievement__title">{{ a.title }}</p>
                    <p class="achievement__desc">{{ a.desc }}</p>

                    <div v-if="!a.complete" class="achievement__progress">
                        <span class="achievement__bar"><span class="achievement__bar-fill" :style="{inlineSize: a.ratio * 100 + '%'}"></span></span>
                        <span class="achievement__progress-text">{{ a.progressText }}</span>
                    </div>
                </div>
            </li>
        </ul>

    </section>
</template>

<style scoped>
.achievement {
   
    --card-shadow: 0 1px 2px 0 rgba(var(--puzzle-tile-shadow), 0.20), 0 12px 30px 0 rgba(var(--puzzle-tile-shadow), 0.20);

    inline-size: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    
}
.achievement__heading {
    margin: 0;
}
.achievement__shelf {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    margin: 0;
    list-style: none;
    background-color: rgba(var(--puzzle-tile-shadow), .1);
    border-radius: .8rem;

    @media (width >= 720px) {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
        padding: 2rem;
    }
}
.achievement__item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: center;
    gap: 1.4rem;
    padding: 4rem 2.5rem;
    background: color-mix(in srgb, var(--puzzle-tile-text) 10%, transparent);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    min-block-size: 12rem;

    @media (width < 720px) {
        inline-size: 100%;
        max-inline-size: 24rem;
        aspect-ratio: 9 / 10;
        align-self: center;
    }

    @media (width >= 720px) {
        
        gap: 1.5rem;
        padding: 4rem 2rem 3.5rem;
        min-height: 24rem;
    }
}
.achievement__body {
    flex: 0 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    gap: .3rem;

    @media (width >= 720px) {
        inline-size: 100%;
        align-items: center;
    }
}
.achievement__item--got {
    background: var(--card-background);
    box-shadow: var(--card-shadow);

     &:before {
        display: block;
        content: '';
        position: absolute; 
        inset: .5rem;
        border: 1px solid var(--puzzle-tile-text);
        border-radius: 8px;
        pointer-events: none;        
    }
    &:after {
        display: block;
        content: '';
        position: absolute; 
        inset: 1rem;
        border: 1px solid var(--puzzle-tile-text);
        border-radius: 4px;
        pointer-events: none;        
    }
}
.achievement__badge {
     --tile-shadow:
    0 -0.45rem 0.37rem 0 rgba(var(--puzzle-tile-shadow), 0.40) inset,
    0  0.3rem  0.3rem  0 rgba(255, 255, 255, 0.50) inset,
    0  0.24rem 0.24rem 0 rgba(var(--puzzle-tile-shadow), 0.30),
    0  0.1rem  0.175rem 0 rgba(var(--puzzle-tile-shadow), 0.20),
    0  0.8rem  1.5rem  0 rgba(var(--puzzle-tile-shadow), 0.20);
    position: relative;
    inline-size: 7rem;
    block-size: 7rem;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    
    flex: 0 0 auto;
    box-shadow: var(--tile-shadow);
    display: none;
}
.achievement__item--got .achievement__badge {
    display: flex;
    background: var(--puzzle-tile-background);
    color: var(--puzzle-tile-text);
}
.achievement__sprite {
    inline-size: 3.4rem;
    block-size: 3.4rem;

}
.achievement__item:not(.achievement__item--got) .achievement__sprite {
    color: var(--text-colour-secondary, #777);
    opacity: .55;
}
.achievement__item:not(.achievement__item--got) .achievement__badge {
    background: color-mix(in srgb, var(--text-colour-secondary, #777) 8%, transparent);
}
.achievement__check {
    position: absolute;
    inset-block-start: 2rem;
    inset-inline-start: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    block-size: 2.4rem;
    min-inline-size: 2.4rem;
    padding: 0 .5rem;
    background-color: var(--puzzle-tile-text);
    border: 1px solid var(--puzzle-tile-text);
    border-radius: 2rem;
    line-height: 1;

    @media (width >= 720px) {
        inset-block-start: 2rem;
        inset-inline-start: 2rem;
        order: 0;
    }
}
.achievement__tick {
    inline-size: 1.4rem;
    block-size: 1.4rem;
    color: var(--card-background);
}
.achievement__next {
    flex: 0 0 auto;
    align-self: center;
    pointer-events: none;
    padding: .5rem 1rem;
    background: rgba(var(--puzzle-tile-shadow), .2);
    border-radius: 2rem;
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08rem;
    line-height: 1.2;
    color: var(--text-colour);

    @media (width >= 720px) {
        position: absolute;
        inset-block-start: 1.5rem;
        inset-inline-start: 1.5rem;
    }
}
.achievement__title {
    margin: 0;
    font-weight: 700;
    color: var(--text-colour, #212121);
    line-height: 1.3;

    @media (width >= 720px) {
        margin-block-start: .4rem;
    }
}
.achievement__desc {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-colour-secondary, #777);
}
.achievement__progress {
    inline-size: 100%;
    margin-block-start: .4rem;
    display: flex;
    flex-direction: column;
    gap: .3rem;
    align-items: flex-start;

    @media (width >= 720px) {
        align-items: center;
        padding-inline: 1.5rem;
    }
}
.achievement__bar {
    inline-size: 100%;
    block-size: .5rem;
    background: color-mix(in srgb, var(--text-colour-secondary, #777) 20%, transparent);
    border-radius: 999px;
    overflow: hidden;
}
.achievement__bar-fill {
    display: block;
    block-size: 100%;
    background: var(--puzzle-tile-text);
    border-radius: inherit;
}
.achievement__progress-text {
    font-size: 1.1rem;
    color: var(--text-colour-secondary, #777);
    font-variant-numeric: tabular-nums;
}
.achievement__more {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-colour-secondary, #777);
    font-style: italic;
}
</style>
