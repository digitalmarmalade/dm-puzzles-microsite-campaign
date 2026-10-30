<script setup>
import {themeSlug} from '@/lib/utils'

//  Level variants like "Sudoku Easy" share their icon + theme with the family
//  base ("Sudoku"), so strip the trailing difficulty for those lookups. The
//  route still uses the raw slug so it lands on the correct level page.
const DIFFICULTY_SUFFIX_RE = /\s+(Easy|Medium|Hard|Expert)$/

const props = defineProps(['nameSlug'])
const name = computed(() => props.nameSlug?.name)
const slug = computed(() => props.nameSlug?.slug)
const baseName = computed(() => {
    const n = name.value ?? ''
    const m = n.match(DIFFICULTY_SUFFIX_RE)
    return m ? n.slice(0, -m[0].length) : n
})
const iconSlug = computed(() => baseName.value.toLowerCase().replace(/\s/g, ''))
</script>

<template>
    <NuxtLinkLocale :to="`/puzzles/${slug}`"
        class="nav-variant-card"
        :class="baseName ? 'puzzle-card--' + themeSlug(baseName) : ''"
    >
        <div class="puzzle-icon-holder">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <div class="puzzle-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg">
                    <use :href="sprite(iconSlug)"></use>
                </svg>
            </div>
        </div>

        <span class="title" v-text="name"></span>

    </NuxtLinkLocale>
</template>

<style scoped>
  .nav-variant-card {

    --dot-inset: .4rem;

    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    gap: var(--card-gap, 1rem);
    position: relative;
    padding: var(--nav-variant-padding, 1.5rem);
    text-align: center;
    block-size: 100%;
  }

  

  .title { 
    font-size: 1.6rem;
    font-weight: 700;
}

</style>
