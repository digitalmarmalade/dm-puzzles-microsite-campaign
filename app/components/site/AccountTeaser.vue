<script setup>
const {t} = useI18n()
const gate = useLoginGate()
const modals = useModalStore()
const features = useFeatures()

const cards = computed(() => [
    {kind: 'streak', text: t('account.teaser.streak')},
    {kind: 'setup', text: t('account.teaser.setup')},
    {kind: 'achievements', text: t('account.teaser.achievements')},
    ...(features.friends ? [{kind: 'friends', text: t('account.teaser.friends')}] : []),
])
const days = 7
const streakDays = 5
const setup = [
    {icon: 'crossword', fav: true},
    {icon: 'sudoku', fav: false},
    {icon: 'wordwheel', fav: true},
]
const badges = ['puzzles-1', 'streak-3', 'variety-3'].map(id => ({id, src: achievementImage(id)}))
const friends = ['Priya Shah', 'Sam Lee', 'Alex Morgan']
</script>

<template>
    <div class="account-teaser">
        <FeatureHero labelledby="account-teaser-title" short>
            <span class="feature-hero__kicker">{{ t('account.title') }}</span>
            <h1 id="account-teaser-title" class="feature-hero__title">{{ t('account.teaser.title') }}</h1>
            <p class="feature-hero__body">{{ t('account.teaser.body') }}</p>
            <div class="feature-hero__actions">
                <button type="button" class="feature-hero__cta" @click="gate.open(gate.reason)">
                    {{ t('auth.logIn') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </button>
                <button type="button" class="feature-hero__cta feature-hero__cta--ghost" @click="modals.open('register-modal')">
                    {{ t('auth.signUp') }}
                </button>
            </div>
        </FeatureHero>

        <ul class="account-teaser__cards" :class="{'account-teaser__cards--three': cards.length === 3}">
            <FeatureCard v-for="card in cards" :key="card.kind" class="account-teaser__card">
                <template #visual>
                    <div v-if="card.kind === 'streak'" class="account-teaser__streak">
                        <svg class="account-teaser__flame"><use :href="sprite('streak')" /></svg>
                        <span class="account-teaser__days">
                            <span v-for="i in days" :key="i" class="account-teaser__day" :class="{'is-on': i <= streakDays}" :style="{'--i': i}"></span>
                        </span>
                    </div>

                    <ul v-else-if="card.kind === 'setup'" class="account-teaser__setup">
                        <li v-for="(tile, i) in setup" :key="tile.icon" :class="`puzzle-card--${tile.icon}`" :style="{'--i': i}">
                            <svg><use :href="sprite(tile.icon)" /></svg>
                            <span v-if="tile.fav" class="account-teaser__heart"><svg><use :href="sprite('heart')" /></svg></span>
                        </li>
                    </ul>

                    <div v-else-if="card.kind === 'achievements'" class="account-teaser__badges">
                        <img v-for="(badge, i) in badges" :key="badge.id" :src="badge.src" alt="" :style="{'--i': i}">
                    </div>

                    <div v-else class="account-teaser__friends">
                        <UserBadge v-for="name in friends" :key="name" class="account-teaser__face" :name="name" />
                        <svg class="account-teaser__trophy"><use :href="sprite('gold')" /></svg>
                    </div>
                </template>
                <span class="account-teaser__text">{{ card.text }}</span>
            </FeatureCard>
        </ul>
    </div>
</template>

<style scoped>
.account-teaser {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.account-teaser__cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2rem;
    margin: 0;
    padding: 0;
    list-style: none;

    &.account-teaser__cards--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (width < 1200px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));

        &.account-teaser__cards--three {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }

    @media (width < 790px) {
        grid-template-columns: minmax(0, 1fr);

        &.account-teaser__cards--three {
            grid-template-columns: minmax(0, 1fr);
        }
    }
}

.account-teaser__text {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.3;
    text-wrap: balance;
}

.account-teaser__streak {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
}

.account-teaser__flame {
    inline-size: 3.6rem;
    block-size: 3.6rem;
    color: var(--primary);
}

.account-teaser__days {
    display: flex;
    gap: .6rem;
}

.account-teaser__day {
    inline-size: 1.4rem;
    block-size: 1.4rem;
    border: 2px solid rgba(var(--primary-rgb), .35);
    border-radius: 50%;

    &.is-on {
        border-color: var(--primary);
        background: var(--primary);
    }
}

.account-teaser__setup {
    display: flex;
    gap: .8rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        position: relative;
        display: grid;
        place-items: center;
        inline-size: 4.8rem;
        block-size: 4.8rem;
        border-radius: .8rem;
        background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 18%, var(--card-background, #fff));
        color: var(--puzzle-tile-text);
    }

    svg {
        inline-size: 60%;
        block-size: 60%;
    }
}

.account-teaser__heart {
    position: absolute;
    inset-block-start: -.6rem;
    inset-inline-end: -.6rem;
    display: grid;
    place-items: center;
    inline-size: 2rem;
    block-size: 2rem;
    border: 2px solid var(--app-bg);
    border-radius: 50%;
    background: var(--favourited, var(--primary));
    color: #fff;

    svg {
        inline-size: 1.1rem;
        block-size: 1.1rem;
        fill: currentColor;
    }
}

.account-teaser__badges {
    display: flex;
    align-items: flex-end;
    gap: .6rem;

    img {
        inline-size: 5.6rem;
        block-size: 5.6rem;
        object-fit: contain;
        filter: drop-shadow(0 .4rem .6rem rgba(0, 0, 0, .12));
    }

    img:nth-child(2) {
        inline-size: 7rem;
        block-size: 7rem;
        translate: 0 -.6rem;
    }
}

.account-teaser__friends {
    display: flex;
    align-items: center;
}

.account-teaser__friends > :not(:first-child) {
    margin-inline-start: -.8rem;
    transition: margin .3s cubic-bezier(.2, .7, .2, 1);
}

.account-teaser__face {
    --user-badge-size: 3.6rem;
    --user-badge-font-size: 1.2rem;
    --user-badge-border: var(--card-background, #fff);
    --user-badge-border-width: 2px;
    --user-badge-background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 18%, var(--card-background, #fff));
}

.account-teaser__trophy {
    inline-size: 4.4rem;
    block-size: 4.4rem;
    filter: drop-shadow(0 .4rem .6rem rgba(0, 0, 0, .15));
}

.account-teaser__card:hover .account-teaser__day.is-on {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: account-teaser-pop .4s ease both;
        animation-delay: calc(var(--i) * .07s);
    }
}

.account-teaser__card:hover .account-teaser__flame {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: account-teaser-flicker .6s ease both;
    }
}

.account-teaser__card:hover .account-teaser__setup li,
.account-teaser__card:hover .account-teaser__badges img {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: account-teaser-hop .6s ease both;
        animation-delay: calc(var(--i) * .08s);
    }
}

.account-teaser__card:hover .account-teaser__friends > :not(:first-child) {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        margin-inline-start: -1.2rem;
    }
}

@keyframes account-teaser-pop {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.35); }
}

@keyframes account-teaser-flicker {
    0%, 100% { transform: scale(1) rotate(0); }
    30% { transform: scale(1.12) rotate(-6deg); }
    60% { transform: scale(.96) rotate(5deg); }
}

@keyframes account-teaser-hop {
    0%, 100% { transform: translateY(0); }
    35% { transform: translateY(-.8rem); }
    60% { transform: translateY(0); }
    78% { transform: translateY(-.25rem); }
}
</style>
