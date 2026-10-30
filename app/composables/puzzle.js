import {slugify} from '@/lib/utils'
import {PUZZLE_META} from '@/lib/config'

export const getPuzzleMeta = key => PUZZLE_META[key]
export const QUICK_MINUTES = 4
export const isQuick = key => (PUZZLE_META[key]?.time ?? Infinity) <= QUICK_MINUTES

//  Decorate a raw archive puzzle with the bits the cards need. Play state
//  (started / completed / progress) is NOT baked in here — it's read per-origin
//  from IndexedDB via the play-status store and looked up by slug at render time.
export function toEnhancedPuzzle({puzzle}) {
    const icon = slugify(puzzle.variant)
    const today = 'Monday'  //  todo
    return {...puzzle, icon, today}
}
