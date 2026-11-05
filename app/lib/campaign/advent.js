export const SKINS = ['advent']

export const WOODS = [
    {wood: '#8e3a2a', dark: '#5c2016'},
    {wood: '#5f6b45', dark: '#3c4529'},
    {wood: '#9a4b35', dark: '#63291b'},
    {wood: '#7b3024', dark: '#4d1a12'},
    {wood: '#6d7850', dark: '#454e31'},
]

export const drawerWood = (day) => WOODS[(day * 3) % WOODS.length]

export const ORNAMENTS = ['wreath', 'holly', 'star', 'poinsettia', 'canes', 'snowflake', 'holly', 'wreath', 'none']

export const drawerOrnament = (day) => ORNAMENTS[(day * 5) % ORNAMENTS.length]

const ADVENT_LAYOUT = [13, 6, 21, 2, 17, 9, 24, 4, 11, 19, 1, 15, 8, 22, 3, 12, 18, 7, 23, 10, 5, 16, 20, 14]

export function doorOrder(count) {
    if (count === ADVENT_LAYOUT.length) return [...ADVENT_LAYOUT]
    const order = Array.from({length: count}, (_, i) => i + 1)
    let seed = count * 7919
    for (let i = count - 1; i > 0; i--) {
        seed = (seed * 16807) % 2147483647
        const j = seed % (i + 1);
        [order[i], order[j]] = [order[j], order[i]]
    }
    return order
}
