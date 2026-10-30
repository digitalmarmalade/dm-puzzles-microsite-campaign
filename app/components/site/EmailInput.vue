<script setup>
const props = defineProps({
    id: {type: String, required: true},
    label: {type: String, default: ''},
    modelValue: {type: String, default: ''},
    required: {type: Boolean, default: false},
    autocomplete: {type: String, default: 'email'},
})
const emit = defineEmits(['update:modelValue'])

const {t} = useI18n()
const inputEl = ref(null)
const touched = ref(false)
const invalid = ref(false)

function validate() {
    const el = inputEl.value
    if (el) invalid.value = touched.value && el.value.length > 0 && el.validity.typeMismatch
}

function onBlur() {
    touched.value = true
    validate()
}

function onInput(event) {
    emit('update:modelValue', event.target.value)
    if (touched.value) validate()
}
</script>

<template>
    <div class="form-input">
        <label :for="id">{{ label }}</label>
        <input
            ref="inputEl"
            type="email"
            :id="id"
            :name="id"
            :autocomplete="autocomplete"
            :required="required"
            :value="modelValue"
            :aria-invalid="invalid ? 'true' : undefined"
            :aria-describedby="invalid ? `${id}-error` : undefined"
            @input="onInput"
            @blur="onBlur"
        />
        <p v-if="invalid" :id="`${id}-error`" class="email-input__error" role="alert">{{ t('account.emailInvalid') }}</p>
    </div>
</template>

<style scoped>
.email-input__error {
    margin: .6rem 0 0;
    font-size: 1.3rem;
    color: var(--negative, #e5484d);
}
</style>
