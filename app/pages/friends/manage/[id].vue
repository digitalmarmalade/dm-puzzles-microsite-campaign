<script setup>
import Archive from '@/api/Archive.js'

const {t} = useI18n()
const modals = useModalStore()
const toast = useToastStore()
const route = useRoute()
const groupsStore = useGroupsStore()
const user = useUserStore()
const localePath = useLocalePath()
const puzzles = Archive.getPuzzleNameSlugs()

const group = await groupsStore.groupSetCurrent(route.params.id)
if (!group || !groupsStore.memberHasPrivilege(user, 'edit')) {
    throw createError({statusCode: 404, statusMessage: 'Page Not Found'})
}

useHead({title: () => group?.name || t('friends.title')})

const preview = usePreview()
const SAMPLE_MEMBERS = [
    {id: 'sample-1', name: 'Priya Shah', status: 'member', sample: true},
    {id: 'sample-2', name: 'Chris', status: 'member', sample: true},
    {id: 'sample-3', name: 'Alex Morgan', status: 'applied', sample: true},
    {id: 'sample-4', name: 'Jo', status: 'declined', sample: true},
]
const isOwner = (m) => !!m.roles?.includes('owner')
const isMe = (m) => m.id === user.uid
const members = computed(() => [
    ...Object.entries(group.members ?? {}).map(([id, m]) => ({...m, id})),
    ...(preview.is('friends-members') ? SAMPLE_MEMBERS : []),
])
const players = computed(() => members.value
    .filter(m => m.status === 'member')
    .sort((a, b) => Number(isOwner(b)) - Number(isOwner(a)) || (a.name ?? '').localeCompare(b.name ?? '')))
const requests = computed(() => members.value.filter(m => m.status === 'applied' || m.status === 'declined'))

function accept(m) {
    if (m.sample) return
    groupsStore.memberRequestToJoinAccept(m.id)
    toast.success(t('friends.manage.accepted', {name: m.name}))
}

function decline(m) {
    if (m.sample) return
    groupsStore.memberRequestToJoinDecline(m.id)
    toast.info(t('friends.manage.declinedToast', {name: m.name}))
}

const pendingRemoveId = ref(null)
const invitePanel = ref(null)
function remove(m) {
    if (m.sample) return
    pendingRemoveId.value = m.id
    modals.open('modal-member-remove')
}

const onMemberRemoved = (name) => toast.info(t('friends.manage.removed', {name}))

const chosen = ref([...(group.puzzles ?? [])])
const puzzleStatus = ref('')
let statusTimer = null

function togglePuzzle(slug) {
    const next = chosen.value.includes(slug) ? chosen.value.filter(s => s !== slug) : [...chosen.value, slug]
    clearTimeout(statusTimer)
    if (!next.length) {
        puzzleStatus.value = 'error'
        return
    }
    chosen.value = next
    groupsStore.groupUpdatePuzzleTypes(next)
    puzzleStatus.value = 'saved'
    statusTimer = setTimeout(() => { puzzleStatus.value = '' }, 2000)
}

async function onGroupDeleted(name) {
    toast.info(t('friends.manage.deleted', {name}))
    await navigateTo(localePath('/friends'))
}

onBeforeUnmount(() => clearTimeout(statusTimer))

provide('group', group)
provide('modals', modals)
provide('groupsStore', groupsStore)
provide('user', user)
provide('pendingRemoveId', pendingRemoveId)
</script>

<template>
  <NuxtLayout>
    <Wrapper v-if="user.isLoaded" class="manage-page">
        <div class="manage">
            <NuxtLinkLocale to="/friends" class="manage__back">
                <svg aria-hidden="true"><use :href="sprite('left-arrow')" /></svg>
                {{ t('friends.allFriendGroups') }}
            </NuxtLinkLocale>

            <header class="manage__header">
                <h1 class="manage__title">{{ group.name }}</h1>
                <button type="button" class="manage__rename" :aria-label="t('friends.modal.changeGroupName')" :title="t('friends.modal.changeGroupName')" @click="modals.open('modal-group-name')">
                    <svg aria-hidden="true"><use :href="sprite('edit')" /></svg>
                </button>
            </header>

            <section v-if="requests.length" class="card card--main manage__section">
                <h2 class="manage__heading">{{ t('friends.manage.requestsTitle') }}</h2>
                <ul class="manage__list">
                    <li v-for="m in requests" :key="m.id" class="manage__row">
                        <UserBadge class="manage__avatar" :name="m.name" />
                        <span class="manage__name">
                            {{ m.name }}
                            <span v-if="m.status === 'declined'" class="manage__badge manage__badge--muted">{{ t('friends.members.declined') }}</span>
                        </span>
                        <span class="manage__actions">
                            <button v-if="m.status === 'applied'" type="button" class="manage__text-button" @click="decline(m)">{{ t('friends.members.decline') }}</button>
                            <button type="button" class="manage__pill" @click="accept(m)">{{ t('friends.members.accept') }}</button>
                        </span>
                    </li>
                </ul>
            </section>

            <section class="card card--main manage__section">
                <h2 class="manage__heading">{{ t('friends.manage.playersTitle', {n: players.length}) }}</h2>
                <ul class="manage__list">
                    <li v-for="m in players" :key="m.id" class="manage__row">
                        <UserBadge class="manage__avatar" :class="{'manage__avatar--me': isMe(m)}" :name="m.name" />
                        <span class="manage__name">
                            {{ m.name }}
                            <span v-if="isMe(m)" class="manage__badge">{{ t('friends.members.you') }}</span>
                            <span v-else-if="isOwner(m)" class="manage__badge manage__badge--muted">{{ t('friends.manage.owner') }}</span>
                        </span>
                        <span class="manage__actions">
                            <button v-if="!isMe(m) && !isOwner(m)" type="button" class="manage__text-button manage__text-button--danger" @click="remove(m)">{{ t('friends.members.remove') }}</button>
                        </span>
                    </li>
                </ul>
                <p v-if="players.length <= 1" class="manage__hint">{{ t('friends.manage.onlyOne') }}</p>
            </section>

            <section class="card card--main manage__section">
                <div class="manage__heading-row">
                    <h2 class="manage__heading">{{ t('friends.manage.inviteTitle') }}</h2>
                    <ShareIconButton class="manage__share" :label="t('friends.invite.shareLink')" @click="invitePanel?.shareOrCopy()" />
                </div>
                <FriendsInvitePanel ref="invitePanel" :group="group" />
            </section>

            <section class="card card--main manage__section">
                <div class="manage__heading-row">
                    <h2 class="manage__heading">{{ t('friends.manage.puzzlesTitle') }}</h2>
                    <span class="manage__status" :class="{'manage__status--error': puzzleStatus === 'error'}" role="status">
                        {{ puzzleStatus === 'saved' ? t('friends.manage.saved') : puzzleStatus === 'error' ? t('friends.manage.errLastPuzzle') : '' }}
                    </span>
                </div>
                <p class="manage__hint">{{ t('friends.manage.puzzlesHelp') }}</p>
                <div class="manage__chips">
                    <button
                        v-for="{name, slug} in puzzles"
                        :key="slug"
                        type="button"
                        class="manage__chip"
                        :class="{'manage__chip--on': chosen.includes(slug)}"
                        :aria-pressed="chosen.includes(slug)"
                        @click="togglePuzzle(slug)"
                    >{{ name }}</button>
                </div>
            </section>

            <div class="manage__danger">
                <button type="button" class="manage__text-button manage__text-button--danger" @click="modals.open('modal-group-delete')">{{ t('friends.manage.deleteGroup') }}</button>
            </div>
        </div>

        <ModalGroupName />
        <ModalMemberRemove @removed="onMemberRemoved" />
        <ModalGroupDelete @deleted="onGroupDeleted" />
    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
.wrapper.manage-page {
    padding-block: 2rem 6rem;
}

.manage {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    inline-size: 100%;
    max-inline-size: 64rem;
    margin-inline: auto;
}

.manage__back {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    align-self: flex-start;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour);
        }
    }
}

.manage__header {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.manage__title {
    margin: 0;
    font-size: var(--page-h1-size, 3.6rem);
    line-height: 1.1;
    overflow-wrap: anywhere;
}

.manage__rename {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: 50%;
    background: var(--card-background, #fff);
    color: var(--text-colour-secondary, #666);
    cursor: pointer;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: currentColor;
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            border-color: var(--primary);
            color: var(--primary);
        }
    }
}

.manage__section {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.manage__heading-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
}

.manage__heading {
    margin: 0;
    font-size: 2rem;
}

.manage__share {
    align-self: center;
}

.manage__hint {
    margin: 0;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
}

.manage__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    inline-size: 100%;
}

.manage__row {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding-block: 1.2rem;
    border-block-start: 1px solid var(--card-border);

    &:first-child {
        border-block-start: 0;
        padding-block-start: 0;
    }

    &:last-child {
        padding-block-end: 0;
    }
}

.manage__avatar {
    --user-badge-size: 4rem;
    --user-badge-font-size: 1.4rem;
    --user-badge-border: transparent;
    --user-badge-background: rgba(var(--puzzle-tile-shadow), .12);
    --user-badge-colour: var(--text-colour);

    &.manage__avatar--me {
        --user-badge-background: var(--primary);
        --user-badge-colour: var(--text-on-primary, #fff);
    }
}

.manage__name {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: .8rem;
    min-inline-size: 0;
    font-size: 1.6rem;
    font-weight: 700;
    overflow-wrap: anywhere;
}

.manage__badge {
    padding: .2rem .8rem;
    border-radius: 999px;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: .06rem;
    text-transform: uppercase;

    &.manage__badge--muted {
        background: rgba(var(--puzzle-tile-shadow), .12);
        color: var(--text-colour-secondary, #666);
    }
}

.manage__actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 1.2rem;
}

.manage__text-button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-colour-secondary, #666);
    font: inherit;
    font-size: 1.4rem;
    font-weight: 700;
    cursor: pointer;

    &.manage__text-button--danger {
        color: var(--danger, #c0392b);
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            text-decoration: underline;
        }
    }
}

.manage__pill {
    padding: .6rem 1.4rem;
    border: 0;
    border-radius: 999px;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    font: inherit;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .04rem;
    text-transform: uppercase;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }
}

.manage__status {
    color: var(--positive, #2e7d32);
    font-size: 1.3rem;
    font-weight: 700;

    &.manage__status--error {
        color: var(--danger, #c0392b);
    }
}

.manage__chips {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;
}

.manage__chip {
    padding: .8rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 999px;
    background: var(--card-background, #fff);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.4rem;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, color .15s ease;

    &.manage__chip--on {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--text-on-primary, #fff);
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:not(.manage__chip--on):hover {
            border-color: var(--primary);
        }
    }
}

.manage__danger {
    display: flex;
    justify-content: center;
    padding-block-start: 1rem;
}
</style>
