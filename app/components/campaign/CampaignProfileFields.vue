<script setup>
import {NAME_MAX, REASON_MAX, profileSettings} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    ownHandle: {type: String, default: null},
    offline: {type: Boolean, default: false},
})
const profile = defineModel({type: Object, required: true})
const handleStatus = defineModel('handleStatus', {type: String, default: 'empty'})

const {t} = useI18n()
const settings = profileSettings(props.campaign)
const id = useId()
const initial = computed(() => (profile.value.name ?? '').trim().charAt(0).toUpperCase())
</script>

<template>
    <div class="form-input">
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

    <CampaignHandleField
        v-if="settings.publicPage"
        v-model="profile.handle"
        v-model:status="handleStatus"
        :campaign="campaign"
        :name="profile.name"
        :own-handle="ownHandle"
        :offline="offline"
    />

    <fieldset class="form-input profile-avatars">
        <legend>{{ t('campaign.profile.avatar') }}</legend>
        <div class="profile-avatars__grid">
            <label class="profile-avatar">
                <input type="radio" :name="`${id}-avatar`" class="sr-only" :checked="!profile.avatar" @change="profile.avatar = null" />
                <span class="profile-avatar__image profile-avatar__image--initial" aria-hidden="true">{{ initial || '?' }}</span>
                <span class="sr-only">{{ t('campaign.profile.avatarInitial') }}</span>
            </label>
            <label v-for="(src, i) in settings.avatars" :key="src" class="profile-avatar">
                <input type="radio" :name="`${id}-avatar`" class="sr-only" :checked="profile.avatar === src" @change="profile.avatar = src" />
                <img :src="src" alt="" class="profile-avatar__image" />
                <span class="sr-only">{{ t('campaign.profile.avatarN', {n: i + 1}) }}</span>
            </label>
        </div>
    </fieldset>

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
.profile-avatars {
    border: 0;
    margin: 0;
    padding: 0;

    legend {
        line-height: 1.3;
        margin: 0 0 1rem;
        padding: 0;
    }
}

.profile-avatars__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: 1.2rem;
}

.profile-avatar {
    display: block;
    aspect-ratio: 1;
    border-radius: 50%;
    cursor: pointer;
}

.profile-avatar__image {
    display: grid;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
    border-radius: 50%;
    border: .2rem solid var(--card-border);
    background-color: rgba(var(--primary-rgb), .05);
    padding: .6rem;
    transition: border-color .15s ease, transform .15s ease;

    .profile-avatar:has(:checked) & {
        border-color: var(--primary);
        box-shadow: 0 0 0 .3rem rgba(var(--primary-rgb), .2);
    }

    .profile-avatar:has(:focus-visible) & {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .profile-avatar:hover & {
            transform: scale(1.05);
        }
    }
}

.profile-avatar__image--initial {
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 2.6rem;
    font-weight: 700;
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
