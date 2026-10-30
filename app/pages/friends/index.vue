<script setup>
import Archive from '@/api/Archive.js'
import {sampleLeagues} from '@/lib/friendsPreview'

const {t} = useI18n()
useHead({title: () => t('friends.title')})

const modals = useModalStore()
const user = useUserStore()
const preview = usePreview()
provide('modals', modals)
provide('user', user)

const samples = computed(() => preview.is('friends-leagues')
    ? sampleLeagues(user.uid, user.name, Archive.getPuzzleNameSlugs().map(p => p.slug))
    : null)
const showWelcome = computed(() => preview.is('friends-welcome') || (!samples.value && !user.groups?.length))
</script>

<template>
  <NuxtLayout>
      <Wrapper v-if="user.isLoaded || samples || preview.is('friends-welcome')" :class="{'friends-page--leagues': !showWelcome}">
        <FriendsWelcome v-if="showWelcome" />

        <FriendGroupsPanelList
            v-else
            :groups="samples ?? user.groupsList"
        ></FriendGroupsPanelList>

    </Wrapper>

    <ModalMemberName></ModalMemberName>
  </NuxtLayout>
</template>

<style scoped>
.wrapper.friends-page--leagues {
    flex-grow: 1;
    justify-content: safe center;
}

form {
    inline-size: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--vertical-rhythm);
    align-items: flex-start;
}
.card { 
    padding: var(--card-main-padding); 
}
.empty-icon {
    block-size: 100%;
    inline-size: 100%;
}
</style>