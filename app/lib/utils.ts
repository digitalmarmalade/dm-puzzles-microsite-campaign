export const slugify = (str: string, w: string = '') => str.toLowerCase().replace(/\s/g, w ?? '')

//  hyphenated slug used for theme/card classes, e.g. "Head Coach" -> "head-coach"
export const themeSlug = (name: string): string => (name ? slugify(name, '-') : '')

//  full theme modifier class, e.g. "Head Coach" -> "theme--head-coach"
export const themeClass = (name: string): string => (name ? `theme--${themeSlug(name)}` : '')

//  1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th" ...
export const ordinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export const getLabelFromName = (str: string = '') => str.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()

//  Display name for one difficulty branch of a variant family, e.g.
//  "Sudoku Easy" for a family branch, or just "Sudoku" for a standalone.
export const branchLabel = (family: any, branch: any): string =>
    family?.isFamily && branch?.label ? `${family.name} ${branch.label}` : (family?.name ?? '')
