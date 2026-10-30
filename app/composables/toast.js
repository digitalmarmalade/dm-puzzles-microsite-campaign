//  Ergonomic entry point for firing toasts from anywhere:
//    const toast = useToast()
//    toast.success('Saved')
//    toast.achievement('Achievement unlocked!', 'Completed 10 puzzles', { icon: 'gold' })
export const useToast = () => useToastStore()
