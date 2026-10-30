<script setup>
import {campaignForHost, campaignIds} from '@/lib/campaign/registry'

const {t} = useI18n()
const localePath = useLocalePath()

const own = campaignForHost(window.location.hostname)
if (own) await navigateTo(localePath(`/c/${own}`), {replace: true})

const list = import.meta.dev ? campaignIds() : []
useHead({title: t('campaign.devIndex')})
</script>

<template>
    <main class="campaign-index">
        <template v-if="list.length">
            <h1>{{ t('campaign.devIndex') }}</h1>
            <ul>
                <li v-for="id in list" :key="id">
                    <NuxtLink :to="localePath(`/c/${id}`)">{{ id }}</NuxtLink>
                </li>
            </ul>
        </template>
        <p v-else>{{ t('campaign.notFound') }}</p>
    </main>
</template>

<style scoped>
.campaign-index {
    max-inline-size: 60rem;
    margin: 4rem auto;
    padding-inline: 1.6rem;

    h1 {
        margin-block-end: 1.6rem;
    }

    li {
        margin-block-end: .8rem;
    }
}
</style>
