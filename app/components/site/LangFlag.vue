<script setup>
//  small inline SVG flags for the language switcher, keyed by locale code.
defineProps({
    code: {type: String, required: true},
})
</script>

<template>
    <svg class="lang-flag" viewBox="0 0 24 16" role="img" aria-hidden="true">
        <!-- en — Union Flag (simplified) -->
        <template v-if="code === 'en'">
            <rect width="24" height="16" fill="#012169" />
            <g stroke="#fff" stroke-width="3.2">
                <line x1="0" y1="0" x2="24" y2="16" />
                <line x1="24" y1="0" x2="0" y2="16" />
            </g>
            <g stroke="#C8102E" stroke-width="1.3">
                <line x1="0" y1="0" x2="24" y2="16" />
                <line x1="24" y1="0" x2="0" y2="16" />
            </g>
            <rect x="9" width="6" height="16" fill="#fff" />
            <rect y="5" width="24" height="6" fill="#fff" />
            <rect x="10.4" width="3.2" height="16" fill="#C8102E" />
            <rect y="6.4" width="24" height="3.2" fill="#C8102E" />
        </template>

        <!-- fr — vertical blue / white / red -->
        <template v-else-if="code === 'fr'">
            <rect width="24" height="16" fill="#fff" />
            <rect width="8" height="16" fill="#0055A4" />
            <rect x="16" width="8" height="16" fill="#EF4135" />
        </template>

        <!-- it — vertical green / white / red -->
        <template v-else-if="code === 'it'">
            <rect width="24" height="16" fill="#fff" />
            <rect width="8" height="16" fill="#009246" />
            <rect x="16" width="8" height="16" fill="#CE2B37" />
        </template>

        <!-- de — horizontal black / red / gold -->
        <template v-else-if="code === 'de'">
            <rect width="24" height="16" fill="#000" />
            <rect y="5.333" width="24" height="5.333" fill="#DD0000" />
            <rect y="10.666" width="24" height="5.334" fill="#FFCE00" />
        </template>

        <!-- es — red / yellow (double) / red -->
        <template v-else-if="code === 'es'">
            <rect width="24" height="16" fill="#AA151B" />
            <rect y="4" width="24" height="8" fill="#F1BF00" />
        </template>

        <!-- hu — horizontal red / white / green -->
        <template v-else-if="code === 'hu'">
            <rect width="24" height="16" fill="#CE2939" />
            <rect y="5.333" width="24" height="5.333" fill="#fff" />
            <rect y="10.666" width="24" height="5.334" fill="#436F4D" />
        </template>

        <!-- pl — horizontal white / red -->
        <template v-else-if="code === 'pl'">
            <rect width="24" height="16" fill="#fff" />
            <rect y="8" width="24" height="8" fill="#DC143C" />
        </template>
    </svg>
</template>

<style scoped>
.lang-flag {
    display: block;
    inline-size: 2.4rem;
    block-size: 1.6rem;
    border-radius: 2px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .1);
    flex: none;
}
</style>
