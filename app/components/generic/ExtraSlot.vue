<script setup>
const props = defineProps({
    name: {type: String, required: true},
})
const extras = useExtras(props.name)
</script>

<template>
    <component :is="extra.component" v-for="(extra, i) in extras" :key="i" />
</template>
