
export default defineNuxtPlugin((nuxtApp) => {
    const preview = usePreview()
    preview.restore()
    window.__preview = (names = 'all') => {
        preview.set(names)
        return preview.active.value
    }

    nuxtApp.hook('app:mounted', () => {
        const t = nuxtApp.$i18n.t
        if (preview.is('gate-used')) {
            useLoginGate().open({key: 'auth.freePlayUsed'})
            preview.hide('gate-used')
        }
        const sampleProfile = {id: 'logicBuff', title: t('profile.logicBuff.title'), subtitle: t('profile.logicBuff.subtitle', {v1: 'Sudoku', v2: 'Huedoku'})}
        if (preview.is('profile-modal')) {
            showProfileReveal(sampleProfile)
            preview.hide('profile-modal')
        }
        if (preview.is('profile-toast')) {
            useToastStore().add({
                type: 'achievement',
                iconSrc: `/img/profiles/${sampleProfile.id}.svg`,
                iconSize: 'small',
                message: t('profileAnnounce.changed'),
                duration: 0,
                onClick: () => navigateTo(nuxtApp.$localePath ? nuxtApp.$localePath('/stats') : '/stats'),
            })
            preview.hide('profile-toast')
        }
    })
})
