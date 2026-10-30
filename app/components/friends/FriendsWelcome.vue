<script setup>
const {signIn = false} = defineProps({signIn: Boolean})
const {t} = useI18n()
const gate = useLoginGate()
const modals = useModalStore()
const features = computed(() => [
    {kind: 'puzzles', text: t('friends.welcome.point1')},
    {kind: 'scores', text: t('friends.welcome.point2')},
    {kind: 'winners', text: t('friends.welcome.point4')},
    {kind: 'private', text: t('friends.welcome.point3')},
])
const picks = [
    {icon: 'crossword', picked: true},
    {icon: 'sudoku', picked: true},
    {icon: 'wordwheel', picked: false},
    {icon: 'gridfill', picked: true},
]
const scores = [
    {name: 'Priya Shah', time: '2:41', width: 100},
    {name: 'Sam Lee', time: '3:05', width: 82},
    {name: 'Alex Morgan', time: '3:48', width: 64},
]
const medals = ['silver', 'gold', 'bronze']
const friends = ['Priya Shah', 'Sam Lee', 'Alex Morgan']
</script>

<template>
    <div class="friends-welcome">
        <FeatureHero labelledby="friends-welcome-title" :short="signIn">
            <span class="feature-hero__kicker">{{ t('friends.title') }}</span>
            <h1 id="friends-welcome-title" class="feature-hero__title">{{ t('friends.welcome.title') }}</h1>
            <p class="feature-hero__body">{{ t('friends.welcome.body') }}</p>
            <div v-if="signIn" class="feature-hero__actions">
                <button type="button" class="feature-hero__cta" @click="gate.open(gate.reason)">
                    {{ t('auth.logIn') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </button>
                <button type="button" class="feature-hero__cta feature-hero__cta--ghost" @click="modals.open('register-modal')">
                    {{ t('auth.signUp') }}
                </button>
            </div>
            <div v-else class="feature-hero__actions">
                <NuxtLinkLocale to="/friends/create" class="feature-hero__cta">
                    {{ t('friends.welcome.create') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </NuxtLinkLocale>
                <NuxtLinkLocale to="/friends/join" class="feature-hero__cta feature-hero__cta--ghost">
                    {{ t('friends.welcome.join') }}
                </NuxtLinkLocale>
            </div>
        </FeatureHero>

        <ul class="friends-welcome__features">
            <FeatureCard v-for="feature in features" :key="feature.kind" class="friends-welcome__feature">
                <template #visual>
                    <ul v-if="feature.kind === 'puzzles'" class="friends-welcome__picks">
                        <li v-for="(pick, i) in picks" :key="pick.icon" :class="[`puzzle-card--${pick.icon}`, {'is-picked': pick.picked}]" :style="{'--i': i}">
                            <svg><use :href="sprite(pick.icon)" /></svg>
                            <span class="friends-welcome__tick"><svg><use :href="sprite('tick')" /></svg></span>
                        </li>
                    </ul>

                    <ol v-else-if="feature.kind === 'scores'" class="friends-welcome__scores">
                        <li v-for="(row, i) in scores" :key="row.name" :class="{'is-leader': i === 0}">
                            <UserBadge class="friends-welcome__face" :name="row.name" />
                            <span class="friends-welcome__bar" :style="{'--width': row.width + '%', '--i': i}"></span>
                            <span class="friends-welcome__time">{{ row.time }}</span>
                        </li>
                    </ol>

                    <div v-else-if="feature.kind === 'winners'" class="friends-welcome__medals">
                        <svg v-for="(medal, i) in medals" :key="medal" :class="`friends-welcome__medal--${medal}`" :style="{'--i': i}"><use :href="sprite(medal)" /></svg>
                    </div>

                    <div v-else class="friends-welcome__private">
                        <UserBadge v-for="name in friends" :key="name" class="friends-welcome__face" :name="name" />
                        <span class="friends-welcome__lock"><svg><use :href="sprite('padlock')" /></svg></span>
                    </div>
                </template>
                <span class="friends-welcome__feature-text">{{ feature.text }}</span>
            </FeatureCard>
        </ul>
    </div>
</template>

<style scoped>
.friends-welcome {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.friends-welcome__features {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2rem;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (width < 1200px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (width < 720px) {
        grid-template-columns: minmax(0, 1fr);
    }
}

.friends-welcome__picks {
    display: flex;
    justify-content: center;
    gap: .8rem;
    inline-size: 100%;
    margin: 0;
    padding: 0 1.6rem;
    list-style: none;

    li {
        position: relative;
        display: grid;
        flex: 0 1 4.4rem;
        place-items: center;
        min-inline-size: 0;
        aspect-ratio: 1;
        border: 1px dashed rgba(var(--puzzle-tile-shadow), .5);
        border-radius: .8rem;
        background: var(--card-background, #fff);
        color: var(--puzzle-tile-text);
        opacity: .5;
        transition: opacity .25s ease, background .25s ease, border-color .25s ease;

        &.is-picked {
            border-style: solid;
            border-color: transparent;
            background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 18%, var(--card-background, #fff));
            opacity: 1;
        }
    }

    svg {
        inline-size: 60%;
        block-size: 60%;
    }
}

.friends-welcome__tick {
    position: absolute;
    inset-block-start: -.6rem;
    inset-inline-end: -.6rem;
    display: grid;
    place-items: center;
    inline-size: 1.8rem;
    block-size: 1.8rem;
    border: 2px solid var(--app-bg);
    border-radius: 50%;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    transform: scale(0);
    transition: transform .25s cubic-bezier(.3, 1.6, .5, 1);

    svg {
        inline-size: 1rem;
        block-size: 1rem;
        fill: currentColor;
    }

    .is-picked & {
        transform: scale(1);
    }
}

.friends-welcome__feature:hover .friends-welcome__picks li {
    @media (hover: hover) {
        border-style: solid;
        border-color: transparent;
        background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 18%, var(--card-background, #fff));
        opacity: 1;
    }
}

.friends-welcome__feature:hover .friends-welcome__tick {
    @media (hover: hover) {
        transform: scale(1);
    }
}

.friends-welcome__scores {
    display: flex;
    flex-direction: column;
    gap: .6rem;
    inline-size: 80%;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        display: flex;
        align-items: center;
        gap: .8rem;
    }
}

.friends-welcome__face {
    --user-badge-size: 2.6rem;
    --user-badge-font-size: 1rem;
    --user-badge-border: var(--card-background, #fff);
    --user-badge-border-width: 2px;
    --user-badge-background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 18%, var(--card-background, #fff));

    .is-leader & {
        --user-badge-background: var(--primary);
        --user-badge-colour: var(--text-on-primary, #fff);
    }
}

.friends-welcome__bar {
    flex: 1 1 auto;
    block-size: .8rem;

    &::before {
        content: '';
        display: block;
        inline-size: var(--width);
        block-size: 100%;
        border-radius: 1rem;
        background: rgba(var(--puzzle-tile-shadow), .35);
        transform-origin: left center;
    }

    .is-leader &::before {
        background: var(--primary);
    }
}

.friends-welcome__time {
    font-size: 1.1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.friends-welcome__medals {
    display: flex;
    align-items: flex-end;
    gap: .4rem;

    svg {
        inline-size: 3.6rem;
        block-size: 3.6rem;
        filter: drop-shadow(0 .4rem .6rem rgba(0, 0, 0, .15));
    }

    .friends-welcome__medal--gold {
        inline-size: 5.2rem;
        block-size: 5.2rem;
        translate: 0 -.6rem;
    }

}

.friends-welcome__private {
    display: flex;
    align-items: center;

    .friends-welcome__face {
        --user-badge-size: 3.6rem;
        --user-badge-font-size: 1.2rem;
    }
}

.friends-welcome__private > :not(:first-child) {
    margin-inline-start: -.8rem;
    transition: margin .3s cubic-bezier(.2, .7, .2, 1);
}

.friends-welcome__lock {
    display: grid;
    place-items: center;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    border: 2px solid var(--card-background, #fff);
    border-radius: 50%;
    background: var(--primary);
    color: var(--text-on-primary, #fff);

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: currentColor;
    }
}

.friends-welcome__feature:hover .friends-welcome__picks li {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: friends-welcome-bounce .6s ease both;
        animation-delay: calc(var(--i) * .08s);
    }
}

.friends-welcome__feature:hover .friends-welcome__bar::before {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: friends-welcome-fill .6s cubic-bezier(.2, .7, .2, 1) both;
        animation-delay: calc(var(--i) * .12s);
    }
}

.friends-welcome__feature:hover .friends-welcome__medals svg {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: friends-welcome-swing .8s ease both;
        animation-delay: calc(var(--i) * .1s);
    }
}

.friends-welcome__feature:hover .friends-welcome__private > :not(:first-child) {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        margin-inline-start: -1.2rem;
    }
}

.friends-welcome__feature:hover .friends-welcome__lock {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
        animation: friends-welcome-rattle .6s ease .15s both;
    }
}

@keyframes friends-welcome-bounce {
    0%, 100% { transform: translateY(0); }
    35% { transform: translateY(-.8rem); }
    60% { transform: translateY(0); }
    78% { transform: translateY(-.25rem); }
}

@keyframes friends-welcome-fill {
    from { transform: scaleX(0); }
}

@keyframes friends-welcome-swing {
    0%, 100% { transform: translateY(0) rotate(0); }
    30% { transform: translateY(-.8rem) rotate(-8deg); }
    60% { transform: translateY(0) rotate(6deg); }
    80% { transform: rotate(-3deg); }
}

@keyframes friends-welcome-rattle {
    0%, 100% { transform: rotate(0); }
    20% { transform: rotate(-14deg); }
    40% { transform: rotate(12deg); }
    60% { transform: rotate(-8deg); }
    80% { transform: rotate(4deg); }
}

.friends-welcome__feature-text {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.3;
    text-wrap: balance;
}
</style>
