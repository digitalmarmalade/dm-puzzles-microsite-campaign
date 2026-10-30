<script setup>
const props = defineProps(['url'])

const frameRef = ref(null)
const initialSrc = props.url

watch(() => props.url, (u) => {
    if (!u) return
    const el = frameRef.value
    if (!el) return
    try { el.contentWindow.location.replace(u) }
    catch { el.src = u }
})
</script>

<template>
    <iframe
        ref="frameRef"
        v-focus-on-load
        :src="initialSrc"
        class='puzzle-frame'
        id="puzzle-frame"
        allow="web-share; clipboard-read; clipboard-write"
    ></iframe>
</template>

<style>
  .puzzle-frame {
    border: none;
    inline-size: 100%;
    block-size: 100dvh;
    flex-grow: 1;
    min-block-size: 60rem;

  }
</style>