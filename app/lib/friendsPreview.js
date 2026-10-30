const member = (name, extra = {}) => ({name, status: 'member', roles: [], ...extra})

const others = (names, extra) => Object.fromEntries(names.map((name, i) => [`sample-${i}-${name}`, member(name, extra)]))

export function sampleLeagues(uid, name, slugs) {
    const you = uid ?? 'sample-you'
    const yourName = name || 'You'
    const owner = member(yourName, {roles: ['owner', 'admin']})

    return [
        {
            id: 'sample-owner-busy',
            name: 'The Marmalade Crew Championship League',
            puzzles: slugs.slice(0, 8),
            members: {
                [you]: owner,
                ...others(['Priya Shah', 'Chris', 'Alex Morgan', 'Sam Lee', 'Jo']),
                ...others(['Dana White', 'Lee Park'], {status: 'applied'}),
            },
        },
        {
            id: 'sample-owner-new',
            name: 'Just Me So Far',
            puzzles: slugs.slice(3, 5),
            members: {[you]: owner},
        },
        {
            id: 'sample-member',
            name: 'Family Puzzlers',
            puzzles: slugs.slice(1, 4),
            members: {
                [you]: member(yourName),
                ...others(['Mum', 'Dad Bloggs'], {}),
                'sample-owner': member('Kate Bloggs', {roles: ['owner', 'admin']}),
            },
        },
        {
            id: 'sample-member-big',
            name: 'Office Quiz League',
            puzzles: slugs.slice(5, 6),
            members: {
                [you]: member(yourName),
                ...others(['Ana Lopez', 'Ben Hall', 'Cara Diaz', 'Dev Patel', 'Eve Stone', 'Finn Ray', 'Gus Bell', 'Hal Moore'], {}),
            },
        },
        {
            id: 'sample-applied',
            name: 'Book Club Brains',
            puzzles: slugs.slice(2, 7),
            members: {
                [you]: member(yourName, {status: 'applied'}),
                ...others(['Rosa Grey', 'Tom Fry', 'Una Wells'], {}),
                'sample-owner': member('Vic Hale', {roles: ['owner', 'admin']}),
            },
        },
    ]
}
