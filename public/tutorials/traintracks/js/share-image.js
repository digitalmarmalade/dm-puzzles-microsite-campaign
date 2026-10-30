var app = window.app || {};

(function () {
  'use strict';

  app.helpers = app.helpers || {};

  function svgToImage(svg) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function loadImage(src, crossOrigin) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (crossOrigin) { img.crossOrigin = 'anonymous'; }
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapLines(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = words[i]; } else { line = test; }
    }
    if (line) { lines.push(line); }
    return lines;
  }

  function lightThemeColour(el) {
    var root = document.documentElement;
    var prev = root.getAttribute('data-theme-status');
    root.setAttribute('data-theme-status', 'light');
    var colour = getComputedStyle(el).color;
    if (prev === null) { root.removeAttribute('data-theme-status'); } else { root.setAttribute('data-theme-status', prev); }
    return colour;
  }

  function lightThemeVar(name) {
    var probe = document.createElement('span');
    probe.style.color = 'var(' + name + ')';
    document.body.appendChild(probe);
    var colour = lightThemeColour(probe);
    probe.remove();
    return colour;
  }

  function lightThemePrimary() {
    return lightThemeVar('--primary');
  }

  function fitText(ctx, text, maxWidth) {
    text = String(text);
    if (ctx.measureText(text).width <= maxWidth) { return text; }
    while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) { text = text.slice(0, -1); }
    return text + '…';
  }

  /* Computed styles read with the page forced to its light theme (the card
     is always light). color-mix() results come back as color(srgb …), which
     canvas can't always take, so those are turned into rgb(). */
  function withLightTheme(fn) {
    var root = document.documentElement;
    var prev = root.getAttribute('data-theme-status');
    root.setAttribute('data-theme-status', 'light');
    try { return fn(); } finally {
      if (prev === null) { root.removeAttribute('data-theme-status'); } else { root.setAttribute('data-theme-status', prev); }
    }
  }

  function canvasColour(value) {
    var m = String(value).match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
    if (!m) { return value; }
    var rgb = [m[1], m[2], m[3]].map(function (v) { return Math.round(Number(v) * 255); });
    return m[4] !== undefined ? 'rgba(' + rgb.join(',') + ',' + m[4] + ')' : 'rgb(' + rgb.join(',') + ')';
  }

  function isVisibleColour(value) {
    return !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(value);
  }

  function textStyle(el, fallback) {
    if (!el) { return fallback; }
    var cs = getComputedStyle(el);
    return {
      colour: canvasColour(cs.color),
      size: parseFloat(cs.fontSize) || fallback.size,
      weight: cs.fontWeight || fallback.weight,
      upper: cs.textTransform === 'uppercase',
    };
  }

  /* The league table as the completion screen draws it. */
  function readResultsStyles() {
    return withLightTheme(function () {
      var list = document.querySelector('.mp-results');
      var rowEls = list ? list.querySelectorAll('.mp-results__row') : [];
      var title = document.querySelector('.mp-results__title');
      var note = document.querySelector('.mp-results__tiebreak');
      var you = document.querySelector('.mp-results__you');
      var gap = list ? parseFloat(getComputedStyle(list).rowGap) : NaN;

      var rows = Array.prototype.map.call(rowEls, function (el) {
        var cs = getComputedStyle(el);
        var avatar = el.querySelector('.mp-avatar');
        var acs = avatar ? getComputedStyle(avatar) : null;
        var trophy = el.querySelector('.mp-results__trophy');

        return {
          bg: canvasColour(cs.backgroundColor),
          border: canvasColour(cs.borderTopColor),
          borderWidth: parseFloat(cs.borderTopWidth) || 0,
          radius: parseFloat(cs.borderTopLeftRadius) || 0,
          padX: parseFloat(cs.paddingLeft) || 8,
          colGap: parseFloat(cs.columnGap) || 8,
          height: Math.max(el.getBoundingClientRect().height || 0, 40),
          avatarBg: acs ? canvasColour(acs.backgroundColor) : null,
          avatarColour: acs ? canvasColour(acs.color) : '#fff',
          avatarSize: acs ? parseFloat(acs.width) || 32 : 32,
          avatarFont: acs ? parseFloat(acs.fontSize) || 15 : 15,
          trophyColour: trophy ? canvasColour(getComputedStyle(trophy).color) : null,
          rank: textStyle(el.querySelector('.mp-results__rank'), { colour: '#666', size: 16, weight: '700' }),
          name: textStyle(el.querySelector('.mp-results__name'), { colour: '#212121', size: 16, weight: '400' }),
          you: textStyle(el.querySelector('.mp-results__you'), { colour: '#666', size: 10, weight: '700' }),
          score: textStyle(el.querySelector('.mp-results__score'), { colour: '#212121', size: 20, weight: '700' }),
          total: textStyle(el.querySelector('.mp-results__total'), { colour: '#666', size: 14, weight: '400' }),
          time: textStyle(el.querySelector('.mp-results__time'), { colour: '#666', size: 11, weight: '400' }),
        };
      });

      return {
        rows: rows,
        youText: you ? you.textContent.trim() : null,
        gap: isNaN(gap) ? 2 : gap,
        title: textStyle(title, { colour: null, size: 22, weight: '700' }),
        note: note ? { text: note.textContent.trim(), style: textStyle(note, { colour: '#666', size: 12, weight: '400' }) } : null,
      };
    });
  }

  function font(style, family) {
    return style.weight + ' ' + style.size + 'px ' + family;
  }

  async function drawCompetitiveCard(model) {
    var FONT = 'Lato, sans-serif';
    var SCALE = 2;
    var W = 320;
    var LEFT = 24;
    var RIGHT = W - 24;
    var rows = model.mpScores;
    var theme = lightThemePrimary();
    var total = model.questionsTotal;
    var lang = model.lang || {};
    var look = readResultsStyles();
    var fallbackRow = look.rows[0] || {
      bg: '#fef8f4', border: 'transparent', borderWidth: 0, radius: 0, padX: 8, colGap: 8, height: 48,
      avatarBg: null, avatarColour: '#fff', avatarSize: 32, avatarFont: 15, trophyColour: null,
      rank: { colour: '#666', size: 16, weight: '700' }, name: { colour: '#212121', size: 16, weight: '400' },
      you: { colour: '#666', size: 10, weight: '700', upper: true }, score: { colour: '#212121', size: 20, weight: '700' },
      total: { colour: '#666', size: 14, weight: '400' }, time: { colour: '#666', size: 11, weight: '400' },
    };
    var styleFor = function (i) { return look.rows[i] || fallbackRow; };

    var listTop = 190;
    var listHeight = rows.reduce(function (sum, _, i) { return sum + styleFor(i).height; }, 0) + look.gap * (rows.length - 1);
    var noteHeight = look.note ? 34 : 0;
    var H = listTop + listHeight + noteHeight + 104;

    var canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    var ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = theme; ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, W - 20, H - 20, 12); ctx.stroke();

    var cx = W / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    var iconEl = document.querySelector('.completion__icon');
    if (iconEl) {
      var iconClone = iconEl.cloneNode(true);
      iconClone.setAttribute('width', '56');
      iconClone.setAttribute('height', '56');
      iconClone.setAttribute('style', 'color:' + lightThemeColour(iconEl));
      var iconImg = await svgToImage(new XMLSerializer().serializeToString(iconClone));
      ctx.drawImage(iconImg, cx - 28, 34, 56, 56);
    }

    var trophy = document.getElementById('iconCompetition');
    var trophyFor = {};
    async function trophyIn(colour) {
      if (!trophy) { return null; }
      if (!trophyFor[colour]) {
        trophyFor[colour] = await svgToImage('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="' + (trophy.getAttribute('viewBox') || '0 0 22 21') + '" style="color:' + colour + '">' + trophy.innerHTML + '</svg>');
      }
      return trophyFor[colour];
    }

    ctx.fillStyle = theme;
    ctx.font = '700 11px ' + FONT;
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '1.5px'; }
    ctx.fillText(String(lang.mp_mode_competitive_title || '').toUpperCase(), cx + 1, 104);
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }

    ctx.fillStyle = look.title.colour || theme;
    ctx.font = look.title.weight + ' ' + Math.min(look.title.size, 24) + 'px ' + FONT;
    ctx.fillText(fitText(ctx, model.mpShareResultTitle || model.mpResultTitle || '', W - 60), cx, 122);

    ctx.fillStyle = '#7a7a7a';
    ctx.font = '400 13px ' + FONT;
    ctx.fillText(model.completionMessageMeta || model.mpLobbyTitle || '', cx, 154);

    var y = listTop;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var st = styleFor(i);
      var colour = lightThemeVar('--mp-p' + row.pidx + '-current');
      var h = st.height;
      var mid = y + h / 2;
      var x = LEFT + st.padX;

      ctx.fillStyle = st.bg;
      roundRect(ctx, LEFT, y, RIGHT - LEFT, h, st.radius); ctx.fill();
      if (st.borderWidth && isVisibleColour(st.border)) {
        ctx.strokeStyle = st.border; ctx.lineWidth = st.borderWidth;
        roundRect(ctx, LEFT + st.borderWidth / 2, y + st.borderWidth / 2, RIGHT - LEFT - st.borderWidth, h - st.borderWidth, st.radius); ctx.stroke();
      }

      ctx.textBaseline = 'middle';

      /* Rank column (2rem), a trophy for winners. */
      var trophyImg = row.isWinner ? await trophyIn(st.trophyColour || colour) : null;
      if (trophyImg) {
        ctx.drawImage(trophyImg, x, mid - 10, 20, 20);
      } else {
        ctx.fillStyle = st.rank.colour;
        ctx.font = font(st.rank, FONT);
        ctx.textAlign = 'center';
        ctx.fillText(String(row.rank), x + 10, mid);
      }
      x += 20 + st.colGap;

      var r = st.avatarSize / 2;
      ctx.fillStyle = st.avatarBg && isVisibleColour(st.avatarBg) ? st.avatarBg : colour;
      ctx.beginPath(); ctx.arc(x + r, mid, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = st.avatarColour;
      ctx.font = '700 ' + st.avatarFont + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(row.initial || String(row.name).charAt(0).toUpperCase(), x + r, mid + 0.5);
      x += st.avatarSize + st.colGap;

      var right = RIGHT - st.padX;
      var totalText = model.mpScoreSuffix ? model.mpScoreSuffix(row) : ' / ' + total;
      var tieText = !row.tied ? '' : model.mpTieText ? model.mpTieText(row) : row.avgMs ? (lang.mp_results_time || '[[seconds]]s').replaceAll('[[seconds]]', (row.avgMs / 1000).toFixed(1)) : '';
      var showTime = !!tieText;
      var scoreMid = showTime ? mid - st.time.size / 2 - 1 : mid;
      ctx.textAlign = 'right';
      ctx.font = font(st.total, FONT);
      var totalWidth = ctx.measureText(totalText).width;
      ctx.fillStyle = st.total.colour;
      ctx.fillText(totalText, right, scoreMid + 1);
      ctx.font = font(st.score, FONT);
      ctx.fillStyle = st.score.colour;
      ctx.fillText(String(row.score), right - totalWidth, scoreMid);
      var scoreWidth = ctx.measureText(String(row.score)).width + totalWidth;

      if (showTime) {
        ctx.font = font(st.time, FONT);
        ctx.fillStyle = st.time.colour;
        ctx.fillText(tieText, right, scoreMid + st.score.size / 2 + st.time.size / 2 + 2);
        ctx.font = font(st.score, FONT);
      }

      /* Name, bold for you, then the small "(YOU)". */
      ctx.textAlign = 'left';
      var nameMax = right - scoreWidth - 10 - x;
      var youText = !row.isSelf ? '' : look.youText !== null ? look.youText : lang.mp_you ? '(' + lang.mp_you + ')' : '';
      if (st.you.upper) { youText = youText.toUpperCase(); }
      ctx.font = font(st.you, FONT);
      var youWidth = youText ? ctx.measureText(youText).width + 4 : 0;
      var nameStyle = { colour: st.name.colour, size: st.name.size, weight: row.isSelf ? '700' : st.name.weight };
      ctx.font = font(nameStyle, FONT);
      ctx.fillStyle = nameStyle.colour;
      var nameText = fitText(ctx, row.name, nameMax - youWidth);
      ctx.fillText(nameText, x, mid);
      if (youText) {
        var nameWidth = ctx.measureText(nameText).width;
        ctx.font = font(st.you, FONT);
        ctx.fillStyle = st.you.colour;
        ctx.fillText(youText, x + nameWidth + 4, mid + 1);
      }

      ctx.textBaseline = 'top';
      y += h + look.gap;
    }

    if (look.note) {
      ctx.textAlign = 'center';
      ctx.fillStyle = look.note.style.colour;
      ctx.font = font(look.note.style, FONT);
      var noteLines = wrapLines(ctx, look.note.text, RIGHT - LEFT).slice(0, 2);
      for (var n = 0; n < noteLines.length; n++) {
        ctx.fillText(noteLines[n], cx, y + 8 + n * (look.note.style.size + 3));
      }
    }

    var logoImg = null;
    try { logoImg = await loadImage('./assets/sticky-puzzles-logo.svg'); } catch (e) { logoImg = null; }
    if (logoImg) {
      var logoW = 152;
      ctx.drawImage(logoImg, cx - logoW / 2, H - 78, logoW, logoW * 36 / 155);
    }

    return await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  }

  app.helpers.generateShareImage = async function () {
    if (document.fonts && document.fonts.ready) { await document.fonts.ready; }

    var model = app.vue.model;

    if (model.mpCompetitive && model.mpScores && model.mpScores.length) {
      return drawCompetitiveCard(model);
    }

    /* Quiz: a scored quiz draws score + verdict; a personality quiz draws its
       result instead of the time row, and has no .completion__icon. */
    var personality = model.isPersonalityQuiz && model.personality ? model.personality : null;
    var quizStats = !personality
      && model.questionsTotal !== undefined
      && model.questionsCorrect !== undefined;

    var iconEl = document.querySelector('.completion__icon');
    var themeEl = personality ? document.querySelector('.completion__personality-title') : iconEl;
    if (!themeEl) { return null; }

    var theme = lightThemeColour(themeEl);
    var iconColour = iconEl ? lightThemeColour(iconEl) : theme;
    /* Quiz keeps its own colour for the icon only; the rest of its card is primary. */
    if (quizStats || personality) { theme = lightThemePrimary(); }
    var FONT = 'Lato, sans-serif';
    var SCALE = 2;
    var W = 320;

    /* Which stats slot to draw: a hints line (Sudoku/Crossword/CellBlocks/Wordsearch),
       HeadCoach's two-column panel, or nothing (GuessWord). Also drives the card height. */
    var hasHints = model.hintsUsed !== undefined;
    var hcStats = !hasHints
      && model.user
      && typeof model.user.wrongAnswers === 'number'
      && typeof model.user.reveals === 'number'
      && !!model.lang.modal_completed_correct_stats_wrong_answers;
    /* Polygon (word wheel): draws words-found + rank + hints. Detected by its
       bespoke words_found lang key, which no other puzzle defines. */
    var polyStats = model.foundCount !== undefined
      && model.totalCount !== undefined
      && !!(model.lang && model.lang.modal_completed_correct_words_found);
    var H = personality ? 420 : (quizStats ? 420 : (polyStats ? 410 : (hcStats ? 400 : 360)));

    var canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    var ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = theme; ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, W - 20, H - 20, 12); ctx.stroke();

    var iconImg = null;
    if (iconEl) {
      var iconClone = iconEl.cloneNode(true);
      iconClone.setAttribute('width', '70');
      iconClone.setAttribute('height', '70');
      iconClone.setAttribute('style', 'color:' + iconColour);
      iconImg = await svgToImage(new XMLSerializer().serializeToString(iconClone));
    }

    var clockPathEl = document.querySelector('#iconTime path');
    var clockImg = clockPathEl
      ? await svgToImage('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="' + clockPathEl.getAttribute('d') + '" fill="#1c1c1c"/></svg>')
      : null;

    var logoImg = null;
    try { logoImg = await loadImage('./assets/sticky-puzzles-logo.svg'); } catch (e) { logoImg = null; }

    var cx = W / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (personality) {
      /* The result image may live on another host; without CORS it fails to
         load (rather than tainting the canvas) and the card goes text-only. */
      var resultImg = null;
      if (personality.src) {
        try { resultImg = await loadImage(personality.src, true); } catch (e) { resultImg = null; }
      }

      var py = 110;
      if (resultImg) {
        var imgW = W - 60;
        var imgH = imgW * 9 / 16;
        var scale = Math.max(imgW / resultImg.width, imgH / resultImg.height);
        var sw = imgW / scale;
        var sh = imgH / scale;
        ctx.save();
        roundRect(ctx, 30, 30, imgW, imgH, 8); ctx.clip();
        ctx.drawImage(resultImg, (resultImg.width - sw) / 2, (resultImg.height - sh) / 2, sw, sh, 30, 30, imgW, imgH);
        ctx.restore();
        py = 30 + imgH + 24;
      } else if (iconImg) {
        ctx.drawImage(iconImg, cx - 35, 60, 70, 70);
        py = 150;
      }

      ctx.fillStyle = '#212121';
      ctx.font = '400 14px ' + FONT;
      ctx.fillText(model.lang.modal_completed_personality_intro || '', cx, py);

      ctx.fillStyle = theme;
      ctx.font = '700 26px ' + FONT;
      var titleLines = wrapLines(ctx, personality.title || '', W - 60).slice(0, 2);
      for (var t = 0; t < titleLines.length; t++) {
        ctx.fillText(titleLines[t], cx, py + 22 + t * 30);
      }

      ctx.fillStyle = '#7a7a7a';
      ctx.font = '400 13px ' + FONT;
      var pMeta = model.formattedMeta;
      ctx.fillText(model.completionMessageMeta || (pMeta.variant + ' ' + (pMeta.numberLabel || pMeta.number)).trim(), cx, py + 22 + titleLines.length * 30 + 10);

      if (logoImg) {
        var pLogoW = 152;
        ctx.drawImage(logoImg, cx - pLogoW / 2, H - 78, pLogoW, pLogoW * 36 / 155);
      }

      return await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
    }

    if (iconImg) { ctx.drawImage(iconImg, cx - 35, 60, 70, 70); }

    var titleText = model.lang.modal_completed_correct_title || '';
    try {
      var titleReplaced = model.langReplace ? model.langReplace('modal_completed_correct_title') : titleText;
      if (titleReplaced && titleReplaced.indexOf('[[') === -1 && titleReplaced.indexOf('<') === -1) { titleText = titleReplaced; }
    } catch (e) { /* keep raw title */ }

    ctx.fillStyle = theme;
    ctx.font = '700 15px ' + FONT;
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '1px'; }
    ctx.fillText(titleText.toUpperCase(), cx + 1, 140);
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }

    ctx.fillStyle = '#212121';
    ctx.font = '700 18px ' + FONT;
    var meta = model.formattedMeta;
    /* Quiz names itself by title (completionMessageMeta); everyone else by variant + number. */
    ctx.fillText(quizStats && model.completionMessageMeta ? model.completionMessageMeta : (meta.variant + ' ' + (meta.numberLabel || meta.number)).trim(), cx, 165);

    if (quizStats) {
      var scoreText = String(model.questionsCorrect);
      var totalText = ' / ' + model.questionsTotal;
      ctx.font = '700 44px ' + FONT;
      var scoreWidth = ctx.measureText(scoreText).width;
      ctx.font = '400 24px ' + FONT;
      var totalWidth = ctx.measureText(totalText).width;
      var scoreX = cx - (scoreWidth + totalWidth) / 2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#212121';
      ctx.font = '700 44px ' + FONT;
      ctx.fillText(scoreText, scoreX, 234);
      ctx.font = '400 24px ' + FONT;
      ctx.fillText(totalText, scoreX + scoreWidth, 234);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      var verdict = String(model.completionMessageTitle || '').replace(/<[^>]*>/g, '');
      if (verdict) {
        ctx.font = '600 15px ' + FONT;
        ctx.fillText(verdict, cx, 248);
      }
    }

    /* Quiz swaps the elapsed time for "N seconds remaining" in overall-countdown mode. */
    var time = model.timerDisplay;
    var timeFont = '700 30px ';
    if (quizStats && typeof model.completionMessageByline === 'string') {
      time = model.completionMessageByline.replace(/<[^>]*>/g, '');
      if (model.timerMode === 'overallTimer') { timeFont = '700 18px '; }
    }
    ctx.font = timeFont + FONT;
    var timeWidth = ctx.measureText(time).width;
    var clockSize = quizStats ? 22 : 28;
    var clockWidth = clockImg ? clockSize : 0;
    var rowGap = clockImg ? 8 : 0;
    var startX = cx - (clockWidth + rowGap + timeWidth) / 2;
    var rowMidY = quizStats ? 290 : 205;
    /* Centre the clock and time on one line via the 'middle' baseline: iOS Safari's
       'top' baseline sits lower than desktop's, which skewed the clock/time alignment. */
    ctx.textBaseline = 'middle';
    if (clockImg) { ctx.drawImage(clockImg, startX, rowMidY - clockSize / 2, clockSize, clockSize); }
    ctx.textAlign = 'left';
    ctx.fillText(time, startX + clockWidth + rowGap, rowMidY);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (polyStats) {
      var yStat = 232;

      ctx.fillStyle = '#212121';
      ctx.font = '400 13px ' + FONT;
      var wordsText = model.langReplace ? model.langReplace('modal_completed_correct_words_found') : '';
      if (wordsText && wordsText.indexOf('[[') === -1) { ctx.fillText(wordsText, cx, yStat); }

      if (model.rankName) {
        ctx.fillStyle = theme;
        ctx.font = '700 15px ' + FONT;
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '1px'; }
        var rankLabel = model.langRank ? model.langRank(model.rankName) : model.rankName;
        ctx.fillText(String(rankLabel).toUpperCase(), cx + 1, yStat + 24);
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
      }

      var pHints = model.hintsUsed ? (model.hintsSummary || '') : (model.lang.modal_completed_correct_hints_none || '');
      if (pHints) {
        ctx.fillStyle = '#7a7a7a';
        ctx.font = '400 11px ' + FONT;
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0.5px'; }
        ctx.fillText(pHints.toUpperCase(), cx + 1, yStat + 50);
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
      }
    } else if (hasHints) {
      var hintsText = model.hintsUsed ? (model.hintsSummary || '') : (model.lang.modal_completed_correct_hints_none || '');
      if (hintsText) {
        ctx.fillStyle = '#212121';
        ctx.font = '400 12px ' + FONT;
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '1px'; }
        ctx.fillText(hintsText.toUpperCase(), cx + 1, quizStats ? 312 : 230);
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
      }
    } else if (hcStats) {
      var cols = [
        { value: model.user.wrongAnswers || 0, label: model.lang.modal_completed_correct_stats_wrong_answers || '' },
        { value: model.user.reveals || 0, label: model.lang.modal_completed_correct_stats_reveals || '' }
      ];
      var colGap = 70;
      for (var i = 0; i < cols.length; i++) {
        var colX = cx + (i === 0 ? -colGap : colGap);
        ctx.fillStyle = theme;
        ctx.font = '700 24px ' + FONT;
        ctx.fillText(String(cols[i].value), colX, 255);
        ctx.fillStyle = '#212121';
        ctx.font = '400 10px ' + FONT;
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0.5px'; }
        ctx.fillText(cols[i].label.toUpperCase(), colX, 240);
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
      }
    }

    if (logoImg) {
      var logoW = 152;
      var logoH = logoW * 36 / 155;
      ctx.drawImage(logoImg, cx - logoW / 2, H - 78, logoW, logoH);
    }

    return await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  };
})();
