import { useState, useEffect } from 'react'
import { generateDeviceFingerprint, getStoredDeviceFingerprint, storeDeviceFingerprint } from '@/lib/device-fingerprint'

interface DeviceRegistrationStatus {
  isLoading: boolean
  hasExistingAccount: boolean
  registrationDate: string | null
  error: string | null
}

export function useDeviceRegistration() {
  const [status, setStatus] = useState<DeviceRegistrationStatus>({
    isLoading: true,
    hasExistingAccount: false,
    registrationDate: null,
    error: null
  })

  const checkDeviceRegistration = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }))

      // Get or generate device fingerprint
      let fingerprint = getStoredDeviceFingerprint()
      if (!fingerprint) {
        const deviceInfo = generateDeviceFingerprint()
        fingerprint = deviceInfo.fingerprint
        storeDeviceFingerprint(fingerprint)
      }

      // Check with server
      const response = await fetch('/api/device-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check',
          deviceFingerprint: fingerprint,
          userAgent: navigator.userAgent
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check device registration')
      }

      setStatus({
        isLoading: false,
        hasExistingAccount: data.hasExistingAccount,
        registrationDate: data.registrationDate,
        error: null
      })

    } catch (error) {
      console.error('Device registration check failed:', error)
      setStatus({
        isLoading: false,
        hasExistingAccount: false,
        registrationDate: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const registerDevice = async (userId: string): Promise<boolean> => {
    try {
      const fingerprint = getStoredDeviceFingerprint()
      if (!fingerprint) {
        throw new Error('No device fingerprint available')
      }

      const response = await fetch('/api/device-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          deviceFingerprint: fingerprint,
          userAgent: navigator.userAgent,
          userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register device')
      }

      return true
    } catch (error) {
      console.error('Device registration failed:', error)
      return false
    }
  }

  useEffect(() => {
    checkDeviceRegistration()
  }, [])

  return {
    ...status,
    checkDeviceRegistration,
    registerDevice
  }
}
