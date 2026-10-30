<script setup>
const props = defineProps({
    id: {type: String, required: true},
    label: {type: String, default: ''},
    autocomplete: {type: String, default: 'current-password'},
    modelValue: {type: String, default: ''},
    required: {type: Boolean, default: false},
    strength: {type: Boolean, default: false},
    error: {type: String, default: ''},
})
defineEmits(['update:modelValue'])

const {t} = useI18n()
const visible = ref(false)
</script>

<template>
    <div class="form-input">
        <label :for="id">{{ label }}</label>
        <div class="password-input">
            <input
                :type="visible ? 'text' : 'password'"
                :id="id"
                :name="id"
                :autocomplete="autocomplete"
                :required="required"
                :value="modelValue"
                :aria-invalid="error ? 'true' : undefined"
                :aria-describedby="error ? `${id}-error` : undefined"
                @input="$emit('update:modelValue', $event.target.value)"
            />
            <button
                type="button"
                class="password-input__toggle"
                :aria-label="visible ? t('account.hidePassword') : t('account.showPassword')"
                :aria-pressed="visible"
                @click="visible = !visible"
            >
                <svg aria-hidden="true">
                    <use :href="sprite(visible ? 'eye-off' : 'eye')" />
                </svg>
            </button>
        </div>

        <PasswordStrength v-if="strength" :value="modelValue" />

        <p v-if="error" :id="`${id}-error`" class="password-input__error" role="alert">{{ error }}</p>
    </div>
</template>

<style scoped>
.password-input {
    position: relative;
    display: flex;
    align-items: center;
}

.password-input input {
    inline-size: 100%;
    /* room for the toggle so typed text never sits under it */
    padding-inline-end: 4.4rem;
}

.password-input__toggle {
    position: absolute;
    inset-inline-end: 0;
    inset-block: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 4.4rem;
    background: none;
    border: 0;
    padding: 0;
    color: var(--text-colour-secondary, #6b6b6b);
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour, #212121);
        }
    }
}

.password-input__toggle svg {
    inline-size: 2rem;
    block-size: 2rem;
}

.password-input__error {
    margin: .6rem 0 0;
    font-size: 1.3rem;
    color: var(--negative, #e5484d);
}
</style>
