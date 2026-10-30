<script setup>
import {DOOR_COUNT, LAST_CATCH_UP, LAYOUT, YEAR, doorDate} from '../../lib/advent'

const {t} = useI18n()
const dateLocale = useDateLocale()
const {phase, today, progress, opened, canPlay, refreshCounts, openDoor} = useAdvent()

if (useRuntimeConfig().public.features?.advent === false) await navigateTo('/', {replace: true})

useHead({title: () => t('advent.title')})

onMounted(() => {
    refreshCounts()
    trackFunnel('sp_advent_view', {phase: phase.value, day: today.value})
})

const formatDate = (date, opts) => new Intl.DateTimeFormat(dateLocale.value, opts).format(date)

const doors = computed(() => {
    const list = progress.value?.doors ?? Array.from({length: DOOR_COUNT}, (_, i) => ({day: i + 1, kind: 'any', state: 'locked'}))
    return LAYOUT.map(day => list[day - 1])
})

const final = computed(() => today.value > LAST_CATCH_UP)

const standing = useAdventStanding()

const intro = computed(() => {
    if (today.value === 0) return t('advent.page.opensOn', {date: formatDate(doorDate(1), {weekday: 'long', day: 'numeric', month: 'long'})})
    if (final.value) return t('advent.page.ended')
    return t('advent.page.intro')
})

const catchUpDate = computed(() => formatDate(new Date(YEAR, 11, LAST_CATCH_UP), {day: 'numeric', month: 'long'}))

</script>

<template>
    <NuxtLayout>
        <Wrapper>
            <section class="advent-calendar" :aria-label="t('advent.title')">
                <AdventCalendar :doors="doors" :opened="opened" @select="openDoor">
                    <template #header>
                        <div class="advent-hero">
                            <div class="advent-hero__text">
                                <p class="advent-hero__kicker">{{ t('advent.kicker', {year: YEAR}) }}</p>
                                <h1 class="advent-hero__title">{{ t('advent.title') }}</h1>
                                <p class="advent-hero__intro">{{ intro }}</p>
                                <p v-if="standing" class="advent-hero__standing">{{ standing }}</p>
                                <div v-if="!canPlay && !final" class="advent-hero__join">
                                    <p>{{ t('advent.status.signIn') }}</p>
                                    <div class="advent-hero__join-actions">
                                        <Button url="/account/register">
                                            <template #text><span>{{ t('advent.status.signUp') }}</span></template>
                                        </Button>
                                        <NuxtLinkLocale class="advent-hero__login" to="/account/login">{{ t('advent.status.logIn') }}</NuxtLinkLocale>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </AdventCalendar>
            </section>

            <div class="advent-lower">
                <section class="card advent-panel">
                    <AdventAwards :progress="progress" :final="final || progress?.perfectThrough === DOOR_COUNT" />
                </section>
                <section class="card advent-panel advent-how">
                    <h2>{{ t('advent.page.howTitle') }}</h2>
                    <ol>
                        <li>{{ t('advent.page.how1') }}</li>
                        <li>{{ t('advent.page.how2', {date: catchUpDate}) }}</li>
                        <li>{{ t('advent.page.how3') }}</li>
                    </ol>
                </section>
            </div>

            <AdventDoorModal />
        </Wrapper>
    </NuxtLayout>
</template>

<style scoped>
.advent-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3rem;

    @media (max-width: 760px) {
        flex-direction: column;
        align-items: stretch;
        gap: 2.4rem;
    }
}

.advent-hero__text {
    position: relative;
    max-inline-size: 56rem;
}

.advent-hero__kicker {
    margin: 0 0 .6rem;
    color: var(--advent-gold-light);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.advent-hero__title {
    margin: 0 0 1.2rem;
    color: #fff;
}

.advent-hero__intro {
    margin: 0;
    font-size: 1.7rem;
    opacity: .92;
}

.advent-hero__standing {
    margin: 1.6rem 0 0;
    color: var(--advent-gold-light);
    font-size: 1.6rem;
    font-weight: 700;
}

.advent-hero__join {
    margin-block-start: 2rem;

    p {
        margin: 0 0 1.2rem;
        font-weight: 700;
    }
}

.advent-hero__join-actions {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.advent-hero__login {
    color: #fff;
    font-weight: 700;
}

.advent-calendar {
    margin: 0 0 var(--grid-gap);
}

.advent-lower {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--grid-gap);

    @media (max-width: 1000px) {
        grid-template-columns: 1fr;
    }
}

.advent-panel {
    padding: 3rem;

    @media (max-width: 600px) {
        padding: 2.4rem 1.6rem;
    }
}

.advent-how {
    h2 {
        margin: 0 0 1.6rem;
    }

    ol {
        display: grid;
        gap: 1.2rem;
        margin: 0;
        padding-inline-start: 2rem;
    }
}
</style>
