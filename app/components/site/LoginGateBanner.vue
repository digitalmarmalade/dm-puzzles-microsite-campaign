<script setup>

const gate = useLoginGate()
const modals = useModalStore()

const auth = useAuthStore()
const route = useRoute()
const features = useFeatures()
const freePlay = useFreePlayStore()

const onAuthPage = computed(() =>
    /\/account\/(login|register)$/.test(route.path))

const preview = usePreview()
const previewState = computed(() =>
    preview.is('banner-used') ? 'used' : preview.is('banner-free') ? 'free' : null)

const show = computed(() => !gate.modalOpen && !onAuthPage.value &&
    (previewState.value !== null || (features.requireAccount && !auth.user)))

const freeAvailable = computed(() =>
    previewState.value ? previewState.value === 'free' : freePlay.available)

const bannerEl = ref(null)
let resizeObserver = null

function setBannerHeight(px) {
    if (import.meta.client) {
        document.documentElement.style.setProperty('--login-banner-h', `${px}px`)
    }
}

watch(bannerEl, (el) => {
    resizeObserver?.disconnect()
    if (el) {
        resizeObserver = new ResizeObserver(() => setBannerHeight(el.offsetHeight))
        resizeObserver.observe(el)
        setBannerHeight(el.offsetHeight)
    } else {
        setBannerHeight(0)
    }
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    setBannerHeight(0)
})
</script>

<template>
    <div v-if="show" ref="bannerEl" class="login-banner" role="region" :aria-label="$t('auth.logIn')">
        <template v-if="freeAvailable">
            <p class="login-banner__free" data-guide="free">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M10 8.5v7l6-3.5z" />
                </svg>
                {{ $t('auth.bannerFreeTitle') }}
            </p>
            <p class="login-banner__body">{{ $t('auth.bannerFreeBody') }}</p>
        </template>
        <p v-else class="login-banner__text">{{ $t('auth.freePlayUsed') }}</p>
        <div class="login-banner__actions">
            <button type="button" class="login-banner__btn login-banner__btn--login" @click="gate.open()">
                {{ $t('auth.logIn') }}
            </button>
            <button type="button" class="login-banner__btn login-banner__btn--subscribe" @click="modals.open('register-modal')">
                {{ $t('auth.signUp') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.login-banner {
    position: fixed;
    inset-inline: 0;
    inset-block-end: 0;
    z-index: 40;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem 2rem;
    padding: 2rem 2rem 4rem;
    background: var(--card-background, #fff);
    border-block-start: 1px solid var(--card-border);
    box-shadow: 0 -.4rem 1.2rem rgba(0, 0, 0, .08);
}

.login-banner__text {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    text-align: center;
}

.login-banner__free {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: .8rem;
    margin: 0;
    padding: .8rem 1.8rem .8rem 1.4rem;
    overflow: hidden;
    border-radius: 2rem;
    border: 1px solid color-mix(in srgb, var(--primary, #f17b2d) 35%, transparent);
    background: var(--app-bg);
    color: var(--text-colour);
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.5;

    svg {
        flex: 0 0 auto;
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, .2) 50%, transparent 70%);
        transform: translateX(-100%);
        animation: login-banner-shine 4s ease-in-out 1s infinite;

        @media (prefers-reduced-motion: reduce) {
            animation: none;
            display: none;
        }
    }
}

.login-banner__body {
    order: 1;
    flex: 0 0 100%;
    margin: 0;
    text-align: center;

    @media (width < 720px) {
        order: 0;
    }

    font-size: 1.4rem;
    font-weight: 500;
    color: var(--text-colour-secondary, #777);
    text-wrap: balance;
}

@keyframes login-banner-shine {
    0%, 60% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.login-banner__actions {
    order: 0;
    display: flex;

    @media (width < 720px) {
        order: 1;
    }

    gap: 1rem;
}

.login-banner__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: .8rem 1.8rem;
    border-radius: 2rem;
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all .15s ease;
}

.login-banner__btn--login {
    background: transparent;
    border: 1px solid var(--text-colour, #212121);
    color: var(--text-colour, #212121);

    @media (hover: hover) {
        &:hover {
            background: var(--puzzle-tile-background);
        }
    }
}

.login-banner__btn--subscribe {
    background: var(--primary, var(--text-colour, #212121));
    border: 1px solid var(--primary, var(--text-colour, #212121));
    color: #fff;

    @media (hover: hover) {
        &:hover {
            filter: brightness(1.08);
        }
    }
}
</style>
