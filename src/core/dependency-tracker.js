// Dependency Tracker - Core reactivity system
// Manages reactive dependencies using execution context stack

export class DependencyTracker {
  #executionStack = []
  #dependencies = new WeakMap()
  #subscribers = new WeakMap()
  #batchDepth = 0
  #pendingUpdates = new Set()

  constructor() {
    // Initialize global tracker instance
    // WeakMap-based storage ensures automatic garbage collection
    // when reactive objects are no longer referenced
  }

  /**
   * Execute function with dependency tracking
   * Creates a new execution context for nested reactive contexts
   * @param {Function} fn - Function to execute
   * @param {Object} context - Execution context (effect, computed, etc.)
   * @returns {any} Function result
   */
  withTracking(fn, context) {
    // Push context to execution stack for nested reactive contexts
    this.#executionStack.push(context)
    try {
      return fn()
    } finally {
      // Always pop context, even if function throws
      this.#executionStack.pop()
    }
  }

  /**
   * Get current execution context from the stack
   * Supports nested reactive contexts by returning the top of the stack
   * @returns {Object|null} Current context or null if no active context
   */
  getCurrentContext() {
    return this.#executionStack.length > 0 
      ? this.#executionStack[this.#executionStack.length - 1] 
      : null
  }

  /**
   * Check if currently tracking dependencies
   * @returns {boolean} True if there's an active tracking context
   */
  isTracking() {
    return this.#executionStack.length > 0
  }

  /**
   * Batch multiple updates to prevent cascading renders
   * Implements update optimization by deferring updates until batch completes
   * @param {Function} fn - Function to execute in batch
   * @returns {any} Function result
   */
  batchUpdates(fn) {
    this.#batchDepth++
    try {
      return fn()
    } finally {
      this.#batchDepth--
      // Only flush when we exit the outermost batch
      if (this.#batchDepth === 0) {
        this.#flushUpdates()
      }
    }
  }

  /**
   * Add update to pending queue for batching optimization
   * @param {Function} updateFn - Update function to queue
   */
  queueUpdate(updateFn) {
    if (this.#batchDepth > 0) {
      // Add to pending updates during batching
      this.#pendingUpdates.add(updateFn)
    } else {
      // Execute immediately if not batching
      updateFn()
    }
  }

  /**
   * Check if currently batching updates
   * @returns {boolean} True if updates are being batched
   */
  isBatching() {
    return this.#batchDepth > 0
  }

  /**
   * Flush all pending updates from the batch queue
   * Executes updates in the order they were queued
   */
  #flushUpdates() {
    if (this.#pendingUpdates.size === 0) {
      return
    }

    const updates = Array.from(this.#pendingUpdates)
    this.#pendingUpdates.clear()
    
    // Execute all pending updates
    for (const update of updates) {
      try {
        update()
      } catch (error) {
        console.error('Error in reactive update:', error)
        // Continue with other updates even if one fails
      }
    }
  }

  /**
   * Get dependencies map for a target using WeakMap-based storage
   * @param {Object} target - Target object
   * @returns {Map} Dependencies map for the target
   */
  getDependencies(target) {
    if (!this.#dependencies.has(target)) {
      this.#dependencies.set(target, new Map())
    }
    return this.#dependencies.get(target)
  }

  /**
   * Get subscribers map for a target using WeakMap-based storage
   * @param {Object} target - Target object
   * @returns {Map} Subscribers map for the target
   */
  getSubscribers(target) {
    if (!this.#subscribers.has(target)) {
      this.#subscribers.set(target, new Map())
    }
    return this.#subscribers.get(target)
  }

  /**
   * Clear all dependencies for a target (for cleanup)
   * @param {Object} target - Target object to clear
   */
  clearDependencies(target) {
    this.#dependencies.delete(target)
    this.#subscribers.delete(target)
  }

  /**
   * Get execution stack depth (for debugging/testing)
   * @returns {number} Current stack depth
   */
  getStackDepth() {
    return this.#executionStack.length
  }

  /**
   * Get batch depth (for debugging/testing)
   * @returns {number} Current batch depth
   */
  getBatchDepth() {
    return this.#batchDepth
  }

  /**
   * Get pending updates count (for debugging/testing)
   * @returns {number} Number of pending updates
   */
  getPendingUpdatesCount() {
    return this.#pendingUpdates.size
  }

  /**
   * Track dependency during reactive reads (placeholder)
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   */
  track(target, key) {
    // Implementation will be added in task 2.2
  }

  /**
   * Trigger updates when reactive values change (placeholder)
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   */
  trigger(target, key) {
    // Implementation will be added in task 2.2
  }
}

// Global dependency tracker instance
export const globalTracker = new DependencyTracker()
