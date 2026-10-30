<script setup>
const {title, entries} = defineProps({
    title: {type: String, default: ''},
    //  up to 3 entries, pre-sorted best-first: [{label, name, value}]
    entries: {type: Array, default: () => []},
})

const MEDALS = {1: 'gold', 2: 'silver', 3: 'bronze'}
</script>

<template>
    <section class="card card--main podium-card">
        <h2 class="podium-title">{{ title }}</h2>

        <ol class="podium list-style-none">
            <li
                v-for="(e, i) in entries"
                :key="e.label"
                class="podium-place"
                :class="[`podium-place--${i + 1}`, {'podium-place--me': e.isUser}]"
            >
                <span class="podium-avatar">{{ e.label }}</span>
                <span class="podium-name">{{ e.name }}<span v-if="e.isUser" class="podium-you"> ({{ $t('friends.members.you') }})</span></span>
                <span class="podium-value">{{ e.value }}</span>
                <div class="podium-block">
                    <svg class="podium-medal" aria-hidden="true">
                        <use :href="sprite(MEDALS[i + 1])"/>
                    </svg>
                </div>
            </li>
        </ol>
    </section>
</template>

<style scoped>
.podium-title {
    margin: 0 0 var(--vertical-rhythm, 2rem);
}

.podium {
    inline-size: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 1rem;
    margin: 0;
    padding: 0;
}

.podium-place {
    flex: 1 1 0;
    max-inline-size: 12rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.podium-place--1 { order: 2; }
.podium-place--2 { order: 1; }
.podium-place--3 { order: 3; }

.podium-avatar {
    inline-size: 5.2rem;
    block-size: 5.2rem;
    border-radius: 50%;
    border: 1px solid var(--puzzle-tile-text, --card-border);
    background: var(--card-background, #fff);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1.6rem;
    line-height: 1;
}

.podium-name {
    margin: 1rem 0 .2rem;
    font-size: 1.4rem;
    line-height: 1.2;
    text-wrap: balance;
}

.podium-you {
    font-size: 1.1rem;
}

.podium-place--me .podium-avatar {
    background-color: var(--primary);
    color: var(--text-on-primary);
    border-color: var(--primary);
}

.podium-value {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1rem;
}

.podium-block {
    inline-size: 100%;
    background: var(--puzzle-tile-background, #fef8f4);
    border-radius: .8rem .8rem 0 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 1.6rem 0;
}

.podium-place--1 .podium-block { min-block-size: 12rem; }
.podium-place--2 .podium-block { min-block-size: 9rem; }
.podium-place--3 .podium-block { min-block-size: 6rem; }

.podium-medal {
    inline-size: 4rem;
    block-size: 4rem;
    display: block;
}
</style>
