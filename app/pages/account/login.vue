<script setup>
const {t} = useI18n()
useHead({title: () => t('auth.logIn')})

const auth = useAuthStore()
const router = useRouter()

function onSuccess() {
    //  "logged in" toast is fired centrally by the Firebase auth listener
    const target = auth.to || {path: '/'}
    auth.to = null
    router.replace(target)
}
</script>

<template>
  <NuxtLayout>
    <Wrapper>

        <PageHeading>
            <template #heading>{{ $t('account.signInTitle') }}</template>
        </PageHeading>

        <div class="card card--main">

            <div class="form-holder">

                <LoginForm @success="onSuccess" />

                <TextButton url="/account/register">
                    <template #text>
                        <span>{{ $t('account.noAccount') }}</span>
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