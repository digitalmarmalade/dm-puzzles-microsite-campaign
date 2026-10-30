<script setup>
//  Reusable pill-style single-select filter. Use with v-model:
//      <PillFilter v-model="filter" :options="opts" :aria-label="..." />
//  where each option is {value, label}.
defineProps({
    modelValue: {type: [String, Number], required: true},
    options:    {type: Array, required: true},
    ariaLabel:  {type: String, default: ''},
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
    <div class="pill-filter" role="group" :aria-label="ariaLabel || undefined">
        <button
            v-for="o in options"
            :key="o.value"
            type="button"
            class="pill-filter__pill"
            :class="{'pill-filter__pill--active': modelValue === o.value}"
            :aria-pressed="modelValue === o.value"
            @click="emit('update:modelValue', o.value)"
        >{{ o.label }}</button>
    </div>
</template>

<style scoped>
.pill-filter {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin: 0 0 2.5rem;
}
.pill-filter__pill {
    padding: .8rem 1.8rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: var(--card-background, #fff);
    color: var(--text-colour, #212121);
    font-size: 1.3rem;
    cursor: pointer;
    transition: all .15s ease;
    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour, #212121);
        }
    }
}
.pill-filter__pill--active {
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    border-color: var(--text-colour, #212121);
}
</style>
