var app = window.app || {};

(function () {

    'use strict';

  app.helpers.addEventListeners = function () {
    document.addEventListener(
      'CellClick',
      function (e) {
        app.handlers.cellClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'ClueClick',
      function (e) {
        app.handlers.clueClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterEntered',
      function (e) {
        app.handlers.letterEntered(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterDeleted',
      function (e) {
        app.handlers.letterDeleted(e.detail.item, e);
      },
      false
    );
    window.addEventListener('resize', function () {
      app.handlers.onResize();
    });
    var AUTO_RESUME_WITHIN_MS = 3000;
    var hiddenAt = null;
    window.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        if (app.vue.methods.pauseGame) app.vue.methods.pauseGame(true);
        return;
      }
      var awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt;
      hiddenAt = null;
      if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
        if (app.vue.methods.resumeGame) app.vue.methods.resumeGame();
      }
    });
  };

  app.helpers.getFeedbackLinkObject = function (variant, archive) {
    const { today, puzzles, variants } = archive;
    const id = today && variant !== app.config.variant ? today[variant] : undefined;

    let puzObj = null;

    if (!id) {
      const variantSlugs = variants[variant];

      if (!variantSlugs) return null;

      const first = variantSlugs[0];
      puzObj = first !== app.config.slug ? puzzles[first] : null;

      for (let i = 0; i < variantSlugs.length; i++) {
        if (variantSlugs[i] === app.config.slug && variantSlugs.length > i + 1) {
          puzObj = puzzles[variantSlugs[i + 1]];
          break;
        }
      }
    } else {
      puzObj = puzzles[id];
    }

    if (puzObj) {
      const title = puzObj.name ?? puzObj.title;

      return {
        title,
        url: `${document.referrer}puzzle/?p=${puzObj.slug}`,
        link_text: title,
        image: app.helpers.getFeedbackLinkImagePath(puzObj.variant.replace(/\s+/g, '').toLowerCase()),
      };
    }

    return null;
  };

  app.helpers.getFeedbackCorrectObject = function (archive) {
    const obj = {
      links: [],
      subtitle: `You completed the ${app.config.variant.toLowerCase()} in `,
      title: 'Well done!',
      view_all_url: document.referrer + `puzzles/?v=${app.config.variant.replace(/\s+/g, '').toLowerCase().trim()}`,
    };

    const sameLink = app.helpers.getFeedbackLinkObject(app.config.variant, archive);
    const diffLink = app.helpers.getFeedbackLinkObject(app.config.related, archive);

    obj.links.push(sameLink?.title ? sameLink : null);
    obj.links.push(diffLink?.title ? diffLink : null);

    return obj;
  };

  app.helpers.getFeedbackIncorrectObject = function (archive) {
    const obj = {
      links: [],
      subtitle: "It's not quite right yet.",
      title: 'Keep Trying!',
      view_all_url: document.referrer + `puzzles/?v=${app.config.variant.replace(/\s+/g, '').toLowerCase().trim()}`,
    };

    const sameLink = app.helpers.getFeedbackLinkObject(app.config.variant, archive);
    const diffLink = app.helpers.getFeedbackLinkObject(app.config.related, archive);

    obj.links.push(sameLink?.title ? sameLink : null);
    obj.links.push(diffLink?.title ? diffLink : null);

    return obj;
  };

  app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
    app.vue.data.admired = !!app.status.admired && !isStart;
    if (app.status.admired && !isStart) {
      app.vue.model.hideModal('completeSuccess');
    } else {
      if (sendComplete) {
        app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      }

      app.helpers.showCompletionScreen(isStart);
    }
  };

  app.helpers.loadUserState = function () {
    if (app.config.puzzleApp) {
      return Promise.resolve(null);
    }

    return app.storagePuzzle.get('user').then((data) => {
      const defaultUserState = app.helpers.getDefaultUserState();

      if (data !== null) {
        app.vue.data.user = { ...defaultUserState, ...data };
        app.vue.data.user.answers = app.helpers.expandDataUserAnswers(app.vue.data.user.answers);
        app.vue.data.user.evaluations = app.helpers.expandDataUserEvaluations(app.vue.data.user.evaluations);
      } else {
        app.vue.data.user = defaultUserState;
      }
      app.helpers.saveUserState();
    });
  };

  app.helpers.revealCell = function (id) {
    app.vue.data.user.answers['cell_' + (id - 1)] = app.vue.model.puzzle.cells[id].letter;
    app.helpers.recordCellsRevealed(1);
    app.helpers.saveUserState();
  };

  app.helpers.showConfetti = function () {
    if (typeof confetti === 'undefined') return;
    confetti.maxCount = 300;
    confetti.alpha = 0.8;
    confetti.start(1000);
  };

  app.helpers.loadActiveState = function () {
    return app.storagePuzzle.get('active').then(function (data) {
      if (data !== null) {
        app.vue.data.active = data;
      } else {
        app.vue.data.active = app.helpers.getDefaultActiveState();
      }
      app.vue.data.last['cell-' + app.vue.data.active.direction] = app.vue.data.active.cell;
    });
  };

  app.helpers.loadPuzzleSettings = function () {
    var defaultUserState = app.helpers.getDefaultUserState();

    return app.storageVariant.get('settings').then(function (data) {
      // Defaults under saved values, so new default keys apply to older saves.
      var merged = Object.assign({}, defaultUserState.settings, data || {});
      for (var i in merged) {
        app.vue.data.userPuzzleSettings[i] = merged[i];
      }
    });
  };

  app.handlers.onResize = function () {
    app.helpers.resizeGrid();
  };

  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
  };

    /*  --------------------------  */
    /*   Default state / lifecycle  */
    /*  --------------------------  */

    app.helpers.getDefaultUserState = function () {
        const maxGuesses = (app.puzzle && app.puzzle.maxGuesses) || 6;

        const defaultPuzzleSettings = {
            textSize: 0,
            timer: true,
            theme: 'system',
            themeOptions: ['system', 'light', 'dark'],
            isThemeable: false,
        };

        const userData = {
            answers: new Array(maxGuesses).fill(''),
            evaluations: new Array(maxGuesses).fill(null),
            settings: Object.assign({}, defaultPuzzleSettings),
            cellsRevealed: 0,
            checksUsed: 0,
            time: 0,
        };

        return userData;
    };

    app.helpers.expandDataUserEvaluations = function (data) {
        if (data) {
            const evaluations = { A: 'absent', P: 'present', C: 'correct'};
            return data.map(row => row?.split('').map(col => evaluations[col]));
        }

        return data;
    }

    app.helpers.reduceDataUserAnswers = function (data) {
        return data;
    };

    app.helpers.reduceDataUserEvaluations = function (data) {
        return data?.map(row => row?.map(col => col.slice(0, 1)).join('').toUpperCase());
    };

    app.helpers.getUserState = function () {
        const userState = {...app.vue.data.user};
        userState.answers = app.helpers.reduceDataUserAnswers(userState.answers);
        userState.evaluations = app.helpers.reduceDataUserEvaluations(userState.evaluations);
        return JSON.parse(JSON.stringify(userState));
    }

    app.helpers.historyInit = function () {};
    app.helpers.historyRedo = function () {};
    app.helpers.historySave = function () {};
    app.helpers.historyUndo = function () {};

    app.helpers.updateProgress = function () {
        if (!app.vue.model) return;
        app.status.progress = Math.floor(app.vue.model.totalCellsPercent || 0);
    };

    app.helpers.tock = function () {
        if (app.media && app.media.supports && app.media.supports.audio &&
            app.media.items && app.media.items.tock &&
            app.vue.data.userPuzzleSettings && app.vue.data.userPuzzleSettings.soundskeyboard) {
            app.media.items.tock.play();
        }
    };

    /*  ------------------------  */
    /*   Guess evaluation logic   */
    /*  ------------------------  */

    app.helpers.evaluateGuess = function (guess, solution) {
        var g = String(guess || '').toUpperCase();
        var s = String(solution || '').toUpperCase();
        var n = s.length;
        var result = new Array(n).fill('absent');
        var remaining = {};

        for (var i = 0; i < n; i++) {
            if (g.charAt(i) === s.charAt(i)) {
                result[i] = 'correct';
            } else {
                var ch = s.charAt(i);
                remaining[ch] = (remaining[ch] || 0) + 1;
            }
        }

        for (var j = 0; j < n; j++) {
            if (result[j] === 'correct') continue;
            var gch = g.charAt(j);
            if (remaining[gch] > 0) {
                result[j] = 'present';
                remaining[gch]--;
            }
        }

        return result;
    };

    app.helpers.rowSlots = function (answer, wordLength) {
        return String(answer || '').padEnd(wordLength, ' ').slice(0, wordLength).split('');
    };

    app.helpers.joinSlots = function (slots) {
        return slots.join('').replace(/\s+$/, '');
    };

    app.helpers.lockedGreens = function (answers, evaluations, row, wordLength) {
        var locked = new Array(wordLength).fill('');
        for (var r = 0; r < row; r++) {
            var evalRow = evaluations[r];
            if (!evalRow) continue;
            for (var i = 0; i < wordLength; i++) {
                if (evalRow[i] === 'correct') locked[i] = String(answers[r] || '').charAt(i).toUpperCase();
            }
        }
        return locked;
    };

    app.helpers.activeLockedGreens = function () {
        var model = app.vue.model;
        var wordLength = model.wordLength;
        if (!model.userPuzzleSettings || !model.userPuzzleSettings.autoEnterGreens) {
            return new Array(wordLength).fill('');
        }
        return app.helpers.lockedGreens(model.user.answers || [], model.user.evaluations || [], model.activeRow, wordLength);
    };

    app.helpers.applyAutoGreens = function () {
        var model = app.vue.model;
        if (!model || model.isCompleted || model.activeRow >= model.maxGuesses) return;

        var locked = app.helpers.activeLockedGreens();
        if (!locked.some(Boolean)) return;

        var row = model.activeRow;
        var answers = (model.user.answers || []).slice();
        var slots = app.helpers.rowSlots(answers[row], model.wordLength);
        var queue = slots.filter(function (ch, i) { return ch !== ' ' && ch !== locked[i]; });
        var value = app.helpers.joinSlots(locked.map(function (ch) {
            return ch || (queue.length ? queue.shift() : ' ');
        }));

        if (value === (answers[row] || '')) return;
        answers[row] = value;
        model.user.answers = answers;
        app.helpers.saveUserState();
    };

    app.helpers.buildKeyboardStatus = function (answers, evaluations) {
        var rank = { absent: 1, present: 2, correct: 3 };
        var byLetter = {};

        for (var r = 0; r < evaluations.length; r++) {
            var evalRow = evaluations[r];
            var guess = answers[r] || '';
            if (!evalRow || !guess) continue;
            for (var i = 0; i < evalRow.length; i++) {
                var ch = guess.charAt(i);
                var newStatus = evalRow[i];
                var prev = byLetter[ch];
                if (!prev || rank[newStatus] > rank[prev]) {
                    byLetter[ch] = newStatus;
                }
            }
        }

        return byLetter;
    };

    /*  --------------  */
    /*   Dictionary     */
    /*  --------------  */

    app.helpers.languages = {
        en: {
            dictionary: 'json/dictionary.json',
        },
        pl: {
            dictionary: 'json/dictionary-pl.json',
            extraRows: [['Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż']],
        },
    };

    app.helpers.languageConfig = function (language) {
        return app.helpers.languages[language] || app.helpers.languages.en;
    };

    app.helpers.loadDictionary = function () {
        if (app.vue.data.dictionary) return Promise.resolve();

        return fetch(app.helpers.languageConfig(app.puzzle && app.puzzle.language).dictionary)
            .then(function (res) { return res.ok ? res.json() : []; })
            .then(function (words) {
                var set = new Set();
                for (var i = 0; i < words.length; i++) {
                    set.add(String(words[i]).toUpperCase());
                }

                var override = app.vue.data.source
                    && app.vue.data.source.copy
                    && app.vue.data.source.copy.settings
                    && app.vue.data.source.copy.settings.validGuesses;
                if (Array.isArray(override)) {
                    for (var j = 0; j < override.length; j++) {
                        set.add(String(override[j]).toUpperCase());
                    }
                }
                if (app.puzzle && app.puzzle.solution) {
                    set.add(app.puzzle.solution);
                }

                app.vue.data.dictionary = set;
            })
            .catch(function (err) {
                console.warn('GuessWord dictionary load failed:', err && err.message);
                var set = new Set();
                if (app.puzzle && app.puzzle.solution) set.add(app.puzzle.solution);
                app.vue.data.dictionary = set;
            });
    };

    app.helpers.isValidWord = function (word) {
        if (!app.vue.data.dictionary) return true;      //  fail open if not loaded
        if (app.vue.data.dictionary.size <= 1) return true;  //  permissive fallback
        return app.vue.data.dictionary.has(String(word).toUpperCase());
    };

    /*  --------------  */
    /*   Hard mode      */
    /*  --------------  */

    app.helpers.checkHardModeConstraints = function (guess, answers, evaluations) {
        var g = String(guess || '').toUpperCase();
        var required = {};              //  letter → { count }
        var lockedPositions = [];       //  [{ pos, letter }]

        for (var r = 0; r < evaluations.length; r++) {
            var evalRow = evaluations[r];
            var prev = String((answers[r] || '')).toUpperCase();
            if (!evalRow || !prev) continue;
            for (var i = 0; i < evalRow.length; i++) {
                var letter = prev.charAt(i);
                if (evalRow[i] === 'correct') {
                    lockedPositions.push({ pos: i, letter: letter });
                } else if (evalRow[i] === 'present') {
                    required[letter] = (required[letter] || 0) + 1;
                }
            }
        }

        for (var j = 0; j < lockedPositions.length; j++) {
            var lp = lockedPositions[j];
            if (g.charAt(lp.pos) !== lp.letter) {
                return {
                    ok: false,
                    message: 'blind_hard_mode_message',
                };
            }
        }

        /* Present letters from earlier rows must reappear, counting multiplicity. */
        var pool = g.split('');
        for (var letter in required) {
            var need = required[letter];
            var have = 0;
            for (var k = 0; k < pool.length; k++) if (pool[k] === letter) have++;
            if (have < need) {
                return {
                    ok: false,
                    message: 'blind_hard_mode_message',
                };
            }
        }

        return { ok: true };
    };

    /*  --------------  */
    /*   Blind flashes  */
    /*  --------------  */

    app.helpers.flashInvalidWord = function (messageKey) {
        var lang = (app.vue.model && app.vue.model.lang) || {};
        var key = messageKey || 'blind_invalid_word_message';
        app.vue.data.blind.invalidWordMessage = lang[key] || lang.blind_invalid_word_message || '';
        app.vue.data.blind.invalidWord = true;
        if (app.invalidWordTimeout) clearTimeout(app.invalidWordTimeout);
        app.invalidWordTimeout = setTimeout(function () {
            app.vue.data.blind.invalidWord = false;
        }, 900);
    };

    /*  --------------  */
    /*   Stats storage  */
    /*  --------------  */

    app.helpers.getStatsShape = function () {
        var max = (app.puzzle && app.puzzle.maxGuesses) || 6;
        return {
            played: 0,
            won: 0,
            distribution: new Array(max).fill(0),
            countedPuzzles: [],
            lastGuessCount: null,
        };
    };

    app.helpers.loadStats = function () {
        return app.storageVariant.get('stats').then(function (data) {
            var stats = app.helpers.getStatsShape();
            if (data && typeof data === 'object') {
                stats.played = parseInt(data.played, 10) || 0;
                stats.won = parseInt(data.won, 10) || 0;
                if (Array.isArray(data.distribution)) {
                    for (var i = 0; i < stats.distribution.length; i++) {
                        stats.distribution[i] = parseInt(data.distribution[i], 10) || 0;
                    }
                }
                if (Array.isArray(data.countedPuzzles)) {
                    stats.countedPuzzles = data.countedPuzzles.slice();
                }
                stats.lastGuessCount = data.lastGuessCount || null;
            }
            app.vue.data.statsRaw = stats;
            return stats;
        });
    };

    app.helpers.recordStats = function (won, guessCount) {
        var puzzleId = String((app.puzzle && app.puzzle.number) || app.config.id || '');
        var stats = app.vue.data.statsRaw;
        if (!stats) stats = app.vue.data.statsRaw = app.helpers.getStatsShape();
        if (puzzleId && stats.countedPuzzles.indexOf(puzzleId) !== -1) {
            stats.lastGuessCount = won ? guessCount : null;
            return;
        }
        if (puzzleId) stats.countedPuzzles.push(puzzleId);
        stats.played++;
        if (won) {
            stats.won++;
            var idx = Math.max(0, Math.min(stats.distribution.length - 1, guessCount - 1));
            stats.distribution[idx]++;
            stats.lastGuessCount = guessCount;
        } else {
            stats.lastGuessCount = null;
        }
        app.storageVariant.set('stats', {
            played: stats.played,
            won: stats.won,
            distribution: stats.distribution,
            countedPuzzles: stats.countedPuzzles,
            lastGuessCount: stats.lastGuessCount,
        });
    };

    /*  ------------------  */
    /*   Completion flow    */
    /*  ------------------  */

    app.helpers.showCompletionScreen = function (isStart) {
        if (!app.vue.model.stateModal('completeSuccess')) {
            app.vue.model.showModal('completeSuccess');
            app.helpers.showConfetti && app.helpers.showConfetti();
        }
    };

    app.helpers.puzzleCompletedSuccessfully = function (isStart) {
        if (app.vue.data.config.hasTimer && app.timer) app.timer.stop();

        app.helpers.saveUserPlayStatus();

        if (isStart) {
            app.helpers.showCompletionScreen(isStart);
            app.helpers.checkAdmiredStatus(isStart, app.helpers.checkCompletedStatus());
            return;
        }
        var guessesUsed = ((app.vue.data.user && app.vue.data.user.evaluations) || [])
            .filter(function (e) { return !!e; }).length;
        app.helpers.recordStats(true, guessesUsed);

        var wordLength = (app.puzzle && app.puzzle.wordLength) || 5;
        var flipTotalMs = 500 + (wordLength - 1) * 240;  //  last tile finishes flipping
        var waveTotalMs = 700 + (wordLength - 1) * 90;   //  last tile finishes bouncing
        var revealBufferMs = 250;                        //  short gap after flip before wave

        
        if (app.celebrateStartTimeout) clearTimeout(app.celebrateStartTimeout);
        if (app.celebrateEndTimeout) clearTimeout(app.celebrateEndTimeout);

        app.celebrateStartTimeout = setTimeout(function () {
            app.vue.data.celebrating = true;
        }, flipTotalMs + revealBufferMs);

        app.celebrateEndTimeout = setTimeout(function () {
            app.helpers.showCompletionScreen(false);
            app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus());
        }, flipTotalMs + revealBufferMs + waveTotalMs);
    };

    app.helpers.puzzleCompletedUnsuccessfully = function (isStart) {
        if (app.vue.data.config.hasTimer && app.timer) app.timer.stop();

        if (!isStart) app.helpers.recordStats(false, 0);

        if (app.helpers.checkCompletedStatus() && !isStart) {
            app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
        }

        if (app.incorrectBlindTimeout) clearTimeout(app.incorrectBlindTimeout);
        app.incorrectBlindTimeout = setTimeout(function () {
            app.incorrectBlindTimeout = null;
            if (!app.vue.model || !app.vue.model.isCompletedWithErrors) return;

            app.helpers.dispatchEvent('puzzleincomplete', app.progress?.handlers.all());
            if (!isStart) app.helpers.dispatchEvent('puzzlelost', app.progress?.handlers.all());
            app.vue.data.blind.gameLost = true;
        }, 900);
    };

    app.helpers.puzzleStart = function () {
        if (!app.status.completed && app.vue.data.config.hasTimer) {
            app.timer.start(app.vue.data.time);
        }

        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) {
            app.helpers.puzzleCompletedSuccessfully(true);
        } else if (app.vue.model && app.vue.model.isCompletedWithErrors) {
            app.helpers.puzzleCompletedUnsuccessfully(true);
        }
    };

    app.helpers.resetUserState = function () {

        if (app.celebrateStartTimeout) clearTimeout(app.celebrateStartTimeout);
        if (app.celebrateEndTimeout) clearTimeout(app.celebrateEndTimeout);
        app.celebrateStartTimeout = null;
        app.celebrateEndTimeout = null;

        app.vue.data.celebrating = false;
        app.vue.data.blind.invalidWord = false;
        app.vue.data.blind.gameLost = false;

        app.vue.data.user = app.helpers.getDefaultUserState();

        if (app.vue.data.config.hasTimer && app.timer) app.timer.restart();

        app.status.started = null;
        app.status.completed = null;
        app.status.admired = false;
        app.vue.data.admired = false;
        app.status.progress = 0;

        app.helpers.updateProgress();
        app.helpers.saveUserState();
        app.helpers.saveUserPlayStatus();
    };

    app.helpers.puzzleUpdate = function (count) {
        app.vue.data.user.time = count;
        app.helpers.saveUserTime();
    };

    /*  --------------  */
    /*   Share output   */
    /*  --------------  */

    app.helpers.buildShareText = function (timerDisplay) {
        var evaluations = app.vue.data.user && app.vue.data.user.evaluations || [];
        var guessesUsed = evaluations.filter(function (e) { return !!e; }).length;
        var solved = app.vue.model && app.vue.model.isCompletedWithoutErrors;
        var maxGuesses = (app.puzzle && app.puzzle.maxGuesses) || 6;

        var header = 'GuessWord ' + (app.puzzle && app.puzzle.number ? app.helpers.numberLabel(app.puzzle.number) + ' ' : '') +
                     (solved ? guessesUsed + '/' + maxGuesses : 'X/' + maxGuesses) +
                     (timerDisplay ? ' ⏱ ' + timerDisplay : '');

        var lines = [header];
        var glyph = { correct: '🟩', present: '🟨', absent: '⬛' };
        for (var i = 0; i < evaluations.length; i++) {
            if (!evaluations[i]) continue;
            lines.push(evaluations[i].map(function (s) { return glyph[s] || '⬜'; }).join(''));
        }
        return lines.join('\n');
    };

    app.helpers.mountUiHelpers = function () {
        requestAnimationFrame(function () {
            app.helpers.resizeGrid();
        });

        app.helpers.hideSpinner();
    };

    app.helpers.resizeGrid = function () {

            const gameplayContainer = document.getElementById('gameplayContainer');
            const grid = document.getElementById('pinch-zoom-image');
            if (!grid || !gameplayContainer) return;
            grid.setAttribute('style', '');

            const gameplayContainerHeight = gameplayContainer.offsetHeight;
            const gridHeight = grid.offsetHeight;
            const gridWidth = grid.offsetWidth;
            let heightDifference, adjustedSize;

            if (gridHeight !== gameplayContainerHeight) {
                heightDifference = gameplayContainerHeight / gridHeight;
                adjustedSize = gridWidth * heightDifference;   
                grid.style.blockSize = Math.floor(gameplayContainerHeight) + 'px';
            }
  };

}());
