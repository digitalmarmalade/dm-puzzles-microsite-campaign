export const SKINS = ['advent']

export const PAPERS = [
    {paper: '#ffbc45', dark: '#996200', ribbon: '#9f5760', edge: '#5c3338'},
    {paper: '#6fb3e8', dark: '#22608f', ribbon: '#1f4e8c', edge: '#12305a'},
    {paper: '#e0697f', dark: '#8c2639', ribbon: '#f4d27a', edge: '#a9852a'},
    {paper: '#7fcdb4', dark: '#2e7a62', ribbon: '#2b4c8c', edge: '#182d57'},
    {paper: '#ae93dc', dark: '#5b3f8c', ribbon: '#ffffff', edge: '#7c63a8'},
    {paper: '#2b4c8c', dark: '#0e2250', ribbon: '#e8b64c', edge: '#a97a22'},
]

export const paperFor = (day) => PAPERS[(day * 5) % PAPERS.length]

const WHITE = "fill='#fff' fill-opacity='.6'"

const MOTIFS = [
    {scale: 1, body: `<path d='M14.75 9.5 16.21 13.99H20.93L17.11 16.77 18.57 21.26 14.75 18.48 10.93 21.26 12.39 16.77 8.57 13.99H13.29Z' ${WHITE}/>`},
    {scale: 1.6, body: `<path d='M14.75 7.5 19.6 14.6H17.3L20.9 20.4H8.6L12.2 14.6H9.9Z' ${WHITE}/><rect x='13.75' y='20.4' width='2' height='2.6' ${WHITE}/>`},
    {scale: 1.6, body: `<circle cx='14.75' cy='11.6' r='2.7' ${WHITE}/><circle cx='14.75' cy='18.6' r='4.2' ${WHITE}/>`},
    {scale: 1.35, body: `<rect x='13.55' y='8.2' width='2.4' height='2.2' rx='.5' ${WHITE}/><circle cx='14.75' cy='15.9' r='5' ${WHITE}/>`},
    {scale: 1.35, body: `<path d='M14.75 9.6V21.4M9.64 12.55 19.86 18.45M9.64 18.45 19.86 12.55' stroke='#fff' stroke-opacity='.6' stroke-width='1.4' stroke-linecap='round'/>`},
    {scale: 1.5, body: `<path d='M10.4 10.9H17.4V16.6L20.2 18.1Q22 19.1 21.3 20.8Q20.6 22.3 18.7 21.6L12.6 19.3Q10.4 18.4 10.4 16Z' ${WHITE}/><rect x='9.8' y='8.2' width='8.2' height='2.7' rx='.8' ${WHITE}/>`},
]

const motifFor = (day) => MOTIFS[(day + Math.floor(day / 6)) % MOTIFS.length]

const motifTile = ({scale, body}) => `<g transform='translate(14.75 15.5) scale(${scale}) translate(-14.75 -15.5)'>${body}</g>`

export const motifImage = (day) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29.5 31'>${motifTile(motifFor(day))}</svg>`)}")`

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
