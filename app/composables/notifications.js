export function useNotificationPermission() {
    const supported = import.meta.client && typeof window !== 'undefined' && 'Notification' in window
    const permission = ref(supported ? window.Notification.permission : 'default')

    onMounted(() => {
        if (supported) permission.value = window.Notification.permission
    })

    async function request() {
        if (!supported) return 'default'
        const result = await window.Notification.requestPermission()
        permission.value = result
        return result
    }

    return {supported, permission, request}
}
