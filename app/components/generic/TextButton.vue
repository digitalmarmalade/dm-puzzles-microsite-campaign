<script setup>
const localePath = useLocalePath()

const props = defineProps(['className', 'icon', 'iconPosition', 'size', 'url', 'colour'])
const {className = '', size = 'regular', icon, iconPosition = 'after', url, colour = 'text'} = props;

const iconHref = icon ? sprite(icon) : '';

const baseClasses = 'text-button';
const sizeClasses = {regular: 'text-button--small', small: 'text-button--medium'};
const colourClasses = {text: 'text-button--text', primary: 'text-button--primary'};
const buttonClasses = [baseClasses, sizeClasses[size], colourClasses[colour], className].join(' ');
</script>

<template>
    <div>
        <NuxtLink
            v-if="url"
            :to="localePath(url)"
            :class="buttonClasses"
        >
            <svg aria-hidden="true"
                v-if="icon && iconPosition === 'before'"
            >
                <use :href="iconHref"></use>
            </svg>
            <span class="button-text"><slot name="text"/></span>
            <svg aria-hidden="true"
                v-if="icon && iconPosition === 'after'"
            >
                <use :href="iconHref"></use>
            </svg>
        </NuxtLink>

        <button type="button"
            v-if="!url"
            :class="buttonClasses"
        >
            <svg aria-hidden="true"
                v-if="icon && iconPosition === 'before'"
            >
                <use :href="iconHref"></use>
            </svg>
            <span class="button-text"><slot name="text"/></span>
            <svg aria-hidden="true"
                v-if="icon && iconPosition === 'after'"
            >
                <use :href="iconHref"></use>
            </svg>
        </button>
    </div>
</template>


<style scoped>

.text-button {
    background: none;
    align-items: center;
    border: none;
    display: inline-flex;
    justify-content: center;
    color: var(--text-colour, #212121);
    font-size: var(--text-button-font-size, 1.6rem);
    font-family: var(--font-sans);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 1px;
    gap: 1rem;
    line-height: 1;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    padding: .4rem .5rem;

    transition: all .2s ease;

    @media (hover: hover) {
        &:hover {
            color: var(--primary);
        }
    }

}

.text-button--small {
    text-transform: none;
    gap: .5rem;
}

.text-button--primary {
    color: var(--primary);

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour);
        }
    }
}

.button-text {
    white-space: nowrap;
}

/* Ensure proper icon alignment */
svg {
    display: block;
    block-size: 1.6rem;
    inline-size: 1.6rem;
}
</style>
