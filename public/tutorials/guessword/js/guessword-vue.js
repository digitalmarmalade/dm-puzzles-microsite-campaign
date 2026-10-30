var app = window.app || {};

(function () {

    'use strict';

  app.vue.data.admired = false;

  app.vue.data.visibility = { noErrorGrid: true, noErrorCell: true, errorCell: true };

  app.vue.data.links = { home: '/', puzzleHome: '/', share: '' };

  app.vue.data.show = { help: false, settings: false, tooltip: 1, unused: false, video: null };

  app.vue.data.userPuzzleSettings = { textSize: 0, gridResize: 0, timer: true };

  app.vue.methods.setSource = function (data) {
    app.vue.data.source = data;
    app.config.id = data.meta.id;
    app.config.slug = data.meta.slug;
    app.config.type = data.type || data.meta.type;
    app.config.variant = data.meta.variant || '';
    app.config.variantSlug = app.config.variant.split(' ').join('-').toLowerCase();
    app.config.related = data.meta.related || '';
    app.puzzle = app.vue.methods.getPuzzleObject();
    app.vue.data.keyboard = app.helpers.keyboardFor(app.puzzle.language);
  };

  app.vue.methods.checkLetter = function () {
    var cellId = app.vue.data.active.cell;
    if (cellId === undefined || cellId === null) return;

    var userAnswer = app.vue.data.user.answers[cellId];

    if (userAnswer === undefined || userAnswer === null || userAnswer === '' || userAnswer === 0) {
      return;
    }

    app.vue.data.check.letter = cellId;
    app.helpers.recordCheckUsed();

    var solution = app.vue.data.source.settings.solution.charAt(cellId);
    if (String(userAnswer) === String(solution)) {
      app.vue.data.check.letterCorrect = true;
    }

    var self = this;
    setTimeout(function () {
      self.$root.resetActions('check.letter');
    }, 0);
  };

  app.vue.methods.checkWord = function () {
    app.vue.data.check.word = this.$root.activeWord;
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('check.word');
    }, 0);
  };

  app.vue.methods.checkGrid = function () {
    app.vue.data.check.grid = true;
    app.helpers.recordCheckUsed();
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('check.grid');
    }, 0);
  };

  app.vue.methods.revealLetter = function () {
    app.helpers.revealCell(this.$root.active.cell);
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('reveal.letter');
    }, 0);
  };

  app.vue.methods.revealWord = function () {
    var cells = this.$root.puzzle.words[this.$root.activeWord].cells;
    for (var r = 0; r < cells.length; r++) {
      var id = cells[r].id;
      app.helpers.revealCell(id);
    }
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('reveal.word');
    }, 0);
  };

  app.vue.methods.revealGrid = function () {
    app.helpers.recordCellsRevealed(app.vue.model.puzzle.counts.cells.active - app.vue.model.totalCellsCompleted);
    app.vue.data.reveal.grid = true;
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('reveal.grid');
    }, 0);
  };

  app.vue.methods.langReplace = function (lexeme) {
    var s = (this.lang && this.lang[lexeme]) || '';
    var meta = this.formattedMeta || {};
    s = s.replaceAll('[[difficulty]]', meta.difficulty || '');
    s = s.replaceAll('[[number]]', meta.numberLabel || '');
    s = s.replaceAll('[[timer]]', '<span class="completion__timer">' + (this.timerDisplay || '') + '</span>');
    s = s.replaceAll('[[variant]]', meta.variant || '');

    if (s.indexOf('[[guesses]]') !== -1) {
      var used = ((app.vue.data.user && app.vue.data.user.evaluations) || []).filter(function (e) {
        return !!e;
      }).length;
      s = s.replaceAll('[[guesses]]', String(used));
    }
    if (s.indexOf('[[maxGuesses]]') !== -1) {
      var max = (app.puzzle && app.puzzle.maxGuesses) || 6;
      s = s.replaceAll('[[maxGuesses]]', String(max));
    }
    if (s.indexOf('[[solution]]') !== -1) {
      var sol = (app.puzzle && app.puzzle.solution) || '';
      s = s.replaceAll('[[solution]]', sol);
    }
    return s;
  };

  app.vue.computed.formattedMeta = function () {
    var meta = app.vue.data.source.meta || {};
    var variant = meta.variant || '';
    var title = meta.title || '';
    var number = meta.number || '';
    var difficulty = meta.difficulty || '';

    var pattern = /\d+/;
    var match = pattern.exec(title);
    var noStr = 'No ';

    if (match) {
      var numberInTitle = match[0];
      var numberIndex = match.index;
      var numberPreceededByNo = title.slice(numberIndex - 3, numberIndex) === noStr;
      var difficultySupercedesNumber = title.substring(numberIndex + numberInTitle.length).trim();

      title = title.slice(0, numberPreceededByNo ? numberIndex - 3 : numberIndex);
      number = String(number) || numberInTitle;
      difficulty = difficulty || difficultySupercedesNumber;
    }

    if (String(number).slice(0, 3) === noStr) {
      number = String(number).slice(3);
    }

    return { variant: variant, title: title, number: number, numberLabel: app.helpers.numberLabel(number), difficulty: difficulty };
  };

  app.vue.methods.getMockStats = function () {
    var raw = new URLSearchParams(window.location.search).get('mockStats');
    if (!raw) return null;
    var presets = {
      best: {
        time: { week: 9999, ever: 9999, last: 9999 },
        checks: { week: 99, ever: 99, last: 99 },
        reveals: { week: 99, ever: 99, last: 99 },
      },
      worse: {
        time: { week: 0, ever: 0, last: 0 },
        checks: { week: 0, ever: 0, last: 0 },
        reveals: { week: 0, ever: 0, last: 0 },
      },
      demo: {
        time: { week: 600, ever: 300, last: 240 },
        checks: { week: 5, ever: 2, last: 4 },
        reveals: { week: 10, ever: 3, last: 1 },
      },
    };
    if (presets[raw]) return presets[raw];
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : presets.demo;
    } catch (e) {
      return presets.demo;
    }
  };

  app.vue.methods.modeSet = function (item, value) {
    app.vue.data.modes[item] = value;
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('modes.' + item);
    }, 0);
  };

  app.vue.methods.toggleModal = function (modal) {
    if (app.vue.data.state) {
      app.vue.data.state.suppressWrapperClick = true;
    }

    if (app.vue.data.modals.visible.indexOf(modal) >= 0) {
      app.vue.methods.hideModal(modal);
    } else {
      app.vue.methods.hideModal();
      app.vue.methods.showModal(modal, false);
    }

    setTimeout(function () {
      if (app.vue.data.state) {
        app.vue.data.state.suppressWrapperClick = false;
      }
    }, 0);
  };

  app.vue.computed.textSizeClass = function () {
    switch (app.vue.data.userPuzzleSettings.textSize) {
      case 1:
        return 'large';
        break;

      case 2:
        return 'xlarge';
        break;
    }

    return '';
  };

  app.vue.methods.showModal = function (modal, resetActions) {
    if (!app.vue.methods.stateModal(modal)) {
      app.vue.data.modals.visible.push(modal);
    }

    if (resetActions !== false) {
      app.vue.methods.resetActions();
    }
  };

  app.vue.computed.isCompletionOverlayVisible = function () {
    if (!this.$root.isCompleted) {
      return false;
    }

    if (this.userPuzzleSettings.showCorrections) {
      return false;
    }

    var whenResult = app.helpers.tsThisBeforeThat('hideCompletionOverlay', 'letterEntered');
    return whenResult === 1 || whenResult === true;
  };

  app.vue.methods.MarmalyticsClick = function (event, category, item, value, url) {
    var linkEl = event.target.nodeName === 'A' ? $(event.target) : $(event.target).closest('a');

    url = url || linkEl.attr('href');
    var target = linkEl.attr('target');

    app.marmalytics.send('event', {
      category: category,
      item: item,
      value: value,
    });
    if (url !== undefined) {
      if (app.marmalytics.settings.delayExternalLinks > 0) {
        console.log('will redirect to "' + url + '" in ' + app.marmalytics.settings.delayExternalLinks + 'ms');
      }
      setTimeout(function () {
        window.open(url, target);
      }, app.marmalytics.settings.delayExternalLinks);
    }
  };

  app.vue.methods.changeTextSize = function () {
    app.vue.data.userPuzzleSettings.textSize++;
    if (app.vue.data.userPuzzleSettings.textSize > 2) {
      app.vue.data.userPuzzleSettings.textSize = 0;
    }
  };

  app.vue.computed.helpShowing = function () {
    return app.vue.data.show.help === true;
  };

  app.vue.methods.helpTooltips = function () {
    app.vue.data.show.tooltip++;
    if (app.vue.data.show.tooltip > app.vue.model.tooltips.length) {
      app.vue.data.show.tooltip = 1;
      app.vue.methods.hideModal('help');
      app.storageVariant.set('help', true);
      app.helpers.puzzleStart();
    }
  };

  app.vue.methods.setOverlayState = function () {
    var suppress = ['completeFailure', 'check-cell-no-error', 'check-grid-no-error'];
    var visible = app.vue.data.modals.visible.filter(function (m) {
      return suppress.indexOf(m) === -1;
    });
    return visible.length ? 'showing' : 'hidden';
  };

  app.vue.methods.showPdf = function (link) {
    window.open(link, '_blank', 'download');
  };

  app.vue.methods.showSet = function (item, value) {
    app.vue.data.show[item] = value;
    var self = this;
    setTimeout(function () {
      self.$root.resetActions('show.' + item);
    }, 0);
  };


    app.vue.data.history = {};
    app.vue.data.dictionary = null;
    app.vue.data.celebrating = false;
    app.vue.data.statsRaw = null;
    app.vue.data.blind = {
        invalidWord: false,
        invalidWordMessage: '',
        gameLost: false,
    };

    app.vue.data.state = app.vue.data.state || {
        showTools: true,
        suppressWrapperClick: false,
        isPaused: false,
        wasAutoPaused: false,
        breakpoints: {
            md: window.matchMedia('(min-width: 720px) and (max-width: 1023.99px)').matches,
            lg: window.matchMedia('(min-width: 1024px)').matches,
        },
    };

    window.addEventListener('resize', function () {
        app.vue.data.state.breakpoints.md = window.matchMedia('(min-width: 720px) and (max-width: 1023.99px)').matches;
        app.vue.data.state.breakpoints.lg = window.matchMedia('(min-width: 1024px)').matches;
    });

    app.helpers.keyboardFor = function (language) {
        var extraRows = (app.helpers.languageConfig(language).extraRows || []).map(function (row) { return row.slice(); });

        return extraRows.concat([
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            [
                {
                    code: 13,
                    display: '<span class="key-label">' +
                             '<span class="sr-only">Enter</span>' +
                             '<span aria-hidden="true">&#x21B5;</span>' +
                             '</span>',
                    event: 'enter',
                    wide: true,
                },
                'Z', 'X', 'C', 'V', 'B', 'N', 'M',
                {
                    code: 8,
                    display: '<svg class="icon" data-size="24" aria-hidden="true">' +
                             '<use href="#iconDelete"></use>' +
                             '</svg>' +
                             '<span class="sr-only">Delete</span>',
                    event: 'delete',
                    wide: true,
                },
            ],
        ]);
    };

    app.vue.data.keyboard = app.helpers.keyboardFor('en');

    app.vue.computed.keyboardLetters = function () {
        var letters = [];
        (this.keyboard || []).forEach(function (row) {
            row.forEach(function (key) {
                if (typeof key === 'string') letters.push(key);
            });
        });
        return letters;
    };


    app.vue.computed.wordLength = function () {
        return (app.puzzle && app.puzzle.wordLength) || 5;
    };

    app.vue.computed.maxGuesses = function () {
        return (app.puzzle && app.puzzle.maxGuesses) || 6;
    };

    app.vue.computed.activeRow = function () {
        var evaluations = (this.$root.user && this.$root.user.evaluations) || [];
        for (var i = 0; i < this.maxGuesses; i++) {
            if (!evaluations[i]) return i;
        }
        return this.maxGuesses;
    };

    app.vue.computed.isCompletedWithoutErrors = function () {
        var evaluations = (this.$root.user && this.$root.user.evaluations) || [];
        for (var i = 0; i < evaluations.length; i++) {
            if (evaluations[i] && evaluations[i].every(function (s) { return s === 'correct'; })) {
                return true;
            }
        }
        return false;
    };

    app.vue.computed.isCompletedWithErrors = function () {
        if (this.isCompletedWithoutErrors) return false;
        var evaluations = (this.$root.user && this.$root.user.evaluations) || [];
        var filled = evaluations.filter(function (e) { return !!e; }).length;
        return filled >= this.maxGuesses;
    };

    app.vue.computed.isCompleted = function () {
        return this.isCompletedWithoutErrors || this.isCompletedWithErrors;
    };

    app.vue.computed.totalCellsPercent = function () {
        var evaluations = (this.$root.user && this.$root.user.evaluations) || [];
        var filled = evaluations.filter(function (e) { return !!e; }).length;
        return filled / this.maxGuesses * 100;
    };

    app.vue.computed.totalCellsCompleted = function () {
        var evaluations = (this.$root.user && this.$root.user.evaluations) || [];
        return evaluations.filter(function (e) { return !!e; }).length;
    };

    app.vue.computed.userString = function () {
        var answers = (this.$root.user && this.$root.user.answers) || [];
        return answers.filter(Boolean).join('|');
    };

    app.vue.computed.keyboardStatus = function () {
        return app.helpers.buildKeyboardStatus(
            (this.$root.user && this.$root.user.answers) || [],
            (this.$root.user && this.$root.user.evaluations) || []
        );
    };

    app.vue.computed.statsView = function () {
        var s = this.$root && this.$root.$data && this.$root.$data.statsRaw;
        if (!s) return null;
        var maxCount = 0;
        for (var i = 0; i < s.distribution.length; i++) {
            if (s.distribution[i] > maxCount) maxCount = s.distribution[i];
        }
        return {
            played: s.played,
            won: s.won,
            distribution: s.distribution,
            lastGuessCount: s.lastGuessCount,
            maxCount: maxCount,
        };
    };


    app.vue.methods.getPuzzleObject = function () {
        var puzzle = app.vue.data.source;
        var settings = (puzzle.copy && puzzle.copy.settings) || puzzle.settings || {};
        var solution = String(settings.solution || '').toUpperCase();
        var wordLength = parseInt(settings.colCount, 10) || solution.length || 5;
        var maxGuesses = parseInt(settings.rowCount, 10) || 6;

        var cells = [];
        for (var r = 0; r < maxGuesses; r++) {
            cells[r] = [];
            for (var c = 0; c < wordLength; c++) {
                cells[r][c] = {
                    id: r * wordLength + c,
                    r: r,
                    c: c,
                };
            }
        }

        return {
            solution: solution,
            language: String(settings.language || 'en').toLowerCase(),
            meta: puzzle.meta,
            wordLength: wordLength,
            maxGuesses: maxGuesses,
            cells: cells,
            colCount: wordLength,
            rowCount: maxGuesses,
            name: 'GuessWord',
            counts: {
                cells: {
                    total: wordLength * maxGuesses,
                    active: wordLength * maxGuesses,
                    given: 0,
                },
            },
            activeCellCount: wordLength * maxGuesses,
            gridlen: wordLength * maxGuesses,
        };
    };

    app.vue.methods.letterClicked = function (letter) {
        var model = app.vue.model;
        if (!model || model.isCompleted) return;
        letter = String(letter || '').toUpperCase();
        if (model.keyboardLetters.indexOf(letter) < 0) return;

        var wordLength = model.wordLength;
        var row = model.activeRow;
        var answers = (app.vue.data.user.answers || []).slice();
        var slots = app.helpers.rowSlots(answers[row], wordLength);
        var gap = slots.indexOf(' ');

        if (gap < 0) return;

        slots[gap] = letter;
        answers[row] = app.helpers.joinSlots(slots);
        app.vue.data.user.answers = answers;
        app.helpers.saveUserState();
        app.helpers.dispatchEvent('guessletter');
    };

    app.vue.methods.deleteClicked = function () {
        var model = app.vue.model;
        if (!model || model.isCompleted) return;

        var row = model.activeRow;
        var answers = (app.vue.data.user.answers || []).slice();
        var slots = app.helpers.rowSlots(answers[row], model.wordLength);
        var i = slots.length - 1;

        while (i >= 0 && slots[i] === ' ') i--;
        if (i < 0) return;

        slots[i] = ' ';
        answers[row] = app.helpers.joinSlots(slots);
        app.vue.data.user.answers = answers;
        app.helpers.saveUserState();
    };

    app.vue.methods.submitGuess = function () {
        var model = app.vue.model;
        if (!model || model.isCompleted) return;

        var wordLength = model.wordLength;
        var row = model.activeRow;
        var answers = (app.vue.data.user.answers || []).slice();
        var guess = (answers[row] || '').toUpperCase();

        if (guess.length !== wordLength || guess.indexOf(' ') > -1) {
            app.helpers.flashInvalidWord();
            return;
        }

        if (!app.helpers.isValidWord(guess)) {
            app.helpers.flashInvalidWord();
            return;
        }

        if (app.vue.data.userPuzzleSettings && app.vue.data.userPuzzleSettings.hardMode) {
            var hard = app.helpers.checkHardModeConstraints(
                guess,
                app.vue.data.user.answers || [],
                app.vue.data.user.evaluations || []
            );
            if (!hard.ok) {
                app.helpers.flashInvalidWord(hard.message);
                return;
            }
        }

        var evaluation = app.helpers.evaluateGuess(guess, app.puzzle.solution);

        var evaluations = ((app.vue.data.user.evaluations) || []).slice();
        evaluations[row] = evaluation;
        app.vue.data.user.evaluations = evaluations;
        app.vue.data.user.answers = answers;

        app.helpers.checkStartedStatus();
        app.helpers.updateProgress();
        app.helpers.saveUserState();
        app.helpers.saveUserPlayStatus();

        setTimeout(app.helpers.applyAutoGreens, (wordLength - 1) * 240 + 500);
    };

    app.vue.methods.numberClicked = function (val) {
        var v = String(val);
        if (v.length !== 1) return;
        app.vue.methods.letterClicked(v.toUpperCase());
    };

    app.vue.methods.historyUndo = function () {};
    app.vue.methods.historyRedo = function () {};

    app.vue.methods.resetGrid = function () {
        app.helpers.resetUserState();
        app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());
        if (app.vue.data.config.hasTimer) {
            app.timer.restart();
        }
        this.hideModal();
        // Drop keyboard focus from the reset control; otherwise a later physical
        // Enter re-activates it (running another reset that clears the freshly
        // typed guess) instead of submitting the guess.
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    };

    app.vue.methods.wrapperClicked = function (e) {
        if (app.vue.data.state && app.vue.data.state.suppressWrapperClick) return;
        if (this.modals.visible.some(modal => this.$refs[modal] && this.$refs[modal].contains(e.target))) return;
        this.resetActions();

        if (!this.isCompleted) {
            this.hideModal('settings');
        }
    };

    app.vue.computed.wrapperClasses = function () {
        var classes = [];
        if (app.vue.data.blind.invalidWord) classes.push('is-shaking');
        return classes;
    };

    app.vue.methods.clickAdmire = function () {
        this.hideModal();
        if ((app.status.admired === undefined) || (app.status.admired === null)) {
            app.status.admired = (new Date()).getTime();
            app.helpers.saveUserPlayStatus();
        }
        app.vue.data.admired = true;
        this.$root.$el.parentElement.classList.add('admiring-puzzle');
    };

    app.vue.methods.startGame = function () {
        app.helpers.puzzleStart();
        app.vue.methods.hideModal('help');
        app.vue.data.show.settings = false;
    };

    app.vue.methods.emailPuzzle = function () {
        var meta = app.vue.model.formattedMeta || {};
        var variant = meta.variant || 'GuessWord';
        var numberLabel = meta.numberLabel || '';
        var difficulty = meta.difficulty || '';
        var subject = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
        var body = window.location.href;
        window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    };

    app.vue.methods.shareResult = async function () {
        var url = app.vue.data.links.share;
        var summary = app.helpers.buildShareText(this.timerDisplay);
        var title = app.config.variant + ' No. ' + app.puzzle.number;

        var file = null;
        try {
            var blob = app.helpers.generateShareImage && (await app.helpers.generateShareImage());
            if (blob) file = new File([blob], title + '.png', { type: 'image/png' });
        } catch (err) {
            console.warn('share image failed', err);
        }

        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: title, text: summary });
                app.helpers.dispatchEvent('puzzleshare', { data: {} });
                return false;
            } catch (err) {
                if (err && err.name === 'AbortError') return false;
                console.error(err);
            }
        }

        if (file) {
            var link = document.createElement('a');
            link.href = URL.createObjectURL(file);
            link.download = title + '.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
            app.helpers.dispatchEvent('puzzleshare', { data: {} });
            return false;
        }

        if (navigator.share) {
            navigator.share({
                title: title,
                text: summary + ' ' + url,
                url: url,
            }).then(function () {
                app.helpers.dispatchEvent('puzzleshare', { data: {} });
            }).catch(console.error);
        } else {
            copyToClipboard(summary + ' ' + url);
            app.helpers.dispatchEvent('puzzleshare', { data: {} });
            var msg = document.getElementById('copiedMessage');
            if (msg) {
                msg.classList.add('active');
                setTimeout(function () { msg.classList.remove('active'); }, 2000);
            }
        }
        return false;
    };


    app.vue.watch.isCompletedWithoutErrors = function (val) {
        if (val === true) {
            app.helpers.puzzleCompletedSuccessfully();
        }
    };

    app.vue.watch.isCompletedWithErrors = function (val) {
        if (val === true) {
            app.helpers.puzzleCompletedUnsuccessfully();
        }
    };

    app.vue.watch['userPuzzleSettings.autoEnterGreens'] = function (val) {
        if (val) app.helpers.applyAutoGreens();
    };


    app.vue.mounted = function () {
        var vm = this;

        app.helpers.initTheme();

        var typedKeys = {};

        window.addEventListener('keydown', function (event) {
            if (event.key && event.key.length === 1) typedKeys[event.code] = event.key;
        });

        window.addEventListener('keyup', function (event) {
            var code = event.keyCode || event.which;
            var typed = typedKeys[event.code] || event.key || '';
            delete typedKeys[event.code];

            // Typing goes to the grid on keyup, which the guide's keydown guard can't stop.
            if (vm.guide.tour.active || vm.guideHowToPlayOpen) return;

            if (code === 13) { vm.submitGuess(); event.preventDefault(); return; }
            if (code === 8 || code === 46) { vm.deleteClicked(); event.preventDefault(); return; }
            if (event.ctrlKey || event.metaKey) return;
            if (typed.length === 1 && vm.keyboardLetters.indexOf(typed.toUpperCase()) > -1) {
                vm.letterClicked(typed);
                event.preventDefault();
            }
        });

        Promise.all([
            app.helpers.loadDictionary(),
            app.helpers.loadStats(),
        ]).finally(function () {
            app.helpers.showPuzzleOrStart();
            app.helpers.mountUiHelpers();
            app.emitter.emit('mounted');
            app.helpers.mounted(vm);
            app.helpers.applyAutoGreens();
        });
    };

}());
