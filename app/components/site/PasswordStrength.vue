<script setup>

const props = defineProps({
    value: {type: String, default: ''},
})

const {t} = useI18n()

const score = computed(() => {
    const pw = props.value || ''
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (pw.length >= 12) s++
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
    if (classes >= 2) s++
    if (classes >= 3) s++
    //  anything typed scores at least "weak" so the meter always gives feedback
    return Math.min(Math.max(s, 1), 4)
})

const levels = ['', 'weak', 'fair', 'good', 'strong']
const label = computed(() => (score.value ? t(`account.passwordStrength.${levels[score.value]}`) : ''))
</script>

<template>
    <div v-if="value" class="pw-strength" :class="`pw-strength--${score}`">
        <div class="pw-strength__track">
            <div class="pw-strength__fill" :style="{inlineSize: `${(score / 4) * 100}%`}"></div>
        </div>
        <span class="pw-strength__label" role="status" aria-live="polite">{{ label }}</span>
    </div>
</template>

<style scoped>
.pw-strength {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-block-start: .8rem;
}

.pw-strength__track {
    flex: 1;
    block-size: .5rem;
    border-radius: .25rem;
    background: var(--card-border, #e0e0e0);
    overflow: hidden;
}

.pw-strength__fill {
    block-size: 100%;
    inline-size: 0;
    border-radius: inherit;
    background: var(--text-colour-secondary, #9a9a9a);
    transition: inline-size .25s ease, background-color .25s ease;
}

.pw-strength__label {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-colour-secondary);
    min-inline-size: 5rem;
    text-align: end;
}

.pw-strength--1 .pw-strength__fill { background: #e5484d; }
.pw-strength--2 .pw-strength__fill { background: #f5a623; }
.pw-strength--3 .pw-strength__fill { background: #f2c744; }
.pw-strength--4 .pw-strength__fill { background: #30a46c; }
</style>
