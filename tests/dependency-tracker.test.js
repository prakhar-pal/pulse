import { test, describe } from 'node:test'
import assert from 'node:assert'
import { DependencyTracker } from '../src/core/dependency-tracker.js'

describe('DependencyTracker', () => {
  test('should create instance with initial state', () => {
    const tracker = new DependencyTracker()
    
    assert.strictEqual(tracker.getCurrentContext(), null)
    assert.strictEqual(tracker.isTracking(), false)
    assert.strictEqual(tracker.getStackDepth(), 0)
    assert.strictEqual(tracker.getBatchDepth(), 0)
    assert.strictEqual(tracker.getPendingUpdatesCount(), 0)
  })

  test('should track execution context with withTracking', () => {
    const tracker = new DependencyTracker()
    const context = { id: 'test-context' }
    let result
    
    result = tracker.withTracking(() => {
      assert.strictEqual(tracker.getCurrentContext(), context)
      assert.strictEqual(tracker.isTracking(), true)
      assert.strictEqual(tracker.getStackDepth(), 1)
      return 'test-result'
    }, context)
    
    assert.strictEqual(result, 'test-result')
    assert.strictEqual(tracker.getCurrentContext(), null)
    assert.strictEqual(tracker.isTracking(), false)
    assert.strictEqual(tracker.getStackDepth(), 0)
  })

  test('should handle nested execution contexts', () => {
    const tracker = new DependencyTracker()
    const context1 = { id: 'context-1' }
    const context2 = { id: 'context-2' }
    
    tracker.withTracking(() => {
      assert.strictEqual(tracker.getCurrentContext(), context1)
      assert.strictEqual(tracker.getStackDepth(), 1)
      
      tracker.withTracking(() => {
        assert.strictEqual(tracker.getCurrentContext(), context2)
        assert.strictEqual(tracker.getStackDepth(), 2)
      }, context2)
      
      assert.strictEqual(tracker.getCurrentContext(), context1)
      assert.strictEqual(tracker.getStackDepth(), 1)
    }, context1)
    
    assert.strictEqual(tracker.getStackDepth(), 0)
  })

  test('should register dependencies during tracking', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    const context = { id: 'test-context', update: () => {} }
    
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context)
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), true)
    
    const dependencies = tracker.getDependencies(target)
    const subscribers = dependencies.get('value')
    assert.strictEqual(subscribers.has(context), true)
  })

  test('should not track without active context', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    
    tracker.track(target, 'value')
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), false)
  })

  test('should trigger updates for subscribers', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    let updateCalled = false
    const context = { 
      id: 'test-context', 
      update: () => { updateCalled = true }
    }
    
    // Register dependency
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context)
    
    // Trigger update
    tracker.trigger(target, 'value')
    
    assert.strictEqual(updateCalled, true)
  })

  test('should handle batching updates', () => {
    const tracker = new DependencyTracker()
    const updates = []
    
    const result = tracker.batchUpdates(() => {
      assert.strictEqual(tracker.isBatching(), true)
      assert.strictEqual(tracker.getBatchDepth(), 1)
      
      tracker.queueUpdate(() => updates.push('update1'))
      tracker.queueUpdate(() => updates.push('update2'))
      
      // Updates should be queued, not executed yet
      assert.strictEqual(updates.length, 0)
      assert.strictEqual(tracker.getPendingUpdatesCount(), 2)
      
      return 'batch-result'
    })
    
    // After batch completes, updates should be executed
    assert.strictEqual(result, 'batch-result')
    assert.strictEqual(tracker.isBatching(), false)
    assert.strictEqual(tracker.getBatchDepth(), 0)
    assert.strictEqual(tracker.getPendingUpdatesCount(), 0)
    assert.deepStrictEqual(updates, ['update1', 'update2'])
  })

  test('should handle nested batching', () => {
    const tracker = new DependencyTracker()
    const updates = []
    
    tracker.batchUpdates(() => {
      assert.strictEqual(tracker.getBatchDepth(), 1)
      tracker.queueUpdate(() => updates.push('outer'))
      
      tracker.batchUpdates(() => {
        assert.strictEqual(tracker.getBatchDepth(), 2)
        tracker.queueUpdate(() => updates.push('inner'))
        
        // No updates executed yet
        assert.strictEqual(updates.length, 0)
      })
      
      // Still no updates executed (still in outer batch)
      assert.strictEqual(updates.length, 0)
      assert.strictEqual(tracker.getBatchDepth(), 1)
    })
    
    // All updates executed after outer batch completes
    assert.deepStrictEqual(updates, ['outer', 'inner'])
  })

  test('should execute updates immediately when not batching', () => {
    const tracker = new DependencyTracker()
    let updateCalled = false
    
    tracker.queueUpdate(() => { updateCalled = true })
    
    assert.strictEqual(updateCalled, true)
  })

  test('should clean up context dependencies', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    const context = { id: 'test-context', update: () => {} }
    
    // Register dependency
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context)
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), true)
    
    // Clean up context
    tracker.cleanupContext(context)
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), false)
  })

  test('should detect circular dependencies', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    const context = { 
      id: 'test-context',
      target: target,
      key: 'value',
      update: () => {}
    }
    
    // Register dependency
    tracker.withTracking(() => {
      tracker.track(target, 'value')
      
      // This should throw due to circular dependency
      assert.throws(() => {
        tracker.trigger(target, 'value')
      }, /Circular dependency detected/)
    }, context)
  })

  test('should handle errors in update functions gracefully', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    const context1 = { 
      id: 'context-1', 
      update: () => { throw new Error('Update error') }
    }
    const context2 = { 
      id: 'context-2', 
      update: () => { /* no error */ }
    }
    
    // Register both contexts
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context1)
    
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context2)
    
    // Trigger should not throw, even with error in one update
    assert.doesNotThrow(() => {
      tracker.trigger(target, 'value')
    })
  })

  test('should clear all dependencies for target', () => {
    const tracker = new DependencyTracker()
    const target = { value: 42 }
    const context = { id: 'test-context', update: () => {} }
    
    tracker.withTracking(() => {
      tracker.track(target, 'value')
    }, context)
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), true)
    
    tracker.clearDependencies(target)
    
    assert.strictEqual(tracker.hasSubscribers(target, 'value'), false)
  })
})
