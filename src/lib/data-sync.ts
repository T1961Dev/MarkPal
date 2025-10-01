// Global data synchronization utilities for dashboard

export type DataSyncEvent = 
  | 'userDataChanged'
  | 'questionsUsed'
  | 'subscriptionUpdated'
  | 'profileUpdated'
  | 'questionsReset'

class DataSyncManager {
  private listeners: Map<DataSyncEvent, Set<() => void>> = new Map()

  // Subscribe to data sync events
  subscribe(event: DataSyncEvent, callback: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  // Emit data sync events
  emit(event: DataSyncEvent): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error(`Error in data sync callback for ${event}:`, error)
        }
      })
    }
  }

  // Clear all listeners (useful for cleanup)
  clear(): void {
    this.listeners.clear()
  }
}

// Global instance
export const dataSync = new DataSyncManager()

// Helper functions for common data sync scenarios
export const syncUserData = () => {
  dataSync.emit('userDataChanged')
}

export const syncQuestionsUsed = () => {
  dataSync.emit('questionsUsed')
  // Also emit the legacy event for backward compatibility
  window.dispatchEvent(new Event('questionsUsed'))
}

export const syncSubscriptionUpdate = () => {
  dataSync.emit('subscriptionUpdated')
}

export const syncProfileUpdate = () => {
  dataSync.emit('profileUpdated')
}

export const syncQuestionsReset = () => {
  dataSync.emit('questionsReset')
}
