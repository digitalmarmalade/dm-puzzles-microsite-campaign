<script setup>
defineProps({
    items: {type: Array, required: true},
    numbered: {type: Boolean, default: false},
})

const ICONS = {
    when: '<rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />',
    catchUp: '<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" />',
    joining: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" />',
    track: '<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3z" />',
}
</script>

<template>
    <component :is="numbered ? 'ol' : 'ul'" class="info-list" :class="{'info-list--numbered': numbered}">
        <li v-for="(item, i) in items" :key="i" class="info-list__row">
            <span v-if="numbered" class="info-list__badge info-list__badge--number" aria-hidden="true">{{ i + 1 }}</span>
            <span v-else class="info-list__badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" v-html="ICONS[item.icon]"></svg>
            </span>
            <div class="info-list__text">
                <h3>{{ item.title }}</h3>
                <p>{{ item.body }}</p>
            </div>
        </li>
    </component>
</template>

<style scoped>
.info-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.info-list__row {
    position: relative;
    display: flex;
    gap: 1.6rem;
    align-items: flex-start;

    .info-list--numbered &:not(:last-child)::before {
        content: '';
        position: absolute;
        inset-block: 4.4rem -1.6rem;
        inset-inline-start: 1.9rem;
        inline-size: .2rem;
        border-radius: .1rem;
        background: color-mix(in srgb, var(--primary) 25%, transparent);
    }
}

.info-list__badge {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 10%, var(--card-background));
    color: var(--primary);

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
}

.info-list__badge--number {
    background: var(--primary);
    color: var(--text-on-primary);
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 700;
}

.info-list__text {
    min-inline-size: 0;
    padding-block-start: .6rem;

    h3 {
        margin: 0 0 .4rem;
        font-size: 1.8rem;
        line-height: 1.25;
    }

    p {
        margin: 0;
        line-height: 1.5;
    }
}
</style>
