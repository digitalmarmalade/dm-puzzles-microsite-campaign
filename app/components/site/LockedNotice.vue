<script setup>
//  Shown in place of a gated route's content while the visitor is logged out.
//  The login modal sits on top; this is what's behind it (and what remains if
//  they dismiss the modal), with a way to reopen it or head back.
const gate = useLoginGate()
const {t} = useI18n()

const reason = computed(() => gate.reason)
const reasonText = computed(() =>
    reason.value ? t(reason.value.key, reason.value.params || {}) : t('auth.loginPrompt'))
</script>

<template>
    
        <Wrapper v-if="reason?.key === 'auth.loginToStats'">
            <StatsTeaser sign-in />
        </Wrapper>
        <Wrapper v-else-if="reason?.key === 'auth.loginToFriends'">
            <FriendsWelcome sign-in />
        </Wrapper>
        <Wrapper v-else-if="reason?.key === 'auth.loginToAccount'">
            <AccountTeaser />
        </Wrapper>
        <div v-else class="card locked-notice" :class="reason?.theme">

            <PuzzleIcon v-if="reason?.icon" :icon="reason?.icon"  />
            <svg v-else class="locked-notice__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 10V8a6 6 0 0 1 12 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <rect x="4" y="10" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>             

            <p class="locked-notice__text">{{ reasonText }}</p>

            <div class="locked-notice__actions">

                <Button
                 @click="gate.open(gate.reason)"
                variant="primary"
                >
                    <template #text>
                        {{ $t('auth.logIn') }}
                    </template>
                </Button>
                <NuxtLinkLocale class="locked-notice__back" to="/">{{ $t('auth.backHome') }}</NuxtLinkLocale>
            </div>
        </div>
    
</template>

<style scoped>

.card {
    max-inline-size: 60rem;
    inline-size: 90%;
    margin: 0 auto;
}

.locked-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    text-align: center;
    padding: 6rem 2rem;
    color: var(--text-colour, #212121);
}

.locked-notice__icon {
    inline-size: 4.8rem;
    block-size: 4.8rem;
    color: var(--text-colour-secondary);
}

/* puzzle variant icon (shown instead of the padlock on the puzzle page) */
.locked-notice__icon--puzzle {
    inline-size: 7rem;
    block-size: 7rem;
    color: rgba(var(--puzzle-tile-shadow), .9);
}

.locked-notice__text {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 600;
    max-inline-size: 38rem;
}

.locked-notice__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
}

.locked-notice__btn {
    padding: .9rem 2rem;
    border-radius: 2rem;
    border: 1px solid var(--text-colour, #212121);
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    font-size: 1.4rem;
    font-weight: 700;
    cursor: pointer;
}

.locked-notice__back {
    font-size: 1.4rem;
    color: var(--text-colour-secondary);
}
</style>
