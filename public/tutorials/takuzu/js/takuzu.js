var app = window.app || {};

(function () {

    'use strict';

    app.helpers.getDefaultUserState = function () {
        const defaultPuzzleTypeSettings = {};
        const defaultPuzzleSettings = {
            textSize: 0,
            gridResize: 0,
            timer: true,
            theme: 'system',
            themeOptions: ['system', 'light', 'dark'],
            isThemeable: false,
        };

        const userData = {
            answers: {},
            settings: Object.assign({}, defaultPuzzleSettings, defaultPuzzleTypeSettings),
            time: 0,
            cellsRevealed: 0,
            checksUsed: 0,
            hintsShown: 0,
            revealedCells: [],
        };

        return userData;
    };

    app.helpers.historyInit = function () {
        var options = {
            props: ['active', 'user']
        };
        app.history = app.history || new DMHistoryVue(app.vue.model, options);
    };

    app.helpers.historyRedo = function () {
        if (app.history) {
            app.history.forward();
        }
    };

    app.helpers.historySave = function () {
        if (app.history) {
            app.history.push();
        }
    };

    app.helpers.historyUndo = function () {
        if (app.history) {
            app.history.back();
        }
    };

    app.helpers.isCellGiven = function (cellId) {
        return app.puzzle.givens.charAt(cellId) !== ' ';
    };

    app.helpers.nextCell = function (cellId) {
        var currentId = (typeof cellId === 'number') ? cellId : app.vue.data.active.cell;
        var width = app.puzzle.colCount;
        var total = app.puzzle.gridlen;
        var row = Math.floor(currentId / width);
        var firstCellId = row * width;
        var lastCellId = firstCellId + width - 1;

        var newId = currentId + 1;
        if (newId > lastCellId) {
            newId = firstCellId;
        }

        var guard = 0;
        while (app.helpers.isCellGiven(newId) && guard < total) {
            newId++;
            if (newId > lastCellId) newId = firstCellId;
            guard++;
        }

        app.vue.methods.setActiveCell(newId, 'number');
    };

    app.helpers.prevCell = function (cellId) {
        var currentId = (typeof cellId === 'number') ? cellId : app.vue.data.active.cell;
        var width = app.puzzle.colCount;
        var total = app.puzzle.gridlen;
        var row = Math.floor(currentId / width);
        var firstCellId = row * width;
        var lastCellId = firstCellId + width - 1;

        var newId = currentId - 1;
        if (newId < firstCellId) {
            newId = lastCellId;
        }

        var guard = 0;
        while (app.helpers.isCellGiven(newId) && guard < total) {
            newId--;
            if (newId < firstCellId) newId = lastCellId;
            guard++;
        }

        app.vue.methods.setActiveCell(newId, 'number');
    };

    app.helpers.upCell = function (cellId) {
        var currentId = (typeof cellId === 'number') ? cellId : app.vue.data.active.cell;
        var width = app.puzzle.colCount;
        var height = app.puzzle.rowCount;
        var total = app.puzzle.gridlen;
        var col = currentId % width;
        var firstCellId = col;
        var lastCellId = (height - 1) * width + col;

        var newId = currentId - width;
        if (newId < firstCellId) {
            newId = lastCellId;
        }

        var guard = 0;
        while (app.helpers.isCellGiven(newId) && guard < total) {
            newId -= width;
            if (newId < firstCellId) newId = lastCellId;
            guard++;
        }

        app.vue.methods.setActiveCell(newId, 'number');
    };

    app.helpers.downCell = function (cellId) {
        var currentId = (typeof cellId === 'number') ? cellId : app.vue.data.active.cell;
        var width = app.puzzle.colCount;
        var height = app.puzzle.rowCount;
        var total = app.puzzle.gridlen;
        var col = currentId % width;
        var firstCellId = col;
        var lastCellId = (height - 1) * width + col;

        var newId = currentId + width;
        if (newId > lastCellId) {
            newId = firstCellId;
        }

        var guard = 0;
        while (app.helpers.isCellGiven(newId) && guard < total) {
            newId += width;
            if (newId > lastCellId) newId = firstCellId;
            guard++;
        }

        app.vue.methods.setActiveCell(newId, 'number');
    };

    app.helpers.puzzleCompletedSuccessfully = function (isStart = false) {
        if (app.vue.data.config.hasTimer && app.timer) {
            app.timer.stop();
        }

        app.helpers.saveUserPlayStatus();

        if (isStart) {
            app.helpers.showCompletionScreen(true);
            app.helpers.checkAdmiredStatus(true, app.helpers.checkCompletedStatus());
            return;
        }

        var cols = (app.puzzle && app.puzzle.colCount) || 6;
        var rows = (app.puzzle && app.puzzle.rowCount) || 6;
        var waveMs = ((rows - 1) + (cols - 1)) * 70 + 700 + 150;

        app.vue.data.celebrating = true;
        setTimeout(function () {
            app.vue.data.celebrating = false;
            if (!app.vue.model.stateModal('completeSuccess')) {
                app.helpers.showCompletionScreen(true);
            }
            app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus());
        }, waveMs);
    };

    app.helpers.puzzleCompletedUnsuccessfully = function () {
        //  Delay the blind to allow a user to cycle through options
        if (app.incorrectBlindTimeout) clearTimeout(app.incorrectBlindTimeout);
        if (app.incorrectBlindDismissTimeout) clearTimeout(app.incorrectBlindDismissTimeout);
        app.incorrectBlindTimeout = setTimeout(function () {
            app.incorrectBlindTimeout = null;
            if (!app.vue.model || !app.vue.model.isCompletedWithErrors) return;

            app.helpers.dispatchEvent('puzzleincomplete', app.status);
            app.vue.data.check.gridIncorrect = true;

            app.incorrectBlindDismissTimeout = setTimeout(function () {
                app.incorrectBlindDismissTimeout = null;
                app.vue.data.check.gridIncorrect = false;
            }, 5000);
        }, 1200);
    };

    app.helpers.puzzleStart = function () {

        app.helpers.historyInit();

        if (!app.status.completed && app.vue.data.config.hasTimer) {
            app.timer.start(app.vue.data.time);
        }

        app.helpers.historySave();

        if (app.vue.model && app.vue.model.isCompletedWithoutErrors) {
            app.helpers.puzzleCompletedSuccessfully(true);
        } else if (app.vue.model && app.vue.model.isCompletedWithErrors) {
            app.helpers.puzzleCompletedUnsuccessfully();
        }

        if (app.vue.data.userPuzzleSettings && app.vue.data.userPuzzleSettings.rule) {
            var result = app.helpers.scanRuleBreaks();
            app.vue.data.ruleBreaks = result.cells;
            app.vue.data.ruleBreakType = result.ruleType;
        }
    };

    app.helpers.resetUserState = function () {
        app.vue.data.user = app.helpers.getDefaultUserState();

        if (app.vue.data.config.hasTimer && app.timer) {
            app.timer.restart();
        }

        app.status.started = null;
        app.status.completed = null;
        app.status.admired = false;
        app.status.progress = 0;
        app.vue.data.admired = false;

        app.helpers.updateProgress();
        app.helpers.saveUserState();
        app.helpers.saveUserPlayStatus();
    };

    app.helpers.puzzleUpdate = function (count) {
        app.vue.data.user.time = count;
        app.helpers.saveUserTime();
    };

    app.helpers.revealCell = function (id) {
        var user = app.vue.data.user;
        if (!user.revealedCells) user.revealedCells = [];
        if (user.revealedCells.indexOf(id) === -1) user.revealedCells = user.revealedCells.concat(id);
        var answer = app.puzzle.solution.charAt(id);
        app.vue.data.user.answers[id] = answer;
        app.helpers.recordCellsRevealed(1);
        app.helpers.saveUserState();
    };

    app.helpers.setUserAnswer = function (cellId, answer) {
        app.vue.data.user.answers[cellId] = answer;

        if (answer !== '' && answer !== null && answer !== undefined) {
            app.vue.data.lastEnteredCell = cellId;
        }

        app.vue.data.check.grid = false;
        app.vue.data.check.letter = null;
        app.vue.data.check.letterCorrect = false;
        app.vue.data.check.gridCorrect = false;

        if (answer === '' && app.vue.data.check.gridIncorrect) {
            app.vue.data.check.gridIncorrect = false;
            if (app.incorrectBlindDismissTimeout) {
                clearTimeout(app.incorrectBlindDismissTimeout);
                app.incorrectBlindDismissTimeout = null;
            }
        }

        if (app.vue.data.hint && app.vue.data.hint.reason) {
            app.vue.data.hint = { cellId: null, reason: null };
        }

        app.helpers.updateProgress();
        app.helpers.saveUserState();
        app.helpers.checkStartedStatus();
        app.helpers.saveUserPlayStatus();
        app.helpers.tock();
        app.helpers.scheduleRuleBreakScan();
    };

    // Points to Check once a row or column is full but wrong. Not on a full grid,
    // which has its own feedback.
    app.helpers.guideCheckTip = function () {
        var id = app.vue.data.lastEnteredCell;
        if (id === null || id === undefined || app.helpers.guideTipSeen('check')) return;
        if (app.vue.model.isCompletedWithErrors || app.vue.model.isCompletedWithoutErrors) return;

        var W = app.puzzle.colCount;
        var H = app.puzzle.rowCount;
        var answers = app.vue.data.user.answers;
        var row = Math.floor(id / W);
        var col = id % W;
        var rowCells = Array.from({ length: W }, function (_, c) { return row * W + c; });
        var colCells = Array.from({ length: H }, function (_, r) { return r * W + col; });

        var fullButWrong = function (cells) {
            var full = cells.every(function (c) { return app.helpers.isCellGiven(c) || answers[c]; });
            return full && cells.some(function (c) {
                return !app.helpers.isCellGiven(c) && answers[c] !== app.puzzle.solution.charAt(c);
            });
        };

        if (fullButWrong(rowCells) || fullButWrong(colCells)) app.helpers.guideTip('check');
    };

    app.helpers.scheduleRuleBreakScan = function () {
        if (app.ruleBreakTimeout) clearTimeout(app.ruleBreakTimeout);
        app.vue.data.ruleBreaks = {};
        app.vue.data.ruleBreakType = null;
        if (!app.vue.data.userPuzzleSettings || !app.vue.data.userPuzzleSettings.rule) return;
        app.ruleBreakTimeout = setTimeout(function () {
            app.ruleBreakTimeout = null;
            var result = app.helpers.scanRuleBreaks();
            app.vue.data.ruleBreaks = result.cells;
            app.vue.data.ruleBreakType = result.ruleType;
        }, 1200);
    };

    app.helpers.scanRuleBreaks = function () {
        var breaks = {};
        var ruleType = null;
        if (!app.puzzle || !app.puzzle.cells) return { cells: breaks, ruleType: null };

        var W = app.puzzle.colCount;
        var H = app.puzzle.rowCount;
        var maxPerRow = Math.floor(W / 2);
        var maxPerCol = Math.floor(H / 2);

        var getVal = function (r, c) {
            var cell = app.puzzle.cells[r][c];
            if (cell.given) return cell.value;
            return app.vue.data.user.answers[cell.id] || '';
        };
        var mark = function (r, c) {
            breaks[app.puzzle.cells[r][c].id] = true;
        };

        //  Rule 1: no three of the same digit in a row — horizontal
        for (var r = 0; r < H; r++) {
            for (var c = 0; c <= W - 3; c++) {
                var v = getVal(r, c);
                if (v !== '' && v === getVal(r, c + 1) && v === getVal(r, c + 2)) {
                    mark(r, c); mark(r, c + 1); mark(r, c + 2);
                    ruleType = ruleType || 'threeInRow';
                }
            }
        }
        //  Rule 1: vertical
        for (var c2 = 0; c2 < W; c2++) {
            for (var r2 = 0; r2 <= H - 3; r2++) {
                var v2 = getVal(r2, c2);
                if (v2 !== '' && v2 === getVal(r2 + 1, c2) && v2 === getVal(r2 + 2, c2)) {
                    mark(r2, c2); mark(r2 + 1, c2); mark(r2 + 2, c2);
                    ruleType = ruleType || 'threeInRow';
                }
            }
        }

        //  Rule 2: too many of one digit in a row
        for (var r3 = 0; r3 < H; r3++) {
            var c0 = 0, c1 = 0;
            for (var c3 = 0; c3 < W; c3++) {
                var v3 = getVal(r3, c3);
                if (v3 === '0') c0++;
                else if (v3 === '1') c1++;
            }
            if (c0 > maxPerRow || c1 > maxPerRow) {
                var overflow = c0 > maxPerRow ? '0' : '1';
                for (var c3b = 0; c3b < W; c3b++) {
                    if (getVal(r3, c3b) === overflow) mark(r3, c3b);
                }
                ruleType = ruleType || 'tooMany';
            }
        }
        //  Rule 2: too many of one digit in a column
        for (var c4 = 0; c4 < W; c4++) {
            var d0 = 0, d1 = 0;
            for (var r4 = 0; r4 < H; r4++) {
                var v4 = getVal(r4, c4);
                if (v4 === '0') d0++;
                else if (v4 === '1') d1++;
            }
            if (d0 > maxPerCol || d1 > maxPerCol) {
                var overflow2 = d0 > maxPerCol ? '0' : '1';
                for (var r4b = 0; r4b < H; r4b++) {
                    if (getVal(r4b, c4) === overflow2) mark(r4b, c4);
                }
                ruleType = ruleType || 'tooMany';
            }
        }

        //  Rule 3: no two identical completed rows
        var rowStrs = [];
        for (var r5 = 0; r5 < H; r5++) {
            var rs = '', complete = true;
            for (var c5 = 0; c5 < W; c5++) {
                var vv = getVal(r5, c5);
                if (vv === '') { complete = false; break; }
                rs += vv;
            }
            rowStrs.push(complete ? rs : null);
        }
        for (var i = 0; i < H; i++) {
            if (rowStrs[i] === null) continue;
            for (var j = i + 1; j < H; j++) {
                if (rowStrs[i] === rowStrs[j]) {
                    for (var c6 = 0; c6 < W; c6++) { mark(i, c6); mark(j, c6); }
                    ruleType = ruleType || 'duplicate';
                }
            }
        }
        //  Rule 3: no two identical completed columns
        var colStrs = [];
        for (var c7 = 0; c7 < W; c7++) {
            var cs = '', completeC = true;
            for (var r7 = 0; r7 < H; r7++) {
                var vc = getVal(r7, c7);
                if (vc === '') { completeC = false; break; }
                cs += vc;
            }
            colStrs.push(completeC ? cs : null);
        }
        for (var ii = 0; ii < W; ii++) {
            if (colStrs[ii] === null) continue;
            for (var jj = ii + 1; jj < W; jj++) {
                if (colStrs[ii] === colStrs[jj]) {
                    for (var r8 = 0; r8 < H; r8++) { mark(r8, ii); mark(r8, jj); }
                    ruleType = ruleType || 'duplicate';
                }
            }
        }

        for (var ro = 0; ro < H; ro++) {
            for (var co = 0; co < W; co++) {
                var opCell = app.puzzle.cells[ro][co];
                var opVal = getVal(ro, co);
                if (opVal === '') continue;

                if (co < W - 1 && (opCell.rightOperator === '=' || opCell.rightOperator === 'x')) {
                    var rightVal = getVal(ro, co + 1);
                    if (rightVal !== '') {
                        var badRight = opCell.rightOperator === '=' ? (opVal !== rightVal) : (opVal === rightVal);
                        if (badRight) {
                            mark(ro, co); mark(ro, co + 1);
                            ruleType = ruleType || (opCell.rightOperator === '=' ? 'operatorEqual' : 'operatorCross');
                        }
                    }
                }

                if (ro < H - 1 && (opCell.bottomOperator === '=' || opCell.bottomOperator === 'x')) {
                    var belowVal = getVal(ro + 1, co);
                    if (belowVal !== '') {
                        var badBelow = opCell.bottomOperator === '=' ? (opVal !== belowVal) : (opVal === belowVal);
                        if (badBelow) {
                            mark(ro, co); mark(ro + 1, co);
                            ruleType = ruleType || (opCell.bottomOperator === '=' ? 'operatorEqual' : 'operatorCross');
                        }
                    }
                }
            }
        }

        return { cells: breaks, ruleType: ruleType };
    };

    //  ---------------------------------------------------------------
    //  Hint — find a cell that can be deduced without revealing the answer
    //  ---------------------------------------------------------------

    app.helpers.findHint = function () {
        if (!app.puzzle || !app.puzzle.cells) return null;

        var W = app.puzzle.colCount;
        var H = app.puzzle.rowCount;
        var maxPerRow = Math.floor(W / 2);
        var maxPerCol = Math.floor(H / 2);

        var getVal = function (r, c) {
            var cell = app.puzzle.cells[r][c];
            if (cell.given) return cell.value;
            return app.vue.data.user.answers[cell.id] || '';
        };

        var cid = function (r, c) {
            return app.puzzle.cells[r][c].id;
        };

        for (var or = 0; or < H; or++) {
            for (var oc = 0; oc < W; oc++) {
                var ocell = app.puzzle.cells[or][oc];
                if (ocell.given) continue;
                if ((app.vue.data.user.answers[ocell.id] || '') !== '') continue;

                var links = [];
                if (oc < W - 1) links.push({ op: ocell.rightOperator, nr: or, nc: oc + 1 });
                if (oc > 0) links.push({ op: app.puzzle.cells[or][oc - 1].rightOperator, nr: or, nc: oc - 1 });
                if (or < H - 1) links.push({ op: ocell.bottomOperator, nr: or + 1, nc: oc });
                if (or > 0) links.push({ op: app.puzzle.cells[or - 1][oc].bottomOperator, nr: or - 1, nc: oc });

                for (var li = 0; li < links.length; li++) {
                    var link = links[li];
                    if (link.op !== '=' && link.op !== 'x') continue;
                    if (getVal(link.nr, link.nc) === '') continue;
                    return {
                        cellId: ocell.id,
                        evidence: [app.puzzle.cells[link.nr][link.nc].id],
                        reason: link.op === '=' ? 'operator_equal' : 'operator_cross'
                    };
                }
            }
        }

        for (var r = 0; r < H; r++) {
            for (var c = 0; c < W; c++) {
                var cell = app.puzzle.cells[r][c];
                if (cell.given) continue;
                if ((app.vue.data.user.answers[cell.id] || '') !== '') continue;

                //  Technique 1: adjacent pair — two same to the left/right/above/below
                if (c >= 2 && getVal(r, c - 1) !== '' && getVal(r, c - 1) === getVal(r, c - 2)) {
                    return { cellId: cell.id, evidence: [cid(r, c - 1), cid(r, c - 2)], reason: 'three_adjacent' };
                }
                if (c <= W - 3 && getVal(r, c + 1) !== '' && getVal(r, c + 1) === getVal(r, c + 2)) {
                    return { cellId: cell.id, evidence: [cid(r, c + 1), cid(r, c + 2)], reason: 'three_adjacent' };
                }
                if (r >= 2 && getVal(r - 1, c) !== '' && getVal(r - 1, c) === getVal(r - 2, c)) {
                    return { cellId: cell.id, evidence: [cid(r - 1, c), cid(r - 2, c)], reason: 'three_adjacent' };
                }
                if (r <= H - 3 && getVal(r + 1, c) !== '' && getVal(r + 1, c) === getVal(r + 2, c)) {
                    return { cellId: cell.id, evidence: [cid(r + 1, c), cid(r + 2, c)], reason: 'three_adjacent' };
                }

                //  Technique 2: sandwich — same symbol either side with this in the middle
                if (c >= 1 && c <= W - 2 && getVal(r, c - 1) !== '' && getVal(r, c - 1) === getVal(r, c + 1)) {
                    return { cellId: cell.id, evidence: [cid(r, c - 1), cid(r, c + 1)], reason: 'three_sandwich' };
                }
                if (r >= 1 && r <= H - 2 && getVal(r - 1, c) !== '' && getVal(r - 1, c) === getVal(r + 1, c)) {
                    return { cellId: cell.id, evidence: [cid(r - 1, c), cid(r + 1, c)], reason: 'three_sandwich' };
                }

                //  Technique 3: row already has half of one symbol → rest must be the other
                var rc0 = 0, rc1 = 0;
                for (var cc = 0; cc < W; cc++) {
                    var v = getVal(r, cc);
                    if (v === '0') rc0++;
                    else if (v === '1') rc1++;
                }
                if (rc0 >= maxPerRow || rc1 >= maxPerRow) {
                    var rowFull = rc0 >= maxPerRow ? '0' : '1';
                    var rowCells = Array.from({ length: W }, function (_, i) { return cid(r, i); });
                    return {
                        cellId: cell.id,
                        evidence: rowCells.filter(function (id, i) { return getVal(r, i) === rowFull; }),
                        line: rowCells,
                        reason: 'row_count'
                    };
                }

                //  Technique 4: column already has half of one symbol
                var cc0 = 0, cc1 = 0;
                for (var rr = 0; rr < H; rr++) {
                    var v2 = getVal(rr, c);
                    if (v2 === '0') cc0++;
                    else if (v2 === '1') cc1++;
                }
                if (cc0 >= maxPerCol || cc1 >= maxPerCol) {
                    var colFull = cc0 >= maxPerCol ? '0' : '1';
                    var colCells = Array.from({ length: H }, function (_, i) { return cid(i, c); });
                    return {
                        cellId: cell.id,
                        evidence: colCells.filter(function (id, i) { return getVal(i, c) === colFull; }),
                        line: colCells,
                        reason: 'col_count'
                    };
                }
            }
        }

        return null;
    };

    app.helpers.updateProgress = function () {
        app.status.progress = Math.floor(app.vue.model.totalCellsPercent);
    };

    app.helpers.tock = function () {
        if (app.media.supports.audio && app.media.items.tock && app.vue.data.userPuzzleSettings.soundskeyboard) {
            app.media.items.tock.play();
        }
    };

    app.helpers.timerUpdate = function (count) {
        app.vue.data.time = count;
        app.helpers.saveUserTime();
    };

    app.helpers.getDOMValue = function (selector, value) {
        var node = document.querySelector(selector);
        if (!node) return null;
        return getComputedStyle(node)[value];
    };

    app.helpers.loadPuzzleSettings = function () {
        var defaultUserState = app.helpers.getDefaultUserState();

        return app.storageVariant.get('settings').then(function (data) {
            if (data !== null) {
                for (var i in data) {
                    app.vue.data.userPuzzleSettings[i] = data[i] !== null ? data[i] : defaultUserState.settings[i];
                }
            } else {
                app.vue.data.userPuzzleSettings = defaultUserState.settings;
            }
        });
    };

    app.helpers.resizeGrid = function () {
        const query = window.matchMedia('(min-width: 720px)');
        const windowWidth = window.innerWidth;
        const gameAndKeys = document.getElementById('gameAndKeys');
        const gameplay = document.getElementById('gameplay');
        const gameplayContainer = document.getElementById('gameplayContainer');
        const keysContainer = document.getElementById('keysContainer');

        gameplay.setAttribute('style', '');

        const appMargin = parseInt(getComputedStyle(gameplayContainer.closest('.content-wrapper')).paddingInline);
        const gameAndKeysWidth = gameAndKeys.offsetWidth;
        const gameAndKeysGap = parseInt(getComputedStyle(gameAndKeys).gap);
        const gameplayContainerHeight = gameplayContainer.offsetHeight;
        const gameplayHeight = gameplay.offsetHeight;
        const gameplayWidth = gameplay.offsetWidth;
        const keysContainerWidth = keysContainer ? keysContainer.offsetWidth : 0;
        let heightDifference, adjustedSize;

        if (gameplayHeight !== gameplayContainerHeight) {
            heightDifference = gameplayContainerHeight / gameplayHeight;
            adjustedSize = gameplayWidth * heightDifference;

            if (adjustedSize > windowWidth) {
                adjustedSize = windowWidth - (appMargin * 2);
            }

            if (adjustedSize + keysContainerWidth + gameAndKeysGap > gameAndKeysWidth && query.matches) {
                adjustedSize = gameAndKeysWidth - keysContainerWidth - gameAndKeysGap;
            }

            gameplay.style.inlineSize = Math.floor(adjustedSize) + 'px';
        }
    };
}());

document.addEventListener('puzzlehistorychange', function (e) {
    var history = e.detail.history;
    app.vue.data.history = history;
    app.helpers.saveUserState();
}, false);