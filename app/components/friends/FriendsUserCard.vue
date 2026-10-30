<script setup>
const modals = inject('modals')
const user = inject('user')
</script>

<template>
    <section class="friends-user-card" aria-labelledby="friends-user-card-name">
        <div class="friends-user-card__panel">

            <div class="friends-user-card__user-details">
            <UserBadge class="friends-user-card__badge" :name="user.name" :email="user.email" />
            <h2 id="friends-user-card-name" class="friends-user-card__name">
                <button @click.prevent="modals.open('modal-member-name')">
                    {{ user.name }}
                    <svg aria-hidden="true"><use :href="sprite('edit')"/></svg>
                </button>
            </h2>
            </div>
            <div class="friends-user-card__actions">
                <NuxtLinkLocale to="/friends/create" class="friends-user-card__cta">
                    {{ $t('friends.welcome.create') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </NuxtLinkLocale>
                <NuxtLinkLocale to="/friends/join" class="friends-user-card__cta friends-user-card__cta--ghost">
                    {{ $t('friends.welcome.join') }}
                </NuxtLinkLocale>
            </div>
        </div>
    </section>
</template>

<style scoped>
.friends-user-card {
    --tone: var(--primary);
    --tone-deep: color-mix(in srgb, var(--tone) 45%, #000);
    --tone-mid: color-mix(in srgb, var(--tone) 72%, #000);
    display: flex;
    flex-direction: column;
    block-size: 100%;
    padding: 1rem;
    border-radius: var(--border-radius, 1rem);
    background: linear-gradient(145deg, color-mix(in srgb, var(--tone) 88%, #fff) 0%, var(--tone) 45%, color-mix(in srgb, var(--tone) 85%, #000) 100%);
    box-shadow: var(--card-shadow);

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme-status]) & {
            --tone: color-mix(in srgb, var(--primary) 82%, #000);
        }
    }

    :root[data-theme-status="dark"] & {
        --tone: color-mix(in srgb, var(--primary) 82%, #000);
    }
}

.friends-user-card__panel {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: .4rem;
    padding: 5rem 2rem 2.5rem;
    border: 1px solid rgba(255, 255, 255, .5);
    border-radius: var(--border-radius-inner, 1rem);
    color: var(--text-on-primary);
}
.friends-user-card__user-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
}

.friends-user-card__badge {
    --user-badge-size: 7rem;
    --user-badge-font-size: 3rem;
    --user-badge-border: rgba(255, 255, 255, .55);
    --user-badge-background: var(--text-on-primary);
    --user-badge-colour: var(--tone-deep);
    margin-block-end: 1.2rem;
}

.friends-user-card__name {
    margin: 0;
    font-size: 3.6rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
    overflow-wrap: anywhere;

    button {
        display: inline-flex;
        align-items: center;
        gap: 1.2rem;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-align: start;
        cursor: pointer;

        &:focus-visible {
            outline: 2px solid var(--text-on-primary);
            outline-offset: 4px;
            border-radius: .4rem;
        }
    }

    svg {
        flex: none;
        inline-size: 2rem;
        block-size: 2rem;
        fill: currentColor;
        opacity: .7;
        transition: opacity .15s ease;
    }

    @media (hover: hover) {
        button:hover svg {
            opacity: 1;
        }
    }
}

.friends-user-card__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin-block-start: 2rem;
}

.friends-user-card__cta {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .9rem 1.8rem;
    border: 1px solid var(--text-on-primary);
    border-radius: 2rem;
    background: var(--text-on-primary);
    color: var(--tone-deep);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .06rem;
    text-decoration: none;
    text-transform: uppercase;
    transition: background .15s ease, color .15s ease;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }

    &:focus-visible {
        outline: 2px solid var(--text-on-primary);
        outline-offset: 3px;
    }

    &.friends-user-card__cta--ghost {
        background: transparent;
        color: var(--text-on-primary);

        @media (hover: hover) {
            &:hover {
                background: rgba(255, 255, 255, .2);
            }
        }
    }
}
</style>
