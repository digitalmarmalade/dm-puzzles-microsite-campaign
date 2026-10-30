<script setup>
import {signOut} from 'firebase/auth'
import {NAME_MAX, REASON_MAX, handleCandidates, handleFrom, profileSettings} from '@/lib/campaign/profile'
import {phase} from '@/lib/campaign/schedule'

const campaign = await useCampaign()
const {t, te} = useI18n()
const localePath = useLocalePath()
const {$auth} = useNuxtApp()
const pageUrl = useCampaignPageUrl(campaign)
const signup = useCampaignSignup(campaign)
const p = useCampaignPlayer(campaign)

const homePath = localePath(`/c/${campaign.id}`)
const pending = signup.value
const mode = ref(pending ? 'new' : null)
const form = ref({name: pending?.name ?? '', avatar: null, reason: ''})
const askName = ref(false)
const handle = ref(null)
const open = phase(campaign, p.today.value) === 'open'
const choosing = open && campaign.tracks.length > 1
const track = ref(campaign.tracks.length === 1 ? campaign.tracks[0].id : null)
const iconOf = (puzzle) => puzzle.icon ?? (puzzle.tag ?? '').replaceAll('-', '')
const trackIcons = Object.fromEntries(campaign.tracks.map(option => [option.id, [...new Set(option.puzzles.map(iconOf).filter(Boolean))].slice(0, 5)]))
const settings = profileSettings(campaign)
const busy = ref(false)
const error = ref('')

const chosenTrack = computed(() => campaign.tracks.find(option => option.id === track.value) ?? null)
const initial = computed(() => form.value.name.trim().charAt(0).toUpperCase())
const sections = computed(() => [
    askName.value && {id: 'name', done: !!form.value.name.trim()},
    choosing && {id: 'challenge', done: !!track.value},
    {id: 'avatar', done: !!form.value.avatar},
    settings.reason && {id: 'reason', done: !!form.value.reason?.trim()},
    {id: 'preview', done: false},
].filter(Boolean).map((section, i) => ({...section, number: i + 1})))
const section = (id) => sections.value.find(entry => entry.id === id)

watchEffect(() => {
    if (mode.value || !p.loaded.value) return
    const user = p.user.value
    const guest = campaign.account === 'optional' && user?.isAnonymous
    if (p.player.value || (!p.previewing && (!user || (user.isAnonymous && !guest)))) {
        navigateTo(homePath, {replace: true})
        return
    }
    form.value = {name: '', avatar: null, reason: '', ...p.profile.value}
    askName.value = !form.value.name
    handle.value = p.profile.value?.handle ?? null
    mode.value = 'existing'
})

let lookup = 0
let timer = null
watch(() => mode.value && form.value.name, (name) => {
    clearTimeout(timer)
    if (!name || p.profile.value?.handle || !profileSettings(campaign).publicPage) return
    const run = ++lookup
    timer = setTimeout(async () => {
        for (const candidate of handleCandidates(name)) {
            try {
                if (await handleOwner(campaign, candidate)) continue
            } catch (e) {
                console.error(e)
                return
            }
            if (run === lookup) handle.value = candidate
            return
        }
    }, mode.value === 'new' ? 0 : 400)
}, {immediate: true})
onBeforeUnmount(() => clearTimeout(timer))

async function save() {
    error.value = ''
    busy.value = true
    try {
        const trackId = open ? track.value : null
        if (p.previewing) {
            await p.saveProfile({...form.value, handle: mode.value === 'new' ? handle.value ?? handleFrom(form.value.name) : undefined})
            if (trackId) await p.start(trackId)
        } else if (mode.value === 'new') {
            await registerPlayer(campaign, pending, form.value, trackId)
        } else {
            await joinCampaign(campaign, p.user.value.uid, form.value, trackId)
        }
        signup.value = null
        await navigateTo(homePath)
    } catch (e) {
        console.error(e)
        const key = `campaign.account.errors.${e.code}`
        error.value = te(key) ? t(key) : t('campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}

async function cancel() {
    signup.value = null
    if (mode.value === 'existing' && !p.previewing && p.user.value && !p.user.value.isAnonymous) await signOut($auth)
    navigateTo(homePath)
}
</script>

<template>
    <CampaignShell :campaign="campaign" :title="t('campaign.signup.personaliseShort')">
        <p v-if="!mode" class="welcome__loading">{{ t('campaign.loading') }}</p>

        <div v-else class="welcome">
            <ol v-if="mode === 'new'" class="welcome__progress" :aria-label="t('campaign.signup.step', {step: 2, total: 2})">
                <li class="is-done">
                    <span class="welcome__progress-dot" aria-hidden="true"><svg><use :href="sprite('tick')" /></svg></span>
                    {{ t('campaign.welcome.yourDetails') }}
                </li>
                <li class="is-current" aria-current="step">
                    <span class="welcome__progress-dot" aria-hidden="true">2</span>
                    {{ t('campaign.signup.personaliseShort') }}
                </li>
            </ol>

            <div class="welcome__card">
                <header class="welcome__header">
                    <h1 class="welcome__title">{{ form.name && !askName ? t('campaign.signup.personaliseTitle', {name: form.name}) : t('campaign.signup.personaliseShort') }}</h1>
                    <p class="welcome__intro">{{ t('campaign.signup.personaliseIntro') }}</p>
                </header>

                <form class="welcome__form" @submit.prevent="save">
                    <Attention v-if="error" type="negative">
                        <p role="alert">{{ error }}</p>
                    </Attention>

                    <section v-if="section('name')" class="welcome__section" :class="{'is-done': section('name').done}" :style="{'--i': section('name').number}">
                        <header class="welcome__section-head">
                            <span class="welcome__badge" aria-hidden="true">
                                <svg v-if="section('name').done"><use :href="sprite('tick')" /></svg>
                                <template v-else>{{ section('name').number }}</template>
                            </span>
                            <div>
                                <label for="welcome-name" class="welcome__section-title">{{ t('campaign.profile.name') }}</label>
                                <p id="welcome-name-hint" class="welcome__section-hint">{{ t('campaign.profile.nameHint') }}</p>
                            </div>
                        </header>
                        <input id="welcome-name" v-model="form.name" type="text" autocomplete="given-name" required :maxlength="NAME_MAX" aria-describedby="welcome-name-hint" class="welcome__input">
                    </section>

                    <section v-if="section('challenge')" class="welcome__section" :class="{'is-done': section('challenge').done}" :style="{'--i': section('challenge').number}">
                        <header class="welcome__section-head">
                            <span class="welcome__badge" aria-hidden="true">
                                <svg v-if="section('challenge').done"><use :href="sprite('tick')" /></svg>
                                <template v-else>{{ section('challenge').number }}</template>
                            </span>
                            <div>
                                <h2 id="welcome-challenge" class="welcome__section-title">{{ t('campaign.pickTrack') }}</h2>
                                <p class="welcome__section-hint">{{ t('campaign.welcome.challengeHint', {days: campaign.schedule.days}) }}</p>
                            </div>
                        </header>
                        <div class="welcome__track-grid" role="radiogroup" aria-labelledby="welcome-challenge">
                            <label v-for="option in campaign.tracks" :key="option.id" class="welcome__track">
                                <input v-model="track" type="radio" name="track" :value="option.id" class="welcome__track-input" required>
                                <span class="welcome__track-tick" aria-hidden="true">
                                    <svg><use :href="sprite('tick')" /></svg>
                                </span>
                                <span class="welcome__track-icons" aria-hidden="true">
                                    <span v-for="icon in trackIcons[option.id]" :key="icon" class="welcome__track-icon">
                                        <svg><use :href="sprite(icon)" /></svg>
                                    </span>
                                </span>
                                <strong class="welcome__track-name">{{ option.headline || option.name }}</strong>
                                <span class="welcome__track-description">{{ option.description }}</span>
                            </label>
                        </div>
                    </section>

                    <section class="welcome__section" :class="{'is-done': section('avatar').done}" :style="{'--i': section('avatar').number}">
                        <header class="welcome__section-head">
                            <span class="welcome__badge" aria-hidden="true">
                                <svg v-if="section('avatar').done"><use :href="sprite('tick')" /></svg>
                                <template v-else>{{ section('avatar').number }}</template>
                            </span>
                            <div>
                                <h2 class="welcome__section-title">{{ t('campaign.profile.avatar') }}</h2>
                                <p class="welcome__section-hint">{{ t('campaign.welcome.avatarHint') }}</p>
                            </div>
                        </header>
                        <CampaignAvatarPicker v-model="form.avatar" :campaign="campaign" :name="form.name" :label="t('campaign.profile.avatar')" large />
                    </section>

                    <section v-if="section('reason')" class="welcome__section" :class="{'is-done': section('reason').done}" :style="{'--i': section('reason').number}">
                        <header class="welcome__section-head">
                            <span class="welcome__badge" aria-hidden="true">
                                <svg v-if="section('reason').done"><use :href="sprite('tick')" /></svg>
                                <template v-else>{{ section('reason').number }}</template>
                            </span>
                            <div>
                                <label for="welcome-reason" class="welcome__section-title">{{ t('campaign.profile.reason') }}</label>
                                <p id="welcome-reason-hint" class="welcome__section-hint">{{ t('campaign.profile.reasonHint') }}</p>
                            </div>
                        </header>
                        <div class="welcome__reason">
                            <textarea id="welcome-reason" v-model="form.reason" :maxlength="REASON_MAX" aria-describedby="welcome-reason-hint" class="welcome__input"></textarea>
                            <span class="welcome__count" aria-hidden="true">{{ (form.reason ?? '').length }} / {{ REASON_MAX }}</span>
                        </div>
                    </section>

                    <section class="welcome__section welcome__section--preview" :style="{'--i': section('preview').number}">
                        <header class="welcome__section-head">
                            <span class="welcome__badge welcome__badge--star" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
                            </span>
                            <div>
                                <h2 class="welcome__section-title">{{ t('campaign.profile.pageAddress') }}</h2>
                                <p class="welcome__section-hint">{{ t('campaign.welcome.previewHint') }}</p>
                            </div>
                        </header>
                        <div class="welcome__preview" aria-live="polite">
                            <div class="welcome__preview-top">
                                <img v-if="form.avatar" :src="form.avatar" alt="" class="welcome__preview-avatar">
                                <span v-else class="welcome__preview-avatar welcome__preview-avatar--initial" aria-hidden="true">{{ initial || '?' }}</span>
                                <div class="welcome__preview-titles">
                                    <p class="welcome__preview-name">{{ form.name.trim() ? t('campaign.namedChallenge', {name: form.name.trim()}) : t('campaign.yourChallenge') }}</p>
                                    <p class="welcome__preview-headline">{{ chosenTrack ? (chosenTrack.headline || chosenTrack.name) : t('campaign.welcome.previewPlaceholder') }}</p>
                                </div>
                            </div>
                            <blockquote v-if="form.reason?.trim()" class="welcome__preview-reason">{{ form.reason.trim() }}</blockquote>
                            <p v-if="handle" class="welcome__preview-url">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                                <span>{{ pageUrl(handle).replace(/^https?:\/\//, '') }}</span>
                            </p>
                        </div>
                    </section>

                    <footer class="welcome__actions">
                        <button type="button" class="welcome__cancel" @click="cancel">{{ t('campaign.profile.cancel') }}</button>
                        <Button type="submit" icon="right-arrow" size="lg" :class="{'is-busy': busy}">
                            <template #text>
                                <span>{{ t('campaign.signup.finish') }}</span>
                            </template>
                        </Button>
                    </footer>
                </form>
            </div>
        </div>
    </CampaignShell>
</template>

<style scoped>
.welcome {
    position: relative;
    isolation: isolate;
    max-inline-size: 68rem;
    margin: 1.6rem auto 4rem;

    &::before {
        content: '';
        position: absolute;
        z-index: -1;
        inset: -12rem -40vw auto;
        block-size: 60rem;
        background:
            radial-gradient(40rem 26rem at 20% 30%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 70%),
            radial-gradient(36rem 24rem at 80% 10%, color-mix(in srgb, var(--secondary) 16%, transparent), transparent 70%);
        pointer-events: none;
    }
}

.welcome__loading {
    text-align: center;
}

.welcome__progress {
    display: flex;
    justify-content: center;
    gap: 1.2rem;
    margin: 0 0 2.4rem;
    padding: 0;
    list-style: none;
    font-size: 1.4rem;
    font-weight: 700;

    li {
        display: flex;
        align-items: center;
        gap: .8rem;
        opacity: .55;
    }

    li + li::before {
        content: '';
        inline-size: 4rem;
        block-size: .2rem;
        margin-inline-end: .4rem;
        border-radius: .1rem;
        background: var(--primary);
    }

    .is-done,
    .is-current {
        opacity: 1;
    }
}

.welcome__progress-dot {
    display: grid;
    place-items: center;
    inline-size: 2.8rem;
    block-size: 2.8rem;
    border-radius: 50%;
    border: .2rem solid var(--primary);
    color: var(--primary);
    font-size: 1.3rem;

    svg {
        inline-size: 1.3rem;
        block-size: 1.3rem;
    }

    .is-done & {
        background: var(--primary);
        color: var(--text-on-primary);
    }
}

.welcome__card {
    border-radius: calc(var(--border-radius) * 1.5);
    background: var(--card-background);
    box-shadow: 0 1px 2px rgba(0, 0, 0, .04), 0 24px 60px rgba(var(--primary-rgb), .12);
    overflow: hidden;
}

.welcome__header {
    padding: 3.2rem 2.4rem 2.4rem;
    text-align: center;
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 6%, var(--card-background)), var(--card-background));

    @media (width >= 720px) {
        padding: 4.8rem 5.6rem 3.2rem;
    }
}

.welcome__title {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-size: 3rem;
    line-height: 1.1;
    text-wrap: balance;

    @media (width >= 720px) {
        font-size: 4rem;
    }
}

.welcome__intro {
    max-inline-size: 44rem;
    margin: 0 auto;
    font-size: 1.7rem;
    line-height: 1.5;
    opacity: .8;
    text-wrap: pretty;
}

.welcome__form {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.welcome__section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2.8rem 2.4rem;
    border-block-start: 1px solid var(--card-border);
    animation: welcome-rise .5s ease both;
    animation-delay: calc(var(--i, 0) * 80ms);

    @media (width >= 720px) {
        padding: 3.6rem 5.6rem;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.welcome__section-head {
    display: flex;
    gap: 1.6rem;
    align-items: flex-start;
}

.welcome__badge {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    border-radius: 50%;
    border: .2rem solid color-mix(in srgb, var(--primary) 35%, transparent);
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 700;
    transition: background-color .25s ease, border-color .25s ease, color .25s ease, transform .25s ease;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
    }

    .is-done & {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--text-on-primary);
        transform: scale(1.05);
    }
}

.welcome__badge--star {
    border-color: transparent;
    background: color-mix(in srgb, var(--secondary) 15%, var(--card-background));
    color: var(--secondary);

    svg {
        inline-size: 1.8rem;
        block-size: 1.8rem;
        fill: currentColor;
    }
}

.welcome__section-title {
    display: block;
    margin: .3rem 0 .4rem;
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
}

.welcome__section-hint {
    margin: 0;
    line-height: 1.45;
    opacity: .7;
}

.welcome__input {
    font-size: 1.7rem;
    border-radius: var(--border-radius);
    padding: 1.6rem 2rem;
    transition: border-color .2s ease, box-shadow .2s ease;

    &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 .4rem rgba(var(--primary-rgb), .15);
    }
}

.welcome__reason {
    position: relative;

    textarea {
        min-block-size: 12rem;
        resize: vertical;
        line-height: 1.5;
    }
}

.welcome__count {
    position: absolute;
    inset-block-end: 1rem;
    inset-inline-end: 1.4rem;
    font-size: 1.2rem;
    opacity: .5;
}

.welcome__track-grid {
    display: grid;
    gap: 1.2rem;

    @media (width >= 600px) {
        grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
    }
}

.welcome__track {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: .6rem;
    padding: 1.8rem 2rem 2rem;
    border: .2rem solid color-mix(in srgb, var(--primary) 12%, var(--card-border));
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--primary) 4%, var(--card-background));
    font-weight: 400;
    cursor: pointer;
    transition: border-color .15s ease, background-color .15s ease, transform .15s ease, box-shadow .15s ease;

    &:has(:checked) {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 9%, var(--card-background));
        box-shadow: 0 8px 24px rgba(var(--primary-rgb), .15);
    }

    &:has(:focus-visible) {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            border-color: color-mix(in srgb, var(--primary) 50%, var(--card-border));
            transform: translateY(-.2rem);
        }
    }
}

.welcome__track-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.welcome__track-tick {
    position: absolute;
    z-index: 2;
    inset-block-start: 1.4rem;
    inset-inline-end: 1.4rem;
    display: grid;
    place-items: center;
    inline-size: 2.6rem;
    block-size: 2.6rem;
    border: .2rem solid color-mix(in srgb, var(--primary) 25%, var(--card-border));
    border-radius: 50%;
    background: var(--card-background);
    color: transparent;
    transition: background-color .15s ease, border-color .15s ease, color .15s ease;

    svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
    }

    .welcome__track:has(:checked) & {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--text-on-primary);
    }
}

.welcome__track-icons {
    display: flex;
    margin-block-end: .8rem;
    padding-inline-end: 3.6rem;
}

.welcome__track-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 4.4rem;
    block-size: 4.4rem;
    border: .2rem solid var(--card-background);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--primary) 12%, var(--card-background));
    color: var(--primary);
    transition: background-color .15s ease, color .15s ease, transform .2s ease;

    & + & {
        margin-inline-start: -1rem;
    }

    &:nth-child(even) {
        transform: rotate(4deg);
    }

    &:nth-child(odd) {
        transform: rotate(-3deg);
    }

    svg {
        inline-size: 2.4rem;
        block-size: 2.4rem;
    }

    .welcome__track:has(:checked) & {
        background: var(--primary);
        color: var(--text-on-primary);
    }

    .welcome__track:hover & {
        @media (hover: hover) {
            transform: none;
        }
    }
}

.welcome__track-name {
    font-size: 1.8rem;
    line-height: 1.25;
}

.welcome__track-description {
    line-height: 1.45;
    opacity: .8;
}

.welcome__section--preview {
    background: color-mix(in srgb, var(--secondary) 5%, var(--card-background));
}

.welcome__preview {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    padding: 2.4rem;
    border-radius: var(--border-radius);
    background: var(--card-background);
    box-shadow: 0 1px 2px rgba(0, 0, 0, .05), 0 12px 30px color-mix(in srgb, var(--secondary) 18%, transparent);
}

.welcome__preview-top {
    display: flex;
    gap: 1.6rem;
    align-items: center;
}

.welcome__preview-avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 7.2rem;
    block-size: 7.2rem;
    padding: 1rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 8%, var(--card-background));
    object-fit: contain;
}

.welcome__preview-avatar--initial {
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 3.2rem;
    font-weight: 700;
}

.welcome__preview-titles {
    min-inline-size: 0;

    p {
        margin: 0;
    }
}

.welcome__preview-name {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.2;
}

.welcome__preview-headline {
    color: var(--primary);
    font-size: 1.6rem;
}

.welcome__preview-reason {
    margin: 0;
    padding-inline-start: 1.2rem;
    border-inline-start: .3rem solid var(--secondary);
    font-style: italic;
    line-height: 1.5;
    overflow-wrap: anywhere;
}

.welcome__preview-url {
    display: flex;
    gap: .8rem;
    align-items: center;
    margin: 0;
    color: var(--secondary);
    font-size: 1.4rem;
    font-weight: 700;
    overflow-wrap: anywhere;

    svg {
        flex-shrink: 0;
        inline-size: 1.8rem;
        block-size: 1.8rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
    }
}

.welcome__actions {
    display: flex;
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 1.6rem;
    padding: 2.4rem;
    border-block-start: 1px solid var(--card-border);
    text-align: center;

    :deep(.button) {
        inline-size: 100%;
    }

    @media (width >= 720px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 2.8rem 5.6rem;

        :deep(.button) {
            inline-size: auto;
        }
    }
}

.welcome__cancel {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    opacity: .7;
    text-decoration: underline;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            opacity: 1;
        }
    }
}

.is-busy {
    opacity: .6;
    pointer-events: none;
}

@keyframes welcome-rise {
    from {
        opacity: 0;
        transform: translateY(1.2rem);
    }
}
</style>
