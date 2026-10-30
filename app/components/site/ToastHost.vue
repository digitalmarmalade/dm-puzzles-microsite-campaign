<script setup>

const toasts = useToastStore()

const DEFAULT_ICON = {
    success: 'positive',
    error: 'negative',
    warning: 'attention',
    info: 'attention',
    achievement: 'gold',
    streak: 'streak',
}

const iconFor = (t) => t.icon || DEFAULT_ICON[t.type] || 'attention'

function openToast(t) {
    toasts.dismiss(t.id)
    t.onClick?.()
}

function runAction(t, action) {
    toasts.dismiss(t.id)
    action.onClick?.()
}
</script>

<template>
    <Teleport to="body">
        <div class="toast-stack" role="region" aria-live="polite" :aria-label="$t('common.notifications')">
            <TransitionGroup name="toast">
                <div
                    v-for="t in toasts.toasts"
                    :key="t.id"
                    class="toast"
                    :class="`toast-${t.type}`"
                    role="status"
                >
                    <div class="toast-content" :class="{'toast-content--link': t.onClick}" @click="t.onClick && openToast(t)">
                        <span class="toast-icon" :class="{'toast-icon--image': t.iconSrc, 'toast-icon--small': t.iconSize === 'small'}">
                            <img v-if="t.iconSrc" :src="t.iconSrc" alt="">
                            <svg v-else aria-hidden="true"><use :href="sprite(iconFor(t))" /></svg>
                        </span>
                        <div class="toast-body">
                            <p v-if="t.title" class="toast-title">{{ t.title }}</p>
                            <p class="toast-message">
                                <button v-if="t.onClick" type="button" class="toast-link" @click.stop="openToast(t)">{{ t.message }}</button>
                                <template v-else>{{ t.message }}</template>
                            </p>
                            <div v-if="t.actions.length" class="toast-actions">
                                <button
                                    v-for="action in t.actions"
                                    :key="action.label"
                                    type="button"
                                    class="toast-action"
                                    :class="{'toast-action--primary': action.primary}"
                                    @click="runAction(t, action)"
                                >{{ action.label }}</button>
                            </div>
                        </div>
                        <button type="button" class="toast-close" :aria-label="$t('common.close')" @click.stop="toasts.dismiss(t.id)">
                            <svg aria-hidden="true"><use :href="sprite('close')" /></svg>
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>
