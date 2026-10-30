<script setup>
import {profileSettings} from '@/lib/campaign/profile'

const campaign = await useCampaign()
const {t} = useI18n()
const localePath = useLocalePath()
const text = useCampaignText(campaign)
const p = useCampaignPlayer(campaign)

const homePath = localePath(`/c/${campaign.id}`)
const form = ref(null)
const busy = ref(false)
const error = ref('')
const handleStatus = ref('empty')
const needsHandle = profileSettings(campaign).publicPage

watchEffect(() => {
    if (!p.loaded.value || form.value) return
    if (!p.player.value && !p.profile.value) {
        navigateTo(homePath, {replace: true})
        return
    }
    form.value = {name: '', avatar: null, reason: '', handle: null, ...p.profile.value}
})

async function save() {
    error.value = ''
    if (needsHandle && handleStatus.value !== 'free') {
        error.value = t(`campaign.profile.handleStatus.${handleStatus.value === 'empty' ? 'invalid' : handleStatus.value}`)
        return
    }
    busy.value = true
    try {
        await p.saveProfile(form.value)
        await navigateTo(homePath)
    } catch (e) {
        console.error(e)
        error.value = t(e.code === 'permission-denied' ? 'campaign.profile.handleStatus.taken' : 'campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <CampaignShell :campaign="campaign" :previewing="p.previewing ? p.today.value : null">
        <Title>{{ t('campaign.profile.title') }} · {{ text('title') }}</Title>

        <div class="card card--main campaign-profile">
            <h1 class="campaign-profile__title">{{ t('campaign.profile.title') }}</h1>

            <p v-if="!form">{{ t('campaign.loading') }}</p>

            <form v-else @submit.prevent="save">
                <Attention v-if="error" type="negative">
                    <p role="alert">{{ error }}</p>
                </Attention>

                <CampaignProfileFields
                    v-model="form"
                    v-model:handle-status="handleStatus"
                    :campaign="campaign"
                    :own-handle="p.profile.value?.handle ?? null"
                    :offline="p.previewing"
                />

                <div class="form-actions">
                    <NuxtLink :to="homePath" class="campaign-profile__cancel">{{ t('campaign.profile.cancel') }}</NuxtLink>
                    <Button type="submit" icon="right-arrow" :class="{'is-busy': busy}">
                        <template #text>
                            <span>{{ t('campaign.profile.save') }}</span>
                        </template>
                    </Button>
                </div>
            </form>
        </div>
    </CampaignShell>
</template>

<style scoped>
.campaign-profile {
    inline-size: 100%;
    max-inline-size: 56rem;
    margin-inline: auto;
}

.campaign-profile__title {
    font-family: var(--font-display);
    font-size: 2.8rem;
    margin: 0 0 2.4rem;
}

.form-actions {
    align-items: center;
}

.campaign-profile__cancel {
    color: var(--primary);
    font-weight: 600;
}

.is-busy {
    opacity: .6;
    pointer-events: none;
}
</style>
