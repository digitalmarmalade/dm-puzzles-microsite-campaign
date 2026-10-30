<script setup>
const {groups} = defineProps(['groups'])
</script>

<template>
    <h1 class="friends-leagues__title">{{ $t('friends.title') }}</h1>
    <GroupCards :groups="groups">
        <FriendsUserCard />
    </GroupCards>
</template>

<style scoped>
.friends-leagues__title {
    text-align: center;
}
</style>
