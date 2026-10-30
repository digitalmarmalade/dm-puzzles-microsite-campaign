<script setup>
const modals = inject('modals')
const groupsStore = inject('groupsStore')
const group = inject('group')
const user = inject('user')

const emit = defineEmits(['deleted'])
const deleting = ref(false)

async function confirm() {
    if (deleting.value) return
    deleting.value = true
    const name = group.name
    try {
        await groupsStore.groupDelete(user)
        modals.close()
        emit('deleted', name)
    } finally {
        deleting.value = false
    }
}
</script>

<template>
    <Modal id="modal-group-delete" narrowContent=true>
        <template #title>
            <span>{{ $t('friends.manage.deleteTitle', {name: group.name}) }}</span>
        </template>

        <form @submit.prevent="confirm">
            <p>{{ $t('friends.manage.deleteBody') }}</p>

            <ButtonGroup justify="space">
                <TextButton colour="primary" @click.prevent="modals.close()">
                    <template #text><span>{{ $t('common.cancel') }}</span></template>
                </TextButton>
                <Button variant="danger" type="submit">
                    <template #text><span>{{ $t('friends.manage.deleteConfirm') }}</span></template>
                </Button>
            </ButtonGroup>
        </form>

        <template #footer>
            <span></span>
        </template>
    </Modal>
</template>
