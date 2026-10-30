<script setup>
import {useModalStore} from '@/stores/modals'

const props = defineProps([
    'id',
    'classesBackdrop',
    'classesBody',
    'classesFooter',
    'classesHeader',
    'classesModal',
    'classesOpen',
    'fullscreen',
    'fullscreenMobile',
    'hideTitle',
    'narrowContent',
    'scrollBody',
    'size',
    'title',
    'tray',
    'windowScroll'
])
const {
    id = 'modal',
    classesBody = 'sp-modal__body',
    classesFooter = 'sp-modal__footer',
    classesHeader = 'sp-modal__header',
    classesModal = 'sp-modal',
    fullscreen = false,
    fullscreenMobile = false,
    hideTitle = false,
    narrowContent = false,
    scrollBody = false,
    size = '',
    title = 'Dialog',
    tray = false,
    windowScroll = false
} = props;
const narrowContentClass = narrowContent ? 'has-narrow-content' : '';
const fullscreenClass = [
    fullscreen ? 'sp-modal--fullscreen' : '',
    fullscreenMobile ? 'sp-modal--fullscreen-mobile' : '',
    windowScroll ? 'sp-modal--window-scroll' : '',
    scrollBody ? 'sp-modal--scroll-body' : '',
    tray ? 'sp-modal--tray' : '',
].filter(Boolean).join(' ');
const sizeClass = size ? `sp-modal__dialog--${size}` : '';

const modals = useModalStore()
const dialogEl = ref(null)

function sync(open) {
    const el = dialogEl.value
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
}

watch(() => modals.isOpen(id), sync)
onMounted(() => sync(modals.isOpen(id)))

function onClose() {
    if (modals.isOpen(id)) modals.close(id)
}

function onClick(e) {
    if (e.target === dialogEl.value) modals.close(id)
}
</script>

<template>
    <dialog
        ref="dialogEl"
        :class="[classesModal, narrowContentClass, fullscreenClass]"
        :aria-labelledby="classesHeader && !hideTitle ? `${id}-title` : undefined"
        :aria-label="!classesHeader || hideTitle ? title : undefined"
        @close="onClose"
        @click="onClick"
    >
        <div class="sp-modal__dialog" :class="sizeClass">
            <header
                :class="classesHeader"
                v-if="classesHeader"
            >
                <h2 class="sp-modal__title" :id="`${id}-title`" v-if="!hideTitle">
                    <slot name="title">{{ title }}</slot>
                </h2>
                <button class="sp-modal__close" aria-label="Close dialog"
                    @click="modals.close(id)"
                >
                    <svg aria-hidden="true">
                        <use :href="sprite('close')"/>
                    </svg>
                </button>
            </header>

            <div
                :class="classesBody"
                v-if="classesBody"
            >
                <slot/>
            </div>

            <footer
                :class="classesFooter"
                v-if="classesFooter"
            >
                <slot name="footer">
                    <button class="btn btn--secondary">{{ $t('common.cancel') }}</button>
                    <button class="btn btn--primary">{{ $t('common.ok') }}</button>
                </slot>
            </footer>
        </div>
    </dialog>
</template>

<style>

.sp-modal {
    position: fixed;
    inset: 0;
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100%;
    max-block-size: none;
    margin: 0;
    padding: 2rem;
    border: none;
    background: transparent;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    transition:
        overlay var(--modal-transition-length, .2s) ease allow-discrete,
        display var(--modal-transition-length, .2s) ease allow-discrete;

}

.sp-modal[open] {
    display: flex;
}

.sp-modal--fullscreen {
    padding: 0;

}
.sp-modal--fullscreen .sp-modal__dialog {
    --fs-inset-inline-start: calc(4rem + env(safe-area-inset-left));
    --fs-inset-inline-end: calc(4rem + env(safe-area-inset-right));
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100%;
    max-block-size: none;
    border-radius: 0;
    background-color: var(--app-bg);
    padding-block: calc(2rem + env(safe-area-inset-top)) calc(4rem + env(safe-area-inset-bottom));
    padding-inline: 0;

    &:has(form) {
        max-inline-size: none;
    }
}
.sp-modal--fullscreen .sp-modal__close {
    top: calc(1rem + env(safe-area-inset-top));
    right: calc(1rem + env(safe-area-inset-right));
}
.sp-modal--fullscreen .sp-modal__body {
    flex: 1 1 auto;
    min-block-size: 0;
    display: flex;
    flex-direction: column;

    overflow: visible;
}

.sp-modal--fullscreen-mobile {
    @media (width < 720px) {
        padding: 0;
    }
}
.sp-modal--fullscreen-mobile .sp-modal__dialog {
    @media (width < 720px) {
        inline-size: 100%;
        max-inline-size: none;
        block-size: 100%;
        max-block-size: none;
        border-radius: 0;
        background-color: var(--app-bg);
        padding-block: calc(2rem + env(safe-area-inset-top)) calc(2rem + env(safe-area-inset-bottom));
        padding-inline: calc(1.5rem + env(safe-area-inset-left)) calc(1.5rem + env(safe-area-inset-right));
    }
}
.sp-modal--fullscreen-mobile .sp-modal__close {
    @media (width < 720px) {
        top: calc(1rem + env(safe-area-inset-top));
        right: calc(1rem + env(safe-area-inset-right));
    }
}
.sp-modal--fullscreen-mobile .sp-modal__body {
    @media (width < 720px) {
        flex: 1 1 auto;
        min-block-size: 0;
        display: flex;
        flex-direction: column;
        overflow: auto;
    }
}

.sp-modal--center-mobile .sp-modal__dialog {
    @media (width < 720px) {
        justify-content: center;
    }
}
.sp-modal--center-mobile .sp-modal__header {
    @media (width < 720px) {
        display: contents;
    }
}
.sp-modal--center-mobile .sp-modal__body {
    @media (width < 720px) {
        flex: 0 1 auto;
    }
}

.sp-modal--scroll-body .sp-modal__dialog {
    overflow: hidden;
}
.sp-modal--scroll-body .sp-modal__body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
}

/*  Tall content scrolls the whole overlay, not a boxed inner scroll that would
    cut a puzzle taller than the viewport off on shallow screens.  */
.sp-modal--window-scroll {
    overflow-y: auto;
}
.sp-modal--window-scroll .sp-modal__dialog {
    max-block-size: none;
    margin-block: auto;
}

.sp-modal::backdrop {
    background: rgba(0, 0, 0, .5);
    opacity: 0;
    transition:
        opacity var(--modal-transition-length, .2s) ease,
        overlay var(--modal-transition-length, .2s) ease allow-discrete,
        display var(--modal-transition-length, .2s) ease allow-discrete;
}

.sp-modal[open]::backdrop {
    opacity: 1;
}

@starting-style {
    .sp-modal[open]::backdrop {
        opacity: 0;
    }
}

.sp-modal__dialog {
    background: var(--modal-bg, var(--app-bg, #fff));
    color: var(--modal-fg, var(--text-colour, #212121));
    border-radius: 1rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, .25);
    max-block-size: min(85vh, 1000px);
    overflow: auto;
    inline-size: 100%;
    max-inline-size: 80rem;
    position: relative;
    padding: var(--modal-padding);
    display: flex;
    flex-direction: column;
    gap: var(--vertical-rhythm);
    opacity: 0;
    transform: translateY(2rem) scale(.95);
    transition:
        opacity var(--modal-transition-length, .2s) ease,
        transform var(--modal-transition-length, .2s) ease-out;

    &:has(form) {
        max-inline-size: 50rem;   
    }
}

.sp-modal[open] .sp-modal__dialog {
    opacity: 1;
    transform: none;
}

@starting-style {
    .sp-modal[open] .sp-modal__dialog {
        opacity: 0;
        transform: translateY(2rem) scale(.95);
    }
}

@media (prefers-reduced-motion: reduce) {
    .sp-modal,
    .sp-modal::backdrop,
    .sp-modal__dialog {
        transition-duration: .01ms;
    }

    .sp-modal__dialog {
        transform: none;
    }
}

.sp-modal--tray {
    --modal-transition-length: .35s;
    align-items: flex-end;
    padding: 0;
}
.sp-modal--tray .sp-modal__dialog {
    max-inline-size: 48rem;
    max-block-size: 90dvh;
    padding: 3.6rem 2rem calc(2.4rem + env(safe-area-inset-bottom));
    border-radius: 2rem 2rem 0 0;
    opacity: 1;
    transform: translateY(100%);
    transition: transform var(--modal-transition-length) cubic-bezier(.2, .8, .2, 1);

    &::before {
        content: '';
        position: absolute;
        inset-block-start: 1rem;
        inset-inline-start: 50%;
        inline-size: 4rem;
        block-size: .5rem;
        border-radius: 1rem;
        background: currentColor;
        opacity: .2;
        translate: -50% 0;
    }

    @media (prefers-reduced-motion: reduce) {
        transition-duration: .01ms;
    }
}
.sp-modal--tray .sp-modal__header {
    display: contents;
}
.sp-modal--tray[open] .sp-modal__dialog {
    transform: none;
}
@starting-style {
    .sp-modal--tray[open] .sp-modal__dialog {
        transform: translateY(100%);
    }
}

.sp-modal__dialog--sm {
    max-inline-size: 40rem;
    --modal-padding: 4rem 2rem;
}

.sp-modal__dialog--smmd {
    max-inline-size: 60rem;
}

.sp-modal__dialog--md {
    max-inline-size: 80rem;
}

.sp-modal__dialog--lg {
    max-inline-size: 100rem;
}

.sp-modal__dialog--xl {
    max-inline-size: 120rem;
}

.sp-modal__close {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    width: 4rem;
    height: 4rem;
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 22;
    border-radius: .5rem;
    color: var(--text-colour);

    > svg {
        inline-size: 2.4rem;
        block-size: 2.4rem;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(var(--primary-rgb), .1);
        }
    }
}

.has-narrow-content {
    .sp-modal__header,
    .sp-modal__footer,
    .sp-modal__body {
        inline-size: 100%;
        max-inline-size: 50rem;
        margin-inline: auto;
    }
}
</style>
