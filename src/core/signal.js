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

  /**
   * Unsubscribe a specific callback from this signal
   * @param {Function} callback - The callback to unsubscribe
   * @returns {boolean} True if callback was found and removed
   */
  unsubscribe(callback) {
    return this.#subscribers.delete(callback)
  }

  /**
   * Clear all direct subscribers (but keep dependency tracker subscriptions)
   */
  clearSubscribers() {
    this.#subscribers.clear()
  }

  /**
   * Get all current subscribers (for debugging/testing)
   * @returns {Set} Set of subscriber callbacks
   */
  getSubscribers() {
    return new Set(this.#subscribers)
  }

  /**
   * Subscribe to multiple signals and get notified when any changes
   * @param {Signal[]} signals - Array of signals to watch
   * @param {Function} callback - Function to call when any signal changes
   * @returns {Function} Unsubscribe function that removes all subscriptions
   */
  static subscribeToMultiple(signals, callback) {
    const unsubscribeFunctions = signals.map(signal => {
      if (!(signal instanceof Signal)) {
        throw new Error('All items must be Signal instances')
      }
      return signal.subscribe(callback)
    })

    // Return function that unsubscribes from all signals
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }

  /**
   * Create a derived signal that depends on multiple other signals
   * @param {Signal[]} dependencies - Array of signals this depends on
   * @param {Function} computeFn - Function that computes the derived value
   * @returns {Signal} New signal that updates when dependencies change
   */
  static derived(dependencies, computeFn) {
    if (!Array.isArray(dependencies)) {
      throw new Error('Dependencies must be an array of signals')
    }

    // Validate all dependencies are Signal instances
    for (const dep of dependencies) {
      if (!(dep instanceof Signal)) {
        throw new Error('All dependencies must be Signal instances')
      }
    }

    // Compute initial value
    let initialValue
    try {
      initialValue = computeFn(...dependencies.map(dep => dep.peek()))
    } catch (error) {
      console.error('Error in derived signal initial computation:', error)
      initialValue = undefined
    }
    
    const derivedSignal = new Signal(initialValue)

    // Subscribe to all dependencies
    const unsubscribeFunctions = dependencies.map(dep => {
      return dep.subscribe(() => {
        // Recompute value when any dependency changes
        try {
          const newValue = computeFn(...dependencies.map(d => d.peek()))
          derivedSignal.value = newValue
        } catch (error) {
          console.error('Error in derived signal computation:', error)
        }
      })
    })

    // Add cleanup method to derived signal
    const originalDispose = derivedSignal.dispose.bind(derivedSignal)
    derivedSignal.dispose = () => {
      // Unsubscribe from all dependencies
      unsubscribeFunctions.forEach(unsub => unsub())
      // Call original dispose
      originalDispose()
    }

    return derivedSignal
  }

  /**
   * Batch multiple signal updates to prevent cascading updates
   * @param {Function} updateFn - Function that performs multiple signal updates
   * @returns {any} Result of updateFn
   */
  static batch(updateFn) {
    return globalTracker.batchUpdates(updateFn)
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
