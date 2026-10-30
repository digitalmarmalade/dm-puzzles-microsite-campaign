<script setup>
import {dateHelpers} from '@/lib/challenges'

const {t} = useI18n()
const challenges = useChallengesStore()

const completions = computed(() => challenges.completions ?? [])

const lastSevenDays = computed(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
    return completions.value.filter(c => new Date(c.at) >= start)
})

const puzzleCount = computed(() => lastSevenDays.value.length)
const typeCount = computed(() => new Set(lastSevenDays.value.map(c => c.variant)).size)
const dayCount = computed(() => new Set(lastSevenDays.value.map(c => dateHelpers.dayKey(c.at))).size)
</script>

<template>
    <section class="home-highlight" :aria-label="t('summary.aria')">
        <div class="home-highlight__header">
            <h2>{{ t('summary.title') }}</h2>
        </div>

        <div class="home-highlight__body">
            <div class="home-highlight__stats">
                <div class="home-highlight__stat">
                    <p class="home-highlight__stat-value">
                        <CountUp :value="puzzleCount" />
                    </p>
                    <p class="home-highlight__stat-label">{{ t('summary.puzzles') }}</p>
                </div>
                <div class="home-highlight__stat">
                    <p class="home-highlight__stat-value">
                        <CountUp :value="typeCount" />
                    </p>
                    <p class="home-highlight__stat-label">{{ t('summary.types') }}</p>
                </div>
                <div class="home-highlight__stat">
                    <p class="home-highlight__stat-value">
                        <CountUp :value="dayCount" />
                    </p>
                    <p class="home-highlight__stat-label">{{ t('summary.days') }}</p>
                </div>
            </div>

        </div>
        
    </section>
</template>

<style scoped>

.home-highlight__stats {
    display: flex;
    gap: 2rem;
    inline-size: 100%;
}
</style>
