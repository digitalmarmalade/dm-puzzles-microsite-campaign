<script setup>
const {t, locale} = useI18n()
const entries = useChangelog()
const modals = useModalStore()

function localised(value) {
    if (value == null || typeof value === 'string' || Array.isArray(value)) return value
    if (typeof value !== 'object') return value
    return value[locale.value] ?? value.en ?? Object.values(value)[0] ?? null
}

if (import.meta.client) {
    window.__showChangelog = async (mode = 'latest') => {
        let list = []
        try {
            const res = await fetch('/changelog.json', {cache: 'no-store'})
            if (res.ok) list = await res.json()
        } catch {}
        const picked = Array.isArray(list) && list.length
            ? (mode === 'all' ? list : [list[0]])
            : [{
                title: 'Preview entry',
                notes: [
                    'This is a preview stub — no real entries loaded.',
                    'Add entries to public/changelog.json to see them here.',
                ],
            }]
        entries.value = picked.map((e, i) => (i === 0 ? {...e, id: 'preview'} : e))
        modals.open(CHANGELOG_MODAL_ID)
    }
    window.__hideChangelog = () => {
        modals.close(CHANGELOG_MODAL_ID)
        entries.value = []
    }
    const param = new URLSearchParams(window.location.search).get('showChangelog')
    if (param !== null) onMounted(() => window.__showChangelog(param === 'all' ? 'all' : 'latest'))
}


watch(() => modals.isOpen(CHANGELOG_MODAL_ID), (open) => {
    if (!open && entries.value.length) dismissChangelog()
})
</script>

<template>
    <Modal :id="CHANGELOG_MODAL_ID" size="smmd" :hide-title="true" :title="$t('changelog.title')">
        <div v-if="entries.length" class="changelog">
            <div class="changelog__header">
                <div class="changelog__hero" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                        <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14z"/>
                        <path d="M5 15l.5 1.3L6.8 16.8l-1.3.5L5 18.6l-.5-1.3L3.2 16.8l1.3-.5L5 15z"/>
                    </svg>
                </div>
                <h2 class="changelog__title">{{ $t('changelog.title') }}</h2>
            </div>

            <section v-for="entry in entries" :key="entry.id" class="changelog__entry">
                <img
                    v-if="localised(entry.image)"
                    :src="localised(entry.image)"
                    :alt="localised(entry.imageAlt) || ''"
                    class="changelog__image"
                />
                <h3 class="changelog__entry-title">{{ localised(entry.title) }}</h3>
                <ul v-if="localised(entry.notes)?.length" class="changelog__notes">
                    <li v-for="(n, i) in localised(entry.notes)" :key="i">{{ n }}</li>
                </ul>
                <p v-else-if="localised(entry.body)" class="changelog__body">{{ localised(entry.body) }}</p>
            </section>
        </div>

        <template #footer>
            <ButtonGroup>
                <Button icon="right-arrow" @click.prevent="dismissChangelog">
                    <template #text>
                        <span>{{ $t('changelog.dismiss') }}</span>
                    </template>
                </Button>
            </ButtonGroup>
        </template>
    </Modal>
</template>

<style scoped>
    :deep(.sp-modal__dialog) {
        --modal-padding: 2.4rem 2.4rem 4rem;
    }
    .changelog {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        align-items: stretch;
    }
    .changelog__header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.2rem;
        text-align: center;
    }
    .changelog__hero {
        inline-size: 6rem;
        block-size: 6rem;
        border-radius: 50%;
        background: color-mix(in srgb, var(--primary, #F17B2D) 12%, transparent);
        color: var(--primary, #F17B2D);
        display: grid;
        place-items: center;
    }
    .changelog__hero svg {
        inline-size: 3rem;
        block-size: 3rem;
    }
    .changelog__title {
        margin: 0;
        font-size: 2.2rem;
        line-height: 1.2;
        text-wrap: balance;
    }
    .changelog__entry {
        display: flex;
        flex-direction: column;
        gap: .8rem;
    }
    .changelog__image {
        display: block;
        inline-size: 100%;
        aspect-ratio: 2 / 1;
        object-fit: cover;
        border-radius: var(--border-radius);
        margin-block-end: 1rem;
        background: color-mix(in srgb, var(--text-colour, #333) 6%, transparent);
    }
    .changelog__entry-title {
        margin: 0;
        font-size: 1.8rem;
        line-height: 1.3;
    }
    .changelog__notes {
        margin: 0;
        padding-inline-start: 2rem;
        display: flex;
        flex-direction: column;
        gap: .6rem;
        font-size: 1.5rem;
        line-height: 1.5;
    }
    .changelog__body {
        margin: 0;
        font-size: 1.6rem;
        line-height: 1.5;
    }
</style>
