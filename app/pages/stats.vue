<script setup>
const {t} = useI18n()
const features = useFeatures()
const challenges = useChallengesStore()
const auth = useAuthStore()
const loggedOut = computed(() => features.requireAccount && !auth.user)
const puzzleStats = usePuzzleStats()
const hasData = computed(() => puzzleStats.totalPuzzles.value > 0)
useHead({title: () => t('stats.title')})
</script>

<template>
  <NuxtLayout>
    <Wrapper>
      <h1 v-if="hasData">{{ $t('stats.title') }}</h1>

      <WrappedStory v-if="!loggedOut" />

      <section class="stats-section">
        <h2 class="sr-only">{{ $t('stats.puzzleStatistics') }}</h2>
        <PuzzleStatistics />
      </section>

      <section v-if="features.achievements" class="stats-section">
        
        <Achievements />
      </section>
    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
h1 span {
  font-size: 1.4rem;
  font-weight: 400;
}
h2 { 
  margin: 0 0 2rem; 
}
.stats-section {
    margin-block-end: 3rem;
}
</style>
