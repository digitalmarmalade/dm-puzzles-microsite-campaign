<script setup>
const features = useFeatures()
const auth = useAuthStore()
const authReady = useState('authReady', () => false)

const timedOut = ref(false)
let timer = null
onMounted(() => { timer = setTimeout(() => { timedOut.value = true }, 5000) })
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

const show = computed(() =>
    features.requireAccount && !auth.user && !authReady.value && !timedOut.value)
</script>

<template>
    <div v-if="show" class="auth-splash" role="status" aria-live="polite" aria-label="Loading">
        <div class="auth-splash__spinner" aria-hidden="true">
            <div class="auth-splash__path">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="auth-splash__logo" viewBox="0 0 39 60">
                <path fill="#F17B2D" d="M17 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                <path fill="#F17B2D" fill-rule="evenodd" d="M0 20.03v35.958C0 58.214 1.71 60 3.849 60c2.138 0 3.905-1.786 3.905-4.012V39.941c.029-2.166 1.768-3.923 3.878-3.923 2.138 0 3.905 1.786 3.905 4.011v7.965c0 2.196 1.74 4.012 3.906 4.012 2.138 0 3.906-1.786 3.906-4.012V40c0-2.196 1.739-4.012 3.905-4.012 2.081 0 3.735 1.845 3.878 3.924v.059c0 2.225 1.767 4.04 3.934 4.04 2.166 0 3.934-1.815 3.934-4.04V20C39 8.96 30.276 0 19.529 0 8.78 0 0 8.99 0 20.03zM18 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm8 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" clip-rule="evenodd"/>
                <path fill="#F17B2D" d="M29 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            </svg>
        </div>
    </div>
</template>

<style scoped>
.auth-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--app-bg, #fff);
}
.auth-splash__spinner {
    position: relative;
    block-size: 10rem;
    inline-size: 10rem;
}
.auth-splash__logo {
    block-size: 6rem;
    inline-size: 3.9rem;
    inset: 50% auto auto 50%;
    position: absolute;
    transform: translate(-50%, -50%);
}
.auth-splash__path {
    block-size: 10rem;
    inline-size: 10rem;
    inset: 50% auto auto 50%;
    position: absolute;
    transform: translate(-50%, 0);
}
.auth-splash__path > * {
    animation: auth-splash-spin 3s infinite;
}
.auth-splash__path > *::after {
    block-size: 1.4rem;
    inline-size: 1.4rem;
    border-radius: 50%;
    background: #F17B2D;
    content: '';
    display: block;
    position: absolute;
}
.auth-splash__path > *:nth-child(1) { animation-delay: .5s; }
.auth-splash__path > *:nth-child(2) { animation-delay: 1s; }
.auth-splash__path > *:nth-child(3) { animation-delay: 1.5s; }
.auth-splash__path > *:nth-child(4) { animation-delay: 2s; }
@keyframes auth-splash-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
