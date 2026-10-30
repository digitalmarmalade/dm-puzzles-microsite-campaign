<script setup>
import {useModalStore} from '@/stores/modals'
const modals = useModalStore()
import Archive from '@/api/Archive.js'

const puzzleNameSlugs = Archive.getPuzzleNameSlugs()
    .map(n => ({...n, slug: Archive.getArchiveSlug(n.name) ?? n.slug}))
    .sort((a, b) => a.name.localeCompare(b.name))
const features = useFeatures()

const {toggleTheme} = useTheme()

const subMenuOpen = ref(false)
const puzzlesToggle = ref(null)
const submenuHolder = ref(null)

async function toggleSubMenu() {
    subMenuOpen.value = !subMenuOpen.value
    if (subMenuOpen.value) {
        await nextTick()
        submenuHolder.value?.querySelector('.nav-variant-card')?.focus()
    }
}
function closeSubMenu() {
    if (!subMenuOpen.value) return
    subMenuOpen.value = false
    puzzlesToggle.value?.focus()
}

const menuOpen = useState('nav:menuOpen', () => false)
const burger = ref(null)
const toggleMenu = () => menuOpen.value = !menuOpen.value
const closeMenu = () => { menuOpen.value = false; subMenuOpen.value = false }

function onKeydown(e) {
    if (e.key !== 'Escape') return
    if (subMenuOpen.value) closeSubMenu()
    else if (menuOpen.value) { menuOpen.value = false; burger.value?.focus() }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
    
    <div class="sub-menu-holder " id="puzzles-submenu"
        ref="submenuHolder"
        role="group"
        :aria-label="$t('nav.puzzles')"
        :class="{'sub-menu-holder--open': subMenuOpen}"
        :inert="!subMenuOpen"
    >
        <button type="button" class="back-button" :aria-label="$t('common.back')" @click="closeSubMenu">
            <svg aria-hidden="true"><use :href="sprite('left-arrow')" /></svg>
        </button>
        <ul class="sub-menu">
            <template
                v-for="nameSlug in puzzleNameSlugs"
              >
                <NavVariantCard
                    :nameSlug
                    @click="closeMenu"
                />
              </template>
        </ul>
    </div>
    
    <div class="puzzle-nav" :class="{'has-subnav': subMenuOpen}">

        <button
            ref="burger"
            type="button"
            class="burger"
            data-guide="nav-menu"
            :class="{'burger--open': menuOpen}"
            :aria-expanded="menuOpen"
            aria-controls="nav-menu"
            :aria-label="$t('nav.menu')"
            @click="toggleMenu"
        >
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        </button>

        <div id="nav-menu" class="nav-menu" :class="{'open': menuOpen}">

            <button type="button" class="close-menu" :aria-label="$t('common.close')" @click="closeMenu">
                <svg aria-hidden="true"><use :href="sprite('close')" /></svg>
            </button>

            <ul class="menu list-style-none">
                <li>
                    <NuxtLinkLocale class="link" to="/" @click="closeMenu">{{ $t('nav.home') }}</NuxtLinkLocale>
                </li>
                <li>
                    <button
                        ref="puzzlesToggle"
                        type="button"
                        class="link"
                        :class="{'active': subMenuOpen === true}"
                        :aria-expanded="subMenuOpen"
                        aria-controls="puzzles-submenu"
                        @click.prevent="toggleSubMenu"
                    >
                        {{ $t('nav.puzzles') }}
                        <svg aria-hidden="true">
                            <use :href="sprite('down-arrow')" />
                        </svg>
                    </button>
                </li>
                <li v-if="features.stats">
                    <NuxtLinkLocale class="link" to="/stats" data-guide="nav-stats" @click="closeMenu">{{ $t('nav.stats') }}</NuxtLinkLocale>
                </li>
                <li v-if="features.friends">
                    <NuxtLinkLocale class="link" to="/friends" @click="closeMenu">{{ $t('nav.friends') }}</NuxtLinkLocale>
                </li>
                <li v-if="features.account">
                    <NuxtLinkLocale class="link" to="/account" @click="closeMenu">{{ $t('nav.account') }}</NuxtLinkLocale>
                </li>
                <li>
                    <button type="button" data-theme-toggle="" :aria-label="$t('nav.toggleTheme')" class="btn-darklight" @click="toggleTheme">
                        <div class="btn-darklight__icon">
                            <div class="btn-darklight__icon-box">
                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M15.5355 8.46447C17.4882 10.4171 17.4882 13.5829 15.5355 15.5355C13.5829 17.4882 10.4171 17.4882 8.46447 15.5355C6.51184 13.5829 6.51184 10.4171 8.46447 8.46447C10.4171 6.51184 13.5829 6.51184 15.5355 8.46447Z"
                                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M12 4V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M12 22V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M18.3599 5.63999L19.0699 4.92999" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M4.93018 19.07L5.64018 18.36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M20 12H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M2 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M18.3599 18.36L19.0699 19.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M4.93018 4.92999L5.64018 5.63999" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                            </div>
                            <div class="btn-darklight__icon-box is--absolute">
                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M18.395 13.027C18.725 12.872 19.077 13.197 18.985 13.55C18.671 14.752 18.054 15.896 17.104 16.846C14.283 19.667 9.77001 19.726 7.02201 16.978C4.27401 14.23 4.33401 9.71601 7.15501 6.89501C8.10501 5.94501 9.24801 5.32801 10.451 5.01401C10.804 4.92201 11.128 5.27401 10.974 5.60401C9.97201 7.74301 10.301 10.305 11.998 12.002C13.694 13.7 16.256 14.029 18.395 13.027Z"
                                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                            </div>
                        </div>
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style>

.burger {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    width: 4rem;
    height: 4rem;
    transition: gap .25s;

    @media (hover: hover) {
        &:hover {
            gap: .7rem;
        }
    }

    @media (width >= 1024px) {
        display: none;
    }

    @media (width < 1024px) {
        &:focus {
            outline: 2px solid #0066cc;
            outline-offset: 2px;
        }
    }
}

.bar {
    @media (width < 1024px) {
        display: block;
        width: 2.5rem;
        border-radius: 1px;
        height: .2rem;
        background-color: var(--text-colour, #333);
        transition: 0.3s;
    }
}

.nav-menu {
    @media (width < 1024px) {
        position: fixed;
        inset: 0;
        background: var(--app-bg, #fff);
        z-index: 10;
        padding: 8rem 3rem 3rem;
        transform: translateX(103%);
        transition: all 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        overflow: auto;
        box-shadow: var(--card-shadow);
        flex-direction: column;
        color: var(--text-colour);
    }
}

.menu {
    display: flex;
    gap: 1rem;
    padding: 0;
    margin: 0;


    @media (width < 1024px) {
        inline-size: 100%;
        max-inline-size: 50rem;
        flex-direction: column;
        container: puzzles-nav / inline-size;

        &:after {
            content: '';
            position: absolute;
            display: block;
            inset: 0;
            background: rgba(0, 0, 0, .2);
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }
    }

}

.has-subnav .menu:after {
    @media (width < 1024px) {
        opacity: 1;
        pointer-events: initial;
    }
}

.has-subnav .nav-menu {
    @media (width < 1024px) {
        padding-block-start: 8.5rem
    }
}

.nav-menu.open {
    @media (width < 1024px) {
        transform: translateX(0);
        border-radius: 0;
    }
}

.menu li .link,
.menu li .btn-darklight {
    @media (width < 1024px) {
        transform: translateX(5rem);
        opacity: 0;
        transition: all 0.3s ease-in-out .12s;
    }
}

.menu li .btn-darklight {
    @media (width < 1024px) {
        padding-inline-start: 2rem;
    }
}

.menu li:nth-child(2) .link {
    @media (width < 1024px) {
        transition-delay: 0.15s;
    }
}

.menu li:nth-child(3) .link {
    @media (width < 1024px) {
        transition-delay: 0.17s;
    }
}

.menu li:nth-child(4) .link {
    @media (width < 1024px) {
        transition-delay: 0.19s;
    }
}

.menu li:nth-child(5) .link {
    @media (width < 1024px) {
        transition-delay: 0.21s;
    }
}

.menu li:nth-child(6) .link,
.menu li:nth-child(6) .btn-darklight {
    @media (width < 1024px) {
        transition-delay: 0.23s;
    }
}

.nav-menu.open .menu li .link,
.nav-menu.open .menu li .btn-darklight {
    @media (width < 1024px) {
        transform: translateX(0);
        opacity: 1;
    }
}

.link {
    font-size: 1.5rem;
    display: flex;
    padding: 2rem;
    text-decoration: none;
    color: var(--nav-link);
    text-transform: uppercase;
    letter-spacing: 1px;
    background: none;
    border: none;
    cursor: pointer;
    gap: .5rem;
    align-items: center;

    > svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;

        @media (width >= 1024px) {
            transition: transform .25s ease;
        }
        @media (width < 1024px) {
            transform: rotate(-90deg);
        }
    }

    @media (width >= 1024px) {
        padding: 1rem;
    }

    &[aria-current='page'] {
        color: var(--primary);
    }


    &.active {
        @media (width >= 1024px) {
            > svg {
                transform: rotate(180deg);
            }
        }
    }

    @media (hover: hover) {
        &:hover {
            color: var(--nav-link-hover);
        }
    }

}

:global(.global-header) {
    @media (width >= 1024px) {
        transition: all .3s ease;
    }
}

:global(.is-stuck .global-header) {
    @media (width >= 1024px) {
        background-color: rgba(var(--app-bg-rgb), .95);
        backdrop-filter: blur(2px);
        border-radius: var(--border-radius);
        border: 1px solid var(--card-border) !important;
        z-index: 30;
        box-shadow: var(--card-shadow);
    }
}

:global(.global-header):has(.sub-menu-holder--open) {
    @media (width >= 1024px) {
        background-color: rgba(var(--app-bg-rgb), .95);
        backdrop-filter: blur(2px);
        border-radius: var(--border-radius) var(--border-radius) 0 0 !important;
        border: 1px solid var(--card-border) !important;
        z-index: 30;
        box-shadow: var(--card-shadow);
    }
}

:global(body):has(.sub-menu-holder--open) {
    @media (width >= 1024px) {
        &:after {
            background: rgba(0, 0, 0, .1);
        }
    }
}

.sub-menu-holder {
    @media (width < 1024px) {
        position: fixed;
        transform: translateX(103%);
        transition: all 0.3s ease-in-out;
        box-shadow: var(--card-shadow);
        inset: 0;
        background-color: var(--app-bg, #fff);
        padding: 10rem 3rem 3rem;
        overflow-y: auto;
        z-index: 21;
    }
    @media (width >= 1024px) {
        position: absolute;
        pointer-events: none;
        z-index: -1;
        background-color: rgba(var(--app-bg-rgb), .95);
        backdrop-filter: blur(2px);
        box-shadow: var(--card-shadow);
        border-radius: 0 0 var(--border-radius) var(--border-radius);
        left: -1px;
        inline-size: calc(100% + 2px);
        padding: 3rem;
        border: 1px solid var(--card-border);
        container: puzzles-nav / inline-size;
        top: 100%;
        opacity: 0;
        transform: translateY(5rem);
    }
}

.sub-menu {

    --c: 2;
    --grid-gap: .5rem;

    display: grid;

    gap: var(--grid-gap);
    grid-template-columns: repeat(var(--c), minmax(0, 1fr));

    @container puzzles-nav (width > 400px) {
        --c: 3;
        --grid-gap: 1rem
    }

    @container puzzles-nav (width > 600px) {
        --c: 4;
        --grid-gap: 1rem
    }

    @container puzzles-nav (width > 800px) {
        --c: 5;
        --grid-gap: 1rem
    }
}

.sub-menu-holder.sub-menu-holder--open {
    @media (width < 1024px) {
        transform: translateX(0);
    }
    @media (width >= 1024px) {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
    }
}

.close-menu {
    @media (width < 1024px) {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        width: 4rem;
        height: 4rem;
        position: absolute;
        top: 3rem;
        right: 3rem;
        z-index: 22;
        color: var(--text-colour);

        > svg {
            opacity: 0;
            transition: opacity 0.3s ease-in-out .5s;
            inline-size: 2.4rem;
            block-size: 2.4rem;
        }
    }
    @media (width >= 1024px) {
        display: none;
    }
}

.nav-menu.open .close-menu > svg {
    @media (width < 1024px) {
        opacity: 1;
    }
}

.back-button {
    @media (width < 1024px) {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        width: 4rem;
        height: 4rem;
        position: absolute;
        top: 3rem;
        left: 3rem;
        z-index: 40;
        color: var(--text-colour);

        > svg {
            opacity: 0;
            transition: opacity 0.3s ease-in-out 0s;
            inline-size: 2.4rem;
            block-size: 2.4rem;
        }
    }
    @media (width >= 1024px) {
        display: none;
    }
}

.sub-menu-holder.sub-menu-holder--open .back-button > svg {
    @media (width < 1024px) {
        opacity: 1;
        transition-delay: .5s;
    }
}


</style>
