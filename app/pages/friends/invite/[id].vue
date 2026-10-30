<script setup>
const {t} = useI18n()
const route = useRoute()
const groupsStore = useGroupsStore()
const user = useUserStore()

const group = await groupsStore.groupSetCurrent(route.params.id)
if (!group || !groupsStore.memberHasPrivilege(user, 'edit')) {
    throw createError({statusCode: 404, statusMessage: 'Page Not Found'})
}

useHead({title: () => t('friends.invite.title', {name: group?.name ?? ''})})

const invitePanel = ref(null)
</script>

<template>
  <NuxtLayout>
    <Wrapper class="invite-page">
        <section class="card card--main invite">
            <ShareIconButton class="invite__share" :label="t('friends.invite.shareLink')" @click="invitePanel?.shareOrCopy()" />
            <h1 class="invite__title">{{ t('friends.invite.title', {name: group.name}) }}</h1>
            <p class="invite__intro">{{ t('friends.invite.intro') }}</p>

            <FriendsInvitePanel ref="invitePanel" :group="group" />

            <TextButton :url="`/friends/manage/${group.id}`" colour="primary" class="invite__done">
                <template #text><span>{{ t('friends.invite.done') }}</span></template>
            </TextButton>
        </section>
    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
.wrapper.invite-page {
    flex-grow: 1;
    justify-content: safe center;
    padding-block: 4rem;
}

.invite {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    max-inline-size: 56rem;
    margin-inline: auto;
    text-align: center;
}

.invite__share {
    position: absolute;
    inset-block-start: 2rem;
    inset-inline-end: 2rem;
}

.invite__title {
    margin: 0;
    padding-inline: 4.4rem;
    font-size: var(--page-h2-size, 2.8rem);
    text-wrap: balance;
}

.invite__intro {
    max-inline-size: 42rem;
    margin: -1rem 0 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.6rem;
    text-wrap: balance;
}
</style>
