<template>
    <div class="section">
        <slot/>
    </div>
</template>

<style scoped>
.section {
    display: flex;
    flex-direction: column;
    gap: var(--y-space);
    min-inline-size: 0;
}
</style>
