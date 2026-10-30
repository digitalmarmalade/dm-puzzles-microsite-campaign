<script setup>
import {HANDLE_MAX, handleFrom, handleSuggestions, isValidHandle} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    name: {type: String, default: ''},
    ownHandle: {type: String, default: null},
    offline: {type: Boolean, default: false},
})
const handle = defineModel({type: String, default: null})
const status = defineModel('status', {type: String, default: 'empty'})

const {t} = useI18n()
const id = useId()
const pageUrl = useCampaignPageUrl(props.campaign)
const edited = ref(!!handle.value)
const suggestion = ref(null)
const shown = computed(() => handle.value || handleFrom(props.name) || '')
const [before, after] = pageUrl('__handle__').split('__handle__')

watch(() => props.name, (name) => {
    if (!edited.value) handle.value = handleFrom(name) || null
}, {immediate: true})

function onInput(event) {
    edited.value = true
    const typed = event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').slice(0, HANDLE_MAX)
    event.target.value = typed
    handle.value = typed || null
}

function onBlur() {
    if (handle.value) handle.value = handleFrom(handle.value) || null
}

async function isFree(candidate) {
    if (props.offline || candidate === props.ownHandle) return true
    return !await handleOwner(props.campaign, candidate)
}

let checking = 0
let timer = null
watch(handle, (value) => {
    clearTimeout(timer)
    suggestion.value = null
    const next = !value ? 'empty' : isValidHandle(value) ? 'checking' : 'invalid'
    status.value = next
    if (next !== 'checking') return
    const run = ++checking
    timer = setTimeout(async () => {
        try {
            const free = await isFree(value)
            if (run !== checking) return
            status.value = free ? 'free' : 'taken'
            if (free) return
            for (const candidate of handleSuggestions(value)) {
                if (await isFree(candidate)) {
                    if (run === checking) suggestion.value = candidate
                    return
                }
            }
        } catch (e) {
            console.error(e)
            if (run === checking) status.value = 'free'
        }
    }, 400)
}, {immediate: true})
onBeforeUnmount(() => clearTimeout(timer))

function useSuggestion() {
    edited.value = true
    handle.value = suggestion.value
}
</script>

<template>
    <div class="form-input handle-field">
        <label :for="`${id}-handle`">{{ t('campaign.profile.handle') }}</label>
        <p :id="`${id}-handle-hint`">{{ t('campaign.profile.handleHint') }}</p>
        <input
            :id="`${id}-handle`"
            type="text"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
            required
            :maxlength="HANDLE_MAX"
            :aria-describedby="`${id}-handle-hint ${id}-handle-status`"
            :aria-invalid="status === 'invalid' || status === 'taken' ? 'true' : undefined"
            :value="handle ?? ''"
            @input="onInput"
            @blur="onBlur"
        />
        <div :id="`${id}-handle-status`" class="handle-field__preview" :class="`is-${status}`" aria-live="polite">
            <p class="handle-field__url">{{ before }}<strong>{{ shown || '…' }}</strong>{{ after }}</p>
            <p v-if="status !== 'empty'" class="handle-field__status">
                {{ t(`campaign.profile.handleStatus.${status}`) }}
                <button v-if="suggestion" type="button" class="handle-field__suggestion" @click="useSuggestion">
                    {{ t('campaign.profile.handleTry', {handle: suggestion}) }}
                </button>
            </p>
        </div>
    </div>
</template>

<style scoped>
.handle-field__preview {
    margin-block-start: .8rem;
    padding: 1rem 1.4rem;
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--secondary) 8%, var(--card-background));
    font-size: 1.4rem;

    &.is-taken,
    &.is-invalid {
        background: color-mix(in srgb, var(--negative, #e5484d) 8%, var(--card-background));
    }
}

.handle-field__url {
    margin: 0;
    opacity: 1;
    overflow-wrap: anywhere;
    text-wrap: wrap;

    strong {
        color: var(--primary);
    }
}

.handle-field__status {
    margin: .4rem 0 0;
    font-weight: 600;

    .is-free & {
        color: var(--positive, #1a7f37);
        opacity: 1;
    }

    .is-taken &,
    .is-invalid & {
        color: var(--negative, #e5484d);
        opacity: 1;
    }
}

.handle-field__suggestion {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    margin-inline-start: .4rem;
    color: var(--primary);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
}
</style>
