<script setup>
const {t} = useI18n()
useHead({title: () => t('friends.join.title')})

const groupsStore = useGroupsStore()
const user = useUserStore()
const route = useRoute()

const code = ref(String(route.query.code ?? ''))
const displayName = ref(user.name ?? '')
const error = ref('')
const saving = ref(false)

watch([code, displayName], () => { error.value = '' })

async function submit() {
    if (saving.value) return
    const groupCode = code.value.trim()
    if (!groupCode) return (error.value = t('friends.join.errNoCode'))
    if (groupCode.length < 6) return (error.value = t('friends.join.errCodeShort'))
    if (!displayName.value.trim()) return (error.value = t('friends.errNoDisplayName'))
    saving.value = true
    if (displayName.value.trim() !== user.name) user.setName(displayName.value.trim())
    const resp = await groupsStore.groupJoin(groupCode, user)
    saving.value = false
    if (resp?.type === 'negative') return (error.value = resp.message)
    navigateTo('/friends')
}
</script>

<template>
  <NuxtLayout>
    <Wrapper class="friends-form-page">
        <form class="card card--main friends-form" novalidate @submit.prevent="submit">
            <h1 class="friends-form__title">{{ t('friends.join.title') }}</h1>

            <div class="friends-form__field">
                <label for="groupCode">{{ t('friends.join.codeLabel') }}</label>
                <input id="groupCode" v-model="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" class="friends-form__code" />
                <p class="friends-form__help">{{ code && route.query.code ? t('friends.join.fromLink') : t('friends.join.codeHelp') }}</p>
            </div>

            <div class="friends-form__field">
                <label for="displayName">{{ t('friends.nameLabel') }}</label>
                <input id="displayName" v-model="displayName" type="text" autocomplete="nickname" />
                <p class="friends-form__help">{{ t('friends.nameHelp') }}</p>
            </div>

            <p v-if="error" class="friends-form__error" role="alert">{{ error }}</p>

            <ButtonGroup justify="space" class="friends-form__actions">
                <TextButton url="/friends" colour="primary">
                    <template #text><span>{{ t('common.cancel') }}</span></template>
                </TextButton>
                <Button type="submit" icon="right-arrow">
                    <template #text><span>{{ t('friends.join.submit') }}</span></template>
                </Button>
            </ButtonGroup>
            <p class="friends-form__note">{{ t('friends.join.approvalNote') }}</p>
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

    label {
        font-size: 1.6rem;
        font-weight: 700;
    }

    input {
        font-size: 1.8rem;
    }
}

.friends-form__code {
    letter-spacing: .3rem;
}

.friends-form__help {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
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

.friends-form__note {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.3rem;
    text-align: center;
}
</style>
