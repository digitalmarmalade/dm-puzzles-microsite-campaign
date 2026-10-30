<script setup>
import {NAME_MAX, REASON_MAX, profileSettings} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    showName: {type: Boolean, default: true},
    pageUrl: {type: String, default: null},
})
const profile = defineModel({type: Object, required: true})

const {t} = useI18n()
const settings = profileSettings(props.campaign)
const id = useId()
</script>

<template>
    <div v-if="showName" class="form-input">
        <label :for="`${id}-name`">{{ t('campaign.profile.name') }}</label>
        <p :id="`${id}-name-hint`">{{ t('campaign.profile.nameHint') }}</p>
        <input
            :id="`${id}-name`"
            type="text"
            autocomplete="given-name"
            required
            :maxlength="NAME_MAX"
            :aria-describedby="`${id}-name-hint`"
            v-model="profile.name"
        />
    </div>

    <div v-if="pageUrl" class="form-input">
        <p class="profile-page-label">{{ t('campaign.profile.pageAddress') }}</p>
        <p class="profile-page-url">{{ pageUrl }}</p>
    </div>

    <div class="form-input">
        <p class="profile-label" aria-hidden="true">{{ t('campaign.profile.avatar') }}</p>
        <CampaignAvatarPicker v-model="profile.avatar" :campaign="campaign" :name="profile.name" :label="t('campaign.profile.avatar')" />
    </div>

    <div v-if="settings.reason" class="form-input">
        <label :for="`${id}-reason`">{{ t('campaign.profile.reason') }}</label>
        <p :id="`${id}-reason-hint`">{{ t('campaign.profile.reasonHint') }}</p>
        <textarea
            :id="`${id}-reason`"
            :maxlength="REASON_MAX"
            :aria-describedby="`${id}-reason-hint`"
            v-model="profile.reason"
        ></textarea>
        <p class="profile-count" aria-hidden="true">{{ (profile.reason ?? '').length }} / {{ REASON_MAX }}</p>
    </div>
</template>

<style scoped>
.profile-label,
.profile-page-label {
    font-weight: 700;
    opacity: 1;
}

.profile-page-url {
    margin: 0;
    padding: 1.2rem 1.6rem;
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--secondary) 8%, var(--card-background));
    color: var(--primary);
    font-weight: 700;
    opacity: 1;
    overflow-wrap: anywhere;
}

textarea {
    min-block-size: 10rem;
    resize: vertical;
}

.profile-count {
    margin: .6rem 0 0;
    font-size: 1.3rem;
    text-align: end;
}
</style>
