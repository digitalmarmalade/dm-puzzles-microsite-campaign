<script setup>
const {slug, name} = defineProps({
    slug: {type: String, default: ''},
    //  display name used in the "hidden" toast (e.g. "Head Coach")
    name: {type: String, default: ''},
})

const {t} = useI18n()
const hidden = useHiddenVariantsStore()
const toast = useToast()
const isHidden = computed(() => hidden.isHidden(slug))

function toggle() {
    const wasHidden = isHidden.value
    hidden.toggle(slug)
    if (!wasHidden && name) {
        toast.info(t('home.variantHidden', {name}))
    }
}
</script>

<template>
    <span
        class="hide-variant"
        :class="{'hide-variant--on': isHidden}"
        role="button"
        tabindex="0"
        :aria-pressed="isHidden"
        :aria-label="isHidden ? t('home.unhideVariant') : t('home.hideVariant')"
        :title="isHidden ? t('home.unhideVariant') : t('home.hideVariant')"
        @click.prevent.stop="toggle"
        @keydown.enter.prevent.stop="toggle"
        @keydown.space.prevent.stop="toggle"
    >
        
        <VisibilityIcon :hidden="isHidden" />
    </span>
</template>

<style scoped>
.hide-variant {

    inline-size: 3.2rem;
    block-size: 3.2rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    border-radius: 50%;
    color: var(--not-favourited, #9a9a9a);
    transition: color .15s ease, transform .15s ease;
    margin: 0 .5rem;

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour, #212121);
            transform: scale(1.08);
        }
    }
}

.hide-variant svg {
    inline-size: 2.2rem;
    block-size: 2.2rem;
}

.hide-variant--on {
    color: #666;
}

.hide-variant:focus-visible {
    outline: 2px solid var(--text-colour, #212121);
    outline-offset: 2px;
}
</style>
