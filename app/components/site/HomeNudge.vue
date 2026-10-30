<script setup>
import Archive from '@/api/Archive.js'

const {t} = useI18n()
const toast = useToastStore()
const preview = usePreview()
const {nudge: realNudge, answer: realAnswer} = useTasteNudge()
const tracked = new Set()

const previewLevel = () => {
    const family = Archive.getVariantFamilies().find(f => f.branches.length > 1)
    if (!family) return null
    const name = family.isFamily ? `${family.name} ${family.branches[1].label}` : family.name
    return {
        key: 'preview-level',
        kind: 'level',
        preview: 'nudge-level',
        prompt: t('nudge.levelPrompt', {family: family.name, name}),
        yes: t('nudge.levelYes'),
        done: t('nudge.levelDone', {name}),
    }
}

const nudge = computed(() => {
    if (preview.is('nudge-level')) return previewLevel()
    return realNudge.value
})

function answer(n, yes, surface) {
    if (n.preview) return preview.hide(n.preview)
    realAnswer(n, yes, surface)
}

function previewToast(sample, name) {
    if (!sample) return
    toast.add({
        type: 'info',
        message: sample.prompt,
        duration: 0,
        actions: [
            {label: sample.yes, primary: true, onClick: () => toast.success(sample.done)},
            {label: t('nudge.no')},
        ],
    })
    preview.hide(name)
}

onMounted(() => {
    if (preview.is('level-toast')) previewToast(previewLevel(), 'level-toast')
})

watch(nudge, (n) => {
    if (!n || n.preview || tracked.has(n.key)) return
    tracked.add(n.key)
    trackFunnel('sp_nudge_show', {kind: n.kind, subject: n.subject, surface: 'home'})
}, {immediate: true})
</script>

<template>
    <div v-if="nudge" class="home-nudge" role="region" :aria-label="$t('nudge.label')">
        <p class="home-nudge__text">{{ nudge.prompt }}</p>
        <div class="home-nudge__actions">
            <button type="button" class="home-nudge__btn home-nudge__btn--yes" @click="answer(nudge, true, 'home')">
                {{ nudge.yes }}
            </button>
            <button type="button" class="home-nudge__btn" @click="answer(nudge, false, 'home')">
                {{ $t('nudge.no') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.home-nudge {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 2rem 2.4rem;
    margin-block-end: 4rem;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    box-shadow: var(--card-shadow);
}

.home-nudge__text {
    margin: 0;
    font-size: 1.6rem;
    text-wrap: balance;
}

.home-nudge__actions {
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
}

.home-nudge__btn {
    padding: .8rem 1.8rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: transparent;
    color: var(--text-colour);
    font-size: 1.4rem;
    font-weight: 700;
    cursor: pointer;
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour);
        }
    }
}

.home-nudge__btn--yes {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--text-on-primary);

    @media (hover: hover) {
        &:hover {
            border-color: var(--primary);
            filter: brightness(.95);
        }
    }
}
</style>
