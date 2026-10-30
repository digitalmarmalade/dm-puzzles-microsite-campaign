<script setup>
import {ACHIEVEMENTS, TITLE_KEYS, descKeyFor, achievementProgress} from '@/lib/achievements'

const props = defineProps({
    signIn: {type: Boolean, default: false},
    compact: {type: Boolean, default: false},
    playLink: {type: Boolean, default: false},
})

const {t} = useI18n()
const gate = useLoginGate()
const modals = useModalStore()
const challenges = useChallengesStore()
const streak = computed(() => challenges.dayStreak ?? 0)

const TEASER_IDS = ['puzzles-1', 'streak-3', 'variety-3']

const stats = usePuzzleStats()
const snapshot = computed(() => ({
    totalPuzzles: stats.totalPuzzles.value,
    uniqueVariants: stats.uniqueVariants.value,
    daysPlayed: stats.daysPlayed.value,
    challengesCompleted: stats.challengesCompleted.value,
    totalVariants: stats.totalVariants.value,
    longestStreak: stats.longestStreak.value,
    cleanSolves: stats.cleanSolves.value,
}))

const teasers = computed(() => ACHIEVEMENTS.filter(a => TEASER_IDS.includes(a.id)).map((a) => {
    const progress = achievementProgress(a, snapshot.value)
    return {
        id: a.id,
        title: t(TITLE_KEYS[a.id]),
        desc: t(descKeyFor(a), {target: progress.target}),
        current: Math.min(progress.current, progress.target),
        target: progress.target,
        unlocked: progress.complete,
        iconSrc: achievementImage(a.id),
    }
}))
</script>

<template>
    <section v-if="props.compact" class="stats-teaser stats-teaser--compact" :aria-label="$t('statsTeaser.title')">
        <p class="stats-teaser__title">{{ $t('statsTeaser.title') }}</p>
        <StreakPanel v-if="streak > 0" class="stats-teaser__streak" />
        <div v-if="props.signIn" class="stats-teaser__cta">
            <p class="stats-teaser__cta-text">{{ $t('statsTeaser.signIn') }}</p>
            <div class="stats-teaser__actions">
                <button type="button" class="stats-teaser__btn stats-teaser__btn--primary" @click="gate.open()">
                    {{ $t('auth.logIn') }}
                </button>
                <button type="button" class="stats-teaser__btn" @click="modals.open('register-modal')">
                    {{ $t('auth.signUp') }}
                </button>
            </div>
        </div>
        <NuxtLinkLocale v-else-if="props.playLink" to="/" class="stats-teaser__btn stats-teaser__btn--primary">
            {{ $t('statsTeaser.play') }}
        </NuxtLinkLocale>
    </section>

    <section v-else class="stats-teaser" :aria-label="$t('statsTeaser.title')">
        <FeatureHero labelledby="stats-teaser-title" short>
            <h1 id="stats-teaser-title" class="feature-hero__title">{{ $t('statsTeaser.title') }}</h1>
            <p class="feature-hero__body">{{ props.signIn ? $t('statsTeaser.signIn') : $t('statsTeaser.body') }}</p>
            <div v-if="props.signIn" class="feature-hero__actions">
                <button type="button" class="feature-hero__cta" @click="gate.open()">
                    {{ $t('auth.logIn') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </button>
                <button type="button" class="feature-hero__cta feature-hero__cta--ghost" @click="modals.open('register-modal')">
                    {{ $t('auth.signUp') }}
                </button>
            </div>
            <div v-else-if="props.playLink" class="feature-hero__actions">
                <NuxtLinkLocale to="/" class="feature-hero__cta">
                    {{ $t('statsTeaser.play') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </NuxtLinkLocale>
            </div>
        </FeatureHero>

        <StreakPanel v-if="streak > 0" class="stats-teaser__streak" />

        <ul class="stats-teaser__achievements" :aria-label="$t('statsTeaser.achievements')">
            <FeatureCard
                v-for="a in teasers"
                :key="a.id"
                class="stats-teaser__achievement"
                :class="{'stats-teaser__achievement--unlocked': a.unlocked}"
            >
                <template #visual>
                    <img class="stats-teaser__icon" :src="a.iconSrc" alt="">
                    <span v-if="a.unlocked" class="stats-teaser__tick"><svg><use :href="sprite('tick')" /></svg></span>
                </template>
                <span class="stats-teaser__achievement-title">{{ a.title }}</span>
                <span class="stats-teaser__achievement-desc">{{ a.desc }}</span>
                <span class="stats-teaser__progress">
                    <span class="stats-teaser__bar" aria-hidden="true">
                        <span class="stats-teaser__bar-fill" :style="{inlineSize: `${(a.current / a.target) * 100}%`}"></span>
                    </span>
                    <span class="stats-teaser__progress-text">{{ a.current }} / {{ a.target }}</span>
                </span>
            </FeatureCard>
        </ul>

    </section>
</template>

<style scoped>
.stats-teaser {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-block-end: 4rem;
}

.stats-teaser--compact {
    gap: 1.6rem;
    padding: 2rem;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    box-shadow: var(--card-shadow);
}

.stats-teaser__title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
}

.stats-teaser__streak {
    flex: none;
    inline-size: min(100%, 48rem);
    min-block-size: 0;
    margin-inline: auto;
}

.stats-teaser__achievements {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (width < 790px) {
        grid-template-columns: minmax(0, 1fr);
    }
}

.stats-teaser__icon {
    inline-size: 9rem;
    block-size: 9rem;
    object-fit: contain;
    filter: grayscale(1);
    opacity: .45;

    .stats-teaser__achievement--unlocked & {
        filter: none;
        opacity: 1;
    }
}

.stats-teaser__tick {
    position: absolute;
    inset-block-start: 1rem;
    inset-inline-end: 1rem;
    display: grid;
    place-items: center;
    inline-size: 2.4rem;
    block-size: 2.4rem;
    border-radius: 50%;
    background: var(--primary);
    color: var(--text-on-primary, #fff);

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }
}

.stats-teaser__achievement-title {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
}

.stats-teaser__achievement-desc {
    flex-grow: 1;
    margin-block-start: -1rem;
    font-size: 1.3rem;
    line-height: 1.3;
    color: var(--text-colour-secondary, #777);
}

.stats-teaser__progress {
    display: flex;
    align-items: center;
    gap: .6rem;
    inline-size: 100%;
}

.stats-teaser__bar {
    flex: 1 1 auto;
    block-size: .6rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(0, 0, 0, .06);
}

.stats-teaser__bar-fill {
    display: block;
    block-size: 100%;
    background: var(--primary);
    transform-origin: left center;
    transition: inline-size .25s ease;
}

.stats-teaser__progress-text {
    flex: none;
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-colour-secondary, #777);
}

.stats-teaser__achievement:hover .stats-teaser__icon {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: stats-teaser-hop .6s ease both;
    }
}

.stats-teaser__achievement:hover .stats-teaser__bar-fill {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: stats-teaser-fill .6s cubic-bezier(.2, .7, .2, 1) .1s both;
    }
}

@keyframes stats-teaser-hop {
    0%, 100% { transform: translateY(0) rotate(0); }
    35% { transform: translateY(-.8rem) rotate(-6deg); }
    60% { transform: translateY(0) rotate(4deg); }
    80% { transform: translateY(-.2rem) rotate(-2deg); }
}

@keyframes stats-teaser-fill {
    from { transform: scaleX(0); }
}

.stats-teaser__cta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.6rem;
}

.stats-teaser__cta-text {
    position: relative;
    margin: 0;
    font-size: 1.5rem;
    text-wrap: balance;
}

.stats-teaser__actions {
    position: relative;
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
}

.stats-teaser__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    padding: .8rem 1.8rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: transparent;
    color: var(--text-colour);
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour);
        }
    }
}

.stats-teaser__btn--primary {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--text-on-primary);

    @media (hover: hover) {
        &:hover {
            border-color: var(--primary);
            filter: brightness(.95);
        }
    }
}
</style>
