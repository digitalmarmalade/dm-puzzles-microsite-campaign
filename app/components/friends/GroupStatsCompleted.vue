<script setup>
import {slugify, themeSlug} from '@/lib/utils'
import {variantLook} from '@/lib/variantLook'

const {data, puzzleName, variant, groupId} = defineProps(['data', 'puzzleName', 'variant', 'groupId'])

const routeSlug = computed(() => slugify(variant ?? ''))
const look = computed(() => variantLook(variant))
</script>

<template>
    <NuxtLinkLocale class="group-stats-card"
    :to="`/friends/stats/${groupId}/${routeSlug}`"
    :class="look.theme ? 'puzzle-card--' + themeSlug(look.theme) : ''"
    >
        <div class="puzzle-icon-holder">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <div class="puzzle-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <use :href="sprite(look.icon)"></use>
                    </svg>
                </div>
        </div>
        <h3>{{puzzleName}}</h3>
        <div class="group-stats-panel">
                <BubbleBars
                    :data="data.members"
                    value="completed"
                ></BubbleBars>
        </div>
    </NuxtLinkLocale>
</template>

<style scoped>
.group-stats-card {
    text-decoration: none;
    color: inherit;

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}
</style>
