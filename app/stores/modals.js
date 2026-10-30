import {defineStore} from 'pinia'

export const useModalStore = defineStore('modalStore', {
    state: () => ({
        openList: [],
    }),
    getters: {
        isOpen: (state) => {
            return (id) => state.openList.includes(id)
        },
    },
    actions: {
        close(id) {
            if (id) {
                this.openList = this.openList.filter(m => m !== id)
            } else {
                this.openList = []
            }
        },
        open(id) {
            this.close(id)
            this.openList.push(id)
        },
        toggle(id) {
            if (this.isOpen(id)) {
                this.close(id)
            } else {
                this.openList.push(id)
            }
        },
    }
})
