var app = window.app || {};

(function () {

    'use strict';

    var params = new URLSearchParams(window.location.search);

    app.setup = app.setup || {
        debug: true,
    };

    app.guide = {
        slides: function () {
            var base = './assets/onboarding/';
            var slides = [
                { text: 'modal_onboarding_slide_01', image: base + 'slide-1.svg' },
                { text: 'modal_onboarding_slide_02', image: base + 'slide-2.svg' },
                { text: 'modal_onboarding_slide_03', image: base + 'slide-3.svg' },
            ];
            var operators = (app.puzzle && app.puzzle.operators) || '';
            if (/[=x×]/.test(operators)) {
                slides.push({ text: 'modal_onboarding_slide_04', image: base + 'slide-4.svg' });
            }
            return slides;
        },
        tour: [
            { target: '#pinch-zoom-image', title: 'guide_tour_grid_title', body: 'guide_tour_grid_body' },
            { target: '[data-action=undo]', outline: true, title: 'guide_tour_undo_title', body: 'guide_tour_undo_body' },
            { target: '[data-action=hints]', outline: true, title: 'guide_tour_hints_title', body: 'guide_tour_hints_body' },
            { target: ['[data-actions=hints] .action-popout__header', '[data-actions=hints] li:nth-child(-n+2)'], requires: '[data-action=hints]', open: 'hintsMenu', title: 'guide_tour_hint_title', body: 'guide_tour_hint_body' },
            { target: '[data-actions=hints] li:nth-child(n+3):nth-child(-n+5)', requires: '[data-action=hints]', open: 'hintsMenu', title: 'guide_tour_check_title', body: 'guide_tour_check_body' },
            { target: '[data-actions=hints] li:nth-child(n+6)', requires: '[data-action=hints]', open: 'hintsMenu', title: 'guide_tour_reveal_title', body: 'guide_tour_reveal_body' },
            { target: '[data-action=settings]', outline: true, title: 'guide_tour_more_title', body: 'guide_tour_more_body' },
            { target: '#settings', requires: '[data-action=settings]', open: 'settings', title: 'guide_tour_settings_title', body: 'guide_tour_settings_body' },
            { title: 'guide_tour_ready_title' },
        ],
        tips: {
            check: { target: '[data-action=hints]', text: 'guide_tip_check' },
            hint: { target: '[data-action=hints]', text: 'guide_tip_hint' },
        },
        idleTip: { tip: 'hint', after: 90 },
        events: { letter: 'symbolentered', cell: 'symbolentered' },
        onLetter: function () {
            app.helpers.guideCheckTip();
        },
    };

    app.setup.init = function (settings) {
        app.setup.log('setup.init');
        settings = settings || {};
        app.helpers.processSettings(settings);
        app.helpers.parseUrlParams();
        app.config.puzzleApp = params.has('puzzleApp') ? window.parent.puzzleApp : null;
        app.setup.langData();
    };

    app.setup.langData = async function () {
        app.setup.log('setup.langData');
        try {
            var languagesToAttemptToLoad = [];
            if (location.params.lang) {
                languagesToAttemptToLoad.push(location.params.lang);
            }
            if (typeof navigator !== 'undefined' && navigator.language) {
                languagesToAttemptToLoad.push(navigator.language.substring(0, 2));
            }
            languagesToAttemptToLoad.push('en');
            languagesToAttemptToLoad = [...new Set(languagesToAttemptToLoad)];

            var res;
            for (var lidx in languagesToAttemptToLoad) {
                var lang = languagesToAttemptToLoad[lidx];
                res = await fetch('locale-' + lang + '.json');
                if (res.ok) {
                    app.vue.data.locale = await res.text().then(JSON.parse).catch(function () {
                        throw new Error('Failed to parse locale-' + lang + '.json');
                    });
                    return app.setup.gameData();
                } else {
                    console.log('Failed to fetch locale-' + lang + '.json: ' + res.status + ' (' + res.statusText + ')');
                    if (lidx >= languagesToAttemptToLoad.length - 1) {
                        throw new Error('Failed to fetch locales: ' + res.status + ' (' + res.statusText + ')');
                    }
                }
            }
        } catch (err) {
            if (app.helpers.error) app.helpers.error(err);
            else console.error(err);
        }
    };

    app.setup.getGameDataFromLocalJson = function () {
        var json = location.params.json;
        var dataUrl = !json ? 'data.json' : /[\/.]/.test(json) ? json : 'json/' + json + '.json';
        return fetch(dataUrl).then(function (res) { return res.json(); });
    };

    app.setup.gameData = async function () {
        app.setup.log('setup.gameData');
        if (window.puzzleData) {
            app.setup.gameDataDone(window.puzzleData);
            return;
        }

        if (app.config.puzzleApp && !params.has('json')) {
            try {
                var data = await app.channel?.request(
                    'getdata',
                    app.helpers.toFormattedOutgoingMessage({ type: 'puzzle' }),
                    { batch: false }
                );

                if (!data || typeof data !== 'object' || !('json' in data)) {
                    throw new TypeError('Malformed puzzle data response from parent');
                }

                app.setup.gameDataDone(data.json);
                return;
            } catch (err) {
                app.setup.log(Logger.print(err));
            }
        }

        app.setup.gameDataDone(await app.setup.getGameDataFromLocalJson());
    };

    app.setup.gameDataDone = function (json) {
        app.setup.log('setup.gameDataDone');
        app.vue.data.json = json;
        app.json = json;
        app.setup.puzzleObject();
    };

    app.setup.puzzleObject = function () {
        app.setup.log('setup.puzzleObject');
        app.vue.methods.setSource(app.vue.data.json);
        app.puzzle = app.vue.methods.getPuzzleObject();
        app.setup.puzzleObjectDone();
    };

    app.setup.puzzleObjectDone = function () {
        app.setup.log('setup.puzzleObjectDone');
        app.setup.storageObjects();
    };

    app.setup.storageObjects = function () {
        app.setup.log('setup.storageObjects');
        app.idbUserRequest = indexedDB.open('DMPuzzlesUserData', Date.now());

        app.idbUserRequest.onupgradeneeded = function (e) {
            var db = e.target.result;
            var puzzleStore = app.config.type + '-' + app.config.id;
            var variantStore = app.config.type;
            if (!db.objectStoreNames.contains(puzzleStore)) {
                db.createObjectStore(puzzleStore, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(variantStore)) {
                db.createObjectStore(variantStore, { keyPath: 'id' });
            }
        };

        app.idbUserRequest.onsuccess = function () {
            app.idbUserRequest.result.onversionchange = function () {
                app.idbUserRequest.result.close();
            };
            app.storagePuzzle = new StorageIdb(app.config.type + '-' + app.config.id, app.idbUserRequest);
            app.storageVariant = new StorageIdb(app.config.type, app.idbUserRequest);
            app.setup.storageObjectsDone();
        };
    };

    app.setup.storageObjectsDone = function () {
        app.setup.log('setup.storageObjectsDone');
        app.setup.userData();
    };

    app.setup.userData = async function () {
        app.setup.log('setup.userData');

        if (!app.config.puzzleApp) {
            app.helpers.loadPuzzleState().then(app.setup.userDataDone);
            return;
        }

        try {
            var request = function (type) {
                return app.channel?.request('getdata', app.helpers.toFormattedOutgoingMessage({ type: type }), { batch: true });
            };
            var pending = [request('user'), request('status'), request('time')];
            app.channel?.flush();
            var results = await Promise.all(pending);

            app.helpers.onUserData(results[0]);
            app.helpers.onStatusData(results[1]);
            app.helpers.onTimeData(results[2]);

            app.setup.userDataDone();
        } catch (err) {
            app.setup.log('Error getting user data', Logger.print(err));
        }
    };

    app.setup.userDataDone = function () {
        app.setup.log('setup.userDataDone');
        app.setup.puzzleCompletionData();
    };

    app.setup.getCompletionDataFromArchive = async function () {
        app.setup.log('setup.getCompletionDataFromArchive');

        try {
            const res = await fetch(app.vue.data.source.meta.archive);

            if (!res.ok) {
                throw new Error(`Failed to fetch archive: ${res.status} (${res.statusText})`);
            }

            const json = await res
                .text()
                .then(JSON.parse)
                .catch(() => {
                    throw new Error(`Failed to parse archive: ${res.status} (${res.statusText})`);
                });

            app.puzzle.feedback = app.helpers.getFeedbackLinksObject(json);
        } catch (err) {
            console.error(err);
        }
    };

    app.setup.getCompletionDataFromParent = function () {
        app.setup.log('setup.getCompletionDataFromParent');
        app.puzzle.feedback = window.parent.puzzleApp.completion;
        app.puzzle.stats = window.parent.puzzleApp.stats || null;
    };

    app.setup.puzzleCompletionData = async function () {
        app.setup.log('setup.puzzleCompletionData');

        if (window.parent.puzzleApp?.completion) {
            app.setup.getCompletionDataFromParent();
        } else if (app.vue.data.source.meta?.archive) {
            await app.setup.getCompletionDataFromArchive();
        }

        app.setup.puzzleCompletionDataDone();
    };

    app.setup.puzzleCompletionDataDone = function () {
        app.setup.log('setup.puzzleCompletionDataDone');
        app.setup.vue();
    };

    app.setup.vue = function () {
        app.setup.log('setup.vue');
        app.vue.init(app.config.el);
        app.setup.vueDone();
    };

    app.setup.vueDone = function () {
        app.setup.log('setup.vueDone');
        app.helpers.initPuzzle();
        app.helpers.addEventListeners();
        if (app.vue.data.config.hasTimer) {
            app.timer = new DMTimer();
            app.timer.callback = app.helpers.timerUpdate;
        }
        app.setup.analytics();
    };

    app.setup.analytics = function () {
        app.setup.log('setup.analytics');

        if (app.marmalytics) {
            app.helpers.initialiseAnalytics();
            app.marmalytics.init();
            app.marmalytics.pageLoad();
        }

        app.setup.analyticsDone();
    };

    app.setup.analyticsDone = function () {
        app.setup.log('setup.analyticsDone');
        app.setup.done();
    };

    app.setup.done = function () {
        app.setup.log('setup.done');
        app.helpers.showPuzzleOrStart();
        app.helpers.dispatchEvent('puzzleready');
        return false;
    };

    app.setup.log = function (message) {
        if (this.debug) {
            console.log(message);
        }
    };

}());
