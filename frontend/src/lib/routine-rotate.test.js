import { describe, expect, it } from 'vitest'
import { rotateSlot, rotateRoutines, suggestBackups } from './routine-backups.js'
import { EXDB } from './exercises.js'

const S0 = { routines: [], workouts: [] }

describe('rotate exercises', () => {
  it('moves a slot to its next backup and puts the old exercise at the end', () => {
    const slot = { id: '0025', sets: 4, reps: 8, weight: 60, subs: ['0289', '0047'] }
    const a = rotateSlot(slot, S0, 'r')
    expect(a.id).toBe('0289')
    expect(a.subs).toEqual(['0047', '0025'])
    expect([a.sets, a.reps]).toEqual([4, 8])
    const b = rotateSlot(a, S0, 'r'), c = rotateSlot(b, S0, 'r')
    expect([b.id, c.id]).toEqual(['0047', '0025'])
    expect(c.subs).toEqual(['0289', '0047'])
  })
  it('leaves a slot without backups alone', () => {
    const slot = { id: '0025', sets: 3 }
    expect(rotateSlot(slot, S0, 'r')).toBe(slot)
  })
  it('rotates only the finished routines that have vary on', () => {
    const s = { workouts: [], routines: [
      { id: 'a', vary: true, ex: [{ id: '0025', subs: ['0289'] }] },
      { id: 'b', ex: [{ id: '0025', subs: ['0289'] }] },
      { id: 'c', vary: true, ex: [{ id: '0025', subs: ['0289'] }] }] }
    rotateRoutines(s, { routineIds: ['a', 'b'] })
    expect(s.routines.map(r => r.ex[0].id)).toEqual(['0289', '0025', '0025'])
  })
})

describe('suggestBackups', () => {
  const ex = id => EXDB.find(e => e.id === id)
  it('same muscle and movement on other equipment, one per kind', () => {
    const ids = suggestBackups(ex('0405'), EXDB)
    const names = ids.map(id => ex(id).n)
    expect(names.length).toBe(2)
    names.forEach(n => expect(n).toMatch(/seated shoulder press/))
    expect(new Set(ids.map(id => ex(id).eq)).size).toBe(2)
    expect(ids).not.toContain('0405')
  })
  it('respects what is allowed, and gives nothing for an unknown movement', () => {
    expect(suggestBackups(ex('0025'), EXDB, 2, e => e.eq === 'smith machine').every(id => ex(id).eq === 'smith machine')).toBe(true)
    expect(suggestBackups({ id: 'x', n: 'mystery move', tg: 'lats', eq: 'cable' }, EXDB)).toEqual([])
  })
})
