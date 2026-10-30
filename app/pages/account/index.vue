<script setup>

const {t} = useI18n()
useHead({title: () => t('account.title')})

const auth = useAuthStore()
const router = useRouter()
const user = useUserStore()
const modals = useModalStore()
const preferences = usePreferencesStore()
const notifications = useNotificationPermission()

async function onNotificationsToggle(e) {
    const wants = e.target.checked
    if (!wants) {
        preferences.set('notifications', false)
        return
    }
    if (notifications.permission.value === 'granted') {
        preferences.set('notifications', true)
        return
    }
    const result = await notifications.request()
    preferences.set('notifications', result === 'granted')
}

provide('modals', modals)
provide('user', user)

function replayTour() {
    preferences.set('onboardingStep', 0)
    openOnboarding('account')
}

async function logout() {
    try {
        await auth.signOutUser()
    } catch (error) {
        console.log(error);
        return
    }

    //  "logged out" toast is fired centrally by the Firebase auth listener
    router.push({ path: '/' })
}
</script>

<template>
    <NuxtLayout>
        <Wrapper v-if="auth.user" narrow="true">
            <h1>{{ $t('account.title') }}</h1>
            <div class="card card--main">
                

                <div class="account">
                    <UserBadge :name="user.name" :email="user.email" />
                    <div class="account__body">
                        <button
                            type="button"
                            class="account__name"
                            @click.prevent="modals.open('modal-member-name')"
                        >
                            <span>{{ user.name || $t('friends.addDisplayName') }}</span>
                            <svg aria-hidden="true">
                                <use :href="sprite('edit')"/>
                            </svg>
                        </button>
                        <div class="account__email">{{ user.email }}</div>                        
                    </div>
                    <div class="account-logout">
                        <Button
                            type="submit"
                            gurl="/account/logout"
                            @click.prevent="logout"
                            variant="secondary"
                        >
                            <template #text>
                                <span>{{ $t('account.logout') }}</span>
                            </template>
                        </Button>
                    </div>                

                    <p v-if="user.uid" class="account-uid">
                        <span class="account-uid__label">{{ $t('account.fieldUid') }}</span>
                        <code>{{ user.uid }}</code>
                    </p>
                </div>

                
            </div>

            <div class="card card--main preferences">
                <h2>{{ $t('account.preferences.title') }}</h2>

                <div class="preference-list">
                    <label class="pref-toggle">
                        <span class="pref-toggle__label">{{ $t('account.preferences.showFeatured') }}</span>
                        <input
                            type="checkbox"
                            role="switch"
                            class="pref-toggle__input"
                            :checked="preferences.showFeatured"
                            @change="preferences.set('showFeatured', $event.target.checked)"
                        />
                        <span class="pref-toggle__track" aria-hidden="true">
                            <span class="pref-toggle__thumb"></span>
                        </span>
                    </label>
                    <label class="pref-toggle">
                        <span class="pref-toggle__label">{{ $t('account.preferences.showChallenges') }}</span>
                        <input
                            type="checkbox"
                            role="switch"
                            class="pref-toggle__input"
                            :checked="preferences.showChallenges"
                            @change="preferences.set('showChallenges', $event.target.checked)"
                        />
                        <span class="pref-toggle__track" aria-hidden="true">
                            <span class="pref-toggle__thumb"></span>
                        </span>
                    </label>
                    <template v-if="notifications.supported">
                        <label class="pref-toggle">
                            <span class="pref-toggle__label">{{ $t('account.preferences.notifications') }}</span>
                            <input
                                type="checkbox"
                                role="switch"
                                class="pref-toggle__input"
                                :checked="preferences.notifications && notifications.permission.value === 'granted'"
                                :disabled="notifications.permission.value === 'denied'"
                                @change="onNotificationsToggle"
                            />
                            <span class="pref-toggle__track" aria-hidden="true">
                                <span class="pref-toggle__thumb"></span>
                            </span>
                        </label>
                        <p v-if="notifications.permission.value === 'denied'" class="pref-note">
                            {{ $t('account.preferences.notificationsBlocked') }}
                        </p>
                    </template>

                    <div class="pref-action">
                        <Button variant="tertiary" size="sm" @click.prevent="replayTour">
                            <template #text>
                                <span>{{ $t('account.preferences.replayTour') }}</span>
                            </template>
                        </Button>
                    </div>
                </div>
            </div>

            <LearnedAboutYou />
        </Wrapper>
        <ModalMemberName />
    </NuxtLayout>
</template>

<style scoped>
    .account {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.6rem;
        margin: var(--vertical-rhythm) 0;
        inline-size: 100%;
        text-align: center;
    }
    .account__body {
        display: flex;
        flex-direction: column;
        gap: .2rem;
        min-inline-size: 0;
    }
    .account__name {
        appearance: none;
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: .6rem;
        font-size: 2.4rem;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text-colour, #333);
        text-align: center;
        justify-content: center;
    }
    .account__name svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: currentColor;
        opacity: .6;
    }
    .account__name:hover svg {
        @media (hover: hover) {
            opacity: 1;
        }
    }
    .account__email {
        font-size: 1.6rem;
        opacity: .7;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .account-uid {
        margin: var(--vertical-rhythm) 0 0;
        display: flex;
        align-items: center;
        gap: .6rem;
        flex-wrap: wrap;
        font-size: 1.1rem;
        opacity: .5;
        justify-content: center;
        inline-size: 100%;
    }
    .account-uid__label {
        text-transform: uppercase;
        letter-spacing: .05rem;
    }
    .account-uid code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        word-break: break-all;
    }
    
    .preferences h2 {
        font-size: var(--page-h3-size);
        margin: 0;
    }
    .preference-list {
        display: flex;
        flex-direction: column;
        inline-size: 100%;
    }
    .pref-toggle {
        display: flex;
        align-items: center;
        gap: 1.2rem;
        padding: 2rem 0;
        cursor: pointer;
        border-block-start: 1px solid var(--card-border);
    }
    .pref-toggle__label {
        flex: 1;
        font-size: 1.6rem;
        line-height: 1.4;
    }
    .pref-toggle__input {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
        clip: rect(0 0 0 0);
        overflow: hidden;
    }
    .pref-toggle__track {
        inline-size: 4.4rem;
        block-size: 2.4rem;
        border-radius: 9999px;
        background: color-mix(in srgb, var(--text-colour) 25%, transparent);
        position: relative;
        transition: background 0.15s ease;
        flex-shrink: 0;
    }
    .pref-toggle__thumb {
        position: absolute;
        inset-block-start: 2px;
        inset-inline-start: 2px;
        inline-size: 2rem;
        block-size: 2rem;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        transition: transform 0.15s ease;
    }
    .pref-toggle__input:checked + .pref-toggle__track {
        background: var(--primary);
    }
    .pref-toggle__input:checked + .pref-toggle__track .pref-toggle__thumb {
        transform: translateX(2rem);
    }
    .pref-toggle__input:focus-visible + .pref-toggle__track {
        outline: 2px solid var(--focus-colour, currentColor);
        outline-offset: 2px;
    }
    .pref-toggle:has(.pref-toggle__input:disabled) {
        opacity: .55;
        cursor: not-allowed;
    }
    .pref-note {
        margin: -.4rem 0 .8rem;
        font-size: 1.2rem;
        opacity: .7;
        line-height: 1.4;
    }
    .pref-action {
        padding: 2rem 0;
        border-block-start: 1px solid var(--card-border);
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
    }
</style>
