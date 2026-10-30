<script setup>
const emit = defineEmits(['success'])

const form = reactive({
    email: '',
    password: '',
})

const auth = useAuthStore()
const feedbackAuth = reactive(new Feedback(null))

async function login() {
    const resp = await auth.signInUser(form)
    if (resp?.user) {
        emit('success', resp)
    } else {
        feedbackAuth.show(resp)
    }
}
</script>

<template>
    <form class="login-form" @submit.prevent="login">

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
            autocomplete="current-password"
            required
            v-model="form.password"
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

    .login-form { 
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

</style>