const Archive = {
    loaded: false,

    async load(archiveFile) {
        if (Archive.loaded) return
        const response = await fetch(archiveFile)
        data = await response.json()
        Archive.loaded = true
    },
    getPuzzles(slug) {
        return slug ? data.puzzles[slug] : data.puzzles
    },
    getPuzzleNameSlugs() {
        const puzzleNameSlugs = [];
        for (const name of Object.keys(this.getVariants() ?? {})) {
            const puzzlesNotUsingHyphensInSlug = ['Slide Puzzle'];
            const delimiter = puzzlesNotUsingHyphensInSlug.includes(name) ? '' : '-';
            puzzleNameSlugs.push({name, slug: name.toLowerCase().replace(/\s/g, delimiter)});
        }
        return puzzleNameSlugs
    },
    getPuzzleTypes() {
        return Object.keys(data.variants)
    },
    getToday() {
        return data.today
    },
    getTodaysPuzzles() {
        //  create list of today's puzzles
        const todaysPuzzles = Object.values(this.getToday()).map(slug => ({
            ...this.getPuzzles(slug),
        }))
        //  for any variants not already in list, add the first puzzle in the bundle
        for (const variant of Object.keys(this.getVariants())) {

            const isMissingPuzzle = !todaysPuzzles.find(p => p.variant === variant)

            if (!isMissingPuzzle) continue

            if (isMissingPuzzle) {
                const [firstPuzzleInBundle] = this.getVariants(variant).map(slug => ({
                    ...this.getPuzzles(slug),
                }))
                todaysPuzzles.push(firstPuzzleInBundle)
            }
        }
        //  add extra data to items in list (play state is read separately by slug)
        for (let currentPuzzle in todaysPuzzles) {
            todaysPuzzles[currentPuzzle] = toEnhancedPuzzle({
                'puzzle': todaysPuzzles[currentPuzzle],
            });
        }

        return todaysPuzzles
    },
    getVariants(variant) {
        return variant ? data.variants[variant] : data.variants
    },
    getVariantFamilies() {
        const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert']
        const DIFFICULTY_ORDER = {Standard: 0, Easy: 1, Medium: 2, Hard: 3, Expert: 4}
        const SUFFIX_RE = new RegExp(`\\s+(${DIFFICULTIES.join('|')})$`)
        const slugify = (s) => s.toLowerCase().replace(/\s/g, '')
        const sortByDifficulty = (branches) =>
            branches.sort((a, b) => (DIFFICULTY_ORDER[a.label] ?? 99) - (DIFFICULTY_ORDER[b.label] ?? 99))

        const variants = this.getVariants() ?? {}
        const puzzles = this.getPuzzles() ?? {}

        const bases = new Map()
        for (const variantName of Object.keys(variants)) {
            const match = variantName.match(SUFFIX_RE)
            const base = match ? variantName.slice(0, -match[0].length) : variantName
            const label = match ? match[1] : null
            if (!bases.has(base)) bases.set(base, [])
            bases.get(base).push({variantName, label})
        }

        const families = []
        for (const [baseName, members] of bases) {
            if (members.length > 1) {
                const branches = sortByDifficulty(members.map(m => ({
                    label: m.label ?? 'Standard',
                    slug: slugify(m.variantName),
                    variantName: m.variantName,
                    difficulty: null,
                    puzzleSlugs: variants[m.variantName] ?? [],
                })))
                families.push({name: baseName, slug: slugify(baseName), isFamily: true, branches})
                continue
            }

            const {variantName} = members[0]
            const puzzleSlugs = variants[variantName] ?? []
            const distinct = new Set()
            for (const s of puzzleSlugs) {
                const d = puzzles[s]?.difficulty
                if (DIFFICULTIES.includes(d)) distinct.add(d)
            }

            if (distinct.size > 1) {
                const branches = sortByDifficulty([...distinct].map(d => ({
                    label: d,
                    slug: slugify(`${variantName} ${d}`),
                    variantName,
                    difficulty: d,
                    puzzleSlugs: puzzleSlugs.filter(s => puzzles[s]?.difficulty === d),
                })))
                families.push({name: variantName, slug: slugify(variantName), isFamily: true, branches})
            } else {
                families.push({
                    name: variantName,
                    slug: slugify(variantName),
                    isFamily: false,
                    branches: [{
                        label: null,
                        slug: slugify(variantName),
                        variantName,
                        difficulty: null,
                        puzzleSlugs,
                    }],
                })
            }
        }
        return families
    },
    getArchiveSlug(variantName, puzzleSlug = null) {
        for (const family of this.getVariantFamilies()) {
            for (const branch of family.branches) {
                if (branch.variantName !== variantName) continue
                if (!puzzleSlug || branch.puzzleSlugs.includes(puzzleSlug)) return branch.slug
            }
        }
        return null
    },
    getBranchBySlug(slug) {
        for (const family of this.getVariantFamilies()) {
            for (const branch of family.branches) {
                if (branch.slug === slug) return {family, branch}
            }
        }
        return null
    },
    getPuzzleUrl(puzzle, locale = null, theme = null, fallbackVersion = null) {
        const base = puzzle?.url
        if (!base) return base

        const shareParams = new URLSearchParams(window.location.search)
        const linkType = base.split('.').pop()
        //console.log('URL', base, linkType)
        let puzzleUrl = new URL(base)

        if (linkType === 'json') {
            // A data-only .json url, so use built-in gameplay
            const gameplayUrl = window.location.origin + `/gameplay/${puzzle.type}/index.html`
            const dataUrl = base
            //console.log('JSON URL', gameplayUrl, dataUrl)
            puzzleUrl = new URL(gameplayUrl + '?json=' + encodeURIComponent(dataUrl))
        } else {
            // Assume its a regular html puzzle link
        }

        let params = new URLSearchParams(puzzleUrl.search)
        params.set('lang', locale)
        params.set('theme', theme)
        const version = data.config?.gameplayVersion ?? fallbackVersion
        if (version) params.set('v', version)

        // Params for multiplayer share links
        if (shareParams.has('gid')) {
            params.set('gid', shareParams.get('gid'))
            params.set('local', 'true')
            params.set('variant', puzzle.tag)
            params.set('pid', puzzle.id)
        }

        puzzleUrl.search = params.toString()

        return puzzleUrl.href
    },
    getPuzzleSiteUrl(puzzle, locale = null, theme = null) {
        // Puzzle link to the microsite URL for the puzzle
        return window.location.origin + '/' + [locale, 'puzzle', puzzle.slug].filter(Boolean).join('/')
    },
    getPuzzleImageUrl(puzzle, locale = null, theme = null) {
        // Puzzle link to a variant icon to use on a puzzle completion screen
        const puzzleSlug = puzzle.tag.replaceAll('-', '')
        return window.location.origin + '/' + ['gameplay', puzzle.type, 'assets', 'puzzle-icons', theme, puzzleSlug].filter(Boolean).join('/') + '.svg'
    },
    getAnotherVariantPuzzle(slug, variantName, locale = null, theme = null) {
        // Get another puzzle of the same variant
        const puzzle = data.puzzles[slug] || null

        if (puzzle) {
            const variantName = puzzle.variant
            const variantPuzzles = this.getVariants(variantName)

            if (variantPuzzles) {
                for (const puzzleSlug of variantPuzzles) {
                    if (puzzleSlug !== slug) {
                        const anotherPuzzle = data.puzzles[puzzleSlug] || null

                        if (anotherPuzzle) {
                            return {
                                title: anotherPuzzle.name,
                                variant: anotherPuzzle.variant,
                                url: this.getPuzzleSiteUrl(anotherPuzzle, locale, theme),
                                link_text: anotherPuzzle.name,
                                image: this.getPuzzleImageUrl(anotherPuzzle, locale, theme),
                                target: '_parent',
                            }
                        }
                    }
                }
            }
        }

        return null
    },
    getDifferentVariantPuzzle(slug, variantName, locale = null, theme = null) {
        // Get another puzzle of a different variant
        const variants = this.getVariants()
        const variantNames = Object.keys(variants)
        const firstVariantName = variantNames[0]

        let newVariantName = firstVariantName
        let passed = false

        for (const name of variantNames) {
            if (name === variantName) {
                passed = true
            } else if (passed) {
                newVariantName = name
                break
            }
        }

        const variantPuzzles = this.getVariants(newVariantName)

        for (const puzzleSlug of variantPuzzles) {
            const differentPuzzle = data.puzzles[puzzleSlug] || null
            return {
                title: differentPuzzle.name,
                variant: differentPuzzle.variant,
                url: this.getPuzzleSiteUrl(differentPuzzle, locale, theme),
                link_text: differentPuzzle.name,
                image: this.getPuzzleImageUrl(differentPuzzle, locale, theme),
                target: '_parent',
            }
        }

        return null
    },
    getPuzzleCompletionData(slug, locale = null, theme = null) {
        //console.log('getPuzzleCompletionData', slug, locale, theme)
        const puzzle = data.puzzles[slug] || null
        const anotherPuzzle = this.getAnotherVariantPuzzle(slug, puzzle.variant, locale, theme)
        const differentPuzzle = this.getDifferentVariantPuzzle(slug, puzzle.variant, locale, theme)
        const viewAllUrl = [window.location.origin, locale, 'puzzles', this.getArchiveSlug(puzzle.variant, slug) ?? puzzle.tag].filter(Boolean).join('/')
        //console.log('getPuzzleCompletionData anotherPuzzle', anotherPuzzle)
        //console.log('getPuzzleCompletionData differentPuzzle', differentPuzzle)

        const completionData = {
            correct: {
                links: [anotherPuzzle, differentPuzzle],
                subtitle: 'You completed the ' + puzzle.variant + ' in ',
                title: 'Well done!',
                view_all_url: viewAllUrl
            },
            incorrect: {
                links: [anotherPuzzle, differentPuzzle],
                subtitle: "It's not quite right yet.",
                title: 'Keep Trying!',
                view_all_url: viewAllUrl
            }
        }

        return completionData
    },
}


let data = {}

export default Archive
