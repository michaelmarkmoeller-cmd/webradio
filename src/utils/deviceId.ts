let _sessionFallbackId: string | undefined

export function getDeviceId(): string {
  try {
    const key = 'webradio_device_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return (_sessionFallbackId ??= crypto.randomUUID())
  }
}
