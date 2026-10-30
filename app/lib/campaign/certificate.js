const WIDTH = 1080
const HEIGHT = 1350

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

function lines(ctx, text, {y, size, maxWidth, lineHeight = 1.2}) {
    const rows = wrap(ctx, text, maxWidth)
    rows.forEach((row, i) => ctx.fillText(row, WIDTH / 2, y + i * size * lineHeight))
    return y + rows.length * size * lineHeight
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
}

export async function drawCertificate({colours, fonts, logo, title, avatar, initial, name, completed, result, dates, url}) {
    await document.fonts?.ready
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = colours.background
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = colours.secondary
    ctx.globalAlpha = .12
    ctx.beginPath()
    ctx.arc(WIDTH * .9, HEIGHT * .08, 260, 0, Math.PI * 2)
    ctx.arc(WIDTH * .08, HEIGHT * .95, 220, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    const card = {x: 70, y: 70, w: WIDTH - 140, h: HEIGHT - 140}
    ctx.shadowColor = 'rgba(0, 0, 0, .12)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 12
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, card.x, card.y, card.w, card.h, 40)
    ctx.fill()
    ctx.shadowColor = 'transparent'

    ctx.save()
    roundRect(ctx, card.x, card.y, card.w, card.h, 40)
    ctx.clip()
    ctx.fillStyle = colours.primary
    ctx.fillRect(card.x, card.y, card.w, 22)
    ctx.restore()

    let y = 190
    const logoImage = logo ? await loadImage(logo) : null
    if (logoImage) {
        const h = 110
        const w = Math.min(card.w - 160, logoImage.width * (h / logoImage.height))
        ctx.drawImage(logoImage, (WIDTH - w) / 2, y - 80, w, h)
        y += 60
    } else {
        ctx.fillStyle = colours.primary
        ctx.font = `700 46px ${fonts.display}`
        y = lines(ctx, title, {y, size: 46, maxWidth: card.w - 160})
    }

    const r = 150
    const cy = y + 60 + r
    ctx.fillStyle = colours.tint
    ctx.beginPath()
    ctx.arc(WIDTH / 2, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = colours.primary
    ctx.stroke()
    const avatarImage = avatar ? await loadImage(avatar) : null
    if (avatarImage) {
        const size = r * 1.2
        ctx.drawImage(avatarImage, WIDTH / 2 - size / 2, cy - size / 2, size, size)
    } else {
        ctx.fillStyle = colours.primary
        ctx.font = `700 150px ${fonts.display}`
        ctx.textBaseline = 'middle'
        ctx.fillText(initial || '★', WIDTH / 2, cy + 8)
        ctx.textBaseline = 'alphabetic'
    }

    y = cy + r + 110
    ctx.fillStyle = colours.text
    ctx.font = `700 76px ${fonts.display}`
    y = lines(ctx, name, {y, size: 76, maxWidth: card.w - 120}) + 10

    ctx.fillStyle = colours.primary
    ctx.font = `400 46px ${fonts.body}`
    y = lines(ctx, completed, {y, size: 46, maxWidth: card.w - 160}) + 40

    ctx.fillStyle = colours.text
    ctx.font = `700 40px ${fonts.body}`
    y = lines(ctx, result, {y, size: 40, maxWidth: card.w - 160}) + 6

    ctx.globalAlpha = .7
    ctx.font = `400 34px ${fonts.body}`
    lines(ctx, dates, {y, size: 34, maxWidth: card.w - 160})
    ctx.globalAlpha = 1

    if (url) {
        ctx.fillStyle = colours.secondary
        ctx.font = `700 30px ${fonts.body}`
        lines(ctx, url, {y: card.y + card.h - 70, size: 30, maxWidth: card.w - 120})
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
