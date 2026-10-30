export const APP_NAME = 'Sticky Puzzles'
export const APP_DESCRIPTION = 'A collection of puzzles'
export const APP_SLUG = 'sticky-puzzles'
export const IS_DEV = import.meta.env.DEV
export const IS_PROD = import.meta.env.PROD
export const ARCHIVE_URL = 'archive.json'
export const CLIENT_TRANSITIONS = false
export const PUZZLE_SSR = false
export const DB_NAME = 'SPMicrositeData'
export const PASS_DATA_TO_PARENT = false

//  Description text is held in i18n under `puzzleDescription.{slug}`.
//  Tag words are held in i18n under `tags.{slug}`.
//  `time` is a rough per-play estimate in minutes; the card renders it via i18n.
//  `tutorial` is how many practice puzzles there are in public/tutorials/{slug}/{slug}-{n}.json, played in the gameplay copy at public/tutorials/{slug}/index.html.
export const PUZZLE_META = {
    gridfill:          {type: 'logic',   time: 2, tutorial: 3},
    headcoach:         {type: 'numbers', time: 3, tutorial: 3},
    pyramidplus:       {type: 'numbers', time: 5},
    quiz:              {type: 'quiz',    time: 5},
    sudoku:            {type: 'logic',   time: 10, tutorial: 3},
    wordsearch:        {type: 'words',   time: 8, tutorial: 3},
    totalswipeout:     {type: 'numbers', time: 3},
    worumber:          {type: 'numbers', time: 5},
    wordwheel:         {type: 'words',   time: 5, tutorial: 3},
    crossword:         {type: 'words',   time: 8, tutorial: 3},
    '5mquiz':          {type: 'quiz',    time: 5},
    slidepuzzle:       {type: 'logic',   time: 3},
    '2speedcrossword': {type: 'words',   time: 15},
    huedoku:           {type: 'logic',   time: 8, tutorial: 3},
    guessword:         {type: 'words',   time: 5, tutorial: 3},
    traintracks:       {type: 'logic',   time: 5, tutorial: 3},
    takuzu:            {type: 'logic',   time: 5, tutorial: 3},
    codeword:          {type: 'words',   time: 10, tutorial: 3},
}
