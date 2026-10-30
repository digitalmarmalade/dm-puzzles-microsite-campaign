import {defineStore} from 'pinia'

//  Toast notifications. Flexible by design — a toast is:
//    { type, message, title?, icon?, iconSrc?, iconSize?, duration, actions?, onClick? }
//  `type` drives the accent colour + default icon (success / error / warning /
//  info / achievement). `icon` overrides the sprite symbol (e.g. 'gold' for an
//  achievement). `duration` is ms before auto-dismiss; 0 keeps it until closed.
let nextId = 0

export const useToastStore = defineStore('toast', {
    state: () => ({
        toasts: [],
    }),
    actions: {
        add(toast = {}) {
            const id = ++nextId
            const entry = {
                id,
                type: toast.type ?? 'info',
                title: toast.title ?? '',
                message: toast.message ?? '',
                icon: toast.icon ?? null,
                iconSrc: toast.iconSrc ?? null,
                duration: toast.duration ?? 4000,
                actions: toast.actions ?? [],
                onClick: toast.onClick ?? null,
                iconSize: toast.iconSize ?? null,
            }
            this.toasts.push(entry)
            if (entry.duration > 0) {
                setTimeout(() => this.dismiss(id), entry.duration)
            }
            return id
        },
        dismiss(id) {
            this.toasts = this.toasts.filter((t) => t.id !== id)
        },
        clear() {
            this.toasts = []
        },

        //  convenience helpers — `opts` can carry title / icon / duration
        success(message, opts = {}) { return this.add({...opts, type: 'success', message}) },
        error(message, opts = {}) { return this.add({...opts, type: 'error', message}) },
        warning(message, opts = {}) { return this.add({...opts, type: 'warning', message}) },
        info(message, opts = {}) { return this.add({...opts, type: 'info', message}) },
        //  achievement toasts get a title + a longer default dwell
        achievement(title, message, opts = {}) {
            return this.add({duration: 6000, icon: 'gold', ...opts, type: 'achievement', title, message})
        },
        streak(title, message, opts = {}) {
            return this.add({duration: 5000, icon: 'streak', ...opts, type: 'streak', title, message})
        },
    },
})
