<script setup>
const modals = inject('modals')
const groupsStore = inject('groupsStore')
const group = inject('group')
const pendingRemoveId = inject('pendingRemoveId')

const member = computed(() => pendingRemoveId.value ? groupsStore.getMember(pendingRemoveId.value) : null)
const memberName = computed(() => member.value?.name ?? '')

const emit = defineEmits(['removed'])

function confirm() {
    const id = pendingRemoveId.value
    if (!id) return
    const name = memberName.value
    groupsStore.memberRemove(id)
    modals.close()
    pendingRemoveId.value = null
    emit('removed', name)
}

function cancel() {
    modals.close()
    pendingRemoveId.value = null
}
</script>

<template>
    <Modal id="modal-member-remove" narrowContent=true>
        <template #title>
            <span>{{ $t('friends.modal.removeMemberTitle') }}</span>
        </template>

        <form @submit.prevent="confirm">
            <p>{{ $t('friends.modal.removeMemberBody', {name: memberName, group: group.name}) }}</p>

            <ButtonGroup justify="space">
                <TextButton colour="primary" @click.prevent="cancel">
                    <template #text><span>{{ $t('common.cancel') }}</span></template>
                </TextButton>
                <Button variant="danger" type="submit">
                    <template #text><span>{{ $t('friends.modal.removeMemberConfirm') }}</span></template>
                </Button>
            </ButtonGroup>
        </form>

        <template #footer>
            <span></span>
        </template>
    </Modal>
</template>
