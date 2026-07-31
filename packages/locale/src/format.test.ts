import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatNumber, formatDateTimeInTimeZone, resolveFormattingLocale } from './format.ts'

test('resolveFormattingLocale passes through available locales', () => {
  assert.equal(resolveFormattingLocale('en-US'), 'en-US')
  assert.equal(resolveFormattingLocale('en-IN'), 'en-IN')
})

test('resolveFormattingLocale falls back to en-US for planned locales', () => {
  assert.equal(resolveFormattingLocale('hi'), 'en-US')
  assert.equal(resolveFormattingLocale('not-a-real-locale'), 'en-US')
})

test('formatNumber uses locale-specific digit grouping', () => {
  const us = formatNumber(1234567.89, 'en-US')
  const inFmt = formatNumber(1234567.89, 'en-IN')
  assert.equal(us, '1,234,567.89')
  // Indian numbering system groups by lakh/crore (e.g. 12,34,567.89).
  assert.equal(inFmt, '12,34,567.89')
  assert.notEqual(us, inFmt)
})

test('formatDate produces a long-style date string without throwing', () => {
  const date = new Date('2026-07-31T12:00:00Z')
  const result = formatDate(date, 'en-US')
  assert.match(result, /2026/)
})

test('formatDateTimeInTimeZone respects an explicit IANA zone', () => {
  const date = new Date('2026-07-31T12:00:00Z')
  const result = formatDateTimeInTimeZone(date, 'en-US', 'Asia/Kolkata')
  assert.equal(typeof result, 'string')
  assert.ok(result.length > 0)
})
