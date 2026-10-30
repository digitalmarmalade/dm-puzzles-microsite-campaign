const DIFFICULTY_SUFFIX_RE = /\s+(Easy|Medium|Hard|Expert)$/

export function baseNameOf(variant) {
    if (!variant) return variant
    const m = variant.match(DIFFICULTY_SUFFIX_RE)
    return m ? variant.slice(0, -m[0].length) : variant
}

export function matchBranchForPuzzle(family, puzzle) {
    if (puzzle.difficulty) {
        const b = family.branches.find(b => b.difficulty === puzzle.difficulty || b.label === puzzle.difficulty)
        if (b) return b
    }
    const suffix = puzzle.variant?.match(DIFFICULTY_SUFFIX_RE)
    if (suffix) {
        const b = family.branches.find(b => b.label === suffix[1])
        if (b) return b
    }
    const bySlug = family.branches.find(b => b.puzzleSlugs.includes(puzzle.slug))
    if (bySlug) return bySlug
    return family.branches[0]
}

export function makeBranchResolver(families) {
    const familyByBaseName = new Map(families.map(f => [f.name, f]))
    const familyOf = (variant) => familyByBaseName.get(baseNameOf(variant)) ?? null
    const branchFor = (puzzle) => {
        const family = familyOf(puzzle?.variant)
        if (!family) return {family: null, branch: null}
        return {family, branch: matchBranchForPuzzle(family, puzzle)}
    }
    return {familyOf, branchFor}
}
