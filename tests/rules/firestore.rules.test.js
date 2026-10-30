import {readFileSync} from 'node:fs'
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest'
import {assertFails, assertSucceeds, initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch} from 'firebase/firestore'

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
        await setDoc(doc(db, `${C}/public/bob`), {ownerUid: 'bob', name: 'Bob', avatar: null, reason: '', updatedAt: Timestamp.now()})
    })
})

const details = (extra = {}) => ({name: 'Amy', avatar: '/img/avatars/dice.svg', reason: 'For my gran', updatedAt: serverTimestamp(), ...extra})

function saveProfile(uid, handle, extra = {}) {
    const db = as(uid)
    const batch = writeBatch(db)
    if (handle) batch.set(doc(db, `${C}/public/${handle}`), {ownerUid: uid, ...details(extra)})
    batch.set(doc(db, `${C}/profiles/${uid}`), {...details(extra), handle})
    return batch.commit()
}

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
    test('anyone can read one player\'s progress for their public page, but not list players', async () => {
        await assertSucceeds(getDoc(doc(as(null), `${C}/players/bob`)))
        await assertSucceeds(getDocs(collection(as(null), `${C}/players/bob/days`)))
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

describe('profiles', () => {
    test('a player saves their profile and page address together', async () => {
        await assertSucceeds(saveProfile('amy', 'amy'))
        await assertSucceeds(saveProfile('amy', 'amy', {name: 'Amy B', avatar: null, reason: ''}))
        await assertSucceeds(getDoc(doc(as('amy'), `${C}/profiles/amy`)))
    })
    test('a profile can go without a page', async () => {
        await assertSucceeds(saveProfile('amy', null))
    })
    test('a profile cannot claim someone else\'s address', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/profiles/amy`), {...details(), handle: 'bob'}))
        await assertFails(saveProfile('amy', 'bob'))
    })
    test('nobody else can write or read it, except admins reading', async () => {
        await assertSucceeds(saveProfile('amy', 'amy'))
        await assertFails(setDoc(doc(as('bob'), `${C}/profiles/amy`), {...details(), handle: null}))
        await assertFails(getDoc(doc(as('bob'), `${C}/profiles/amy`)))
        await assertSucceeds(getDoc(doc(as('partner'), `${C}/profiles/amy`)))
    })
    test('only the expected fields, within their limits', async () => {
        await assertFails(saveProfile('amy', 'amy', {admin: true}))
        await assertFails(saveProfile('amy', 'amy', {name: 'x'.repeat(41)}))
        await assertFails(saveProfile('amy', 'amy', {reason: 'x'.repeat(281)}))
        await assertFails(saveProfile('amy', 'amy', {updatedAt: Timestamp.fromDate(new Date('2020-01-01'))}))
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
        await assertSucceeds(getDoc(doc(as(null), `${C}/public/bob`)))
    })
    test('nobody can list them except admins', async () => {
        await assertFails(getDocs(collection(as(null), `${C}/public`)))
        await assertFails(getDocs(collection(as('amy'), `${C}/public`)))
        await assertSucceeds(getDocs(collection(as('partner'), `${C}/public`)))
    })
    test('only the owner can edit or remove theirs', async () => {
        const page = (extra = {}) => ({ownerUid: 'bob', ...details({name: 'Robert'}), ...extra})
        await assertSucceeds(setDoc(doc(as('bob'), `${C}/public/bob`), page()))
        await assertFails(setDoc(doc(as('amy'), `${C}/public/bob`), page({ownerUid: 'amy'})))
        await assertFails(setDoc(doc(as('bob'), `${C}/public/bob`), page({ownerUid: 'amy'})))
        await assertFails(deleteDoc(doc(as('amy'), `${C}/public/bob`)))
        await assertSucceeds(deleteDoc(doc(as('bob'), `${C}/public/bob`)))
    })
    test('an address must be a tidy, unreserved one', async () => {
        await assertSucceeds(setDoc(doc(as('amy'), `${C}/public/amy-2`), {ownerUid: 'amy', ...details()}))
        await assertFails(setDoc(doc(as('amy'), `${C}/public/Amy`), {ownerUid: 'amy', ...details()}))
        await assertFails(setDoc(doc(as('amy'), `${C}/public/profile`), {ownerUid: 'amy', ...details()}))
        await assertFails(setDoc(doc(as('amy'), `${C}/public/welcome`), {ownerUid: 'amy', ...details()}))
    })
    test('nobody can create one in someone else\'s name', async () => {
        await assertFails(setDoc(doc(as('amy'), `${C}/public/x`), {ownerUid: 'bob', ...details()}))
    })
})
