<script setup lang="ts">
import '@/styles/reset.css'
import '@/styles/globals.css'

const i18nHead = useLocaleHead()
useHead(() => i18nHead.value)
</script>

<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>
