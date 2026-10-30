const registry = shallowReactive({})

export function registerExtra(slot, component, {order = 0} = {}) {
    registry[slot] = [...(registry[slot] ?? []), {component: markRaw(component), order}]
        .sort((a, b) => a.order - b.order)
}

export function useExtras(slot) {
    return computed(() => registry[slot] ?? [])
}
