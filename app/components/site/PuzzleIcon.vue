<script setup>
const props = defineProps({
    icon: {type: String, default: ''},
    status: {type: Object, default: null},
    showHomeIcon: {type: Boolean, default: true},
})

const progress = computed(() => props.status?.progress ?? 0)
const hasPercent = computed(() => typeof props.status?.progress === 'number')
const started = computed(() => !!props.status?.started)
const completed = computed(() => !!props.status?.completed)
</script>

<template>
    <div class="puzzle-icon-holder">
        <div v-if="showHomeIcon" class="puzzle-icon__home-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                :aria-hidden="started || completed ? 'true' : 'false'">
                <title v-html="!started && !completed ? $t('puzzle.notStarted') : ''"></title>
                <use :href="sprite(icon)"></use>
            </svg>
        </div>

        <template v-if="started && !completed && hasPercent">
            <div
                class="puzzle-icon__progress puzzle-icon__progress--home"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="progress"
                :style="`--thickness: 1.5; --value: ${progress};`">
                <svg viewBox="0 0 100 100">
                    <title>{{ $t('puzzle.percentComplete', { percent: progress }) }}</title>

                    <!-- Foreground progress -->
                    <rect x="2" y="2" width="96" height="96" rx="12" ry="12"
                        fill="none"
                        stroke="rgba(var(--puzzle-tile-shadow), 1)"
                        stroke-width="var(--thickness)"
                        stroke-linecap="round"
                        pathLength="100"
                        stroke-dasharray="calc(var(--value) * 1%) 100"
                        stroke-dashoffset="-10.5"
                    />
                </svg>
            </div>
        </template>

        <div class="puzzle-icon-holder__rotor">
            <template v-if="completed">
                <div class="puzzle-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <use :href="sprite(icon)"></use>
                    </svg>
                </div>
            </template>

            <!-- card-specific chrome (day number, status badge, …) -->
            <slot/>
        </div>
    </div>
</template>
