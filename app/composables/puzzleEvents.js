//import {UserPuzzle, UserStorage} from "~/composables/userStorage.js";
import {getApp} from 'firebase/app'
import {getAnalytics, logEvent} from 'firebase/analytics'

export const PuzzleEvents = {
    debug: true,
    childPuzzle: null,
    puzzle: {
        iframeId: 'puzzle-frame',
        iframe: null,
        status: null,
        variant: null,
        variantName: null,
        slug: null,
    },
    analytics: null,

    async init (puzzle = null) {
        const features = useFeatures()

        PuzzleEvents.log('PuzzleEvents.init');
        PuzzleEvents.puzzle.variant = puzzle.tag;
        PuzzleEvents.puzzle.variantName = puzzle.variant;

        if (features.requireAccount || features.friends) {
            PuzzleEvents.analytics = getAnalytics(getApp());
            UserStorage.init();
        }

        window.addEventListener('message', PuzzleEvents.handleMessage, false);
    },

    async deinit () {
        PuzzleEvents.log('PuzzleEvents.deinit');
        window.removeEventListener('message', PuzzleEvents.handleMessage);
    },

    log: function (...data) {
        if (PuzzleEvents.debug) {
            console.log('PuzzleEvents', ...data);
        }
    },

    logEvent: function (eventName, id, extraData = {}) {
        const data = {...{
                id: id,
                name: id,
                variant: PuzzleEvents.puzzle.variant,
                firebase_screen: PuzzleEvents.puzzle.variantName,
                //screen_name: PuzzleEvents.puzzle.variantName,
            }, ...extraData};

        if (PuzzleEvents.analytics) {
            logEvent(PuzzleEvents.analytics, eventName, data);
        }
        PuzzleEvents.log('logEvent', eventName, data);
    },

    // GAMEPLAY interaction
    handleMessage: function (event) {
        try {
            //PuzzleEvents.log('handleMessage', event);
            if (typeof event.data.type === 'undefined' || String(event.data.type).startsWith('tutorial')) {
                return false;
            }
            //PuzzleEvents.log('handleMessage', event.data.type);

            const validMsgs = {
                puzzleready: 'puzzleReady',
                puzzlestart: 'puzzleStart',
                puzzleprogress: 'puzzleProgress',
                puzzlecomplete: 'puzzleComplete',
                //puzzleincomplete: 'puzzleIncomplete',
                puzzleshare: 'puzzleShare',
                puzzlereset: 'puzzleReset',
                //puzzlehint: 'puzzleHint',
                //puzzlehelp: 'puzzleHelp',
                puzzlecreate: 'puzzleCreate',
                puzzlejoin: 'puzzleJoin',
                puzzleinvite: 'puzzleInvite',
                puzzledifficulty: 'puzzleDifficulty',
                puzzleassists: 'puzzleAssists',

                //getdata: 'getData',
            };
            const functionName = validMsgs[event.data.type] || null;

            if ((functionName === null) || (typeof PuzzleEvents.fromChild[functionName] === 'undefined')) {
                console.warn('method not found: fromChild.' + event.data.type, event.data);
            } else {
                const bubbleEvents = [];

                /*if (!bubbleEvents.includes(functionName)) {
                    event.stopPropagation();
                }*/
                PuzzleEvents.fromChild[functionName](event.data);
            }
        } catch (e) {
            console.error(e);
        }
    },
    puzzleExit: function (event) {
        PuzzleEvents.puzzle.status = PuzzleEvents.childPuzzle.status.get();
        const userData = PuzzleEvents.childPuzzle.user.get() || {};
        PuzzleEvents.log('puzzleExit', PuzzleEvents.puzzle.status, userData);
        PuzzleEvents.logEvent('puzzle_exit', PuzzleEvents.puzzle.slug);

        // Only save progress if puzzle is not already completed?
        if (!PuzzleEvents.puzzle.status.completed) {
            UserPuzzle.savePuzzleProgress(
                {variant: PuzzleEvents.puzzle.variant, slug: PuzzleEvents.puzzle.slug},
                {
                    node: 'all',
                    data: {
                        user: userData,
                        time: PuzzleEvents.childPuzzle.time.get() || 0,
                        status: PuzzleEvents.puzzle.status || {},
                    },
                });

            //UserPuzzle.setPuzzleUserStatus({variant: PuzzleEvents.puzzle.variant, slug: PuzzleEvents.puzzle.slug}, PuzzleEvents.puzzle.status);
            //puzzleAppVue.statusCache[PuzzleEvents.puzzle.slug] = PuzzleEvents.puzzle.status;
        }
    },

    fromChild: {
        puzzleReady: function (data) {
            PuzzleEvents.log('puzzleReady', data);
            try {
                PuzzleEvents.puzzle.slug = data.slug;
                //PuzzleEvents.puzzle.variant = puzzleApp.puzzle.variant;

                PuzzleEvents.puzzle.iframe = document.getElementById(PuzzleEvents.puzzle.iframeId).contentWindow;
                PuzzleEvents.childPuzzle = PuzzleEvents.puzzle.iframe.app.puzzleApi;
                PuzzleEvents.puzzle.status = PuzzleEvents.childPuzzle.status.get();
                PuzzleEvents.puzzle.iframe.window.addEventListener('unload', PuzzleEvents.puzzleExit, false);
            } catch (e) {
                PuzzleEvents.log(e);
            }
        },

        puzzleStart: function (data) {
            PuzzleEvents.log('puzzleStart', data);
            PuzzleEvents.logEvent('puzzle_start', data.slug);

            UserPuzzle.setPuzzleUserStatus({variant: PuzzleEvents.puzzle.variant, slug: data.slug}, data.payload.status);
            //puzzleAppVue.statusCache[data.slug] = data.payload.status;

            if (typeof UserStats !== 'undefined') {
                UserStats.incrementGlobalStartStats();
                UserStats.incrementVariantStartStats(PuzzleEvents.puzzle.variant);
            }
        },

        puzzleProgress: function (data) {
            PuzzleEvents.log('puzzleProgress', data);
        },

        puzzleComplete: function (data) {
            PuzzleEvents.log('puzzleComplete', data);
            PuzzleEvents.logEvent('puzzle_complete', data.slug);

            //UserPuzzle.setPuzzleUserStatus({variant: PuzzleEvents.puzzle.variant, slug: data.slug}, data.payload.status);
            UserPuzzle.savePuzzleProgress(
                {variant: PuzzleEvents.puzzle.variant, slug: data.slug},
                {
                    node: 'all',
                    data: {
                        user: PuzzleEvents.childPuzzle.user.get() || {},
                        time: PuzzleEvents.childPuzzle.time.get() || 0,
                        status: data.payload.status,
                    },
                });

            //puzzleAppVue.statusCache[data.slug] = data.payload.status;
            PuzzleEvents.puzzle.status = data.payload.status;

            if (typeof UserStats !== 'undefined') {
                UserStats.updateGlobalCompletionStats();
                UserStats.updateVariantCompletionStats(PuzzleEvents.puzzle.variant, data.payload.status);
            }
        },

        puzzleShare: function (data) {
            PuzzleEvents.log('puzzleShare', data);
            PuzzleEvents.logEvent('share', data.slug, {content_type: 'puzzle', item_id: data.slug});
        },

        puzzleReset: function (data) {
            PuzzleEvents.log('puzzleReset', data);
            PuzzleEvents.logEvent('puzzle_reset', data.slug);
        },

        puzzleCreate: function (data) {
            PuzzleEvents.log('puzzleCreate', data);
            PuzzleEvents.logEvent('puzzle_multiplayer_create', data.slug);
        },

        puzzleJoin: function (data) {
            PuzzleEvents.log('puzzleJoin', data);
            PuzzleEvents.logEvent('puzzle_multiplayer_join', data.slug);
        },

        puzzleDifficulty: function (data) {
            PuzzleEvents.log('puzzleDifficulty', data);
        },

        puzzleAssists: function (data) {
            PuzzleEvents.log('puzzleAssists', data);
        },

        puzzleInvite: function (data) {
            PuzzleEvents.log('puzzleInvite', data);
            PuzzleEvents.logEvent('puzzle_multiplayer_invite', data.slug);
        },
    },
};
