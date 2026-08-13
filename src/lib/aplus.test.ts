import { describe, expect, it } from 'vitest'
import { csvToArray, csvToPartnerScores, applyAtheistData } from '../../server/aplus.mjs'

/**
 * The A+ Team research spreadsheet is fetched as raw CSV and merged onto field
 * partners to power the Secular/Social/Religion filters. It is third-party data
 * we do not control, so the parser has to survive quoting, embedded commas and
 * ragged rows without shifting a partner's scores onto the wrong columns.
 */

describe('csvToArray', () => {
  it('parses a simple grid', () => {
    expect(csvToArray('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('keeps commas that live inside quoted fields', () => {
    expect(csvToArray('1,"Smith, John",3')).toEqual([['1', 'Smith, John', '3']])
  })

  it('unescapes doubled quotes', () => {
    expect(csvToArray('1,"He said ""hi"""')).toEqual([['1', 'He said "hi"']])
  })

  it('handles CRLF as well as LF', () => {
    expect(csvToArray('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('preserves empty fields as empty strings (not dropped)', () => {
    // Dropping one would shift every later column onto the wrong field.
    expect(csvToArray('a,,c')).toEqual([['a', '', 'c']])
  })

  it('keeps a newline inside a quoted field on one row', () => {
    expect(csvToArray('1,"line1\nline2",3')).toEqual([['1', 'line1\nline2', '3']])
  })
})

describe('csvToPartnerScores', () => {
  const header = 'ignored,cols,from,the,sheet\n'

  it('maps rows onto the canonical column names, ignoring the sheet header', () => {
    const csv = header + '123,x,Acme MFI,link,Kenya,Active,1.2,3.4,5,4,Secular,notes,3,social notes'
    const [row] = csvToPartnerScores(csv)

    expect(row.id).toBe('123')
    expect(row.Name).toBe('Acme MFI')
    expect(row.secularRating).toBe('4')
    expect(row.religiousAffiliation).toBe('Secular')
    expect(row.socialRating).toBe('3')
  })

  it('does not invent fields for a short (ragged) row', () => {
    const [row] = csvToPartnerScores(header + '123,x,Acme')
    expect(row.Name).toBe('Acme')
    expect(row.secularRating).toBeUndefined()
  })

  it('returns nothing when there are no data rows', () => {
    expect(csvToPartnerScores('just,a,header')).toEqual([])
  })
})

describe('applyAtheistData', () => {
  const csv =
    'header\n' +
    '10,x,Ten MFI,link,Kenya,Active,1,2,5,4,Secular,secular notes,3,social notes,,,,review notes\n' +
    '999,x,Missing MFI,link,Peru,Active,1,2,5,1,Christian,nope,1,nope,,,,nope'

  it('attaches scores to the matching partner and counts the merges', () => {
    const partners = [{ id: 10, name: 'Ten MFI' }, { id: 20, name: 'Twenty MFI' }]
    const merged = applyAtheistData(partners, csv)

    expect(merged).toBe(1) // only partner 10 is in the sheet
    expect(partners[0].atheistScore).toMatchObject({
      secularRating: 4,
      religiousAffiliation: 'Secular',
      socialRating: 3,
    })
    expect(partners[1].atheistScore).toBeUndefined()
  })

  it('matches ids across string/number types', () => {
    const partners = [{ id: '10', name: 'Ten MFI' }]
    expect(applyAtheistData(partners, csv)).toBe(1)
  })

  it('ignores sheet rows with no matching partner', () => {
    const partners = [{ id: 10 }]
    applyAtheistData(partners, csv)
    expect(partners).toHaveLength(1) // 999 did not create anything
  })

  it('still normalizes religions when the sheet is unavailable', () => {
    // A+ is optional; a failed download must not break partner processing.
    const partners = [{ id: 10 }]
    expect(applyAtheistData(partners, null)).toBe(0)
    expect(partners[0]).toHaveProperty('normalizedReligions')
  })

  it('tolerates a missing partner list', () => {
    expect(applyAtheistData(null, csv)).toBe(0)
  })
})
