<script setup>
const localePath = useLocalePath()

const props = defineProps(['className', 'icon', 'iconPosition', 'size', 'type', 'url', 'variant'])
const {className = '', size = 'md', icon, iconPosition = 'after', type = 'button', url, variant = 'primary'} = props;

const iconHref = icon ? sprite(icon) : '';

const baseClasses = 'button';
const sizeClasses = {sm: 'button--small', md: 'button--medium', lg: 'button--large'};
const variantClasses = {primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', danger: 'danger'};
const buttonClasses = [baseClasses, sizeClasses[size], variantClasses[variant], className].join(' ');
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

        <button
            v-if="!url"
            :type="type"
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
.button {
    /* variant tokens — overridden by .secondary / .danger below */
    --button-bg: var(--button-primary);
    --button-fg: var(--text-on-primary, #fff);
    --button-bg-hover: var(--button-primary-hover);

    align-items: center;
    background-color: var(--button-bg);
    border: 1px solid transparent;
    border-radius: 999px;
    display: inline-flex;
    justify-content: center;
    color: var(--button-fg);
    cursor: pointer;
    font-size: var(--button-font-size, 1.6rem);
    font-family: var(--font-sans);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 1px;
    gap: .2rem;
    line-height: 1;
    min-inline-size: 12rem;
    padding-block: var(--button-py);
    padding-inline: var(--button-px);
    text-align: center;
    text-decoration: none;
    box-shadow: 0 1px 1px rgba(var(--primary-rgb), .4);
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover {
            background-color: var(--button-bg-hover);
            transform: translateY(-.1rem);
            box-shadow: 0 3px 3px rgba(var(--primary-rgb), .3);
        }
    }
}

.button:active {
    background-color: var(--button-bg-hover);
    transform: translateY(.1rem);
    box-shadow: 0 0 1px rgba(var(--primary-rgb), .3);
}

/* -------- variants -------- */
.button.secondary {
    --button-bg: var(--button-secondary);
    --button-fg: var(--button-secondary-foreground, #fff);
    --button-bg-hover: var(--button-secondary);

    @media (hover: hover) {
        &:hover {
            filter: brightness(1.12);
        }
    }
}

.button.tertiary {
    --button-bg: var(--button-tertiary, #fff);
    --button-fg: var(--button-tertiary-foreground, var(--text-colour));
    --button-bg-hover: var(--button-tertiary-hover, var(--app-bg));

    border: 1px solid var(--card-border);
    box-shadow: none;

    @media (hover: hover) {
        &:hover {
            filter: brightness(1.12);
        }
    }
}

.button.danger {
    --button-bg: var(--danger);
    --button-fg: #fff;
    --button-bg-hover: var(--danger);

    @media (hover: hover) {
        &:hover {
            filter: brightness(1.08);
        }
    }
}

/* -------- sizes -------- */
.button.button--small {
    --button-px: 1.4rem;
    --button-py: 1rem;
    --button-font-size: 1.5rem;
    min-inline-size: unset;
    gap: .4rem;
    letter-spacing: .5px;
}

.button-text {
    white-space: nowrap;
}

svg {
    display: block;
    block-size: 1.6rem;
    inline-size: 1.6rem;
}

.button--small svg {
    block-size: 1.3rem;
    inline-size: 1.3rem;
}
</style>
