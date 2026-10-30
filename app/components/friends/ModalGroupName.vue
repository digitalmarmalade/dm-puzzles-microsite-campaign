<script setup>
const modals = inject('modals')
const groupsStore = inject('groupsStore')
const group = inject('group')

const name = ref(group.name)

watch(() => modals.isOpen('modal-group-name'), (open) => {
    if (open) name.value = group.name
})

function submit() {
    const value = name.value.trim()
    if (!value) return
    if (value !== group.name) groupsStore.groupRename(value)
    modals.close()
}
</script>

<template>
    <Modal id="modal-group-name" narrowContent=true>
        <template #title>
            <span>{{ $t('friends.modal.changeGroupName') }}</span>
        </template>

        <form @submit.prevent="submit">
            <div class="form-input">
                <label for="renameGroup" class="sr-only">{{ $t('friends.create.nameLabel') }}</label>
                <input id="renameGroup" v-model="name" type="text" class="text-start" autocomplete="off" required />
            </div>
            <ButtonGroup justify="space">
                <TextButton colour="primary" @click.prevent="modals.close()">
                    <template #text><span>{{ $t('common.cancel') }}</span></template>
                </TextButton>
                <Button icon="right-arrow" type="submit">
                    <template #text><span>{{ $t('common.update') }}</span></template>
                </Button>
            </ButtonGroup>
        </form>

        <template #footer>
            <span></span>
        </template>
    </Modal>
</template>
