// Stationsspecifik oprydning af ICY-titler, så alle stationer ender som "Kunstner - Titel" (det format
// resten af appen — visning, store afspiller, MediaSession og cover-opslag — forventer).

// Radio ANR sender "TITEL-KUNSTNER": store bogstaver, ingen mellemrum om bindestregen, titel først
// ("OPALITE-TAYLOR SWIFT"). Deles ved første bindestreg; en bindestreg *i* titlen eller kunstnernavnet
// (fx "A-ha") kan ikke skelnes og giver en forkert deling — så rammes opslaget bare ikke
const ANR_HOST = 'stream.anr.dk'

// Radio Nord sender "Kunstner, Titel" (komma som skilletegn): "Andreas Odbjerg, Jeg tror jeg elsker dig for evigt".
// Deles ved første komma — et komma i selve kunstnernavnet ("Earth, Wind & Fire") giver en forkert deling,
// og nummeret får så bare intet cover
const NORD_HOST = 'radionord.dk'

// "TAYLOR SWIFT" → "Taylor Swift" (kun hvis hele strengen er store bogstaver)
function titleCase(s: string): string {
  if (s !== s.toUpperCase() || s === s.toLowerCase()) return s
  return s.toLowerCase().replace(/(^|[\s("\-])([a-zæøåéèüöä])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase())
}

export function cleanIcyTitle(streamUrl: string, raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  // DR sætter "/ " foran kunstneren ("/ Freya Skye - bad taste")
  let t = raw.replace(/^\/\s*/, '').trim()
  if (!t) return null
  if (streamUrl.includes(ANR_HOST) && !t.includes(' - ')) {
    const i = t.indexOf('-')
    if (i > 0 && i < t.length - 1) {
      const song = t.slice(0, i).trim()
      const artist = t.slice(i + 1).trim()
      if (song && artist) t = `${titleCase(artist)} - ${titleCase(song)}`
    }
  }
  if (streamUrl.includes(NORD_HOST) && !t.includes(' - ')) {
    const i = t.indexOf(',')
    if (i > 0 && i < t.length - 1) {
      const artist = t.slice(0, i).trim()
      const song = t.slice(i + 1).trim()
      if (artist && song) t = `${artist} - ${song}`
    }
  }
  return t
}
