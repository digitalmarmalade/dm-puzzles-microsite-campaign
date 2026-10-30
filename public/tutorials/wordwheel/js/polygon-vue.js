var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.vue.data.feedback = [];

  app.vue.data.reveal.solution = false;

  app.vue.data.show.help = false;

  app.vue.data.show.tooltip = 1;

  app.vue.data.show.unused = false;

  app.vue.data.show.settings = false;

  app.vue.data.admired = false;

  app.vue.computed.isCompletedWithErrors = function () {
    return this.isCompleted && !this.isCompletedWithoutErrors;
  };

  app.vue.computed.isTouch = function () {
    return Modernizr.touch;
  };

  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
  };

  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize;
  };

  app.vue.computed.helpShowing = function () {
    return app.vue.data.show.help === true;
  };

  app.vue.computed.wrapperClasses = function () {
    return [];
  };

  app.vue.methods.shareResult = async function () {
    const url = app.vue.data.links.share;
    const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

    const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
    const result = app.helpers.isPointsScoring()
      ? `scoring ${this.score} of ${this.maxScore} points`
      : `finding ${this.foundCount} of ${this.totalCount} words`;
    const text = this.mpCompetitive
      ? this.mpShareText
      : app.helpers.isTimed()
        ? `🔤 I played ${title} against the clock, ${result}`
        : `🔤 I completed ${title} in ${this.timerDisplay}, ${result}`;

    let file = null;
    try {
      const blob = app.helpers.generateShareImage && (await app.helpers.generateShareImage());
      if (blob) file = new File([blob], `${title}.png`, { type: 'image/png' });
    } catch (err) {
      console.warn('share image failed', err);
    }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text });
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.error(err);
      }
    }

    if (file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `${title}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    if (!navigator.share) {
      app.vue.methods.copyToClipboard(`${text} ${url}`);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    navigator
      .share({ title, text, url })
      .then(() => app.helpers.dispatchEvent('puzzleshare', { data: {} }))
      .catch((err) => {
        app.vue.methods.copyToClipboard(`${text} ${url}`);
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        console.error(err);
      });
  };

  app.vue.methods.langReplace = function (lexeme) {
    let string = this.lang[lexeme];
    if (!string) return '';

    string = string.replaceAll('[[difficulty]]', this.formattedMeta.difficulty);
    string = string.replaceAll('[[foundCount]]', this.foundCount);
    string = string.replaceAll('[[score]]', this.score);
    string = string.replaceAll('[[maxScore]]', this.maxScore);
    string = string.replaceAll('[[number]]', this.formattedMeta.numberLabel);
    string = string.replaceAll(
      '[[timer]]',
      '<span class="completion__timer">' + this.timerDisplay + '</span>'
    );
    string = string.replaceAll('[[totalCount]]', this.totalCount);
    string = string.replaceAll('[[variant]]', this.formattedMeta.variant);
    string = string.replaceAll('[[wordsUntilNextRank]]', this.wordsUntilNextRank);

    return string;
  };

  app.vue.data.show.main = [];
  app.vue.data.show.howToPlay = '';
  app.vue.data.reveal.hint = false;
  app.vue.data.hintTimes = 0;
  app.vue.data.celebrating = false;

  app.vue.computed.totalCellsCompleted = function () {
    return app.vue.data.user.found.length;
  };

  app.vue.computed.totalCellsPercent = function () {
    const max = app.helpers.maxScore();
    return max ? (app.helpers.score() / max) * 100 : 0;
  };

  app.vue.computed.isTimed = function () {
    return app.helpers.isTimed();
  };

  app.vue.computed.clockDisplay = function () {
    if (!app.helpers.isTimed()) return this.timerDisplay;
    return this.formatDuration(app.helpers.timeLimit() - app.vue.data.time);
  };

  app.vue.computed.timeLeftFraction = function () {
    const limit = app.helpers.timeLimit();
    return limit ? Math.max(0, limit - app.vue.data.time) / limit : 0;
  };

  app.vue.computed.clockFinal = function () {
    const left = app.helpers.timeLimit() - app.vue.data.time;
    return app.helpers.isTimed() && !this.isCompleted && left > 0 && left <= 10;
  };

  app.vue.computed.clockLow = function () {
    return (
      app.helpers.isTimed() &&
      !this.isCompleted &&
      app.helpers.timeLimit() - app.vue.data.time <= 30
    );
  };

  app.vue.computed.score = function () {
    return app.helpers.score();
  };

  app.vue.computed.maxScore = function () {
    return app.helpers.maxScore();
  };

  app.vue.computed.lang = (function (base) {
    return function () {
      const lexemes = base.call(this);
      const modes = [
        app.helpers.isReuseLetters() && 'reuse',
        app.helpers.isTimed() && 'timed',
        app.helpers.isPointsScoring() && 'points',
      ].filter(Boolean);
      if (!modes.length) return lexemes;

      const suffixes = [];
      for (let mask = (1 << modes.length) - 1; mask > 0; mask--) {
        suffixes.push('_' + modes.filter((m, i) => mask & (1 << i)).join('_'));
      }
      suffixes.sort((a, b) => b.split('_').length - a.split('_').length);

      const minutes = String(Math.round(app.helpers.timeLimit() / 60));
      const swapped = { ...lexemes };
      for (const key in lexemes) {
        const suffix = suffixes.find(s => lexemes[key + s] !== undefined);
        if (suffix) swapped[key] = lexemes[key + suffix];
        if (typeof swapped[key] === 'string' && swapped[key].includes('[[minutes]]')) {
          swapped[key] = swapped[key].replaceAll('[[minutes]]', minutes);
        }
      }
      return swapped;
    };
  })(app.vue.computed.lang);

  app.vue.computed.userString = function () {
    return app.vue.data.user.answers || app.vue.data.source.celldata;
  };

  app.vue.computed.isCompletedWithoutErrors = function () {
    return app.vue.data.user.found?.length === app.vue.data.user.solution.length;
  };

  app.vue.computed.isCompleted = function () {
    return (
      app.vue.data.user.found?.length === app.vue.data.user.solution.length ||
      app.vue.data.user.isEnded
    );
  };

  app.vue.methods.deleteClicked = function () {
    app.vue.methods.removeLetter();
  };

  app.vue.methods.getPuzzleObject = function () {
    var puzzle = app.vue.data.source;
    var obj = {
      allowedValues: puzzle.settings.allowedValues,
      width: puzzle.settings.colCount,
      height: puzzle.settings.rowCount,
      letters: [],
      counts: {
        cells: {
          active: 0,
          given: 0,
          total: 0,
        },
      },
      meta: puzzle.meta,
      cells: puzzle.celldata,
      clues: puzzle.cluedata,
      solution: puzzle.settings.solution.split(','),
    };

    obj = app.vue.methods.setPuzzleGrid(obj, puzzle);

    return obj;
  };

  app.vue.computed.getShortestWord = function () {
    const f = app.vue.data.user.found.map(({ word }) => word.toLowerCase());

    const words = app.vue.data.user.solution
      .filter(w => w && !f.includes(w.toLowerCase()))
      .sort((a, b) => a.length - b.length);

    return words[0]?.length || 0;
  };

  app.vue.computed.minWordLength = function () {
    const lengths = (app.vue.data.user.solution || []).filter(Boolean).map(w => w.length);

    return lengths.length ? Math.min(...lengths) : 0;
  };

  app.vue.computed.canSubmitWord = function () {
    if (app.vue.computed.isCompleted()) return false;

    const word = app.vue.data.user.currentWord || '';

    return word.length >= app.vue.computed.minWordLength();
  };

  app.vue.methods.setPuzzleGrid = function (obj, puzzle) {
    var givenLetters = puzzle.celldata.replace(',', '');

    for (var id = 0, x = 0; x < givenLetters.length; x++) {
      var letter = {
        id: id,
        text: givenLetters[x],
        used: false,
      };
      id++;
      obj.letters.push(letter);
    }

    return obj;
  };

  app.vue.methods.enterLetter = function (id) {
    app.vue.methods.clearStates();
    if (app.helpers.isReuseLetters()) {
      app.vue.methods.pressCell(app.vue.data.user.letters.indexOf(id));
    }
    app.helpers.setLetterUsed(id, true);
    app.helpers.addLetterToWord(id);
    app.helpers.saveUserState();
    app.helpers.dispatchEvent('letterpicked');
  };

  app.vue.methods.removeLetter = function () {
    app.vue.methods.clearStates();

    const lastLetter = app.vue.data.user.orderAdded[app.vue.data.user.orderAdded.length - 1];

    if (lastLetter) {
      app.helpers.setLetterUsed(lastLetter, false);
      app.helpers.removeLetterFromWord();
    }

    app.helpers.saveUserState();
  };

  app.vue.methods.shuffleLetters = function () {
    app.vue.methods.clearStates();

    const [first, ...rest] = app.vue.data.user.letters;
    const sortedLetters = rest.sort(() => 0.5 - Math.random());

    app.vue.data.user.letters = [first, ...sortedLetters];

    const WHEEL = 150;
    const DURATION = 600;
    const ease = t => 1 - Math.pow(1 - t, 4);

    const targets = [];
    document.querySelectorAll('#gridWrapper .cell-group').forEach(group => {
      if (group.querySelector('.centre-button')) return;
      const letter = group.querySelector('.cell-letter');
      let lcx = WHEEL;
      let lcy = WHEEL;
      try {
        if (letter) {
          const b = letter.getBBox();
          lcx = b.x + b.width / 2;
          lcy = b.y + b.height / 2;
        }
      } catch (e) {}
      targets.push({ group, letter, lcx, lcy });
    });

    const token = (app.polygonShuffleToken = (app.polygonShuffleToken || 0) + 1);
    const startedAt = performance.now();
    const step = now => {
      if (token !== app.polygonShuffleToken) return;
      const angle = 360 * ease(Math.min(1, (now - startedAt) / DURATION));
      targets.forEach(({ group, letter, lcx, lcy }) => {
        group.setAttribute('transform', `rotate(${angle} ${WHEEL} ${WHEEL})`);
        if (letter) letter.setAttribute('transform', `rotate(${-angle} ${lcx} ${lcy})`);
      });
      if (now - startedAt < DURATION) {
        requestAnimationFrame(step);
      } else {
        targets.forEach(({ group, letter }) => {
          group.removeAttribute('transform');
          if (letter) letter.removeAttribute('transform');
        });
      }
    };
    requestAnimationFrame(step);

    app.helpers.dispatchEvent('shuffled');
    app.helpers.saveUserState();
  };

  app.vue.methods.revealHint = function () {
    if (app.status.completed) return;

    const onHint =
      !!app.vue.data.user.shownHint &&
      (app.vue.data.user.currentWord || '').toUpperCase() === app.vue.data.user.shownHint;

    if (!onHint) {
      while (app.vue.data.user.currentWord) {
        app.vue.methods.removeLetter();
      }
      app.vue.data.user.hintTimes = 0;
      app.vue.data.user.shownHint = '';
    }

    app.helpers.dispatchEvent('puzzlehintused', { data: {} });
    app.vue.data.user.reveal.hint = true;
    app.vue.data.user.hintTimes++;

    const {
      letters,
      hintTimes,
      shownHint,
      reveal: { hint },
    } = app.vue.data.user;

    const shortestWord = app.vue.model.getShortestWord;
    const shortestHint = app.vue.model.getShortestHint;

    if (hintTimes > 0 && hint) {
      if (hintTimes - 1 < shortestWord) {
        app.vue.data.user.shownHint = shownHint + shortestHint[hintTimes - 1]?.toUpperCase();

        for (let i = 0; i < letters.length; i++) {
          if (
            !letters[i].used &&
            app.vue.data.user.shownHint[hintTimes - 1] === letters[i].text.toUpperCase()
          ) {
            app.helpers.recordCellsRevealed(1);
            app.helpUsed('reveal', 'letter');
            return app.vue.methods.enterLetter(letters[i]);
          }
        }
      } else if (hintTimes >= shortestWord && hint) {
        return shortestWord;
      }
    }
  };

  app.vue.methods.clearStates = function () {};

  app.vue.computed.getShortestHint = function () {
    const s = app.vue.model.getShortestWord;
    const f = app.vue.data.user.found.map(({ word }) => word.toLowerCase());

    const words = app.vue.data.user.solution.filter(w => {
      if (w.length === s && !f.includes(w.toLowerCase())) {
        return w;
      }
    });

    return words[Math.floor(Math.random() * words.length)];
  };

  app.vue.computed.hintsMaxed = function () {
    return app.vue.data.user.hintTimes === app.vue.computed.getShortestWord();
  };

  app.vue.computed.wordsRemaining = function () {
    return app.vue.data.user.solution.length - app.vue.data.user.found.length;
  };

  app.vue.computed.wordsUntilNextRank = function () {
    const landmarks = app.helpers.processLandmarks(app.puzzle.clues);
    return landmarks[app.vue.data.user.rank.current] - app.helpers.score();
  };

  app.vue.computed.rankCount = function () {
    return app.vue.data.user.rank.current;
  };

  app.vue.computed.rankName = function () {
    return app.vue.data.user.rank.name;
  };

  app.vue.computed.foundCount = function () {
    return app.vue.data.user.found.length;
  };

  app.vue.computed.totalCount = function () {
    return app.vue.data.user.solution.length;
  };

  app.vue.methods.resetGrid = function () {
    app.helpers.resetUserState();
    app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());
    app.vue.data.reveal.solution = false;
    app.vue.methods.hideModal();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };

  app.vue.methods.revealGrid = function () {
    app.vue.data.reveal.grid = true;
    this.hideModal();
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('reveal.grid');
    }, 0);
  };

  app.vue.methods.changeHint = function () {
    app.vue.data.user.settings.hint++;
  };

  app.vue.methods.resetSelectedWords = function () {
    app.vue.data.user.letters.map(letter => (letter.used = false));
  };

  app.vue.methods.shakeElement = function (el) {
    if (!el) return;

    el.classList.add('shake');

    setTimeout(() => {
      el.classList.remove('shake');
    }, 1000);
  };

  app.vue.methods.celebrateWord = function () {
    const word = document.querySelector('#gameInput .game-input__word');
    if (!word) return;

    const rect = word.getBoundingClientRect();
    const cs = getComputedStyle(word);
    const ghost = word.cloneNode(true);

    Object.assign(ghost.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      margin: '0',
      color: 'var(--primary)',
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      pointerEvents: 'none',
      zIndex: '50',
    });

    document.body.appendChild(ghost);

    const anim = ghost.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.25)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0)', opacity: 0 },
      ],
      { duration: 550, easing: 'ease-out' }
    );

    const cleanup = () => ghost.remove();
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  };

  app.vue.methods.usesAllLetters = function (word) {
    if (!word) return false;
    const used = new Set(word.toLowerCase().split(''));
    return app.vue.data.user.letters.every(l => used.has(l.text.toLowerCase()));
  };

  app.vue.methods.celebratePangram = function () {
    const wheel = document.querySelector('#gridWrapper svg');

    if (wheel) {
      wheel.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.4 }, { transform: 'scale(1)' }],
        { duration: 380, easing: 'ease-out' }
      );
    }

    return app.vue.methods.sweepWheel({ duration: 340, stagger: 45, pulse: true });
  };

  app.vue.methods.sweepWheel = function ({ duration, stagger, pulse = false, hold = false }) {
    const groups = [...document.querySelectorAll('#gridWrapper .cell-group')];
    const gold =
      getComputedStyle(document.documentElement).getPropertyValue('--celebration-gold').trim() ||
      '#d4af37';

    const ordered = groups
      .map(group => {
        const circle = group.querySelector('.cell-button');
        const cx = parseFloat(circle.getAttribute('cx'));
        const cy = parseFloat(circle.getAttribute('cy'));
        const isCentre = !!group.querySelector('.centre-button');
        const angle = (Math.atan2(cx - 150, -(cy - 150)) * 180) / Math.PI;
        return { group, circle, cx, cy, isCentre, angle: (angle + 360) % 360 };
      })
      .sort((a, b) => (a.isCentre ? -1 : b.isCentre ? 1 : a.angle - b.angle));

    const total = duration + Math.max(0, ordered.length - 1) * stagger;

    ordered.forEach((cell, i) => {
      const base = getComputedStyle(cell.circle).fill;
      const frames = hold
        ? [{ fill: base }, { fill: gold, offset: 0.4 }, { fill: gold, offset: 0.7 }, { fill: base }]
        : [{ fill: base }, { fill: gold, offset: 0.4 }, { fill: base }];
      cell.circle.animate(frames, {
        duration,
        delay: i * stagger,
        easing: hold ? 'ease-in-out' : 'ease-out',
      });
    });

    if (!pulse) return total;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const token = (app.polygonPangramToken = (app.polygonPangramToken || 0) + 1);
    const start = performance.now();
    const step = now => {
      if (token !== app.polygonPangramToken) return;
      const elapsed = now - start;
      ordered.forEach((cell, i) => {
        const p = (elapsed - i * stagger) / duration;
        if (p <= 0 || p >= 1) {
          cell.group.removeAttribute('transform');
          return;
        }
        const peak = cell.isCentre ? 1.12 : 1.07;
        const tri = p < 0.4 ? easeOut(p / 0.4) : easeOut((1 - p) / 0.6);
        const s = 1 + (peak - 1) * tri;
        cell.group.setAttribute(
          'transform',
          `translate(${cell.cx} ${cell.cy}) scale(${s}) translate(${-cell.cx} ${-cell.cy})`
        );
      });
      if (elapsed < total) requestAnimationFrame(step);
      else ordered.forEach(cell => cell.group.removeAttribute('transform'));
    };
    requestAnimationFrame(step);

    return total;
  };

  app.vue.methods.pressCell = function (index) {
    const circle = document
      .querySelector(`#gridWrapper .cell-letter[data-letter="${index}"]`)
      ?.closest('.cell-group')
      ?.querySelector('.cell-button');
    if (!circle) return;

    const group = circle.closest('.cell-group');
    const isCentre = circle.classList.contains('centre-button');
    const base = getComputedStyle(circle).fill;
    circle.style.fill = isCentre ? 'var(--primary-dark)' : 'var(--primary-light)';
    const flash = getComputedStyle(circle).fill;
    circle.style.fill = '';

    circle.getAnimations().forEach(a => a.cancel());
    circle.animate([{ fill: base }, { fill: flash, offset: 0.25 }, { fill: base }], {
      duration: 260,
      easing: 'ease-out',
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    const duration = 200;
    const token = (group.pressToken = (group.pressToken || 0) + 1);
    const start = performance.now();
    const step = now => {
      if (token !== group.pressToken) return;
      const p = Math.min(1, (now - start) / duration);
      const s = 1 - 0.1 * Math.sin(Math.PI * p);
      if (p < 1) {
        group.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
        requestAnimationFrame(step);
      } else {
        group.removeAttribute('transform');
      }
    };
    requestAnimationFrame(step);
  };

  app.vue.computed.statHighlight = function () {
    const time = app.vue.data.time;
    const found = app.vue.data.user.found || [];
    const words = found.length;
    const letters = found.reduce((sum, f) => sum + (f.word ? f.word.length : 0), 0);

    const stats = (app.puzzle && app.puzzle.stats) || this.getMockStats();
    if (!stats) return '';

    const w = stats.words;
    if (w && w.last != null && words !== w.last) {
      const delta = Math.abs(words - w.last);
      const key =
        words > w.last
          ? delta === 1
            ? 'completion_stat_words_more_one'
            : 'completion_stat_words_more_other'
          : delta === 1
          ? 'completion_stat_words_fewer_one'
          : 'completion_stat_words_fewer_other';
      return (this.lang[key] || '').replaceAll('[[delta]]', delta);
    }

    const l = stats.letters;
    if (l && l.last != null && letters !== l.last) {
      const delta = Math.abs(letters - l.last);
      const key = letters > l.last ? 'completion_stat_letters_more' : 'completion_stat_letters_fewer';
      return (this.lang[key] || '').replaceAll('[[delta]]', delta);
    }

    const t = app.helpers.isTimed() ? null : stats.time;
    if (t) {
      if (t.ever != null && time <= t.ever) return this.lang.completion_stat_time_bestEver || '';
      if (t.week != null && time <= t.week) return this.lang.completion_stat_time_bestWeek || '';
      if (t.last != null && time < t.last) {
        return (this.lang.completion_stat_time_better || '').replaceAll(
          '[[delta]]',
          this.formatDuration(t.last - time)
        );
      }
    }

    return '';
  };

  app.vue.methods.getMockStats = (function (base) {
    return function () {
      const merged = base();
      const raw = new URLSearchParams(window.location.search).get('mockStats');
      const wordPresets = {
        best: { words: { last: 0 }, letters: { last: 0 } },
        worse: { words: { last: 9999 }, letters: { last: 9999 } },
        demo: { words: { last: 12 }, letters: { last: 60 } },
      };
      if (merged && wordPresets[raw]) Object.assign(merged, wordPresets[raw]);
      return merged;
    };
  })(app.vue.methods.getMockStats);

  // Three rejected words in a row points to Hint, once.
  var rejectedInARow = 0;

  app.vue.methods.enterWord = function () {
    app.vue.data.user.reveal.hint = false;
    app.vue.data.user.hintTimes = 0;
    app.vue.data.user.shownHint = '';

    app.vue.methods.clearStates();

    if (!app.vue.data.user.currentWord) return;

    const inSolution = app.vue.data.user.solution
      .map(s => s.toLowerCase())
      .includes(app.vue.data.user.currentWord.toLowerCase());

    const isAlreadyFound = app.vue.data.user.found.some(
      ({ word }) => word === app.vue.data.user.currentWord
    );

    const containsCentreLetter = app.vue.data.user.currentWord
      .split('')
      .includes(app.vue.data.user.letters[0].text);

    const tooShort = app.vue.data.user.currentWord.length < app.vue.computed.minWordLength();

    let foundNewWord = false;

    switch (true) {
      case tooShort:
        app.vue.methods.showFeedback(app.vue.model.lang.feedback_too_short);
        app.vue.methods.shakeElement(document.getElementById('gameInput'));
        break;
      case !containsCentreLetter:
        app.vue.methods.showFeedback(app.vue.model.lang.blind_incorrect_missing_centre_title);
        app.vue.methods.shakeElement(document.getElementById('gameInput'));
        break;
      case inSolution && !isAlreadyFound:
        foundNewWord = true;
        app.vue.data.user.found.push({
          word: app.vue.data.user.currentWord,
          time: app.vue.computed.timerDisplay(),
        });
        app.vue.methods.celebrateWord();
        if (app.vue.methods.usesAllLetters(app.vue.data.user.currentWord)) {
          app.vue.methods.celebratePangram();
          app.vue.methods.showFeedback(app.vue.model.lang.feedback_pangram, 'good');
        }
        app.helpers.checkLevelUp();
        app.helpers.checkPace();
        break;
      case !inSolution:
        app.vue.methods.showFeedback(app.vue.model.lang.blind_incorrect_not_in_solution_title);
        app.vue.methods.shakeElement(document.getElementById('gameInput'));
        break;
      case isAlreadyFound:
        app.vue.methods.showFeedback(
          app.helpers.alreadyFoundText?.(app.vue.data.user.currentWord) ??
            app.vue.model.lang.blind_incorrect_already_found_title
        );
        app.vue.methods.shakeElement(document.getElementById('gameInput'));
        break;
    }

    app.vue.methods.resetSelectedWords();
    app.vue.data.user.currentWord = '';

    app.helpers.updateProgress();
    app.helpers.saveUserState();
    app.helpers.checkStartedStatus();
    app.helpers.saveUserPlayStatus();
    app.helpers.saveActiveState();

    if (foundNewWord) {
      app.helpers.checkHalfwayComplete();
      app.helpers.sendProgressUpdate();
      rejectedInARow = 0;
      app.helpers.dispatchEvent('wordfound');
    } else if (++rejectedInARow >= 3) {
      app.helpers.guideTip?.('hint');
    }
  };

  app.vue.methods.timeUp = function (animate = true) {
    if (app.vue.data.user.isEnded || app.status.completed || app.vue.data.state.timeUp) return;

    const finish = () => {
      app.vue.data.state.timeUp = false;
      app.vue.data.reveal.solution = true;
      app.vue.data.user.isEnded = true;
      app.helpers.setRank(app.vue.data.user.found);
      app.helpers.saveUserPlayStatus();
      app.helpers.saveUserState();
      app.helpers.dispatchEvent('puzzleended', app.progress?.handlers.all());
      app.helpers.puzzleCompletedSuccessfully();
    };

    if (!animate) return finish();

    app.timer?.stop();
    app.vue.methods.hideModal();
    while (app.vue.data.user.currentWord) app.vue.methods.removeLetter();
    app.vue.data.state.timeUp = true;
    navigator.vibrate?.([120, 80, 120]);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(finish, reduceMotion ? 1000 : 1800);
  };

  app.vue.methods.endGame = function () {
    app.helpUsed('reveal', 'solution');
    app.vue.methods.hideModal();
    app.vue.data.reveal.solution = true;
    app.vue.data.user.isEnded = true;
    app.helpers.setRank(app.vue.data.user.found);
    app.helpers.saveUserPlayStatus();
    app.helpers.saveUserState();
    app.helpers.dispatchEvent('puzzleended', app.progress?.handlers.all());
    app.helpers.puzzleCompletedSuccessfully();
  };

  let feedbackId = 0;
  let feedbackNextAt = 0;

  app.vue.methods.showFeedback = function (text, tone = 'bad') {
    if (!text) return;
    const now = performance.now();
    const delay = Math.max(0, feedbackNextAt - now);
    feedbackNextAt = now + delay + 450;
    app.vue.data.feedback.push({ id: ++feedbackId, text, tone, delay });
  };

  app.helpers.checkLevelUp = function () {
    const before = app.vue.data.user.rank.current;
    app.helpers.setRank(app.vue.data.user.found);
    if (app.vue.data.user.rank.current <= before || app.vue.computed.isCompletedWithoutErrors()) return;
    app.vue.methods.showFeedback(app.vue.model.lang.feedback_level_up, 'good');
  };

  const PACE = [
    { count: 5, secs: 20 },
    { count: 10, secs: 30 },
  ];
  const PACE_GAP_MS = 10000;
  let paceTimes = [];
  let paceShown = -1;

  app.helpers.checkPace = function () {
    const now = performance.now();
    const last = paceTimes[paceTimes.length - 1];
    if (last && now - last > PACE_GAP_MS) paceShown = -1;

    paceTimes.push(now);
    paceTimes = paceTimes.filter(t => now - t <= PACE[PACE.length - 1].secs * 1000);

    for (let i = PACE.length - 1; i > paceShown; i--) {
      const { count, secs } = PACE[i];
      if (paceTimes.filter(t => now - t <= secs * 1000).length < count) continue;
      paceShown = i;
      app.vue.methods.showFeedback(app.vue.model.lang['feedback_pace_' + count], 'good');
      return;
    }
  };

  app.vue.methods.hideFeedback = function (id) {
    const index = app.vue.data.feedback.findIndex(item => item.id === id);
    if (index >= 0) app.vue.data.feedback.splice(index, 1);
  };

  app.vue.methods.letterClicked = function (keycode) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letters[keycode - 17];

    for (let idx in app.vue.data.user.letters) {
      const l = app.vue.data.user.letters[idx];

      if (!l.used && l.text === letter) {
        app.vue.methods.enterLetter(l);
        break;
      }
    }
  };

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.vue.data.reveal.solution = true;
    app.status.admired = true;
    app.vue.data.admired = true;
    app.helpers.saveUserPlayStatus();
  };

  app.vue.methods.wrapperClicked = function (e) {
    if (app.vue.data.state.suppressWrapperClick || app.vue.methods.stateModal('help')) {
      return;
    }

    app.vue.data.state.suppressWrapperClick = true;

    const foundWords = document.getElementById('foundWords');

    if (
      app.vue.data.reveal.solution &&
      e.target !== foundWords &&
      !foundWords?.contains(e.target) &&
      !app.vue.model.isCompleted
    ) {
      app.vue.data.reveal.solution = false;
    }

    const visibleModals = app.vue.data.modals.visible;

    if (visibleModals.length) {
      const modalNodes = visibleModals.map(modal => app.vue.model.$refs[modal]);

      if (!modalNodes.includes(e.target) && !modalNodes.some(modal => modal?.contains(e.target))) {
        app.vue.methods.resetActions();

        if (!this.isCompletedWithoutErrors) {
          app.vue.methods.hideModal('settings');
        } else {
          app.vue.methods.hideModal();
        }
      }
    }

    setTimeout(() => {
      app.vue.data.state.suppressWrapperClick = false;
    }, 0);
  };

  app.vue.mounted = function () {
    app.helpers.initTheme();

    document.addEventListener(
      'click',
      function (e) {
        if (e.detail === 0) return;
        e.target.closest?.('button')?.blur();
      },
      true
    );

    window.addEventListener('keyup', function (e) {
      const code = e.keyCode || e.which;
      const tag = e.target?.tagName;

      if (app.status.admired || app.vue.data.state.timeUp) return;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if ((code === 13 || code === 32) && tag === 'BUTTON') return;

      if (code >= 65 && code <= 90) {
        if (tag === 'BUTTON') e.target.blur();
        app.vue.methods.letterClicked(code - 48);
      }

      if (code === 8 || code === 46) {
        app.vue.methods.deleteClicked();
      }

      if (code === 13) {
        app.vue.methods.enterWord();
      }

      if (code === 32) {
        app.vue.methods.shuffleLetters();
      }
    });

    app.helpers.mountUiHelpers();
    app.emitter.emit('mounted');
    app.helpers.mounted(this);

    if (this.isCompletedWithoutErrors) {
      const root = document.getElementById('app');
      if (root) root.classList.add('completed');
    }
  };

  app.vue.methods.removeFromMainClass = function (item) {
    var idx = app.vue.data.show.main.indexOf(item);
    if (idx > -1) {
      app.vue.data.show.main.splice(idx, 1);
    }
  };

  app.vue.methods.langRank = function (text) {
    let key = 'rank_' + text?.toLowerCase();

    return this.lang[key] ?? text;
  };

  app.vue.watch.isCompletedWithoutErrors = function (val) {
    const root = document.getElementById('app');
    if (root) root.classList.toggle('completed', !!val);

    if (val !== true) return;

    if (!app.status.completed) {
      if (app.vue.data.config.hasTimer) app.timer.stop();

      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var sweepMs = reduceMotion ? 0 : app.vue.methods.sweepWheel({ duration: 500, stagger: 80, hold: true });

      app.vue.data.celebrating = true;
      setTimeout(function () {
        app.vue.data.celebrating = false;
        app.helpers.puzzleCompletedSuccessfully();
      }, sweepMs);
    } else {
      app.helpers.puzzleCompletedSuccessfully();
    }
  };

  app.vue.watch.isCompletedWithErrors = function (val) {
    if (val === true) {
      app.helpers.puzzleCompletedUnsuccessfully();
    }
  };

  app.vue.watch['user.found'] = {
    deep: true,
    handler(val) {
      app.helpers.setRank(val);
      app.helpers.setWordLengthRank(val);
    },
  };
})();
