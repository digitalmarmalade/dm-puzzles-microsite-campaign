const SVG = 'http://www.w3.org/2000/svg'

function iconParticle(href) {
    const svg = document.createElementNS(SVG, 'svg')
    const use = document.createElementNS(SVG, 'use')
    use.setAttribute('href', href)
    svg.append(use)
    Object.assign(svg.style, {inlineSize: '100%', blockSize: '100%', color: '#5c2016'})
    const tile = document.createElement('span')
    Object.assign(tile.style, {
        display: 'block',
        inlineSize: '3.2rem',
        blockSize: '3.2rem',
        padding: '.5rem',
        borderRadius: '.8rem',
        background: 'linear-gradient(160deg, #fbf1dc, #e8c77d)',
        boxShadow: '0 .4rem 1rem rgba(0, 0, 0, .4)',
    })
    tile.append(svg)
    return tile
}

function sparkle(colour, size) {
    const el = document.createElement('span')
    Object.assign(el.style, {
        display: 'block',
        inlineSize: `${size}px`,
        blockSize: `${size}px`,
        background: colour,
        clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)',
        filter: `drop-shadow(0 0 ${size / 2}px ${colour})`,
    })
    return el
}

const COLOURS = ['#f6dc9a', '#e8c77d', '#fff6dc', '#ffb347']

export function glitterBurst(rect, {container, sparkles = 90, spread = 900, at = .3, arc = 1, reach = 1, layer: z = 4, colours = COLOURS}) {
    const layer = document.createElement('div')
    Object.assign(layer.style, {position: 'absolute', inset: '0', pointerEvents: 'none'})
    container.append(layer)
    const box = container.getBoundingClientRect()
    const originX = rect.left - box.left + rect.width / 2
    const originY = rect.top - box.top + rect.height * at
    let longest = 0
    for (let i = 0; i < sparkles; i++) {
        const el = sparkle(colours[i % colours.length], 5 + Math.random() * 11)
        Object.assign(el.style, {position: 'absolute', left: `${originX + (Math.random() - .5) * rect.width * .5}px`, top: `${originY}px`, translate: '-50% -50%', zIndex: String(z)})
        layer.append(el)
        const angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.4 * arc
        const power = (120 + Math.random() * 320) * reach
        const dx = Math.cos(angle) * power
        const dy = Math.sin(angle) * power
        const spin = (Math.random() - .5) * 600
        const delay = Math.random() * spread
        const duration = 2200 + Math.random() * 1600
        longest = Math.max(longest, delay + duration)
        el.animate([
            {transform: 'translate(0, 0) scale(.3) rotate(0deg)', opacity: 0},
            {transform: `translate(${dx * .3}px, ${dy * .3}px) scale(1.1) rotate(${spin * .2}deg)`, opacity: 1, offset: .14},
            {transform: `translate(${dx * .85}px, ${dy * .85}px) scale(1) rotate(${spin * .6}deg)`, opacity: 1, offset: .5},
            {transform: `translate(${dx * 1.05}px, ${dy * .6 + 160}px) scale(.7) rotate(${spin}deg)`, opacity: 0},
        ], {duration, delay, easing: 'cubic-bezier(.12, .7, .35, 1)', fill: 'both'})
    }
    setTimeout(() => layer.remove(), longest + 100)
}

const between = ([low, high]) => low + Math.random() * (high - low)

function driftAround(layer, target, {every, make, reach, duration, spin, inset = 0}) {
    const tick = () => {
        const box = target.getBoundingClientRect()
        const base = layer.getBoundingClientRect()
        const side = Math.floor(Math.random() * 4)
        const t = Math.random()
        const cx = box.left + box.width / 2
        const cy = box.top + box.height / 2
        const edgeX = side === 1 ? box.right : side === 3 ? box.left : box.left + t * box.width
        const edgeY = side === 0 ? box.top : side === 2 ? box.bottom : box.top + t * box.height
        const x = edgeX + (cx - edgeX) * inset
        const y = edgeY + (cy - edgeY) * inset
        const length = Math.hypot(edgeX - cx, edgeY - cy) || 1
        const far = between(reach)
        const dx = (edgeX - cx) / length * far
        const dy = (edgeY - cy) / length * far - 30
        const turn = (Math.random() - .5) * spin
        const el = make()
        Object.assign(el.style, {position: 'absolute', left: `${x - base.left}px`, top: `${y - base.top}px`, translate: '-50% -50%'})
        layer.append(el)
        el.animate([
            {transform: 'translate(0, 0) scale(.3) rotate(0deg)', opacity: 0},
            {transform: `translate(${dx * .3}px, ${dy * .3}px) scale(1) rotate(${turn * .4}deg)`, opacity: 1, offset: .3},
            {transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(${turn}deg)`, opacity: 0},
        ], {duration: between(duration), easing: 'ease-out'}).onfinish = () => el.remove()
    }
    tick()
    const id = setInterval(tick, every)
    return () => {
        clearInterval(id)
        layer.replaceChildren()
    }
}

export const sparkleAround = (layer, target, {colours = COLOURS} = {}) => driftAround(layer, target, {
    every: 110,
    make: () => sparkle(colours[Math.floor(Math.random() * colours.length)], 5 + Math.random() * 10),
    reach: [30, 110],
    duration: [1600, 2600],
    spin: 440,
})

export const iconsAround = (layer, target, icon) => driftAround(layer, target, {
    every: 340,
    make: () => iconParticle(icon),
    reach: [120, 260],
    duration: [3400, 5200],
    spin: 70,
    inset: .3,
})
