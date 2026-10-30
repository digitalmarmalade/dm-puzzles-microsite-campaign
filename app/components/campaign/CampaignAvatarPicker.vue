<script setup>
import {profileSettings} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    name: {type: String, default: ''},
    label: {type: String, required: true},
    large: {type: Boolean, default: false},
})
const avatar = defineModel({type: String, default: null})

const {t} = useI18n()
const settings = profileSettings(props.campaign)
const id = useId()
const initial = computed(() => (props.name ?? '').trim().charAt(0).toUpperCase())
</script>

<template>
    <div class="avatar-picker" :class="{'avatar-picker--large': large}" role="radiogroup" :aria-label="label">
        <label class="avatar-picker__option">
            <input type="radio" :name="`${id}-avatar`" class="sr-only" :checked="!avatar" @change="avatar = null" />
            <span class="avatar-picker__image avatar-picker__image--initial" aria-hidden="true">{{ initial || '?' }}</span>
            <span class="avatar-picker__tick" aria-hidden="true"><svg><use :href="sprite('tick')" /></svg></span>
            <span class="sr-only">{{ t('campaign.profile.avatarInitial') }}</span>
        </label>
        <label v-for="(src, i) in settings.avatars" :key="src" class="avatar-picker__option">
            <input type="radio" :name="`${id}-avatar`" class="sr-only" :checked="avatar === src" @change="avatar = src" />
            <img :src="src" alt="" class="avatar-picker__image" />
            <span class="avatar-picker__tick" aria-hidden="true"><svg><use :href="sprite('tick')" /></svg></span>
            <span class="sr-only">{{ t('campaign.profile.avatarN', {n: i + 1}) }}</span>
        </label>
    </div>
</template>

<style scoped>
.avatar-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: 1.2rem;
}

.avatar-picker--large {
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: 1.6rem;
}

.avatar-picker__option {
    position: relative;
    display: block;
    aspect-ratio: 1;
    border-radius: 50%;
    cursor: pointer;
}

.avatar-picker__image {
    display: grid;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
    border-radius: 50%;
    border: .2rem solid var(--card-border);
    background-color: color-mix(in srgb, var(--primary) 5%, var(--card-background));
    padding: .6rem;
    transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;

    .avatar-picker__option:has(:checked) & {
        border-color: var(--primary);
        box-shadow: 0 0 0 .3rem rgba(var(--primary-rgb), .2);
    }

    .avatar-picker--large .avatar-picker__option:has(:checked) & {
        transform: scale(1.08);
        box-shadow: 0 0 0 .4rem rgba(var(--primary-rgb), .18), 0 8px 18px rgba(var(--primary-rgb), .2);
    }

    .avatar-picker__option:has(:focus-visible) & {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .avatar-picker__option:hover & {
            transform: scale(1.05);
        }
    }
}

.avatar-picker__image--initial {
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 2.6rem;
    font-weight: 700;
}

.avatar-picker__tick {
    position: absolute;
    inset-block-start: -.2rem;
    inset-inline-end: -.2rem;
    display: none;
    place-items: center;
    inline-size: 2.2rem;
    block-size: 2.2rem;
    border: .2rem solid var(--card-background);
    border-radius: 50%;
    background: var(--primary);
    color: var(--text-on-primary);

    svg {
        inline-size: 1.1rem;
        block-size: 1.1rem;
    }

    .avatar-picker--large .avatar-picker__option:has(:checked) & {
        display: grid;
    }
}
</style>
