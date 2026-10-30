<script setup>
import Archive from '@/api/Archive.js'

const debug = useDebugTaste()
const config = useRuntimeConfig()
const ready = ref(Archive.loaded)
const open = ref(true)

onMounted(async () => {
    if (ready.value) return
    await Archive.load(config.public.archiveFile)
    ready.value = true
})
</script>

<template>
    <aside class="taste-debug" :class="{'taste-debug--collapsed': !open}" aria-label="Taste model debug">
        <header class="taste-debug__bar">
            <button type="button" class="taste-debug__toggle" :aria-expanded="open" @click="open = !open">
                Taste model {{ open ? '▾' : '▸' }}
            </button>
            <button type="button" class="taste-debug__close" aria-label="Close debug panel" @click="debug.set(false)">×</button>
        </header>
        <TasteDebugBody v-if="open && ready" />
    </aside>
</template>

<style scoped>
.taste-debug {
    position: fixed;
    inset-block-end: 1.6rem;
    inset-inline-start: 1.6rem;
    z-index: 900;
    inline-size: min(48rem, calc(100vw - 3.2rem));
    max-block-size: 75vh;
    display: flex;
    flex-direction: column;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    box-shadow: var(--card-shadow-hover, 0 1rem 2rem rgba(0, 0, 0, .15));
    font-size: 1.25rem;
    color: var(--text-colour);
    overflow: hidden;
}

.taste-debug--collapsed {
    inline-size: auto;
}

.taste-debug__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: .8rem 1.2rem;
    border-block-end: 1px solid var(--card-border);
    background: var(--app-bg);
}

.taste-debug__toggle,
.taste-debug__close {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.taste-debug__close {
    font-size: 1.8rem;
    line-height: 1;
}
</style>
