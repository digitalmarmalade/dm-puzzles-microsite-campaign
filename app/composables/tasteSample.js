const DAY = 24 * 60 * 60 * 1000

function at(daysAgo, hour) {
    const d = new Date(Date.now() - daysAgo * DAY)
    d.setHours(hour, 10, 0, 0)
    return d.toISOString()
}

function solve(variant, daysAgo, hour, extra = {}) {
    return {slug: `sample-${variant}-${daysAgo}-${hour}`.replace(/\s/g, '').toLowerCase(), variant, at: at(daysAgo, hour), ...extra}
}

const PRESETS = {
    improver: {
        label: 'Improving Sudoku player (clean, getting faster)',
        build: () => [
            ...Array.from({length: 14}, (_, i) => solve('Sudoku', 20 - i, 12, {timeSec: 600 - i * 22, checksUsed: 0, cellsRevealed: 0})),
            ...[3, 9, 15].map(d => solve('Crossword', d, 19, {timeSec: 700, checksUsed: 1, cellsRevealed: 0})),
        ],
    },
    dayparts: {
        label: 'Crosswords in the morning, Sudoku in the evening',
        build: () => Array.from({length: 10}, (_, i) => [
            solve('Crossword', i * 2 + 1, 8, {timeSec: 650, checksUsed: 1, cellsRevealed: 0}),
            solve('Sudoku', i * 2 + 1, 20, {timeSec: 500, checksUsed: 1, cellsRevealed: 0}),
        ]).flat(),
    },
    hinty: {
        label: 'Hint-heavy word player (rated a crossword too hard)',
        build: () => [
            ...Array.from({length: 8}, (_, i) => solve('Crossword', i * 2, 18, {timeSec: 900, checksUsed: 5, cellsRevealed: 3})),
            ...Array.from({length: 4}, (_, i) => solve('Wordsearch', i * 3 + 1, 13, {timeSec: 400, checksUsed: 0, cellsRevealed: 0})),
            solve('Crossword', 0, 9, {timeSec: 1100, checksUsed: 6, cellsRevealed: 4, rating: 'hard'}),
        ],
    },
    newcomer: {
        label: 'New player (3 solves)',
        build: () => [solve('Huedoku', 2, 12), solve('GuessWord', 1, 12, {guesses: 4}), solve('Crossword', 0, 12, {checksUsed: 2, cellsRevealed: 1})],
    },
}

export function useTasteSample() {
    const active = useState('tasteSample', () => null)
    const challenges = useChallengesStore()

    function load(key) {
        const preset = PRESETS[key]
        if (!preset) return
        if (!active.value) challenges.persist = () => {}
        active.value = key
        challenges.completions = preset.build()
    }

    return {
        active,
        presets: Object.entries(PRESETS).map(([key, p]) => ({key, label: p.label})),
        load,
    }
}
