<script setup>
import {EmailAuthProvider, createUserWithEmailAndPassword, linkWithCredential, signInWithEmailAndPassword} from 'firebase/auth'

const props = defineProps({
    campaign: {type: Object, required: true},
})

const {t, te} = useI18n()
const {$auth} = useNuxtApp()

const mode = ref('register')
const form = reactive({email: '', password: '', confirm: ''})
const profile = ref({name: '', avatar: null, reason: ''})
const busy = ref(false)
const error = ref('')

const registering = computed(() => mode.value === 'register')
const confirmError = computed(() => registering.value && form.confirm && form.password !== form.confirm ? t('account.passwordMismatch') : '')

async function register() {
    const current = $auth.currentUser
    if (current?.isAnonymous) {
        await linkWithCredential(current, EmailAuthProvider.credential(form.email, form.password))
        await current.reload()
        await saveCampaignProfile(props.campaign, current.uid, profile.value)
        useState('campaignUser').value = {uid: current.uid, isAnonymous: false, email: current.email}
        return
    }
    const {user} = await createUserWithEmailAndPassword($auth, form.email, form.password)
    await saveCampaignProfile(props.campaign, user.uid, profile.value)
}

async function submit() {
    if (confirmError.value) return
    busy.value = true
    error.value = ''
    try {
        if (registering.value) await register()
        else await signInWithEmailAndPassword($auth, form.email, form.password)
    } catch (e) {
        const key = `campaign.account.errors.${e.code}`
        error.value = te(key) ? t(key) : t('campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <div class="card card--main campaign-signin">
        <h2 class="campaign-signin__title">{{ t(registering ? 'campaign.account.register' : 'campaign.account.signIn') }}</h2>
        <p class="campaign-signin__intro">{{ t('campaign.account.needed') }}</p>

        <form @submit.prevent="submit">
            <Attention v-if="error" type="negative">
                <p role="alert">{{ error }}</p>
            </Attention>

            <CampaignProfileFields v-if="registering" v-model="profile" :campaign="campaign" />

            <EmailInput id="campaign-email" :label="t('account.yourEmail')" required v-model="form.email" />

            <PasswordInput
                id="campaign-password"
                :label="t('account.password')"
                :autocomplete="registering ? 'new-password' : 'current-password'"
                required
                :strength="registering"
                v-model="form.password"
            />

            <PasswordInput
                v-if="registering"
                id="campaign-confirm"
                :label="t('account.confirmPassword')"
                autocomplete="new-password"
                required
                :error="confirmError"
                v-model="form.confirm"
            />

            <div class="form-actions">
                <Button type="submit" icon="right-arrow" :class="{'is-busy': busy}">
                    <template #text>
                        <span>{{ t(registering ? 'campaign.account.register' : 'campaign.account.signIn') }}</span>
                    </template>
                </Button>
            </div>
        </form>

        <p class="campaign-signin__switch">
            {{ t(registering ? 'campaign.account.haveAccount' : 'campaign.account.noAccount') }}
            <button type="button" class="link-button" @click="mode = registering ? 'signIn' : 'register'">
                {{ t(registering ? 'campaign.account.signIn' : 'campaign.account.register') }}
            </button>
        </p>
    </div>
</template>

<style scoped>
.campaign-signin {
    inline-size: 100%;
    max-inline-size: 56rem;
    margin-inline: auto;
}

.campaign-signin__title {
    font-family: var(--font-display);
    font-size: 2.8rem;
    margin: 0 0 .6rem;
}

.campaign-signin__intro {
    margin: 0 0 2.4rem;
}

.is-busy {
    opacity: .6;
    pointer-events: none;
}

.campaign-signin__switch {
    margin: 2.4rem 0 0;
    text-align: center;
}

.link-button {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    color: var(--primary);
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
}
</style>
