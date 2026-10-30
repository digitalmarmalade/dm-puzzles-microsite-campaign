export const SHARE_FORMATS = {
    square: {width: 1080, height: 1080, margin: 70, pad: 80, logo: 170, headline: 112, body: 42, button: 38, url: 28, bodyLines: 4},
    story: {width: 1080, height: 1920, margin: 90, pad: 90, logo: 260, headline: 160, body: 58, button: 52, url: 36, bodyLines: 6},
    wide: {width: 1200, height: 630, margin: 44, pad: 56, logo: 92, headline: 74, body: 30, button: 28, url: 22, bodyLines: 2},
}

export function themeOf(el) {
    const css = getComputedStyle(el)
    const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
    return {
        colours: {
            primary: v('--primary', '#333'),
            secondary: v('--secondary', '#333'),
            background: v('--app-bg', '#f5f5f5'),
            text: v('--text-colour', '#222'),
            onPrimary: v('--text-on-primary', '#fff'),
            tint: `rgba(${v('--primary-rgb', '0, 0, 0')}, .1)`,
        },
        fonts: {display: v('--font-display', 'sans-serif'), body: v('--font-sans', 'sans-serif')},
    }
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
    })
}

function wrap(ctx, text, maxWidth) {
    const lines = []
    let line = ''
    for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word
        if (line && ctx.measureText(next).width > maxWidth) {
            lines.push(line)
            line = word
        } else {
            line = next
        }
    }
    if (line) lines.push(line)
    return lines
}

export async function drawShareCard({format = 'square', colours, fonts, logo, title, headline, body, button, url}) {
    const f = SHARE_FORMATS[format]
    const {width: W, height: H} = f
    await document.fonts?.ready
    await Promise.all([`700 ${f.headline}px ${fonts.display}`, `400 ${f.body}px ${fonts.body}`].map(font => document.fonts?.load(font).catch(() => null)))

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = colours.background
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = .1
    ctx.fillStyle = colours.secondary
    ctx.beginPath()
    ctx.arc(W * .92, H * .06, Math.min(W, H) * .3, 0, Math.PI * 2)
    ctx.arc(W * .06, H * .96, Math.min(W, H) * .26, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    const card = {x: f.margin, y: f.margin, w: W - f.margin * 2, h: H - f.margin * 2}
    const radius = Math.min(W, H) * .035
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, .12)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 14
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(card.x, card.y, card.w, card.h, radius)
    ctx.fill()
    ctx.restore()

    const inset = Math.max(10, Math.min(W, H) * .022)
    ctx.lineWidth = Math.max(3, Math.min(W, H) * .004)
    ctx.strokeStyle = colours.secondary
    ctx.beginPath()
    ctx.roundRect(card.x + inset, card.y + inset, card.w - inset * 2, card.h - inset * 2, radius * .7)
    ctx.stroke()

    const textWidth = card.w - f.pad * 2
    const cx = W / 2

    const logoImage = logo ? await loadImage(logo) : null
    const maxLines = format === 'wide' ? 1 : 2
    let size = f.headline
    let heads = []
    while (true) {
        ctx.font = `700 ${size}px ${fonts.display}`
        const joined = wrap(ctx, headline.join(' '), textWidth)
        const split = headline.flatMap(line => wrap(ctx, line, textWidth))
        heads = joined.length === 1 && (format === 'wide' || headline.length === 1) ? joined : headline.length > 1 ? split : joined
        if (heads.length <= Math.max(maxLines, headline.length) || size <= f.headline * .55) break
        size *= .92
    }
    ctx.font = `400 ${f.body}px ${fonts.body}`
    const bodyLines = wrap(ctx, body, textWidth).slice(0, f.bodyLines)
    ctx.font = `700 ${f.button}px ${fonts.body}`
    const buttonText = button.toUpperCase()
    const buttonW = ctx.measureText(buttonText).width + f.button * 3.4
    const buttonH = f.button * 2.3

    const logoH = logoImage ? f.logo : f.headline * .55
    const gapA = f.headline * .35
    const headH = heads.length * size * 1.02
    const gapB = f.headline * .3
    const bodyH = bodyLines.length * f.body * 1.45
    const gapC = f.body * 1.1
    const urlH = url ? f.url * 2.2 : 0
    const total = logoH + gapA + headH + gapB + bodyH + gapC + buttonH + urlH
    let y = card.y + (card.h - total) / 2

    if (logoImage) {
        const w = Math.min(textWidth, logoImage.width * (logoH / logoImage.height))
        const h = w * (logoImage.height / logoImage.width)
        ctx.drawImage(logoImage, cx - w / 2, y + (logoH - h) / 2, w, h)
    } else {
        ctx.fillStyle = colours.primary
        ctx.font = `700 ${f.headline * .45}px ${fonts.display}`
        ctx.fillText(title, cx, y + logoH * .8, textWidth)
    }
    y += logoH + gapA

    ctx.fillStyle = colours.text
    ctx.font = `700 ${size}px ${fonts.display}`
    heads.forEach((line, i) => ctx.fillText(line, cx, y + size * .82 + i * size * 1.02))
    y += headH + gapB

    ctx.font = `400 ${f.body}px ${fonts.body}`
    bodyLines.forEach((line, i) => ctx.fillText(line, cx, y + f.body * 1.05 + i * f.body * 1.45))
    y += bodyH + gapC

    ctx.fillStyle = colours.primary
    ctx.beginPath()
    ctx.roundRect(cx - buttonW / 2, y, buttonW, buttonH, buttonH / 2)
    ctx.fill()
    ctx.fillStyle = colours.onPrimary
    ctx.font = `700 ${f.button}px ${fonts.body}`
    const chevron = f.button * .35
    ctx.fillText(buttonText, cx - chevron, y + buttonH / 2 + f.button * .36)
    const tx = cx + ctx.measureText(buttonText).width / 2 + chevron * .4
    ctx.lineWidth = f.button * .1
    ctx.strokeStyle = colours.onPrimary
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(tx, y + buttonH / 2 - chevron * .6)
    ctx.lineTo(tx + chevron * .6, y + buttonH / 2)
    ctx.lineTo(tx, y + buttonH / 2 + chevron * .6)
    ctx.stroke()
    y += buttonH

    if (url) {
        ctx.fillStyle = colours.secondary
        ctx.font = `700 ${f.url}px ${fonts.body}`
        ctx.fillText(url, cx, y + f.url * 1.7, textWidth)
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
