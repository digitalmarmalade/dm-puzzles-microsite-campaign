<script setup>
const {locale, locales, setLocale} = useI18n()

const available = computed(() => locales.value)

function onChange(event) {
    setLocale(event.target.value)
}
</script>

<template>
    <select
        v-if="available.length > 1"
        class="lang-switcher"
        name="language-switcher"
        :value="locale"
        :aria-label="$t('language.label')"
        @change="onChange"        
    >
        <component :is="'button'" class="lang-switcher__button">
            <selectedcontent class="lang-switcher__selected"></selectedcontent>
            <svg class="lang-switcher__chev" aria-hidden="true">
                <use :href="sprite('down-arrow')" />
            </svg>
            <span class="sr-only">Select Language:</span>
        </component>

        <option
            v-for="loc in available"
            :key="loc.code"
            :value="loc.code"
        >
            <LangFlag :code="loc.code" />
            <component :is="'span'" class="lang-switcher__label">{{ loc.name }}</component>
        </option>
    </select>
</template>

<style>

.lang-switcher,
.lang-switcher::picker(select) {
    appearance: base-select;
}

/* closed-state control */
.lang-switcher {
    border: 1px solid var(--card-border);
    border-radius: .25rem;
    color: var(--nav-link);
    cursor: pointer;
    padding: 0;
    block-size: 4rem;
}

.lang-switcher__button {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .5rem 1rem;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.lang-switcher__selected {
    display: inline-flex;
    align-items: center;
}

.lang-switcher__selected .lang-switcher__label {
    display: none;
}

.lang-switcher__chev {
    inline-size: 1.6rem;
    block-size: 1.6rem;
    flex: none;
    transition: transform .25s ease;
}

.lang-switcher:open .lang-switcher__chev {
    transform: rotate(180deg);
}

.lang-switcher::picker-icon {
    display: none;
}

.lang-switcher::picker(select) {
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius);
    background: var(--card-background);
    box-shadow: var(--card-shadow);
    padding: .4rem;
    margin-block-start: .4rem;
}

.lang-switcher option {
    display: flex;
    align-items: center;
    gap: .8rem;
    padding: .6rem .8rem;
    border-radius: var(--border-radius-inner, .6rem);
    font-size: 1.4rem;
    color: var(--text-colour, #212121);
    cursor: pointer;
}

.lang-switcher option:focus {
    background: var(--puzzle-tile-background);
}

.lang-switcher option:hover {
    @media (hover: hover) {
        background: var(--puzzle-tile-background);
    }
}

.lang-switcher option:checked {
    font-weight: 700;
}

.lang-switcher option::checkmark {
    display: none;
}

@supports not (appearance: base-select) {
    .lang-switcher {
        appearance: none;
        -webkit-appearance: none;
        font: inherit;
        font-size: 1.4rem;
        line-height: 1;
        padding-block: 0;
        padding-inline: 1rem 3rem;
        background-color: var(--card-background, transparent);
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23555' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 6l4 4 4-4'/></svg>");
        background-repeat: no-repeat;
        background-position: right .8rem center;
        background-size: 1.2rem;
        @media (hover: hover) {
            &:hover {
                border-color: var(--text-colour, #212121);
            }
        }
    }

    .lang-switcher:focus-visible {
        outline: 2px solid var(--favourited, var(--primary, #212121));
        outline-offset: 2px;
    }
}
</style>
