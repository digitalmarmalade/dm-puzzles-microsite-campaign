import Archive from '@/api/Archive.js'
const DEFAULT_STATS = ['completed', 'cleanSolves', 'currentStreak', 'longestStreak', 'avgTime', 'bestTime', 'avgChecks', 'avgReveals']

const PLAY_ACHIEVEMENTS = [
    {id: 'play-10',  titleKey: 'apprentice', descKey: 'descPlay', tier: 1, metric: 'completed', target: 10},
    {id: 'play-25',  titleKey: 'expert',     descKey: 'descPlay', tier: 2, metric: 'completed', target: 25},
    {id: 'play-100', titleKey: 'master',     descKey: 'descPlay', tier: 3, metric: 'completed', target: 100},
]

const WORDS_ACHIEVEMENTS = [
    {id: 'words-60',  titleKey: 'sharpEye',  descKey: 'descWordsPct', tier: 1, metric: 'bestWordsPct', target: 60},
    {id: 'words-80',  titleKey: 'wordHawk',  descKey: 'descWordsPct', tier: 2, metric: 'bestWordsPct', target: 80},
    {id: 'words-100', titleKey: 'fullHouse', descKey: 'descWordsPct', tier: 3, metric: 'bestWordsPct', target: 100},
]

const POINTS_ACHIEVEMENTS = WORDS_ACHIEVEMENTS.map(a => ({...a, descKey: 'descPointsPct'}))

const SHARP_ACHIEVEMENTS = [
    {id: 'sharp-5',   titleKey: 'sharpSolver', descKey: 'descSharp', tier: 1, metric: 'clean', target: 5},
    {id: 'sharp-25',  titleKey: 'sharpSolver', descKey: 'descSharp', tier: 2, metric: 'clean', target: 25},
    {id: 'sharp-100', titleKey: 'sharpSolver', descKey: 'descSharp', tier: 3, metric: 'clean', target: 100},
]

export const SHARP_GUESS_MAX = 3
export function isCleanSolve(c, clean) {
    if (clean === 'guesses')
        return typeof c.guesses === 'number' && c.guesses <= SHARP_GUESS_MAX
    const help = clean === 'mistakes' ? c.wrongAnswers : c.checksUsed
    return typeof help === 'number' && help === 0 &&
        typeof c.cellsRevealed === 'number' && c.cellsRevealed === 0 &&
        (c.hintsShown ?? 0) === 0
}

const DEFAULT = {
    stats: DEFAULT_STATS,
    chart: ['time', 'checks', 'reveals'],
    source: 'completions',
    clean: 'checks',
    achievements: [
        ...PLAY_ACHIEVEMENTS,
        {id: 'clean-10', titleKey: 'purist', descKey: 'descClean', tier: 2, metric: 'clean', target: 10},
    ],
    excludePersonas: [],
}

const HINT_CHART = ['time', 'checks', 'reveals', 'hints']

const OVERRIDES = {
    'Sudoku': {chart: HINT_CHART},
    'Sudoku Hard': {chart: HINT_CHART},
    'Huedoku': {chart: HINT_CHART},
    'Takuzu': {chart: HINT_CHART},
    'Head Coach': {
        stats: ['completed', 'cleanSolves', 'currentStreak', 'longestStreak', 'avgTime', 'bestTime', 'avgMistakes', 'avgReveals'],
        chart: ['time', 'reveals', 'mistakes'],
        clean: 'mistakes',
        excludePersonas: ['hintHunter'],
    },
    'WordWheel': {
        stats: ['completed', 'cleanSolves', 'currentStreak', 'longestStreak', 'avgWordsFound', 'bestWordsFound', 'avgReveals'],
        chart: ['wordsFound', 'reveals'],
        source: 'attempts',
        cardResult: 'words',
        wordsComplete: 20,
        achievements: [...PLAY_ACHIEVEMENTS, ...WORDS_ACHIEVEMENTS],
        excludePersonas: ['improver', 'recordBreaker', 'clockwork', 'hintHunter'],
    },
    'GuessWord': {
        stats: ['completed', 'winRate', 'currentStreak', 'longestStreak', 'avgTime', 'bestTime', 'avgGuesses', 'bestGuesses'],
        chart: ['time', 'guesses'],
        distribution: 'guesses',
        cardResult: 'guesses',
        clean: 'guesses',
        achievements: [...PLAY_ACHIEVEMENTS, ...SHARP_ACHIEVEMENTS],
        excludePersonas: ['purist', 'hintHunter'],
    },
}

const POINTS = {
    stats: ['completed', 'cleanSolves', 'currentStreak', 'longestStreak', 'avgScore', 'bestScore', 'avgReveals'],
    chart: ['score', 'reveals'],
    source: 'attempts',
    cardResult: 'words',
    measure: 'points',
    wordsComplete: 20,
    achievements: [...PLAY_ACHIEVEMENTS, ...POINTS_ACHIEVEMENTS],
    excludePersonas: ['improver', 'recordBreaker', 'clockwork', 'hintHunter'],
}

const pointsVariants = new Map()

export function isPointsVariant(variant) {
    if (!variant || !Archive.loaded) return false
    if (!pointsVariants.has(variant)) {
        const [slug] = Archive.getVariants()?.[variant] ?? []
        pointsVariants.set(variant, Archive.getPuzzles(slug)?.scoring === 'letters')
    }
    return pointsVariants.get(variant)
}

export function gameConfig(variant) {
    return {...DEFAULT, ...(OVERRIDES[variant] ?? {}), ...(isPointsVariant(variant) ? POINTS : {})}
}
