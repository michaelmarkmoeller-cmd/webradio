import https from 'https'
import http from 'http'

const stations = [
  { name: '80s80s Radio',  url: 'https://streams.80s80s.de/80s80s/mp3-192/stream.mp3',          category: "80's" },
  { name: 'Radio 80s',     url: 'https://str0.creacast.com/radio80s128',                         category: "80's" },
  { name: '90s90s Radio',  url: 'https://streams.90s90s.de/90s90s/mp3-192/stream.mp3',           category: "90's" },
  { name: 'Radio Nostalgia', url: 'https://streaming.radio.co/s3f6d17f78/listen',               category: "90's" },
  { name: 'Radio Pop FM',  url: 'https://stream.popfm.pl/pop/mp3',                              category: 'Pop'  },
  { name: 'Absolute Radio', url: 'https://icecast.thisisdax.com/AbsoluteRadioMP3',              category: 'Rock' },
  { name: 'Radio Danmark', url: 'https://live-icy.gss.dr.dk/A/A05H.mp3',                       category: 'Dansk'},
  { name: 'DR P3',         url: 'https://live-icy.gss.dr.dk/A/A03H.mp3',                       category: 'Dansk'},
  { name: 'Italo Radio',   url: 'https://streaming.radio.co/s8f2a77f5a/listen',                category: 'Italo'},
]

// Known higher-bitrate alternatives to try for each station
const upgradeCandidates = {
  '80s80s Radio': [
    'https://streams.80s80s.de/80s80s/aac-64/stream.aac',
    'https://streams.80s80s.de/80s80s/mp3-128/stream.mp3',
    'https://streams.80s80s.de/80s80s/mp3-192/stream.mp3',
    'https://streams.80s80s.de/80s80s/mp3-320/stream.mp3',
  ],
  'Radio 80s': [
    'https://str0.creacast.com/radio80s128',
    'https://str0.creacast.com/radio80s192',
    'https://str0.creacast.com/radio80s320',
  ],
  '90s90s Radio': [
    'https://streams.90s90s.de/90s90s/mp3-128/stream.mp3',
    'https://streams.90s90s.de/90s90s/mp3-192/stream.mp3',
    'https://streams.90s90s.de/90s90s/mp3-320/stream.mp3',
  ],
  'Radio Danmark': [
    'https://live-icy.gss.dr.dk/A/A05H.mp3',   // 192k MP3
    'https://live-icy.gss.dr.dk/A/A05L.mp3',   // low
  ],
  'DR P3': [
    'https://live-icy.gss.dr.dk/A/A03H.mp3',   // 192k MP3
    'https://live-icy.gss.dr.dk/A/A03L.mp3',   // low
  ],
}

function checkStream(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Icy-MetaData': '1',
          'User-Agent': 'WebRadio-Checker/1.0',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const bitrate =
          res.headers['icy-br'] ||
          res.headers['x-audiocast-bitrate'] ||
          null
        const contentType = res.headers['content-type'] || ''
        req.destroy()
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          bitrate: bitrate ? parseInt(bitrate, 10) : null,
          contentType,
        })
      }
    )

    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }) })
    req.on('error', (e) => resolve({ ok: false, error: e.message }))
    req.end()
  })
}

async function findBestUrl(name, currentUrl) {
  const candidates = upgradeCandidates[name]
  if (!candidates) return { url: currentUrl, bitrate: null }

  let best = { url: currentUrl, bitrate: 0 }

  for (const candidate of candidates) {
    const result = await checkStream(candidate)
    if (result.ok) {
      const br = result.bitrate ?? 0
      console.log(`    ${br ? br + ' kbps' : '? kbps'} — ${candidate}`)
      if (br > best.bitrate) {
        best = { url: candidate, bitrate: br }
      }
    } else {
      console.log(`    FEJL (${result.error || result.statusCode}) — ${candidate}`)
    }
  }

  return best
}

console.log('='.repeat(60))
console.log('WebRadio stream-checker')
console.log('='.repeat(60))

const results = []

for (const station of stations) {
  console.log(`\n${station.name}`)
  console.log(`  Nuværende: ${station.url}`)

  const current = await checkStream(station.url)

  if (!current.ok) {
    console.log(`  STATUS: FEJLER (${current.error || current.statusCode})`)
    results.push({ ...station, status: 'dead', bestUrl: station.url, bestBitrate: null })
    continue
  }

  console.log(`  Nuværende bitrate: ${current.bitrate ? current.bitrate + ' kbps' : 'ukendt'}`)

  if (upgradeCandidates[station.name]) {
    console.log('  Checker alternativer:')
    const best = await findBestUrl(station.name, station.url)
    const upgraded = best.url !== station.url
    console.log(
      `  BEDSTE: ${best.bitrate ? best.bitrate + ' kbps' : '?'} — ${best.url}` +
        (upgraded ? ' *** OPGRADERET ***' : ' (uændret)')
    )
    results.push({ ...station, status: 'ok', bestUrl: best.url, bestBitrate: best.bitrate, upgraded })
  } else {
    results.push({ ...station, status: 'ok', bestUrl: station.url, bestBitrate: current.bitrate, upgraded: false })
  }
}

console.log('\n' + '='.repeat(60))
console.log('OPSUMMERING')
console.log('='.repeat(60))

for (const r of results) {
  const br = r.bestBitrate ? `${r.bestBitrate} kbps` : '?'
  const tag = r.status === 'dead' ? '  FEJLER' : r.upgraded ? '  OPGRADERET' : '  OK'
  console.log(`${tag.padEnd(14)} ${r.name.padEnd(20)} ${br.padEnd(10)} ${r.bestUrl}`)
}

// Output updated seed data
console.log('\n' + '='.repeat(60))
console.log('OPDATERET SEED-DATA (kopi ind i stationsService.ts)')
console.log('='.repeat(60))

const seedLines = results
  .filter((r) => r.status === 'ok')
  .map(
    (r) =>
      `  { name: '${r.name}', streamUrl: '${r.bestUrl}', category: '${r.category}' },`
  )

console.log(seedLines.join('\n'))
