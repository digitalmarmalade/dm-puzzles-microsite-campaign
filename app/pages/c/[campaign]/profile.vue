<script setup>
const campaign = await useCampaign()
const {t} = useI18n()
const localePath = useLocalePath()
const text = useCampaignText(campaign)
const p = useCampaignPlayer(campaign)

const homePath = localePath(`/c/${campaign.id}`)
const form = ref(null)
const busy = ref(false)
const error = ref('')
const pageUrl = useCampaignPageUrl(campaign)

watchEffect(() => {
    if (!p.loaded.value || form.value) return
    if (!p.player.value && !p.profile.value) {
        navigateTo(homePath, {replace: true})
        return
    }
    form.value = {name: '', avatar: null, reason: '', ...p.profile.value}
})

async function save() {
    error.value = ''
    busy.value = true
    try {
        await p.saveProfile(form.value)
        await navigateTo(homePath)
    } catch (e) {
        console.error(e)
        error.value = t('campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <CampaignShell :campaign="campaign" :previewing="p.previewing ? p.today.value : null">
        <Title>{{ t('campaign.profile.title') }} · {{ text('title') }}</Title>

        <div class="card card--main campaign-panel campaign-profile">
            <h1 class="campaign-panel__title">{{ t('campaign.profile.title') }}</h1>

            <p v-if="!form">{{ t('campaign.loading') }}</p>

            <form v-else @submit.prevent="save">
                <Attention v-if="error" type="negative">
                    <p role="alert">{{ error }}</p>
                </Attention>

                <CampaignProfileFields
                    v-model="form"
                    :campaign="campaign"
                    :page-url="p.profile.value?.handle ? pageUrl(p.profile.value.handle) : null"
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
    max-inline-size: 56rem;
    margin-inline: auto;
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
