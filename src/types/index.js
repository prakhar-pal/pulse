// Type definitions and interfaces for the reactive library

/**
 * @typedef {Object} ReactiveContext
 * @property {DependencyTracker|null} currentTracker - Current dependency tracker
 * @property {Array} executionStack - Stack of execution contexts
 * @property {number} batchDepth - Current batching depth
 * @property {Set<Function>} pendingUpdates - Pending update functions
 */

/**
 * @typedef {Object} SubscriberTypes
 * @property {string} COMPUTED - Computed value subscriber
 * @property {string} EFFECT - Effect subscriber
 * @property {string} COMPONENT - Component subscriber
 */

/**
 * @typedef {Function} ComputeFunction
 * @returns {any} The computed value
 */

/**
 * @typedef {Function} EffectFunction
 * @returns {Function|void} Optional cleanup function
 */

/**
 * @typedef {Function} CleanupFunction
 * @returns {void}
 */

/**
 * @typedef {Object} RouteMatch
 * @property {string} path - Matched path
 * @property {Object} params - Route parameters
 * @property {Function} component - Component constructor
 */

export const SubscriberTypes = {
  COMPUTED: 'computed',
  EFFECT: 'effect',
  COMPONENT: 'component'
}
