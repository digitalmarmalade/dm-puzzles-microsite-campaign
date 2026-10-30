<script setup>
import Archive from '@/api/Archive.js'

const challenges = useChallengesStore()
const preferences = usePreferencesStore()
const hidden = useHiddenVariantsStore()
const taste = useTasteModel()
const sample = useTasteSample()
const preset = ref(sample.presets[0].key)

const todaySlugs = new Set(Archive.getTodaysPuzzles().map(p => taste.branchFor(p).branch?.slug).filter(Boolean))
const pct = (v) => `${Math.round(v * 100)}%`
const num = (v) => v.toFixed(2)

const rows = computed(() => {
    const m = taste.model.value
    const out = []
    taste.families.forEach((family, fi) => family.branches.forEach((branch, bi) => {
        const parts = m.breakdown.get(branch.slug) ?? {explicit: 0, play: 0, boost: 0}
        out.push({
            slug: branch.slug,
            name: family.isFamily ? `${family.name} ${branch.label}` : family.name,
            score: m.scoreFor(branch.slug),
            ...parts,
            today: todaySlugs.has(branch.slug),
            hidden: hidden.isHidden(branch.slug),
            order: fi * 10 + bi,
        })
    }))
    return out.sort((a, b) => b.score - a.score || a.order - b.order)
})

const leans = computed(() => [...taste.model.value.leans.entries()].map(([slug, r]) => ({
    name: taste.families.find(f => f.slug === slug)?.name ?? slug,
    ...r,
})))

const nudgeRows = computed(() => {
    const {counts, total} = taste.categoryCounts.value
    const {minPlays, minShare} = taste.nudgeThresholds
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category, n]) => {
        const share = total ? n / total : 0
        let status = 'eligible'
        if (preferences.boostedCategories.includes(category)) status = 'answered yes'
        else if (preferences.declinedCategories.includes(category)) status = 'answered no'
        else if (n < minPlays) status = `needs ${minPlays} plays`
        else if (share < minShare) status = `needs ${pct(minShare)} share`
        else if (taste.leads(category)) status = 'already leading'
        return {category, n, share, status}
    })
})

const nextNudge = computed(() => {
    if (taste.levelCue.value) return `Level cue: “ready to try ${taste.levelCue.value.name}?”`
    return 'None due'
})
</script>

<template>
    <div class="tdb">
        <section class="tdb__section tdb__summary">
            <span><b>{{ pct(taste.confidence.value) }}</b> confidence</span>
            <span><b>{{ num(taste.model.value.weight) }}</b> weighted solves</span>
            <span><b>{{ taste.model.value.slot }}</b> slot</span>
            <span><b>{{ challenges.completions.length }}</b> in log</span>
        </section>

        <section class="tdb__section tdb__sample">
            <select v-model="preset" aria-label="Sample player">
                <option v-for="p in sample.presets" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>
            <button type="button" @click="sample.load(preset)">Load sample</button>
            <p v-if="sample.active.value" class="tdb__note">Sample loaded in memory only — nothing is saved or synced. Reload the page to go back to your real data.</p>
        </section>

        <section class="tdb__section">
            <h3 class="tdb__heading">Ranking</h3>
            <table class="tdb__table">
                <thead>
                    <tr><th>#</th><th>Puzzle</th><th>Score</th><th>Explicit</th><th>Play</th><th>Boost</th></tr>
                </thead>
                <tbody>
                    <tr v-for="(r, i) in rows" :key="r.slug" :class="{'tdb__row--muted': r.hidden}">
                        <td>{{ i + 1 }}</td>
                        <td>
                            {{ r.name }}
                            <span v-if="r.favourite" title="Favourite">★</span>
                            <span v-if="r.onboardingMatch && !r.favourite" title="Matches tour picks">◆</span>
                            <span v-if="r.today" class="tdb__tag">today</span>
                            <span v-if="r.hidden" class="tdb__tag">hidden</span>
                        </td>
                        <td><b>{{ num(r.score) }}</b></td>
                        <td>{{ num(r.explicit) }}</td>
                        <td>{{ num(r.play) }}</td>
                        <td>{{ r.boost ? num(r.boost) : '–' }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section class="tdb__section">
            <h3 class="tdb__heading">Difficulty lean</h3>
            <p v-if="!leans.length" class="tdb__note">No play yet.</p>
            <ul class="tdb__list">
                <li v-for="l in leans" :key="l.name">
                    <b>{{ l.name }}</b> → {{ l.lean ?? 'no lean' }}
                    <span class="tdb__muted">({{ l.source }}: {{ l.detail ?? '–' }})</span>
                </li>
            </ul>
        </section>

        <section class="tdb__section">
            <h3 class="tdb__heading">Nudges</h3>
            <p><b>Next:</b> {{ nextNudge }}</p>
            <table v-if="nudgeRows.length" class="tdb__table">
                <thead><tr><th>Category (14 days)</th><th>Plays</th><th>Share</th><th>Status</th></tr></thead>
                <tbody>
                    <tr v-for="n in nudgeRows" :key="n.category">
                        <td>{{ n.category }}</td><td>{{ n.n }}</td><td>{{ pct(n.share) }}</td><td>{{ n.status }}</td>
                    </tr>
                </tbody>
            </table>
            <p class="tdb__muted">
                Offered: {{ preferences.nudgeOffered || '–' }} ·
                Yes: {{ preferences.boostedCategories.join(', ') || '–' }} ·
                No: {{ preferences.declinedCategories.join(', ') || '–' }} ·
                Levels answered: {{ preferences.answeredLevels.join(', ') || '–' }}
            </p>
        </section>
    </div>
</template>

<style scoped>
.tdb {
    overflow-y: auto;
}

.tdb__section {
    padding: 1rem 1.2rem;
    border-block-end: 1px solid var(--card-border);

    & p {
        margin: .4rem 0;
    }
}

.tdb__summary {
    display: flex;
    flex-wrap: wrap;
    gap: .6rem 1.4rem;
}

.tdb__sample {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .8rem;

    & select {
        flex: 1;
        min-inline-size: 0;
        font: inherit;
    }

    & button {
        font: inherit;
        font-weight: 700;
        cursor: pointer;
    }
}

.tdb__heading {
    margin: 0 0 .6rem;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: .05rem;
    color: var(--text-colour-secondary, #777);
}

.tdb__table {
    inline-size: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;

    & th,
    & td {
        padding: .3rem .4rem;
        text-align: start;
        border-block-end: 1px dotted var(--card-border);
    }

    & th {
        font-weight: 700;
        color: var(--text-colour-secondary, #777);
    }
}

.tdb__row--muted {
    opacity: .5;
}

.tdb__tag {
    margin-inline-start: .3rem;
    padding: 0 .4rem;
    border-radius: .4rem;
    background: var(--app-bg);
    font-size: 1rem;
    text-transform: uppercase;
}

.tdb__list {
    margin: 0;
    padding-inline-start: 1.6rem;
}

.tdb__muted,
.tdb__note {
    color: var(--text-colour-secondary, #777);
}
</style>
