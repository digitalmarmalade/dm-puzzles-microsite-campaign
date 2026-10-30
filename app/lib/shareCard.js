import {spriteFile} from '@/utils/assets'

const W = 1080
const H = 1350
const PAD = 96
const FONT = 'Lato, sans-serif'

let spriteText = null

export function resolveColor(el, value) {
    const probe = document.createElement('span')
    probe.style.color = value
    el.appendChild(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
}

function loadImage(svg) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
}

async function iconImage(slug) {
    spriteText ??= await fetch(spriteFile()).then(r => r.text())
    const match = spriteText.match(new RegExp(`<symbol[^>]*id="${slug}"[^>]*>([\\s\\S]*?)</symbol>`))
    if (!match) return null
    const viewBox = match[0].match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 100 100'
    const body = match[1].replace(/var\(--[a-z-]+(?:,[^)]*)?\)\)?/g, '#fff')
    return loadImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="400" height="400" color="#fff" fill="none">${body}</svg>`)
}

function logoImage(logoSvg) {
    const tagged = logoSvg.includes('xmlns=') ? logoSvg : logoSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    const svg = tagged
        .replace(/var\(--text-colour, #212121\)/g, '#fff')
        .replace(/width="\d+"/, 'width="640"')
        .replace(/height="\d+"/, 'height="144"')
    return loadImage(svg)
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
}

function wrapLines(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/)
    const lines = []
    let line = ''
    for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line)
            line = word
        } else line = test
    }
    if (line) lines.push(line)
    return lines
}

function fitFont(ctx, text, weight, size, maxWidth) {
    let s = size
    do {
        ctx.font = `${weight} ${s}px ${FONT}`
        s -= 4
    } while (ctx.measureText(text).width > maxWidth && s > 24)
    return s + 4
}

function drawBackdrop(ctx, colors) {
    const bg = ctx.createLinearGradient(0, 0, W * 0.6, H)
    bg.addColorStop(0, colors.a)
    bg.addColorStop(1, colors.b)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    const glow = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, W * 0.75)
    glow.addColorStop(0, 'rgba(255, 255, 255, .2)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    const r = 54
    const dx = r * Math.sqrt(3)
    ctx.lineWidth = 2
    for (let row = 0, y = 0; y < H + r; row++, y += r * 1.5) {
        const alpha = 0.1 * Math.max(0, 1 - y / (H * 0.7))
        if (!alpha) continue
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        for (let x = row % 2 ? dx / 2 : 0; x < W + dx; x += dx) {
            ctx.beginPath()
            for (let i = 0; i < 6; i++) {
                const a = Math.PI / 3 * i + Math.PI / 6
                ctx.lineTo(x + r * 0.9 * Math.cos(a), y + r * 0.9 * Math.sin(a))
            }
            ctx.closePath()
            ctx.stroke()
        }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, .4)'
    ctx.lineWidth = 3
    roundRect(ctx, 36, 36, W - 72, H - 72, 36)
    ctx.stroke()
}

function drawCalendar(ctx, cells, top) {
    const size = 64
    const gap = 16
    const width = 7 * size + 6 * gap
    const left = (W - width) / 2
    cells.forEach((cell, i) => {
        if (cell.empty) return
        const x = left + (i % 7) * (size + gap)
        const y = top + Math.floor(i / 7) * (size + gap)
        ctx.fillStyle = cell.played ? '#fff' : 'rgba(255, 255, 255, .18)'
        roundRect(ctx, x, y, size, size, 14)
        ctx.fill()
    })
    return top + Math.ceil(cells.length / 7) * (size + gap)
}

const METALS = {
    1: ['#E8B184', '#B3733F', '#985B30'],
    2: ['#F4F6F9', '#A6B0BC', '#86909E'],
    3: ['#FFE38F', '#D9A21B', '#B8840F'],
}

function drawMedal(ctx, medal, top) {
    const size = 300
    const x = (W - size) / 2
    const y = top + 10
    const [light, base, dark] = METALS[medal.tier]
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, .3)'
    ctx.shadowBlur = 50
    ctx.shadowOffsetY = 30
    const metal = ctx.createLinearGradient(x, y, x + size, y + size)
    metal.addColorStop(0, light)
    metal.addColorStop(.28, base)
    metal.addColorStop(.52, dark)
    metal.addColorStop(.72, base)
    metal.addColorStop(1, light)
    ctx.fillStyle = metal
    roundRect(ctx, x, y, size, size, 48)
    ctx.fill()
    ctx.restore()
    const sheen = ctx.createLinearGradient(x, y, x + size * .6, y + size)
    sheen.addColorStop(0, 'rgba(255, 255, 255, .5)')
    sheen.addColorStop(.46, 'rgba(255, 255, 255, 0)')
    sheen.addColorStop(1, 'rgba(0, 0, 0, .08)')
    ctx.fillStyle = sheen
    roundRect(ctx, x, y, size, size, 48)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, .35)'
    ctx.lineWidth = 4
    roundRect(ctx, x + 6, y + 6, size - 12, size - 12, 42)
    ctx.stroke()
    ctx.font = `900 64px ${FONT}`
    ctx.fillStyle = 'rgba(255, 255, 255, .85)'
    ctx.fillText(medal.label.toUpperCase(), W / 2, y + size / 2 + 4)
    ctx.fillStyle = '#fff'
    return top + 360
}

function blockHeight(card) {
    let h = 0
    if (card.kicker) h += 60
    if (card.medal) h += 360
    if (card.icon) h += 300
    if (card.big) h += card.bigSize + 20
    if (card.unit) h += 70
    if (card.calendar) h += Math.ceil(card.calendar.length / 7) * 80 + 30
    if (card.body) h += 60 * card.bodyLines + 20
    return h
}

export async function renderShareCard(card, {colors, logoSvg, month, footer}) {
    await document.fonts?.load(`900 100px ${FONT}`).catch(() => {})
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    const maxWidth = W - PAD * 2

    drawBackdrop(ctx, colors)

    const [logo, icon] = await Promise.all([
        logoImage(logoSvg).catch(() => null),
        card.icon ? iconImage(card.icon).catch(() => null) : null,
    ])
    if (logo) ctx.drawImage(logo, PAD, PAD - 4, 320, 72)

    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.font = `700 34px ${FONT}`
    ctx.globalAlpha = 0.85
    ctx.fillText(month.toUpperCase(), W - PAD, PAD + 32)
    ctx.globalAlpha = 1
    ctx.textAlign = 'center'

    if (card.big) card.bigSize = fitFont(ctx, card.big, 900, card.bigSize ?? 300, maxWidth)
    ctx.font = `500 44px ${FONT}`
    const bodyLines = card.body ? wrapLines(ctx, card.body, maxWidth - 60) : []
    card.bodyLines = bodyLines.length

    let y = (H - blockHeight(card)) / 2 + 30

    if (card.kicker) {
        ctx.letterSpacing = '6px'
        fitFont(ctx, card.kicker.toUpperCase(), 800, 38, maxWidth)
        ctx.globalAlpha = 0.85
        ctx.fillText(card.kicker.toUpperCase(), W / 2, y + 20)
        ctx.letterSpacing = '0px'
        ctx.globalAlpha = 1
        y += 60
    }

    if (card.medal) y = drawMedal(ctx, card.medal, y)

    if (card.icon) {
        const size = 260
        const x = (W - size) / 2
        ctx.fillStyle = 'rgba(255, 255, 255, .16)'
        roundRect(ctx, x, y + 10, size, size, 48)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, .5)'
        ctx.lineWidth = 3
        ctx.stroke()
        if (icon) ctx.drawImage(icon, x + 50, y + 60, size - 100, size - 100)
        ctx.fillStyle = '#fff'
        y += 300
    }

    if (card.big) {
        ctx.font = `900 ${card.bigSize}px ${FONT}`
        ctx.fillText(card.big, W / 2, y + card.bigSize / 2)
        y += card.bigSize + 20
    }

    if (card.unit) {
        fitFont(ctx, card.unit, 800, 54, maxWidth)
        ctx.fillText(card.unit, W / 2, y + 30)
        y += 70
    }

    if (card.calendar) y = drawCalendar(ctx, card.calendar, y + 10) + 20

    if (bodyLines.length) {
        ctx.font = `500 44px ${FONT}`
        ctx.globalAlpha = 0.9
        bodyLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 30 + i * 60))
        ctx.globalAlpha = 1
    }

    ctx.font = `700 34px ${FONT}`
    ctx.globalAlpha = 0.85
    ctx.fillText(footer, W / 2, H - PAD - 10)
    ctx.globalAlpha = 1

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
