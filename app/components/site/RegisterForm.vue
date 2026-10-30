<script setup>
const emit = defineEmits(['success'])

const form = reactive({
    email: '',
    password: '',
    confirm: '',
})

const auth = useAuthStore()
const {t} = useI18n()
const feedbackAuth = reactive(new Feedback(null))

const confirmError = computed(() =>
    form.confirm && form.password !== form.confirm ? t('account.passwordMismatch') : '')

async function register() {
    if (confirmError.value || form.password !== form.confirm) return
    const resp = await auth.createUser(form)
    if (resp?.user) {
        emit('success', resp)
    } else {
        feedbackAuth.show(resp)
    }
}
</script>

<template>
    <form class="register-form" @submit.prevent="register">

        <Attention :type="feedbackAuth.type" v-if="feedbackAuth.message">
            <p>{{ feedbackAuth.message }}</p>
        </Attention>

        <EmailInput
            id="email"
            :label="$t('account.yourEmail')"
            required
            v-model="form.email"
        />

        <PasswordInput
            id="password"
            :label="$t('account.password')"
            autocomplete="new-password"
            required
            strength
            v-model="form.password"
        />

        <PasswordInput
            id="confirm"
            :label="$t('account.confirmPassword')"
            autocomplete="new-password"
            required
            :error="confirmError"
            v-model="form.confirm"
        />

        <div class="form-actions">
            <Button type="submit" icon="right-arrow">
                <template #text>
                    <span>{{ $t('common.submit') }}</span>
                </template>
            </Button>
        </div>

    </form>
</template>


<style scoped>

    .register-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

</style>
