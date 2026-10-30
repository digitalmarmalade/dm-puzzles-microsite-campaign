var app = window.app || {};

(function () {

    'use strict';

    app.vue.data.history = {};
    app.vue.data.ruleBreaks = {};
    app.vue.data.ruleBreakType = null;
    app.vue.data.hint = { cellId: null, reason: null };
    app.vue.data.celebrating = false;
    app.vue.data.lastEnteredCell = null;

    app.vue.data.check.gridCorrect = false;
    app.vue.data.check.gridIncorrect = false;
    app.vue.data.check.letterCorrect = false;

    app.vue.data.admired = false;

    app.vue.data.print.hasGridTextSize = true;

    app.vue.data.state = app.vue.data.state || {
        showTools: true,
        suppressWrapperClick: false,
        breakpoints: {
            md: window.matchMedia('(min-width: 720px) and (max-width: 1023.99px)').matches,
            lg: window.matchMedia('(min-width: 1024px)').matches,
        },
    };

    window.addEventListener('resize', function () {
        app.vue.data.state.breakpoints.md = window.matchMedia('(min-width: 720px) and (max-width: 1023.99px)').matches;
        app.vue.data.state.breakpoints.lg = window.matchMedia('(min-width: 1024px)').matches;
    });

    app.vue.computed.isCompleted = function () {
        return this.$root.totalCellsPercent === 100;
    };

    app.vue.computed.isCompletedWithErrors = function () {
        return this.isCompleted && !this.isCompletedWithoutErrors;
    };

    app.vue.computed.isCompletedWithoutErrors = function () {
        return this.userString === app.puzzle.solutionForActiveCells;
    };

    app.vue.methods.getPuzzleObject = function () {

        var puzzle = app.vue.data.source;
        var colCount = parseInt(puzzle.settings.colCount, 10);
        var rowCount = parseInt(puzzle.settings.rowCount, 10);
        var solution = puzzle.settings.solution;
        var givens = puzzle.celldata;

        var solutionForActiveCells = '';
        for (var s = 0; s < solution.length; s++) {
            solutionForActiveCells += (givens.charAt(s) !== ' ') ? ' ' : solution.charAt(s);
        }

        var obj = {
            cells: [],
            allowedValues: puzzle.settings.allowedValues,
            charmap: puzzle.settings.mappings || {},
            colCount: colCount,
            rowCount: rowCount,
            counts: {
                cells: {
                    active: 0,
                    given: 0,
                    total: 0,
                },
            },
            operators: puzzle.cluedata,
            givens: givens,
            gridlen: colCount * rowCount,
            name: puzzle.meta.type.charAt(0).toUpperCase() + puzzle.meta.type.slice(1).toLowerCase(),
            number: puzzle.meta.number || null,
            solution: solution,
            solutionForActiveCells: solutionForActiveCells,
            activeCellCount: 0,
            puzzle: {
                layout: {},
            },
        };

        obj = app.vue.methods.setPuzzleGrid(obj, puzzle);
        obj = app.vue.methods.setPuzzleNumber(obj, puzzle);

        var keys = puzzle.settings.allowedValues.split('');
        app.vue.data.keyboard = [
            keys.concat([{
                code: 8,
                display: '<svg class="icon" data-size="24" aria-hidden="true">' +
                  '<use href="#iconDelete"></use>' +
                  '</svg>' +
                  '<span class="sr-only">Delete</span>',
                event: 'delete',
            }]),
        ];

        return obj;
    }

    app.vue.methods.setPuzzleGrid = function (obj, puzzle) {
        const width = puzzle.settings.colCount;
        const height = puzzle.settings.rowCount;
        const givens = puzzle.celldata;
        const operators = puzzle.cluedata;
        const gridLen = width * height;

        for (let cellId = 0, row = 0; row < height; row++) {
            for (let col = 0; col < width; col++, cellId++) {
                const given = givens.charAt(cellId);
                const isGiven = given !== ' ';
                const cell = {
                    id: cellId,
                    c: col,
                    r: row,
                    solution: obj.solution.charAt(cellId),
                    value: given,
                    type: 'number',
                    given: isGiven,
                    rightOperator: operators.charAt(cellId) || ' ',            // between this and cell to the right
                    bottomOperator: operators.charAt(gridLen + cellId) || ' ', // between this and cell below
                };
                obj.cells[row] = obj.cells[row] || [];
                obj.cells[row][col] = cell;
                if (isGiven) {
                    obj.counts.cells.given++;
                } else {
                    obj.counts.cells.active++;
                    obj.activeCellCount++;
                }
                obj.counts.cells.total++;
            }
        }

        return obj;
    };

    app.vue.methods.setPuzzleNumber = function (obj, puzzle) {
        const number = Number(obj.number);

        if (number) {
            obj.number = number.toLocaleString();
        }

        return obj;
    }

    app.vue.methods.checkGrid = function () {

        app.vue.data.check.grid = true;
        app.helpUsed('check', 'grid');
        var self = this;

        var answers = app.vue.data.user.answers;
        var solution = app.vue.data.source.settings.solution;
        var anyWrong = false;
        for (var i = 0; i < solution.length; i++) {
            var val = answers[i];
            if (val && String(val) !== solution.charAt(i)) {
                anyWrong = true;
                break;
            }
        }
        if (!anyWrong) {
            app.vue.data.check.gridCorrect = true;
        }

        setTimeout(function () {
            self.$root.resetActions('check.grid');
        }, 0);
    };

    app.vue.methods.revealGrid = function () {
        app.vue.data.reveal.grid = true;
        var self = this;
        setTimeout(function () {
            self.$root.resetActions('reveal.grid');
        }, 0);
        this.hideModal();
    };

    app.vue.methods.hideBlind = function () {
        app.vue.data.check.letterCorrect = false;
        app.vue.data.check.gridCorrect = false;
        app.vue.data.check.gridIncorrect = false;

        var visible = app.vue.data.modals.visible;
        for (var i = visible.length - 1; i >= 0; i--) {
            if (visible[i] === 'check-grid-no-error' || visible[i] === 'completeFailure') {
                visible.splice(i, 1);
            }
        }
    };

    app.vue.methods.startGame = function () {
        app.helpers.puzzleStart();
        app.vue.methods.hideModal('help');
        app.vue.data.show.settings = false;
    };

    app.vue.methods.emailPuzzle = function () {
        var meta = app.vue.model.formattedMeta || {};
        var variant = meta.variant || 'Takuzu';
        var numberLabel = meta.numberLabel || '';
        var difficulty = meta.difficulty || '';
        var subject = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
        var body = window.location.href;
        window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    };

    app.vue.methods.setActiveCell = function (id, type) {
        if (type === 'number') {
            app.vue.data.active.cell = id;
            app.helpers.saveActiveState();
            app.vue.data.check.grid = false;
            app.vue.data.check.letter = null;
            app.vue.data.check.letterCorrect = false;
            app.vue.data.check.gridCorrect = false;
            app.vue.data.reveal.grid = false;
        }
    };

    app.vue.methods.historyUndo = function () {
        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
        app.helpers.historyUndo();
    };

    app.vue.methods.historyRedo = function () {
        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
        app.helpers.historyRedo();
    };

    app.vue.computed.totalCellsCompleted = function () {
        var answers = this.$root.user.answers;
        return Object.keys(answers)
            .map(function (itm) { return answers[itm]; })
            .join('')
            .replace(/\s/g, '')
            .length;
    };

    app.vue.computed.totalCellsPercent = function () {
        var active = this.puzzle.activeCellCount;
        if (!active) return 0;
        return this.$root.totalCellsCompleted / active * 100;
    };

    app.vue.computed.userString = function () {
        var total = this.puzzle.gridlen,
            givens = this.puzzle.givens,
            answers = this.user.answers,
            string = '';

        for (var i = 0; i < total; i++) {
            if (givens.charAt(i) !== ' ') {
                string += ' ';
            } else {
                string += answers[i] ? answers[i] : ' ';
            }
        }

        return string;
    };

    app.vue.methods.numberClicked = function (number) {
        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
        var value = String(number);
        if (app.puzzle.allowedValues.indexOf(value) === -1) return;
        if (app.helpers.isCellGiven(app.vue.data.active.cell)) return;
        app.vue.data.reveal.grid = false;
        app.helpers.setUserAnswer(app.vue.data.active.cell, value);
        app.helpers.historySave();
        app.helpers.dispatchEvent('symbolentered');
    };

    app.vue.methods.cycleCell = function (id) {
        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
        if (app.helpers.isCellGiven(id)) return;

        app.vue.data.active.cell = id;
        app.helpers.saveActiveState();
        app.vue.data.check.grid = false;
        app.vue.data.check.letter = null;
        app.vue.data.check.letterCorrect = false;
        app.vue.data.check.gridCorrect = false;
        app.vue.data.reveal.grid = false;

        var current = app.vue.data.user.answers[id] || '';
        var next;
        if (current === '') next = '0';
        else if (current === '0') next = '1';
        else next = '';

        app.helpers.setUserAnswer(id, next);
        app.helpers.historySave();
        app.helpers.dispatchEvent('symbolentered');
    };

    app.vue.computed.wrapperClasses = function () {
        return [];
    };

    app.vue.methods.wrapperClicked = function (e) {
        if (app.vue.data.state && app.vue.data.state.suppressWrapperClick) {
            return;
        }

        if (this.modals.visible.some(modal => this.$refs[modal] && this.$refs[modal].contains(e.target))) {
            return;
        }

        this.resetActions();

        if (this.isCompletedWithoutErrors === false) {
            this.hideModal('hintsMenu');
            this.hideModal('revealGridConfirm');
            this.hideModal('settings');
        }
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

    app.vue.methods.deleteClicked = function () {
        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) return;
        if (app.helpers.isCellGiven(app.vue.data.active.cell)) return;
        app.vue.data.reveal.grid = false;
        app.helpers.setUserAnswer(app.vue.data.active.cell, '');
        app.helpers.historySave();
    };

    app.helpers.getDefaultActiveState = function () {
        var givens = (app.vue.data.source && app.vue.data.source.celldata) || '';
        for (var i = 0; i < givens.length; i++) {
            if (givens.charAt(i) === ' ') return { cell: i };
        }
        return { cell: 0 };
    };

    app.vue.methods.shareResult = async function () {
        const url = app.vue.data.links.share;
        const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

        const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
        const text = `⏱️ I completed ${title} in ${this.timerDisplay}`;
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
            .then(() => {
                app.helpers.dispatchEvent('puzzleshare', { data: {} });
            })
            .catch((err) => {
                app.vue.methods.copyToClipboard(`${text} ${url}`);
                app.helpers.dispatchEvent('puzzleshare', { data: {} });
                console.error(err);
            });
    };

    app.vue.methods.resetGrid = function () {
        app.helpers.resetUserState();
        app.helpers.dispatchEvent('puzzlereset', app.progress?.handlers.all());
        this.setActiveCell(app.helpers.getDefaultActiveState().cell, 'number');
        if (app.vue.data.config.hasTimer) {
            app.timer.restart();
        }
        this.hideModal();
        app.helpers.historySave();
    };

    app.vue.methods.getOccurrence = function (array, value) {
        return array.filter((v) => (v === value)).length;
    };

    app.vue.watch['userPuzzleSettings.rule'] = function (val) {
        if (val) {
            var result = app.helpers.scanRuleBreaks();
            app.vue.data.ruleBreaks = result.cells;
            app.vue.data.ruleBreakType = result.ruleType;
        } else {
            app.vue.data.ruleBreaks = {};
            app.vue.data.ruleBreakType = null;
            if (app.ruleBreakTimeout) {
                clearTimeout(app.ruleBreakTimeout);
                app.ruleBreakTimeout = null;
            }
        }
    };

    app.vue.methods.dismissRuleBreak = function () {
        app.vue.data.ruleBreakType = null;
    };

    app.vue.methods.getHint = function () {
        var hint = app.helpers.findHint();
        if (hint) {
            app.vue.data.user.hintsShown = (app.vue.data.user.hintsShown || 0) + 1;
            app.helpers.saveUserState();
            app.vue.data.hint = hint;
            app.vue.data.active.cell = hint.cellId;
            app.helpers.saveActiveState();
        } else {
            app.vue.data.hint = { cellId: null, reason: 'none' };
        }
    };

    app.vue.computed.hintsUsed = function () {
        return (app.vue.data.user.cellsRevealed || 0) > 0
            || (app.vue.data.user.checksUsed || 0) > 0
            || (app.vue.data.user.hintsShown || 0) > 0;
    };

    app.vue.computed.hintsSummary = function () {
        var reveals = app.vue.data.user.cellsRevealed || 0;
        var checks = app.vue.data.user.checksUsed || 0;
        var hints = app.vue.data.user.hintsShown || 0;
        var parts = [];
        var lang = this.lang || {};
        var line = function (n, singular, plural) {
            return (lang[n === 1 ? singular : plural] || '').replaceAll('[[n]]', n);
        };
        if (reveals > 0) parts.push(line(reveals, 'modal_completed_correct_hints_reveals_one', 'modal_completed_correct_hints_reveals_other'));
        if (checks > 0) parts.push(line(checks, 'modal_completed_correct_hints_checks_one', 'modal_completed_correct_hints_checks_other'));
        if (hints > 0) parts.push(line(hints, 'modal_completed_correct_hints_hints_one', 'modal_completed_correct_hints_hints_other'));
        return parts.join(', ');
    };

    app.vue.methods.dismissHint = function () {
        app.vue.data.hint = { cellId: null, reason: null };
    };

    app.vue.watch['hint.reason'] = function () {
        this.$nextTick(function () {
            requestAnimationFrame(function () {
                if (app.helpers.resizeGrid) app.helpers.resizeGrid();
            });
        });
    };

    app.vue.watch.ruleBreakType = function () {
        this.$nextTick(function () {
            requestAnimationFrame(function () {
                if (app.helpers.resizeGrid) app.helpers.resizeGrid();
            });
        });
    };

    app.vue.watch.isCompletedWithErrors = function (val) {
        if (val === true) {
            app.helpers.puzzleCompletedUnsuccessfully();
        } else if (app.incorrectBlindTimeout) {
            clearTimeout(app.incorrectBlindTimeout);
            app.incorrectBlindTimeout = null;
        }
    };

    app.vue.watch.isCompletedWithoutErrors = function (val) {
        if (val === true) {
            app.helpers.puzzleCompletedSuccessfully();
        }
    };

    app.vue.methods.checkLetter = function () {
        var cellId = app.vue.data.active.cell;
        if (cellId === undefined || cellId === null) return;

        var userAnswer = app.vue.data.user.answers[cellId];
        if (userAnswer === undefined || userAnswer === null || userAnswer === '' || userAnswer === 0) {
            return;
        }

        app.vue.data.check.letter = cellId;
        app.helpUsed('check', 'cell');

        var solution = app.vue.data.source.settings.solution.charAt(cellId);
        if (String(userAnswer) === String(solution)) {
            app.vue.data.check.letterCorrect = true;
        }

        var self = this;
        setTimeout(function () {
            self.$root.resetActions('check.letter');
        }, 0);
    };

    app.vue.methods.getDOMValue = function (selector, value) {
        return app.helpers.getDOMValue(selector, value);
    };

    app.vue.methods.setOverlayState = function () {
        var suppress = ['completeFailure', 'check-cell-no-error', 'check-grid-no-error'];
        var visible = app.vue.data.modals.visible.filter(function (m) {
            return suppress.indexOf(m) === -1;
        });
        return visible.length ? 'showing' : 'hidden';
    };

    app.vue.mounted = function () {
        var vm = this;
        app.helpers.initTheme();
        app.vue.data.admired = false;
        window.addEventListener('keyup', function (event) {
            var code = event.keyCode || event.which;
            if (code === 13 || code === 32) {
                vm.cycleCell(app.vue.data.active.cell);
                event.preventDefault();
            }

            if (code === 48 || code === 96) vm.numberClicked(0);
            if (code === 49 || code === 97) vm.numberClicked(1);

            if (code === 8 || code === 46) vm.deleteClicked();

            if (code === 37) app.helpers.prevCell(app.vue.data.active.cell);
            if (code === 38) app.helpers.upCell(app.vue.data.active.cell);
            if (code === 39) app.helpers.nextCell(app.vue.data.active.cell);
            if (code === 40) app.helpers.downCell(app.vue.data.active.cell);
        });

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (app.helpers.resizeGrid) app.helpers.resizeGrid();
                var spinner = document.getElementById('spinner');
                if (spinner) spinner.style.display = 'none';
            });
        });

        app.emitter.emit('mounted');
        app.helpers.mounted(vm);
    };

}());
