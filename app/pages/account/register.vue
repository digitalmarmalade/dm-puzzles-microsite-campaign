<script setup>
const {t} = useI18n()
useHead({title: () => t('account.createTitle')})

const router = useRouter()
const localePath = useLocalePath()

function onSuccess() {
    router.replace(localePath('/'))
}
</script>

<template>
  <NuxtLayout>
    <Wrapper>

        <PageHeading>
            <template #heading>{{ $t('account.createTitle') }}</template>
        </PageHeading>

        <div class="card card--main">

            <div class="form-holder">

                <RegisterForm @success="onSuccess" />

                <TextButton url="/account/login">
                    <template #text>
                        <span>{{ $t('account.haveAccount') }}</span>
                    </template>
                </TextButton>

            </div>

        </div>

    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
    .form-holder {
        max-inline-size: 50rem;
        inline-size: 100%;
        margin-inline: auto;
    }
</style>