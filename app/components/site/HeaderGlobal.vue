<script setup>
import Logo from '@/components/site/Logo.vue'
import Nav from '@/components/site/Nav.vue'

const stuck = ref(false)

onMounted(() => {
    const sentinel = document.querySelector('.global-header-sentinel')
    if (!sentinel) return
    const observer = new IntersectionObserver(
        ([entry]) => { stuck.value = !entry.isIntersecting },
        {rootMargin: '0px', threshold: [0]}
    )
    observer.observe(sentinel)
    onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
    <div class="global-header-sentinel" aria-hidden="true"></div>

    <div class="global-header-holder"
        :class="{'is-stuck': stuck}"
    >
        <Wrapper>
            <header class="global-header">
                <NuxtLinkLocale to="/">
                    <Logo class="logo"/>
                </NuxtLinkLocale>

                <div class="global-header__actions">
                    <Nav/>
                    <LanguageSwitcher/>
                </div>
            </header>
        </Wrapper>
    </div>
</template>

<style>
.global-header-holder {
    position: sticky;
    top: 0;
    z-index: 20;
    pointer-events: initial;
    margin: 0 0 2rem;
    background-color: rgba(var(--app-bg-rgb), .95);
    @media (width >= 1024px) {
        background: none;
    }
}

.global-header {
    inline-size: 100%;
    max-inline-size: var(--header-max-width);
    margin: var(--space-before-nav) auto var(--space-after-nav);
    display: flex;
    justify-content: space-between;
    padding: var(--header-padding);
    align-items: center;

    @media (width >= 720px) {
        position: relative;
        border: 1px solid transparent;
    }

    @media (width >= 1024px) {
        transition: all .3s ease;
    }
}

.global-header-sentinel {
    position: absolute;
    top: 0;
    height: 1px;
    width: 50%;
}

.global-header__actions {
    display: flex;
    align-items: center;
    gap: 1rem;

    @media (width < 1024px) {
        flex-direction: row-reverse;
    }
}

.global-header:has(.sub-menu-holder--open) {
    @media (width >= 1024px) {
        background-color: rgba(var(--app-bg-rgb), .95);
        backdrop-filter: blur(2px);
        border-radius: var(--border-radius) var(--border-radius) 0 0 !important;
        border: 1px solid var(--card-border) !important;
        z-index: 30;
        box-shadow: var(--card-shadow);

        &:after {
            background: rgba(0, 0, 0, .1);
        }
    }
}

.is-stuck .global-header {
    @media (width >= 1024px) {
        background-color: rgba(var(--app-bg-rgb), .95);
        backdrop-filter: blur(2px);
        border-radius: var(--border-radius);
        border: 1px solid var(--card-border) !important;
        z-index: 30;
        box-shadow:var(--card-shadow);
    }
}

body:has(.sub-menu-holder--open) {
    @media (width >= 1024px) {
        &:after {
            background: rgba(0,0,0,.1);
        }
    }
}
</style>
