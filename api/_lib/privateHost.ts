import dns from 'node:dns'

function isPrivateIPv4(a: number, b: number): boolean {
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
}

function isPrivateAddress(address: string, family: number): boolean {
  if (family === 4) {
    const m = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (!m) return true // unparsable — reject defensively
    return isPrivateIPv4(Number(m[1]), Number(m[2]))
  }
  const h = address.toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true // fc00::/7 unique local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true // fe80::/10 link-local
  const mapped = h.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (mapped) return isPrivateIPv4(Number(mapped[1]), Number(mapped[2]))
  return false
}

// Resolves the hostname and checks the ACTUAL address(es), not just the hostname
// string — closes bypasses via decimal/octal/hex IP encodings (which getaddrinfo
// normalizes on resolution) and narrows the DNS-rebinding window to the gap between
// this lookup and the caller's fetch(), rather than leaving it wide open entirely.
export async function isPrivateHost(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase()
  if (h === 'localhost') return true
  try {
    const results = await dns.promises.lookup(h, { all: true, verbatim: true })
    if (results.length === 0) return true
    return results.some((r) => isPrivateAddress(r.address, r.family))
  } catch {
    return true // unresolvable — reject defensively
  }
}
