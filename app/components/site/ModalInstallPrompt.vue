<script setup>
const modals = useModalStore()
const preferences = usePreferencesStore()
const preview = usePreview()

const steps = [
    {key: 'step1', icon: 'share'},
    {key: 'step2', icon: 'add'},
    {key: 'step3', icon: 'tick'},
]

onMounted(() => {
    if (preview.is('install-prompt')) modals.open(INSTALL_PROMPT_MODAL_ID)
})

function close() {
    preview.hide('install-prompt')
    modals.close(INSTALL_PROMPT_MODAL_ID)
}

function never() {
    if (!preview.is('install-prompt')) preferences.set('installPromptNever', true)
    close()
}
</script>

<template>
    <Modal :id="INSTALL_PROMPT_MODAL_ID" :tray="true" :hide-title="true" :title="$t('installPrompt.title')">
        <div class="install-prompt">
            <div class="install-prompt__intro">
                <img class="install-prompt__icon" src="/img/web-app-manifest-192x192.png" alt="" width="64" height="64">
                <div>
                    <h2>{{ $t('installPrompt.title') }}</h2>
                    <p class="install-prompt__body">{{ $t('installPrompt.body') }}</p>
                </div>
            </div>

            <ol class="install-prompt__steps">
                <li v-for="step in steps" :key="step.key" class="install-prompt__step">
                    <span class="install-prompt__glyph" aria-hidden="true">
                        <svg v-if="step.icon === 'share'" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
                        <svg v-else-if="step.icon === 'add'" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></svg>
                        <svg v-else viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    </span>
                    <span class="install-prompt__text">
                        <strong>{{ $t(`installPrompt.${step.key}`) }}</strong>
                        <span>{{ $t(`installPrompt.${step.key}Hint`) }}</span>
                    </span>
                </li>
            </ol>
        </div>

        <template #footer>
            <div class="install-prompt__options">
                <Button @click.prevent="close">
                    <template #text>
                        <span>{{ $t('installPrompt.gotIt') }}</span>
                    </template>
                </Button>
                <TextButton colour="primary" @click.prevent="never">
                    <template #text>
                        <span>{{ $t('installPrompt.never') }}</span>
                    </template>
                </TextButton>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
.install-prompt {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.install-prompt__intro {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    padding-inline-end: 3rem;

    h2 {
        margin: 0 0 .4rem;
        font-size: 2rem;
        line-height: 1.2;
        text-wrap: balance;
    }
}

.install-prompt__icon {
    flex: none;
    inline-size: 6.4rem;
    block-size: 6.4rem;
    border-radius: 1.4rem;
    box-shadow: 0 .4rem 1.2rem rgba(0, 0, 0, .15);
}

.install-prompt__body {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.4;
}

.install-prompt__steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.install-prompt__step {
    display: flex;
    align-items: center;
    gap: 1.4rem;
    padding: 1.2rem 1.4rem;
    border-radius: var(--border-radius-inner, 5px);
    background: var(--app-bg);
}

.install-prompt__glyph {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary);

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
}

.install-prompt__text {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    font-size: 1.4rem;
    line-height: 1.35;

    strong {
        font-size: 1.6rem;
    }
}

.install-prompt__options {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
}
</style>
