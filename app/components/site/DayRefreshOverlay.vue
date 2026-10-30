<script setup>
const {refreshing} = useDayRefresh()
</script>

<template>
    <Transition name="day-refresh">
        <div v-if="refreshing" class="day-refresh" role="status" aria-live="polite">
            <div class="day-refresh__spinner" aria-hidden="true">
                <div class="spinner-path" aria-hidden="true">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>

                <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="provider-logo" viewbox=" 0 0 39 60">
                    <path style="fill: var(--primary)" fill="#F17B2D" d="M17 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                    <path style="fill: var(--primary)" fill="#F17B2D" fill-rule="evenodd" d="M0 20.03v35.958C0 58.214 1.71 60 3.849 60c2.138 0 3.905-1.786 3.905-4.012V39.941c.029-2.166 1.768-3.923 3.878-3.923 2.138 0 3.905 1.786 3.905 4.011v7.965c0 2.196 1.74 4.012 3.906 4.012 2.138 0 3.906-1.786 3.906-4.012V40c0-2.196 1.739-4.012 3.905-4.012 2.081 0 3.735 1.845 3.878 3.924v.059c0 2.225 1.767 4.04 3.934 4.04 2.166 0 3.934-1.815 3.934-4.04V20C39 8.96 30.276 0 19.529 0 8.78 0 0 8.99 0 20.03zM18 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm8 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" clip-rule="evenodd"/>
                    <path style="fill: var(--primary)" fill="#F17B2D" d="M29 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                </svg>
            </div>
            <p class="day-refresh__message">{{ $t('common.refreshingPuzzles') }}</p>
        </div>
    </Transition>
</template>

<style scoped>
.day-refresh {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    background: rgba(var(--app-bg-rgb), .70);
    backdrop-filter: blur(6px);    
}

.day-refresh__spinner {
    position: relative;
    block-size: 10rem;
    inline-size: 10rem;
}
.provider-logo { 
    block-size: 6rem;
    inline-size: 3.9rem;
    inset: 50% auto auto 50%;
    position: absolute;
    transform: translate(-50%, -50%); 
}
.spinner-path {
    block-size: 10rem;
    inline-size: 10rem;
    inset: 50% auto auto 50%;
    position: absolute;
    transform: translate(-50%, 0);
  }

  .spinner-path > * {
    animation: spinner 3s infinite;
  }

  .spinner-path > *:after {
    block-size: 1.4rem;
    border-radius: 50%;
    content: '';
    display: block;
    inline-size: 1.4rem;
    position: absolute;
  }

  .spinner-path > *:nth-child(1) {
    animation-delay: .5s;
  }

  .spinner-path > *:nth-child(1):after {
    background: var(--primary);
  }

  .spinner-path > *:nth-child(2) {
    animation-delay: 1s;
  }

  .spinner-path > *:nth-child(2):after {
    background: var(--primary);
  }

  .spinner-path > *:nth-child(3) {
    animation-delay: 1.5;
  }

  .spinner-path > *:nth-child(3):after {
    background: var(--primary);
  }

  .spinner-path > *:nth-child(4) {
    animation-delay: 2s;
  }

  .spinner-path > *:nth-child(4):after {
    background: var(--primary);
  }

  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

.day-refresh__message {
    margin: 0;
    font-size: 1.6rem;
    color: var(--text-colour, #212121);
    text-align: center;
    padding-inline: 2rem;
}

.day-refresh-enter-active,
.day-refresh-leave-active {
    transition: opacity .2s ease;
}
.day-refresh-enter-from,
.day-refresh-leave-to {
    opacity: 0;
}
</style>
