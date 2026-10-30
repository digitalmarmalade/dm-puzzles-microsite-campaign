import {getFirestore, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, query, orderBy, serverTimestamp, setDoc, updateDoc, writeBatch} from 'firebase/firestore';
import {dateHelpers} from "~/lib/challenges.js";

// Storage for Firestore collections & documents
const _ = {
    set (obj, key, value) {
        const [current, ...rest] = key.split('.');
        (rest.length >= 1) ?
            _.set(obj[current] = obj[current] || {}, rest.join('.'), value) :
            obj[current]= value;
        return obj;
    },
    get (obj, key) {
        return key.split('.').reduce(function(prev, curr) {
            return prev[curr];
        }, obj || this);
    }
};

export const UserStorage = {
    debug: true,
    enabled: true,
    ready: false,
    uid: null,
    db: null,

    init () {
        UserStorage.db = getFirestore();
    },

    setUid (uid) {
        UserStorage.uid = uid;
    },

    getDocumentRef(path) {
        if (UserStorage.isStorageAvailable()) {
            return doc(UserStorage.db, 'users/' + UserStorage.uid + '/' + path);
        }

        return null;
    },

    async setUserDocument (path, data, batch = null) {
        if (UserStorage.isStorageAvailable()) {
            try {
                const docRef = UserStorage.getDocumentRef(path);

                UserStorage.logStorageWrite('doc', path);
                if (batch) {
                    batch.set(docRef, {});
                    return batch.update(docRef, JSON.parse(JSON.stringify(data)));
                }

                await setDoc(docRef, {})

                return updateDoc(docRef, JSON.parse(JSON.stringify(data)));
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(null);
    },

    async setUserDocumentAttribute (path, key, value, isTimestamp = false, batch = null) {
        if (UserStorage.isStorageAvailable()) {
            try {
                const docRef = UserStorage.getDocumentRef(path);
                let doc = {};

                key = key.replace('/', '.');
                UserStorage.logStorageWrite('doc-attribute', path, key);

                doc = _.set(doc, key, isTimestamp ? value : JSON.parse(JSON.stringify(value)));

                return batch ? batch.set(docRef, doc, { merge: true }) : setDoc(docRef, doc, { merge: true });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(null);
    },

    async getUserDocument (path) {
        if (UserStorage.isStorageAvailable()) {
            try {
                const docRef = UserStorage.getDocumentRef(path);

                UserStorage.logStorageRead('doc', path);

                return getDoc(docRef)
                    .then((snap) => {
                        return snap.exists ? snap.data() : {};
                    });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve({});
    },

    async deleteUserDocument (path = '') {
        if (UserStorage.isStorageAvailable()) {
            try {
                const docRef = UserStorage.getDocumentRef(path);
                UserStorage.logStorageDelete(path);
                return deleteDoc(docRef)
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(null);
    },

    async userDocumentExists (path = '') {
        if (UserStorage.isStorageAvailable()) {
            try {
                const docRef = UserStorage.getDocumentRef(path);

                UserStorage.logStorageRead('doc', path);

                return getDoc(docRef)
                    .then((snap) => {
                        return snap.exists();
                    });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(false);
    },

    async getUserDocumentAttribute (path, key) {
        if (UserStorage.isStorageAvailable()) {
            try {
                return UserStorage.getUserDocument(path)
                    .then((document) => {
                        key = key.replace('/', '.');
                        return _.get(document, key);
                    });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(null);
    },

    async getUserCollection (path, limit = null) {
        if (UserStorage.isStorageAvailable()) {
            try {
                UserStorage.logStorageRead('col lection', path, limit);

                const collectionRef = collection(UserStorage.db, 'users/' + UserStorage.uid, path);

                return getDocs(limit ? query(collectionRef, limit(limit)) : collectionRef)
                    .then((snap) => {
                        let docs = {};

                        snap.forEach((doc) => {
                            docs[doc.id] = doc.data();
                        });

                        return docs;
                    });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve({});
    },

    async countUserCollection(path = '', order = null) {
        if (UserStorage.isStorageAvailable()) {
            try {
                UserStorage.logStorageCount(path, order);

                const collectionRef = collection(UserStorage.db, 'users/' + UserStorage.uid, path);
                return getCountFromServer(order ? query(collectionRef, orderBy(order)) : collectionRef)
                    .then(snap => {
                        return snap.data().count;
                    });
            } catch (e) {
                UserStorage.log(e.message);
            }
        }

        return Promise.resolve(null);
    },

    async getUserData (path) {
        return UserStorage.getUserCollection(path);
    },

    async getTimestamps () {
        return UserStorage.getSetting( 'timestamps');
    },

    async setTimestamps (value) {
        return UserStorage.setSetting( 'timestamps', value);
    },

    setTimestamp (name) {
        UserStorage.setSettingAttribute( 'timestamps', name, serverTimestamp(), true);
    },

    getPuzzleDocumentPath (variant, slug) {
        return 'gameplay/' + variant + '/puzzles/' + slug;
    },

    async getSetting (key) {
        // DATA MODEL: settings collection document
        return UserStorage.getUserDocument('settings/' + key);
    },

    async setSetting (key, value) {
        // DATA MODEL: settings collection document
        if (Array.isArray(value)) {
            value = Object.assign({}, value);
        }
        return UserStorage.setUserDocument('settings/' + key, value);
    },

    async deleteSetting (key) {
        // DATA MODEL: settings collection document
        return UserStorage.deleteUserDocument('settings/' + key);
    },

    async setSettingAttribute (key, attribute, value, isTimestamp = false, batch = null) {
        // DATA MODEL: settings collection document attribute
        return UserStorage.setUserDocumentAttribute('settings/' + key, attribute, value, isTimestamp, batch);
    },

    isEnabled() {
        if (!UserStorage.ready) {
            UserStorage.ready = true;
            UserStorage.log('TMGPUZZLES FIREBASE AUTH USER', UserStorage.uid);
            if (UserStorage.uid === undefined) {
                // TODO: Reload the page as login has changed?
            }
        }

        return UserStorage.enabled && UserStorage.uid;
    },

    isOnline() {
        return navigator && navigator.onLine;
    },

    isStorageAvailable() {
        //console.log('isStorageAvailable', UserStorage.enabled, UserStorage.uid)
        return UserStorage.enabled && UserStorage.uid && UserStorage.isOnline();
    },

    log(...data) {
        if (UserStorage.debug) {
            console.log(...data);
        }
    },

    logStorage(type, on, path, value = '') {
        if (UserStorage.debug) {
            UserStorage.log('FS', type, on, path)
            document.dispatchEvent(new CustomEvent('logStorage', { detail: {name: 'Firestore', type, on, path, value} }))
        }
    },

    logStorageRead(on, path, value = '') {
        UserStorage.logStorage('read', on, path, value)
    },

    logStorageWrite(on, path, value = '') {
        UserStorage.logStorage('write', on, path, value)
    },

    logStorageDelete(path) {
        UserStorage.logStorage('delete', 'doc', path)
    },

    logStorageCount(path, order = '') {
        UserStorage.logStorage('count', 'collection', path, order)
    },

    getUserPath () {
        return 'users/' + UserStorage.uid + '/';
    },

    getPuzzleKey (puzzle) {
        return (typeof puzzle === 'object') ? (puzzle.slug) : puzzle;
    },
};

export const UserPuzzle = {
    async getPuzzleUserData (puzzle) {
        if (UserStorage.uid) {
            const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(puzzle.variant, puzzle.slug || puzzle.id);
            return UserStorage.getUserDocument(puzzleDocumentPath);
        }

        return Promise.resolve(null);
    },

    async setPuzzleDocument (variantSlug, puzzleSlug, puzzleDoc) {
        const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(variantSlug, puzzleSlug);
        return UserStorage.setUserDocument(puzzleDocumentPath, puzzleDoc);
    },

    async savePuzzleProgress (puzzle, data) {
        if (UserStorage.isStorageAvailable()) {
            const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(puzzle.variant, puzzle.slug);

            switch (data.node) {
                case 'all':
                    // Save all nodes under data at once, also update the status_cache
                    const batch = writeBatch(UserStorage.db);
                    await UserStorage.setUserDocument(puzzleDocumentPath, data.data, batch);
                    await UserStorage.setSettingAttribute('status_cache', puzzle.slug, data.data.status, false, batch);
                    return batch.commit();

                case 'active':
                    // Don't persist active state cross-device? Too much Firebase traffic?
                    return Promise.resolve(null);

                case 'time':
                case 'user':
                //case 'status':
                default:
                    return UserStorage.setUserDocumentAttribute(puzzleDocumentPath, data.node, data.data);
            }
        }

        return Promise.resolve(null);
    },

    setPuzzleUserStatus (puzzle, status) {
        // Save puzzle status & also cache status
        const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(puzzle.variant, puzzle.slug);
        UserStorage.setUserDocumentAttribute(puzzleDocumentPath, 'data.status', status ?? null);
        return UserStatus.setStatusCachePuzzle(puzzle, status ?? null);
    },

    async getPuzzleUserStatus (puzzle) {
        if (puzzle !== null) {
            // Get the user status of the puzzle
            const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(puzzle.variant, puzzle.slug);

            return UserStorage.getUserDocumentAttribute(puzzleDocumentPath, 'data.status')
                .then((statusData) => {
                    if  (statusData) {
                        statusData.name = '';

                        if (statusData.isStreakPuzzle) {
                            statusData.name = 'streak';
                        } else if (statusData.completed) {
                            statusData.name = 'completed';
                        } else if (statusData.started) {
                            statusData.name = 'started';
                        }
                    }

                    return statusData;
                });
        }

        return Promise.resolve(null);
    },
};

export const UserStatus = {
    async getLastPlayed () {
        return UserStorage.getSetting('last_played');
    },

    async setLastPlayed (value) {
        return UserStorage.setSetting('last_played', value);
    },

    async getStatusCache () {
        // DATA MODEL: settings collection document
        return UserStorage.getSetting('status_cache');
    },

    async setStatusCache (value) {
        // DATA MODEL: settings collection document
        return UserStorage.setSetting('status_cache', value);
    },

    async setStatusCachePuzzle (puzzle, status) {
        let attribute = UserStorage.getPuzzleKey(puzzle);
        status = JSON.parse(JSON.stringify(status));
        // DATA MODEL: settings collection document attribute
        return UserStorage.setSettingAttribute('status_cache', attribute, status);
    },

    async setStatusCacheStreak (variantSlug, streak) {
        // DATA MODEL: settings collection document attribute
        return UserStorage.setSettingAttribute('status_cache', '_streaks.' + variantSlug, streak);
    },

    async setPuzzleStreak (puzzle, isStreakPuzzle) {
        const puzzleDocumentPath = UserStorage.getPuzzleDocumentPath(puzzle.variant, puzzle.id);
        return UserStorage.setUserDocumentAttribute(puzzleDocumentPath, 'data.status.isStreakPuzzle', isStreakPuzzle);
    },
};

export const UserStats = {
    debug: true,
    enabled: true,
    global: {},
    variants: {},

    async getVariantStats (variantSlug = null) {
        // This is variantSlug attribute in stats/variants document
        return variantSlug ?
            UserStorage.getUserDocumentAttribute('stats/variants', variantSlug) :
            UserStorage.getUserDocument('stats/variants');
    },

    async setVariantStats (variantSlug, stats, updateStreakCache = false) {
        // This is variantSlug attribute in stats/variants document
        await UserStorage.setUserDocumentAttribute('stats/variants', variantSlug, stats);

        if (updateStreakCache) {
            // Update the variant streak in the cached status
            await UserStorage.setStatusCacheStreak(variantSlug, stats.streak);
            // NB: Also update in the local status cache (code is elsewhere)
        }
    },

    async calculateVariantStats(variantSlug) {
        const path = '/gameplay/' + variantSlug + '/puzzles';

        // Count documents under gameplay with given data attributes
        return {
            started: await UserStorage.countUserCollection(path, 'data.status.started'),
            completed: await UserStorage.countUserCollection(path, 'data.status.completed')
        };
    },

    async getGlobalStats () {
        // DATA MODEL: stats collection global document
        return UserStorage.getUserDocument('stats/global');
    },

    async setGlobalStats (stats) {
        // DATA MODEL: stats collection global document
        return UserStorage.setUserDocument('stats/global', stats);
    },

    async loadGlobalStats () {
        UserStats.global = await UserStats.getGlobalStats() || {};
        return UserStats.global;
    },

    async loadVariantStats () {
        UserStats.variants = await UserStats.getVariantStats() || {};
        return UserStats.variants;
    },

    async incrementVariantStartStats (variantSlug) {
        if (variantSlug) {
            let stats = await UserStats.getVariantStats(variantSlug) || {};
            stats.started = stats.started || 0;
            stats.started++;
            UserStats.variants[variantSlug] = stats;

            return UserStats.setVariantStats(variantSlug, stats);
        }

        return Promise.resolve(null);
    },

    async updateVariantCompletionStats (variantSlug, puzzleCompletionData) {
        if (variantSlug) {
            let stats = await UserStats.getVariantStats(variantSlug) || {};

            stats = UserStats.updateStatsFromCompletionData(stats, puzzleCompletionData);
            UserStats.variants[variantSlug] = stats;

            return UserStats.setVariantStats(variantSlug, stats);
        }

        return Promise.resolve(null);
    },

    updateStatsFromCompletionData (stats, data) {
        stats = stats || {};

        stats.completed = stats.completed || 0;
        stats.completed++;

        // TODO: Tidy up these calculations
        if (data.rank?.current) {
            stats.ranks = stats.ranks || [];
            stats.ranks[data.rank.current] = stats.ranks[data.rank.current] || 0;
            stats.ranks[data.rank.current]++;
        }

        stats.times = stats.times || {highest: null, lowest: null, total: 0};
        stats.times.highest = stats.times.highest ? stats.times.highest : null;
        stats.times.lowest = stats.times.lowest ? stats.times.lowest : null;
        stats.times.total = stats.times.total ? stats.times.total : 0;

        stats.times.total += data.completed.seconds;
        stats.times.lowest = !stats.times.lowest || data.completed.seconds < stats.times.lowest ? data.completed.seconds : stats.times.lowest;
        stats.times.highest = !stats.times.highest || data.completed.seconds > stats.times.highest ? data.completed.seconds : stats.times.highest;

        stats.scores = stats.scores || {highest: null, lowest: null, total: 0};
        stats.scores.highest = stats.scores.highest || null;
        stats.scores.lowest = stats.scores.lowest || null;
        stats.scores.total = stats.scores.total || 0;

        data.score = data.score ? data.score : 0;
        stats.scores.total += data.score;
        stats.scores.lowest = !stats.scores.lowest || data.score < stats.scores.lowest ? data.score : stats.scores.lowest;
        stats.scores.highest = !stats.scores.highest || data.score > stats.scores.highest ? data.score : stats.scores.highest;

        stats.scores.maximums = stats.scores.maximums || 0;
        stats.scores.maximums += data.score && data.score_max ? (data.score >= data.score_max ? 1 : 0) : 0;

        return stats;
    },

    async incrementGlobalStartStats () {
        let stats = await UserStats.getGlobalStats() || {};

        stats.started = stats.started || 0;
        stats.started++;
        UserStats.global = stats;

        return UserStats.setGlobalStats(stats);
    },

    async updateGlobalCompletionStats () {
        let stats = await UserStats.getGlobalStats();


        stats = stats || {};

        stats.completed = stats.completed || 0;
        stats.completed++;

        UserStats.global = stats;

        return UserStats.setGlobalStats(stats);
    }
};

// Load from /settings/challenges document
export const UserChallenges = {
    async get() {
        return UserStorage.getSetting('challenges');
    },
    async set(data) {
        return UserStorage.setSetting('challenges', data);
    },
};

// Load from /settings/favourites document
export const UserFavourites = {
    async get() {
        return UserStorage.getSetting('favourites');
    },
    async set(data) {
        return UserStorage.setSetting('favourites', data);
    },
};
