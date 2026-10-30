<script setup>
const year = new Date().getFullYear()
</script>

<template>
    <Wrapper>
        <footer class="global-footer">
            <small>{{ $t('footer.copyright', {year}) }}</small>
            <small><a href="#top">{{ $t('footer.backToTop') }}</a></small>
        </footer>
    </Wrapper>
</template>

<style scoped>

.global-footer {
    inline-size: 100%;
    max-inline-size: var(--footer-max-width);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    padding: var(--vertical-rhythmx2) 0 var(--vertical-rhythmx2);
    align-items: center;
}

</style>
