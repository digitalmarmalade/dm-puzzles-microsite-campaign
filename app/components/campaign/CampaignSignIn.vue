<script setup>
import {signInWithEmailAndPassword} from 'firebase/auth'
import {NAME_MAX} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    profile: {type: Object, default: null},
    intro: {type: String, default: ''},
})
const emit = defineEmits(['registered'])

const {t, te} = useI18n()
const {$auth} = useNuxtApp()
const route = useRoute()
const signup = useCampaignSignup(props.campaign)

const mode = ref('register')
const form = reactive({name: signup.value?.name ?? props.profile?.name ?? '', email: signup.value?.email ?? '', password: '', confirm: ''})
const busy = ref(false)
const error = ref('')

const registering = computed(() => mode.value === 'register')

watch(() => route.query.signin, (asked) => {
    if (!asked) return
    mode.value = 'signIn'
    nextTick(() => {
        const card = document.getElementById('campaign-signin')
        card?.scrollIntoView({behavior: 'smooth', block: 'nearest'})
        card?.querySelector('input[type=email]')?.focus({preventScroll: true})
    })
}, {immediate: true})
const confirmError = computed(() => registering.value && form.confirm && form.password !== form.confirm ? t('account.passwordMismatch') : '')

async function submit() {
    if (confirmError.value) return
    busy.value = true
    error.value = ''
    try {
        if (registering.value) {
            signup.value = {name: form.name.trim(), email: form.email.trim(), password: form.password}
            emit('registered')
        } else {
            await signInWithEmailAndPassword($auth, form.email, form.password)
        }
    } catch (e) {
        const key = `campaign.account.errors.${e.code}`
        error.value = te(key) ? t(key) : t('campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <div id="campaign-signin" class="card card--main campaign-panel">
        <div class="campaign-panel__header">
            <h2 class="campaign-panel__title">{{ t(registering ? 'campaign.signup.title' : 'campaign.account.signIn') }}</h2>
            <p v-if="registering && intro">{{ intro }}</p>
        </div>

        <form @submit.prevent="submit">
            <Attention v-if="error" type="negative">
                <p role="alert">{{ error }}</p>
            </Attention>

            <div v-if="registering" class="form-input">
                <label for="campaign-name">{{ t('campaign.profile.name') }}</label>
                <p id="campaign-name-hint">{{ t('campaign.profile.nameHint') }}</p>
                <input
                    id="campaign-name"
                    type="text"
                    autocomplete="given-name"
                    required
                    :maxlength="NAME_MAX"
                    aria-describedby="campaign-name-hint"
                    v-model="form.name"
                />
            </div>

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
                        <span>{{ t(registering ? 'campaign.signup.next' : 'campaign.account.signIn') }}</span>
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
.is-busy {
    opacity: .6;
    pointer-events: none;
}

.campaign-signin__switch {
    margin: 0;
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
