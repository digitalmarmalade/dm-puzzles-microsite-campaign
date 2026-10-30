<script setup>
const modals = inject('modals')
const user = inject('user')

//  FORM SUBMISSION
const submit = (e) => {
    const formData = new FormData(e.target)
    const displayName = formData.get('displayName')
    if (displayName) {
        modals.close()
        user.setName(displayName)
    }
}
</script>

<template>
    <Modal id="modal-member-name" narrowContent=true>
        <template #title>
            <span>{{ user.name ? $t('friends.modal.changeDisplayName') : $t('friends.modal.addDisplayName') }}</span>
        </template>

        <form
            @submit.prevent="submit"
        >
            <div class="form-input">
                <label for="displayName" class="sr-only">{{ $t('friends.modal.displayNameSr') }}</label>
                <p>{{ $t('friends.modal.displayNameHelp') }}</p>
                <input type="text" id="displayName" name="displayName" class="text-start" :value="user.name"
                    autocomplete="off" required/>
            </div>
            <ButtonGroup
                justify='space'
            >
                <TextButton
                    colour='primary'
                    @click.prevent="modals.close()"
                >
                    <template #text>
                        <span>{{ $t('common.cancel') }}</span>
                    </template>
                </TextButton>
                <Button
                    icon="right-arrow"
                    type="submit"
                >
                    <template #text>
                        <span>{{ $t('common.enter') }}</span>
                    </template>
                </Button>

            </ButtonGroup>
        </form>

        <template #footer>
            <span></span>
        </template>

    </Modal>
</template>
