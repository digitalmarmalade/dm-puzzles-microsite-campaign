<script setup>
import Archive from '@/api/Archive.js'
import {slugify, themeSlug} from '@/lib/utils'

const {groups} = defineProps(['groups'])
const user = inject('user')

const MAX_FACES = 4
const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')

const isOwner = (g) => !!g.members[user.uid]?.roles?.includes('owner')
const isApplied = (g) => g.members[user.uid]?.status === 'applied'
const membersOf = (g) => Object.entries(g.members ?? {})
    .filter(([, m]) => m.status === 'member')
    .map(([id, m]) => ({id, name: m.name, isMe: id === user.uid}))
const requestsOf = (g) => Object.values(g.members ?? {}).filter(m => m.status === 'applied').length

const puzzleNames = computed(() => Object.fromEntries(Archive.getPuzzleNameSlugs().map(p => [p.slug, p.name])))
const familyOf = computed(() => Object.fromEntries(Archive.getVariantFamilies()
    .flatMap(f => f.branches.map(b => [b.variantName, f]))))
const lookOf = (name) => {
    const family = familyOf.value[name]
    return family?.isFamily
        ? {icon: family.slug, theme: themeSlug(family.name)}
        : {icon: slugify(name), theme: themeSlug(name)}
}
const puzzlesOf = (g) => (g.puzzles ?? [])
    .filter(slug => puzzleNames.value[slug])
    .map(slug => ({slug, name: puzzleNames.value[slug], ...lookOf(puzzleNames.value[slug])}))
</script>

<template>
    <ul class="group-cards">
        <li v-if="$slots.default" class="group-cards__lead">
            <slot />
        </li>
        <li v-for="g in groups" :key="g.id" class="group-card" :class="{'group-card--pending': isApplied(g)}">

            
            <div class="group-card__status">
                <span v-if="isOwner(g)" class="group-badge group-badge--owner">
                    {{ $t('friends.list.owner') }}
                </span>
                <span v-else-if="isApplied(g)" class="group-badge group-badge--awaiting">
                    {{ $t('friends.list.awaitingApproval') }}
                </span>
                <div v-if="isOwner(g)" class="group-card__owner-actions">
                    <NuxtLinkLocale
                        v-if="requestsOf(g) > 0"
                        class="group-badge group-badge--requests"
                        :to="`/friends/manage/${g.id}`"
                    >
                        {{ $t('friends.list.requests', requestsOf(g)) }}
                    </NuxtLinkLocale>
                    <NuxtLinkLocale
                        class="group-card__manage"
                        :to="`/friends/manage/${g.id}`"
                        :aria-label="$t('friends.list.manage')"
                        :title="$t('friends.list.manage')"
                    >
                        <svg aria-hidden="true"><use :href="sprite('edit')" /></svg>
                    </NuxtLinkLocale>
                </div>
            </div>

            <component
                :is="isApplied(g) ? 'div' : NuxtLinkLocale"
                class="group-card__play"
                v-bind="isApplied(g) ? {} : {to: `/friends/view/${g.id}`}"
            >
                <h3 class="title">{{ g.name }}</h3>

                <div class="group-card__players-holder">
                    <h4 class="group-card__label">{{ $t('friends.list.players') }}</h4>
                    <ul class="group-card__players" aria-hidden="true">
                        <li v-for="m in membersOf(g).slice(0, MAX_FACES)" :key="m.id">
                            <UserBadge class="group-card__player" :class="{'group-card__player--me': m.isMe}" :name="m.name" />
                        </li>
                        <li v-if="membersOf(g).length > MAX_FACES" class="group-card__player group-card__player--more">
                            +{{ membersOf(g).length - MAX_FACES }}
                        </li>
                    </ul>
                </div>

                <div v-if="puzzlesOf(g).length" class="group-card__puzzles-holder">
                    <h4 class="group-card__label">{{ $t('friends.manage.puzzlesTitle') }}</h4>
                    <ul class="group-card__puzzles">
                        <li v-for="p in puzzlesOf(g)" :key="p.slug" class="group-card__puzzle" :class="`puzzle-card--${p.theme}`" :title="p.name">
                            <svg role="img" :aria-label="p.name"><use :href="sprite(p.icon)" /></svg>
                        </li>
                    </ul>
                </div>
            </component>

            <NuxtLinkLocale
                v-if="!isApplied(g)"
                class="group-card__footer"
                :to="`/friends/view/${g.id}`"
            >
                <span>{{ $t('friends.list.view') }}</span>
                <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
            </NuxtLinkLocale>

        </li>
    </ul>
</template>

<style scoped>
.group-cards {
    --gc-gap: var(--grid-gap);
    inline-size: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--gc-gap);
    margin: 0;
    padding: 0;
    list-style: none;
}

.group-card,
.group-cards__lead {
    flex: 1 1 calc((100% - var(--gc-gap)) / 2);
    max-inline-size: calc((100% - var(--gc-gap)) / 2);
    aspect-ratio: 1;

    @media (width >= 1200px) {
        flex-basis: calc((100% - 2 * var(--gc-gap)) / 3);
        max-inline-size: calc((100% - 2 * var(--gc-gap)) / 3);
        aspect-ratio: 4 / 5;
    }

    @media (width < 790px) {
        flex-basis: 100%;
        max-inline-size: 100%;
        aspect-ratio: auto;
    }
}

.group-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    transition: all .25s ease;

    &::before {
        content: '';
        position: absolute;
        inset: 1rem;
        border: 1px solid rgba(var(--puzzle-tile-shadow), .25);
        border-radius: var(--border-radius-inner, 5px);
        pointer-events: none;
    }

    @media (hover: hover) {
        &:not(.group-card--pending):hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}

/* -------- status row -------- */
.group-card__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 3rem 3rem 1.5rem;
    min-block-size: 7.2rem;

    @media (width < 790px) {
        &:empty {
            min-block-size: 2rem;
        }
    }
}

.group-badge {
    font-size: 1.1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 1;
    padding: .8rem 1.4rem;
    border-radius: 999px;
}

.group-badge--owner {
    background: var(--text-colour, #212121);
    color: var(--text-opposite, #fff);
}

.group-badge--requests {
    margin-inline-start: auto;
    border: 1px solid var(--card-border);
    text-decoration: none;
}

.group-badge--awaiting {
    border: 1px solid var(--text-colour, #212121);
    color: var(--text-colour, #212121);
}

/* -------- play link (icon + title) -------- */
.group-card__play {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.4rem;
    padding: 1rem 3rem 3rem;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
}

.title {
    margin: 0 0 .4rem;
    font-size: 2.8rem;
    font-weight: 800;
    line-height: 1.1;
    text-wrap: balance;
    overflow-wrap: anywhere;
}

.group-card__players {
    display: flex;
    margin: 0;
    padding: 0;
    list-style: none;
    gap: .2rem;

    
}

.group-card__player {
    --user-badge-size: 3.2rem;
    --user-badge-font-size: 1.2rem;
    --user-badge-border: var(--card-border, #fff);
    --user-badge-background: var(--card-background);
    --user-badge-border-width: 2px;
}

.group-card__player--me {
    --user-badge-background: var(--app-bg);
}

.group-card__player--more {
    display: grid;
    place-items: center;
    inline-size: 3.2rem;
    block-size: 3.2rem;
    border: 2px solid var(--card-border, #fff);
    border-radius: 50%;
    background: var(--app-bg, #212121);
    color: var(--text-colour);
    font-size: 1.1rem;
    font-weight: 700;
}

.group-card__players-holder {
    margin-block-start: auto;
    padding-block-start: 3rem;
    inline-size: 100%;
}

.group-card__puzzles-holder {
    padding: 1rem 0 0;
    inline-size: 100%;
    border-radius: var(--border-radius-inner);
}

.group-card__label {
    margin: 0 0 1rem;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: .1rem;
    text-transform: uppercase;
}

.group-card__puzzles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.group-card__puzzle {
    display: grid;
    place-items: center;
    inline-size: 5rem;
    block-size: 5rem;
    border-radius: .8rem;
    background: var(--puzzle-tile-background);
    color: var(--puzzle-tile-text);

    svg {
        display: block;
        inline-size: 2.4rem;
        block-size: 2.4rem;
    }
}

/* -------- manage footer -------- */
.group-card__owner-actions {
    display: flex;
    align-items: center;
    gap: .6rem;
    margin-inline-start: auto;
}

.group-card__manage {
    display: grid;
    place-items: center;
    inline-size: 3.2rem;
    block-size: 3.2rem;
    border: 1px solid var(--card-border);
    border-radius: 50%;
    color: inherit;
    transition: background .15s ease;

    svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
        fill: currentColor;
    }

    @media (hover: hover) {
        &:hover {
            background-color: var(--app-bg);
        }
    }
}

div.group-card__play {
    cursor: default;
}

.group-card__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    margin: 0 1rem 1rem;
    padding: 1.2rem;
    background-color: var(--app-bg);
    border-block-start: 1px solid rgba(var(--puzzle-tile-shadow), .25);
    font-size: var(--card-archive-size, 1.2rem);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-decoration: none;
    color: inherit;
    transition: background .15s ease;
    border-end-start-radius: var(--border-radius-inner, 5px);
    border-end-end-radius: var(--border-radius-inner, 5px);

    @media (hover: hover) {
        &:hover {
            background-color: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 10%, var(--app-bg));
        }
    }
}

.group-card__footer svg {
    inline-size: 1.2rem;
    block-size: 1.2rem;
}
</style>
