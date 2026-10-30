<script setup>
import Archive from '@/api/Archive.js'

const {t, tm, rt} = useI18n()
useHead({title: () => t('friends.create.title')})

const store = useGroupsStore()
const user = useUserStore()
const puzzles = Archive.getPuzzleNameSlugs()

const groupName = ref('')
const displayName = ref(user.name ?? '')
const chosen = ref([])
const error = ref('')
const saving = ref(false)

watch([groupName, displayName, chosen], () => { error.value = '' }, {deep: true})

let deck = []

function generateName() {
    if (!deck.length) {
        deck = (tm('friends.create.suggestions') ?? []).map(n => (typeof n === 'string' ? n : rt(n)))
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[deck[i], deck[j]] = [deck[j], deck[i]]
        }
    }
    const next = deck.pop()
    if (next === groupName.value && deck.length) return generateName()
    if (next) groupName.value = next
}

function toggle(slug) {
    chosen.value = chosen.value.includes(slug) ? chosen.value.filter(s => s !== slug) : [...chosen.value, slug]
}

async function submit() {
    if (saving.value) return
    if (!groupName.value.trim()) return (error.value = t('friends.create.errNoName'))
    if (!displayName.value.trim()) return (error.value = t('friends.errNoDisplayName'))
    if (!chosen.value.length) return (error.value = t('common.errSelectPuzzles'))
    saving.value = true
    if (displayName.value.trim() !== user.name) user.setName(displayName.value.trim())
    const group = await store.groupCreate({name: groupName.value.trim(), variants: chosen.value}, user)
    navigateTo(`/friends/invite/${group.id}`)
}
</script>

<template>
  <NuxtLayout>
    <Wrapper class="friends-form-page">
        <form class="card card--main friends-form" novalidate @submit.prevent="submit">
            <h1 class="friends-form__title">{{ t('friends.create.title') }}</h1>

            <div class="friends-form__field">
                <div class="friends-form__label-row">
                    <label for="groupName">{{ t('friends.create.nameLabel') }}</label>
                    <button type="button" class="friends-form__generate" @click="generateName">{{ t('friends.create.generate') }}</button>
                </div>
                <input id="groupName" v-model="groupName" type="text" autocomplete="off" />
            </div>

            <div class="friends-form__field">
                <label for="displayName">{{ t('friends.nameLabel') }}</label>
                <input id="displayName" v-model="displayName" type="text" autocomplete="nickname" />
                <p class="friends-form__help">{{ t('friends.nameHelp') }}</p>
            </div>

            <fieldset class="friends-form__field">
                <legend>{{ t('friends.create.includeHeading') }}</legend>
                <div class="friends-form__chips">
                    <button
                        v-for="{name, slug} in puzzles"
                        :key="slug"
                        type="button"
                        class="friends-form__chip"
                        :class="{'friends-form__chip--on': chosen.includes(slug)}"
                        :aria-pressed="chosen.includes(slug)"
                        @click="toggle(slug)"
                    >{{ name }}</button>
                </div>
            </fieldset>

            <p v-if="error" class="friends-form__error" role="alert">{{ error }}</p>

            <ButtonGroup justify="space" class="friends-form__actions">
                <TextButton url="/friends" colour="primary">
                    <template #text><span>{{ t('common.cancel') }}</span></template>
                </TextButton>
                <Button type="submit" icon="right-arrow">
                    <template #text><span>{{ t('friends.create.submit') }}</span></template>
                </Button>
            </ButtonGroup>
        </form>
    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
.wrapper.friends-form-page {
    flex-grow: 1;
    justify-content: safe center;
    padding-block: 4rem;
}

.friends-form {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
    max-inline-size: 56rem;
    margin-inline: auto;
}

.friends-form__title {
    margin: 0;
    font-size: var(--page-h2-size, 2.8rem);
    text-align: center;
}

.friends-form__field {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    margin: 0;
    padding: 0;
    border: 0;

    label,
    legend {
        padding: 0;
        font-size: 1.6rem;
        font-weight: 700;
    }

    legend {
        margin-block-end: .8rem;
    }

    input {
        font-size: 1.8rem;
    }
}

.friends-form__label-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
}

.friends-form__generate {
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

.friends-form__help {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
}

.friends-form__chips {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;
}

.friends-form__chip {
    padding: .8rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 999px;
    background: var(--card-background, #fff);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.4rem;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, color .15s ease;

    &.friends-form__chip--on {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--text-on-primary, #fff);
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:not(.friends-form__chip--on):hover {
            border-color: var(--primary);
        }
    }
}

.button-group.friends-form__actions {
    flex-wrap: wrap-reverse;
}

.friends-form__error {
    margin: 0;
    color: var(--error, #c0392b);
    font-size: 1.4rem;
    font-weight: 700;
    text-align: center;
}
</style>
