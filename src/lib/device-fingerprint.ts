// Device fingerprinting utility for registration limits
// This creates a unique identifier for each device/browser combination

export interface DeviceInfo {
  fingerprint: string
  userAgent: string
  timestamp: number
}

export function generateDeviceFingerprint(): DeviceInfo {
  // Collect various browser/device characteristics
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Canvas fingerprinting
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
  }
  
  // Collect fingerprint components
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    navigator.maxTouchPoints?.toString() || '0',
    canvas.toDataURL(),
    // Add more fingerprinting data as needed
    window.devicePixelRatio?.toString() || '1',
    navigator.cookieEnabled.toString(),
    navigator.doNotTrack || 'unknown',
  ]
  
  // Create a hash-like fingerprint
  const fingerprintString = components.join('|')
  const fingerprint = simpleHash(fingerprintString)
  
  return {
    fingerprint,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  }
}

// Simple hash function (not cryptographically secure, but sufficient for fingerprinting)
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

// Check if device fingerprint is stored locally
export function getStoredDeviceFingerprint(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem('device_fingerprint')
  } catch (error) {
    console.warn('Could not access localStorage for device fingerprint:', error)
    return null
  }
}

// Store device fingerprint locally
export function storeDeviceFingerprint(fingerprint: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('device_fingerprint', fingerprint)
    localStorage.setItem('device_fingerprint_timestamp', Date.now().toString())
  } catch (error) {
    console.warn('Could not store device fingerprint in localStorage:', error)
  }
}

// Check if device fingerprint is recent (within 30 days)
export function isDeviceFingerprintRecent(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const timestamp = localStorage.getItem('device_fingerprint_timestamp')
    if (!timestamp) return false
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    return parseInt(timestamp) > thirtyDaysAgo
  } catch (error) {
    console.warn('Could not check device fingerprint timestamp:', error)
    return false
  }
}
