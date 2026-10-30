<script setup>
const props = defineProps(['className', 'justify'])
const {className = '', justify = 'center'} = props;

const baseClasses = 'button-group';
const justifyClasses = {
    center: 'button-group--center',
    start: 'button-group--start',
    end: 'button-group--end',
    space: 'button-group--space',
};
const buttonGroupClasses = [baseClasses, justifyClasses[justify], className].join(' ');
</script>

<template>
    <div
        :class="buttonGroupClasses"
    >
        <slot/>
    </div>
</template>


<style scoped>

.button-group {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    inline-size: 100%;

    @media (width < 600px) {
        flex-direction: row;
    }
}

.button-group--start {
    justify-content: flex-start;
}

.button-group--end {
    justify-content: flex-end;
}

.button-group--space {
    justify-content: space-between;
}

</style>
