import {expect, test} from 'vitest'
import {countsAsDone, percentDone, solveSeconds} from '../../app/lib/campaign/completion.js'

const completed = {completed: {seconds: 60}}

test('a solved grid puzzle counts', () => {
    expect(countsAsDone({status: completed, user: {cellsRevealed: 0}})).toBe(true)
})
test('an unfinished puzzle does not', () => {
    expect(countsAsDone({status: {completed: null}})).toBe(false)
    expect(countsAsDone({})).toBe(false)
})
test('a word game ended with almost nothing found does not count', () => {
    expect(countsAsDone({status: completed, user: {wordsFound: 0, totalWords: 48}})).toBe(false)
    expect(countsAsDone({status: completed, user: {wordsFound: 9, totalWords: 48}})).toBe(false)
})
test('a word game with a fair share found counts', () => {
    expect(countsAsDone({status: completed, user: {wordsFound: 10, totalWords: 48}})).toBe(true)
    expect(countsAsDone({status: completed, user: {score: 40, maxScore: 200}})).toBe(true)
})

test('part-played puzzles report a percentage', () => {
    expect(percentDone({status: {progress: 74.6}})).toBe(75)
    expect(percentDone({status: {}, user: {wordsFound: 12, totalWords: 48}})).toBe(25)
    expect(percentDone({status: {progress: 0}})).toBe(null)
    expect(percentDone({status: {}})).toBe(null)
})

test('the solve time comes from the completed status, in whole seconds', () => {
    expect(solveSeconds({status: {completed: {seconds: 312.4}}})).toBe(312)
    expect(solveSeconds({status: {completed: true}})).toBe(null)
    expect(solveSeconds({status: {completed: {seconds: 0}}})).toBe(null)
    expect(solveSeconds({status: {completed: {seconds: 9e9}}})).toBe(null)
})
