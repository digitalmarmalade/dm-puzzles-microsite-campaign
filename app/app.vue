<script setup lang="ts">
import '@/styles/reset.css'
import '@/styles/globals.css'
import AuthSplash from '@/components/site/AuthSplash.vue'

const i18nHead = useLocaleHead()
useHead(() => i18nHead.value)
</script>

<template>
    <AuthSplash />
    <NuxtPage />
</template>
