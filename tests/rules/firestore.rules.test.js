//  Firestore security rules. Needs the emulator: `npm run test:rules` starts it.
import {readFileSync} from 'node:fs'
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest'
import {assertFails, assertSucceeds, initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp, updateDoc} from 'firebase/firestore'

const C = 'campaigns/charity-run'
let env

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-campaigns',
        firestore: {rules: readFileSync('firestore.rules', 'utf8')},
    })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore()
        await setDoc(doc(db, `${C}/admins/partner`), {})
        await setDoc(doc(db, `${C}/players/bob`), {track: 'logic', startedAt: Timestamp.now()})
        await setDoc(doc(db, `${C}/players/bob/days/1`), {slug: 'sudoku-1', completedAt: Timestamp.now()})
        await setDoc(doc(db, `${C}/public/share-bob`), {ownerUid: 'bob', name: 'Bob'})
    })
})

const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore()

describe('players', () => {
    test('a player can start their own challenge with the server time', async () => {
        await assertSucceeds(setDoc(doc(as('amy'), `${C}/players/amy`), {track: 'words', startedAt: serverTimestamp()}))
    })
    test('a player cannot choose their own start date', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/players/amy`), {track: 'words', startedAt: Timestamp.fromDate(new Date('2020-01-01'))}))
    })
    test('a start date cannot be changed afterwards', async () => {
        await assertFails(updateDoc(doc(as('bob'), `${C}/players/bob`), {startedAt: serverTimestamp()}))
    })
    test('nobody can start a challenge for someone else', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/players/bob2`), {track: 'words', startedAt: serverTimestamp()}))
        await assertFails(setDoc(doc(as(null), `${C}/players/amy`), {track: 'words', startedAt: serverTimestamp()}))
    })
    test('players read only their own record', async () => {
        await assertSucceeds(getDoc(doc(as('bob'), `${C}/players/bob`)))
        await assertFails(getDoc(doc(as('amy'), `${C}/players/bob`)))
        await assertFails(getDocs(collection(as('bob'), `${C}/players`)))
    })
})

describe('days', () => {
    test('a day is saved once, stamped with the server time', async () => {
        await assertSucceeds(setDoc(doc(as('bob'), `${C}/players/bob/days/2`), {slug: 'sudoku-2', completedAt: serverTimestamp()}))
    })
    test('a completion time cannot be backdated', async () => {
        await assertFails(setDoc(doc(as('bob'), `${C}/players/bob/days/2`), {slug: 'sudoku-2', completedAt: Timestamp.fromDate(new Date('2020-01-01'))}))
    })
    test('a saved day cannot be changed or deleted', async () => {
        await assertFails(setDoc(doc(as('bob'), `${C}/players/bob/days/1`), {slug: 'sudoku-1', completedAt: serverTimestamp()}))
        await assertFails(deleteDoc(doc(as('bob'), `${C}/players/bob/days/1`)))
    })
    test('day ids must be day numbers', async () => {
        await assertFails(setDoc(doc(as('bob'), `${C}/players/bob/days/0`), {slug: 'x', completedAt: serverTimestamp()}))
        await assertFails(setDoc(doc(as('bob'), `${C}/players/bob/days/abc`), {slug: 'x', completedAt: serverTimestamp()}))
    })
    test('nobody else can add days to a player', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/players/bob/days/2`), {slug: 'x', completedAt: serverTimestamp()}))
    })
})

describe('partner admins', () => {
    test('see their campaign\'s players and days', async () => {
        await assertSucceeds(getDocs(collection(as('partner'), `${C}/players`)))
        await assertSucceeds(getDocs(collection(as('partner'), `${C}/players/bob/days`)))
    })
    test('cannot see another campaign', async () => {
        await assertFails(getDocs(collection(as('partner'), 'campaigns/advent-2026/players')))
    })
    test('nobody can make themselves an admin', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/admins/amy`), {}))
    })
    test('cannot change player data', async () => {
        await assertFails(setDoc(doc(as('partner'), `${C}/players/bob/days/2`), {slug: 'x', completedAt: serverTimestamp()}))
    })
})

describe('public pages', () => {
    test('anyone can read one, signed in or not', async () => {
        await assertSucceeds(getDoc(doc(as(null), `${C}/public/share-bob`)))
    })
    test('nobody can list them except admins', async () => {
        await assertFails(getDocs(collection(as(null), `${C}/public`)))
        await assertFails(getDocs(collection(as('amy'), `${C}/public`)))
        await assertSucceeds(getDocs(collection(as('partner'), `${C}/public`)))
    })
    test('only the owner can edit or remove theirs', async () => {
        await assertSucceeds(updateDoc(doc(as('bob'), `${C}/public/share-bob`), {name: 'Robert'}))
        await assertFails(updateDoc(doc(as('amy'), `${C}/public/share-bob`), {name: 'Hacked'}))
        await assertFails(updateDoc(doc(as('bob'), `${C}/public/share-bob`), {ownerUid: 'amy'}))
        await assertFails(deleteDoc(doc(as('amy'), `${C}/public/share-bob`)))
        await assertSucceeds(deleteDoc(doc(as('bob'), `${C}/public/share-bob`)))
    })
    test('nobody can create one in someone else\'s name', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/public/share-x`), {ownerUid: 'bob'}))
    })
})

describe('users', () => {
    test('a player\'s own settings are private to them', async () => {
        await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/settings/microsite'), {a: 1}))
        await assertFails(getDoc(doc(as('amy'), 'users/bob/settings/microsite')))
    })
})
