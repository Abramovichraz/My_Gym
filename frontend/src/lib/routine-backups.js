// Planned substitutes for an exercise in a routine (Discord "Substitutions for a routine"): the
// machine is taken, the bar is busy, and the plan already says what to do instead. An optional
// list of exercise ids on the routine's entry, `subs`, picked in the routine editor; a running
// workout's swap sheet shows them first ("Your backups"), and the exercise's ⋯ menu offers each in
// one tap (#649). Nothing else reads it, and a routine entry without it is exactly what it was.

import { replaceSlotExercise } from './routines.js'

export const MAX_BACKUPS = 5

/**
 * The list as it may be stored: unique string ids, never the exercise itself, only ones `known`
 * says exist, at most MAX_BACKUPS. An empty result is no list at all (the field is left out).
 */
export function cleanBackups(list, selfId, known = () => true) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const id of list) {
    if (typeof id !== 'string' || !id || id === selfId || out.includes(id) || !known(id)) continue
    out.push(id)
    if (out.length >= MAX_BACKUPS) break
  }
  return out
}

/** `{ subs }` to spread into a saved entry, or nothing when there are none. */
export const withBackups = (list, selfId, known) => {
  const subs = cleanBackups(list, selfId, known)
  return subs.length ? { subs } : {}
}

/**
 * The plan for `backupId` taking over a running slot in one tap (#649): the slot's own sets, reps,
 * rest, warm-ups and progression, carried the way the routine editor's Replace carries them
 * (replaceSlotExercise, so a bench at 80 kg does not open the dumbbells at 80). The exercise it
 * replaces goes to the front of the backups, so the machine coming free is one tap back too.
 * Only today's session sees this: the routine keeps its exercise and its list.
 */
export function backupSlotConfig(slot, backupId, S, rid, known) {
  const old = slot || {}
  const out = replaceSlotExercise(old, backupId, S, rid)
  delete out.subs
  return { ...out, ...withBackups([old.id, ...(old.subs || [])], backupId, known) }
}

/**
 * Rotate exercises (a routine's `vary` switch): each finished session moves every slot that has
 * backups on to the next one, so Push Day runs bench, then dumbbell press, then the machine, and
 * back. The slot keeps its sets, reps and rule (replaceSlotExercise, which also opens the new
 * exercise at its own last weight in this routine), and the exercise it leaves joins the end of
 * the list, so the cycle comes round in order. A slot without backups stays as it is.
 */
export function rotateSlot(slot, S, rid) {
  const subs = slot?.subs || []
  if (!subs.length) return slot
  return { ...replaceSlotExercise(slot, subs[0], S, rid), subs: [...subs.slice(1), slot.id] }
}

/** After workout `w` lands in draft state `s`: rotate the routines it came from that have `vary` on. */
export function rotateRoutines(s, w) {
  for (const rid of w?.routineIds || []) {
    const r = (s.routines || []).find(x => x.id === rid)
    if (r?.vary && Array.isArray(r.ex)) r.ex = r.ex.map(slot => rotateSlot(slot, s, rid))
  }
}

// What the names say a lift is. Order matters: the first match wins, so "split squat" before "squat".
const PATTERNS = ['bench press', 'press', 'pulldown', 'pull-up', 'chin-up', 'row', 'split squat', 'squat', 'deadlift', 'lunge', 'hip thrust', 'glute bridge', 'leg curl', 'curl', 'extension', 'raise', 'fly', 'pushdown', 'dip', 'shrug', 'crunch']
const EQ_WORD = { barbell: 'barbell', dumbbell: 'dumbbell', cable: 'cable', 'leverage machine': 'lever', 'smith machine': 'smith', 'ez barbell': 'ez', 'sled machine': 'sled' }
const EQ_WORDS = new Set(Object.values(EQ_WORD))
// The common way first: free weights, then the machines most gyms have.
const EQ_ORDER = ['dumbbell', 'barbell', 'leverage machine', 'cable', 'smith machine', 'ez barbell', 'sled machine']
const ODD = /\b(one|single|v|version|with|on|assisted|band|alternate|alternating)\b/
const words = n => (n || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z-]+/g, ' ').trim().split(' ')
const patternOf = n => { const s = ` ${words(n).join(' ')} `; return PATTERNS.find(p => s.includes(` ${p} `)) }

/**
 * Up to `n` backups for `ex` picked from `list`: the same target muscle and the same movement on
 * other gym equipment, closest name first ("dumbbell seated shoulder press" gets the lever and
 * smith seated shoulder press), one per kind of equipment.
 * ponytail: name-based guess with no popularity data; the Coach or a hand-picked list does better.
 */
export function suggestBackups(ex, list, n = 2, allowed = () => true) {
  const p = ex && patternOf(ex.n)
  if (!p) return []
  const own = words(ex.n)
  const extra = x => words(x.n).filter(w => !own.includes(w) && !EQ_WORDS.has(w)).length
  const shared = x => words(x.n).filter(w => own.includes(w) && !EQ_WORDS.has(w)).length
  const out = []
  for (const x of list
    .filter(x => x.tg === ex.tg && x.id !== ex.id && x.eq !== ex.eq && EQ_WORD[x.eq] && !ODD.test(x.n) && patternOf(x.n) === p && allowed(x))
    .sort((a, b) => extra(a) - extra(b) || shared(b) - shared(a) || EQ_ORDER.indexOf(a.eq) - EQ_ORDER.indexOf(b.eq) || a.n.length - b.n.length)) {
    if (!out.some(y => y.eq === x.eq)) out.push(x)
    if (out.length >= n) break
  }
  return out.map(x => x.id)
}
