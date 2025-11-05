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
      try {
        updateFn()
      } catch (error) {
        console.error('Error in reactive update:', error)
        // Continue execution even if update fails
      }
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
   * Check if a target/key combination has any subscribers
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   * @returns {boolean} True if there are subscribers
   */
  hasSubscribers(target, key) {
    const dependencies = this.#dependencies.get(target)
    if (!dependencies) {
      return false
    }
    const subscribers = dependencies.get(key)
    return subscribers && subscribers.size > 0
  }

  /**
   * Track dependency during reactive reads
   * Registers the current execution context as a subscriber to the target property
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   */
  track(target, key) {
    const context = this.getCurrentContext()
    if (!context) {
      // No active tracking context
      return
    }

    // Get or create dependencies map for this target
    const dependencies = this.getDependencies(target)
    
    // Get or create subscribers set for this property
    if (!dependencies.has(key)) {
      dependencies.set(key, new Set())
    }
    const subscribers = dependencies.get(key)
    
    // Add current context as subscriber
    subscribers.add(context)
    
    // Also track in reverse direction for cleanup
    const contextDeps = this.getSubscribers(context)
    if (!contextDeps.has(target)) {
      contextDeps.set(target, new Set())
    }
    contextDeps.get(target).add(key)
  }

  /**
   * Trigger updates when reactive values change
   * Notifies all subscribers of the target property about the change
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   */
  trigger(target, key) {
    const dependencies = this.#dependencies.get(target)
    if (!dependencies) {
      // No dependencies tracked for this target
      return
    }

    const subscribers = dependencies.get(key)
    if (!subscribers || subscribers.size === 0) {
      // No subscribers for this property
      return
    }

    // Check for circular dependencies
    if (this.#detectCircularDependency(target, key)) {
      throw new Error(`Circular dependency detected for ${target.constructor.name}.${String(key)}`)
    }

    // Collect all update functions to execute
    const updates = []
    for (const subscriber of subscribers) {
      if (subscriber && typeof subscriber.update === 'function') {
        updates.push(() => subscriber.update())
      }
    }

    // Execute updates (with batching if active)
    for (const update of updates) {
      this.queueUpdate(update)
    }
  }

  /**
   * Detect circular dependencies to prevent infinite loops
   * @param {Object} target - The reactive target
   * @param {string|symbol} key - The property key
   * @returns {boolean} True if circular dependency detected
   */
  #detectCircularDependency(target, key) {
    // Simple circular dependency detection:
    // Check if any context in the execution stack is already being updated
    // by this same target/key combination
    for (const context of this.#executionStack) {
      if (context.target === target && context.key === key) {
        return true
      }
    }
    return false
  }

  /**
   * Clean up dependencies for a specific context
   * @param {Object} context - The context to clean up
   */
  cleanupContext(context) {
    const contextDeps = this.#subscribers.get(context)
    if (!contextDeps) {
      return
    }

    // Remove context from all its dependencies
    for (const [target, keys] of contextDeps) {
      const dependencies = this.#dependencies.get(target)
      if (dependencies) {
        for (const key of keys) {
          const subscribers = dependencies.get(key)
          if (subscribers) {
            subscribers.delete(context)
            // Clean up empty subscriber sets
            if (subscribers.size === 0) {
              dependencies.delete(key)
            }
          }
        }
        // Clean up empty dependency maps
        if (dependencies.size === 0) {
          this.#dependencies.delete(target)
        }
      }
    }

    // Remove the context's subscriber tracking
    this.#subscribers.delete(context)
  }
}

// Global dependency tracker instance
export const globalTracker = new DependencyTracker()
