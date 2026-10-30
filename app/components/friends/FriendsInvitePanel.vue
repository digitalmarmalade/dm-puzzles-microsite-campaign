<script setup>
import {renderShareCard, resolveColor} from '@/lib/shareCard'
import logoSource from '@/components/site/Logo.vue?raw'

const props = defineProps({
    group: {type: Object, required: true},
})

const {t} = useI18n()
const localePath = useLocalePath()
const group = props.group

const joinLink = computed(() => `${window.location.origin}${localePath('/friends/join')}?code=${encodeURIComponent(group.id)}`)
const canShare = typeof navigator !== 'undefined' && !!navigator.share
const copied = ref(null)
let copiedTimer = null

async function writeText(text) {
    try {
        await navigator.clipboard.writeText(text)
    } catch {
        const field = Object.assign(document.createElement('textarea'), {value: text})
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.append(field)
        field.select()
        const ok = document.execCommand('copy')
        field.remove()
        if (!ok) throw new Error('copy failed')
    }
}

async function copy(kind) {
    try {
        await writeText(kind === 'code' ? group.id : joinLink.value)
        copied.value = kind
        clearTimeout(copiedTimer)
        copiedTimer = setTimeout(() => { copied.value = null }, 2000)
        trackFunnel('sp_friends_invite', {method: `copy-${kind}`})
    } catch {
        copied.value = null
    }
}

const sharing = ref(false)

async function inviteImage() {
    const root = document.documentElement
    const primary = getComputedStyle(root).getPropertyValue('--primary')
    const blob = await renderShareCard({
        kicker: t('friends.invite.cardKicker'),
        icon: 'friends-league',
        big: group.name,
        bigSize: 140,
        unit: t('friends.invite.cardCode', {code: group.id}),
        body: t('friends.invite.cardBody'),
    }, {
        colors: {
            a: resolveColor(root, `color-mix(in srgb, ${primary} 55%, #000)`),
            b: resolveColor(root, primary),
        },
        logoSvg: logoSource.match(/<svg[\s\S]*<\/svg>/)[0],
        month: t('friends.title'),
        footer: t('wrapped.share.footer', {host: location.host}),
    })
    return blob ? new File([blob], 'sticky-puzzles-invite.png', {type: 'image/png'}) : null
}

let imageFile = null
onMounted(() => {
    if (canShare) inviteImage().then((file) => { imageFile = file }).catch(() => {})
})

async function share() {
    if (sharing.value) return
    sharing.value = true
    const text = `${t('friends.invite.shareText', {name: group.name})} ${joinLink.value}`
    try {
        const file = imageFile
        const withImage = file && navigator.canShare?.({files: [file]})
        await navigator.share(withImage ? {files: [file], title: group.name, text} : {title: group.name, text, url: joinLink.value})
        trackFunnel('sp_friends_invite', {method: withImage ? 'share-image' : 'share'})
    } catch {
        copied.value = null
    } finally {
        sharing.value = false
    }
}

function shareOrCopy() {
    return canShare ? share() : copy('link')
}

defineExpose({shareOrCopy})

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
    <div class="invite-panel">
        <div class="invite-panel__code">
            <span class="invite-panel__code-label">{{ t('friends.invite.shareCode') }}</span>
            <span class="invite-panel__code-value"><span class="sr-only">{{ t('friends.invite.codePrefix') }} </span>{{ group.id }}</span>
            <button type="button" class="invite-panel__copy-code" @click="copy('code')">
                {{ copied === 'code' ? t('friends.invite.copied') : t('friends.invite.copyCode') }}
            </button>
        </div>

        <div class="invite-panel__actions">
            <span v-if="canShare" @click="share">
                <Button icon="right-arrow">
                    <template #text><span>{{ t('friends.invite.shareLink') }}</span></template>
                </Button>
            </span>
            <span @click="copy('link')">
                <Button :variant="canShare ? 'secondary' : 'primary'">
                    <template #text><span>{{ copied === 'link' ? t('friends.invite.copied') : t('friends.invite.copyLink') }}</span></template>
                </Button>
            </span>
        </div>

        <p class="invite-panel__note">{{ t('friends.invite.codeNote') }}</p>
    </div>
</template>

<style scoped>
.invite-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    inline-size: 100%;
    text-align: center;
}

.invite-panel__code {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .6rem;
    inline-size: 100%;
    padding: 2rem;
    border: 1px dashed rgba(var(--puzzle-tile-shadow), .35);
    border-radius: var(--border-radius, 1rem);
    background: rgba(var(--puzzle-tile-shadow), .05);
    line-height: 1;
}

.invite-panel__code-label {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: .1rem;
    text-transform: uppercase;
    color: var(--text-colour-secondary, #666);
}

.invite-panel__code-value {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: .1rem;
    word-break: break-all;
}

.invite-panel__copy-code {
    padding: 0;
    border: 0;
    background: none;
    color: var(--primary);
    font: inherit;
    font-size: 1.4rem;
    font-weight: 700;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            text-decoration: underline;
        }
    }
}

.invite-panel__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
}

.invite-panel__note {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
    text-wrap: balance;
}
</style>
