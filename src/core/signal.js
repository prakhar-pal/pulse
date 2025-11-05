import { globalTracker } from './dependency-tracker.js'

/**
 * Signal - A reactive primitive that holds a single value
 * Provides fine-grained reactivity with automatic dependency tracking
 */
export class Signal {
  #value
  #subscribers = new Set()

  /**
   * Create a new Signal with initial value
   * @param {any} initialValue - The initial value for the signal
   */
  constructor(initialValue) {
    this.#value = initialValue
  }

  /**
   * Get the current value and register dependency if tracking
   * @returns {any} The current signal value
   */
  get value() {
    // Register dependency with the global tracker
    globalTracker.track(this, 'value')
    return this.#value
  }

  /**
   * Set a new value and trigger updates to subscribers
   * @param {any} newValue - The new value to set
   */
  set value(newValue) {
    // Only update if value actually changed
    if (this.#value !== newValue) {
      this.#value = newValue
      
      // Notify direct subscribers first
      this.update()
      
      // Then trigger updates through dependency tracker
      globalTracker.trigger(this, 'value')
    }
  }

  /**
   * Get the current value without registering dependency
   * Useful for internal operations that shouldn't create dependencies
   * @returns {any} The current signal value
   */
  peek() {
    return this.#value
  }

  /**
   * Subscribe to changes in this signal
   * @param {Function} callback - Function to call when signal changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.#subscribers.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.#subscribers.delete(callback)
    }
  }

  /**
   * Update method called by dependency tracker
   * Notifies all direct subscribers
   */
  update() {
    for (const callback of this.#subscribers) {
      try {
        callback(this.#value)
      } catch (error) {
        console.error('Error in signal subscriber:', error)
      }
    }
  }

  /**
   * Dispose of the signal and clean up all subscriptions
   */
  dispose() {
    this.#subscribers.clear()
    globalTracker.clearDependencies(this)
  }

  /**
   * Get the number of subscribers (for debugging/testing)
   * @returns {number} Number of subscribers
   */
  getSubscriberCount() {
    return this.#subscribers.size
  }

  /**
   * Check if the signal has any subscribers
   * @returns {boolean} True if there are subscribers
   */
  hasSubscribers() {
    return this.#subscribers.size > 0
  }
}

/**
 * Factory function to create a new Signal
 * @param {any} initialValue - The initial value for the signal
 * @returns {Signal} A new Signal instance
 */
export function signal(initialValue) {
  return new Signal(initialValue)
}
