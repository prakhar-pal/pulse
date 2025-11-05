import { test, describe } from 'node:test'
import assert from 'node:assert'
import { Signal, signal } from '../src/core/signal.js'

describe('Signal', () => {
  test('should create signal with initial value', () => {
    const s = new Signal(42)
    assert.strictEqual(s.peek(), 42)
    assert.strictEqual(s.value, 42)
  })

  test('should update value and trigger reactivity', () => {
    const s = new Signal(0)
    let updateCount = 0
    
    // Subscribe to changes
    const unsubscribe = s.subscribe((value) => {
      updateCount++
    })
    
    // Change value
    s.value = 1
    assert.strictEqual(s.value, 1)
    assert.strictEqual(updateCount, 1)
    
    // Change to same value should not trigger update
    s.value = 1
    assert.strictEqual(updateCount, 1)
    
    // Change to different value should trigger update
    s.value = 2
    assert.strictEqual(updateCount, 2)
    
    unsubscribe()
  })

  test('should support multiple subscribers', () => {
    const s = new Signal('initial')
    const updates1 = []
    const updates2 = []
    
    const unsub1 = s.subscribe(value => updates1.push(value))
    const unsub2 = s.subscribe(value => updates2.push(value))
    
    s.value = 'changed'
    
    assert.deepStrictEqual(updates1, ['changed'])
    assert.deepStrictEqual(updates2, ['changed'])
    
    unsub1()
    unsub2()
  })

  test('should handle subscriber errors gracefully', () => {
    const s = new Signal(0)
    const updates = []
    
    // Add subscriber that throws
    s.subscribe(() => {
      throw new Error('Subscriber error')
    })
    
    // Add normal subscriber
    s.subscribe(value => updates.push(value))
    
    // Should not throw and normal subscriber should still work
    assert.doesNotThrow(() => {
      s.value = 1
    })
    
    assert.deepStrictEqual(updates, [1])
  })

  test('should unsubscribe correctly', () => {
    const s = new Signal(0)
    let updateCount = 0
    
    const unsubscribe = s.subscribe(() => updateCount++)
    
    s.value = 1
    assert.strictEqual(updateCount, 1)
    
    unsubscribe()
    
    s.value = 2
    assert.strictEqual(updateCount, 1) // Should not increment after unsubscribe
  })

  test('should support peek without creating dependencies', () => {
    const s = new Signal(42)
    
    // peek should return value without tracking
    assert.strictEqual(s.peek(), 42)
    
    s.value = 100
    assert.strictEqual(s.peek(), 100)
  })

  test('should dispose and clean up', () => {
    const s = new Signal(0)
    let updateCount = 0
    
    s.subscribe(() => updateCount++)
    assert.strictEqual(s.hasSubscribers(), true)
    assert.strictEqual(s.getSubscriberCount(), 1)
    
    s.dispose()
    
    assert.strictEqual(s.hasSubscribers(), false)
    assert.strictEqual(s.getSubscriberCount(), 0)
    
    // Should not trigger updates after disposal
    s.value = 1
    assert.strictEqual(updateCount, 0)
  })

  test('should work with factory function', () => {
    const s = signal('test')
    assert.strictEqual(s.value, 'test')
    
    s.value = 'updated'
    assert.strictEqual(s.value, 'updated')
  })

  test('should support primitive and object values', () => {
    // Primitive values
    const numSignal = signal(42)
    const strSignal = signal('hello')
    const boolSignal = signal(true)
    
    assert.strictEqual(numSignal.value, 42)
    assert.strictEqual(strSignal.value, 'hello')
    assert.strictEqual(boolSignal.value, true)
    
    // Object values
    const objSignal = signal({ count: 0 })
    const arrSignal = signal([1, 2, 3])
    
    assert.deepStrictEqual(objSignal.value, { count: 0 })
    assert.deepStrictEqual(arrSignal.value, [1, 2, 3])
    
    // Update object values
    objSignal.value = { count: 1 }
    arrSignal.value = [4, 5, 6]
    
    assert.deepStrictEqual(objSignal.value, { count: 1 })
    assert.deepStrictEqual(arrSignal.value, [4, 5, 6])
  })

  test('should unsubscribe specific callback', () => {
    const s = signal(0)
    let count1 = 0
    let count2 = 0
    
    const callback1 = () => count1++
    const callback2 = () => count2++
    
    s.subscribe(callback1)
    s.subscribe(callback2)
    
    s.value = 1
    assert.strictEqual(count1, 1)
    assert.strictEqual(count2, 1)
    
    // Unsubscribe specific callback
    const removed = s.unsubscribe(callback1)
    assert.strictEqual(removed, true)
    
    s.value = 2
    assert.strictEqual(count1, 1) // Should not increment
    assert.strictEqual(count2, 2) // Should increment
    
    // Try to unsubscribe again
    const removedAgain = s.unsubscribe(callback1)
    assert.strictEqual(removedAgain, false)
  })

  test('should clear all subscribers', () => {
    const s = signal(0)
    let count1 = 0
    let count2 = 0
    
    s.subscribe(() => count1++)
    s.subscribe(() => count2++)
    
    assert.strictEqual(s.getSubscriberCount(), 2)
    
    s.clearSubscribers()
    
    assert.strictEqual(s.getSubscriberCount(), 0)
    assert.strictEqual(s.hasSubscribers(), false)
    
    s.value = 1
    assert.strictEqual(count1, 0)
    assert.strictEqual(count2, 0)
  })

  test('should get subscribers set', () => {
    const s = signal(0)
    const callback1 = () => {}
    const callback2 = () => {}
    
    s.subscribe(callback1)
    s.subscribe(callback2)
    
    const subscribers = s.getSubscribers()
    assert.strictEqual(subscribers.size, 2)
    assert.strictEqual(subscribers.has(callback1), true)
    assert.strictEqual(subscribers.has(callback2), true)
    
    // Should be a copy, not the original
    subscribers.clear()
    assert.strictEqual(s.getSubscriberCount(), 2)
  })

  test('should subscribe to multiple signals', () => {
    const s1 = signal(1)
    const s2 = signal(2)
    const s3 = signal(3)
    const updates = []
    
    const unsubscribe = Signal.subscribeToMultiple([s1, s2, s3], (value) => {
      updates.push(value)
    })
    
    s1.value = 10
    s2.value = 20
    s3.value = 30
    
    assert.deepStrictEqual(updates, [10, 20, 30])
    
    unsubscribe()
    
    s1.value = 100
    s2.value = 200
    
    // Should not add more updates after unsubscribe
    assert.deepStrictEqual(updates, [10, 20, 30])
  })

  test('should throw error for invalid signals in subscribeToMultiple', () => {
    const s1 = signal(1)
    
    assert.throws(() => {
      Signal.subscribeToMultiple([s1, 'not-a-signal'], () => {})
    }, /All items must be Signal instances/)
  })

  test('should create derived signal', () => {
    const a = signal(2)
    const b = signal(3)
    
    const sum = Signal.derived([a, b], (aVal, bVal) => aVal + bVal)
    
    assert.strictEqual(sum.value, 5)
    
    a.value = 5
    assert.strictEqual(sum.value, 8)
    
    b.value = 7
    assert.strictEqual(sum.value, 12)
  })

  test('should handle errors in derived signal computation', () => {
    const a = signal(2)
    const b = signal(1) // Start with non-zero value
    
    const division = Signal.derived([a, b], (aVal, bVal) => {
      if (bVal === 0) throw new Error('Division by zero')
      return aVal / bVal
    })
    
    assert.strictEqual(division.value, 2) // 2/1 = 2
    
    // Should not throw when setting to zero, error should be caught
    assert.doesNotThrow(() => {
      b.value = 0
    })
    
    // Value should remain unchanged after error
    assert.strictEqual(division.value, 2)
  })

  test('should dispose derived signal properly', () => {
    const a = signal(1)
    const b = signal(2)
    
    const sum = Signal.derived([a, b], (aVal, bVal) => aVal + bVal)
    
    assert.strictEqual(sum.value, 3)
    
    sum.dispose()
    
    // After disposal, derived signal should not update
    const oldValue = sum.peek()
    a.value = 10
    assert.strictEqual(sum.peek(), oldValue)
  })

  test('should throw error for invalid dependencies in derived', () => {
    assert.throws(() => {
      Signal.derived('not-an-array', () => {})
    }, /Dependencies must be an array/)
    
    assert.throws(() => {
      Signal.derived([signal(1), 'not-a-signal'], () => {})
    }, /All dependencies must be Signal instances/)
  })

  test('should batch signal updates', () => {
    const s1 = signal(1)
    const s2 = signal(2)
    const updates = []
    
    s1.subscribe(val => updates.push(`s1: ${val}`))
    s2.subscribe(val => updates.push(`s2: ${val}`))
    
    const result = Signal.batch(() => {
      s1.value = 10
      s2.value = 20
      return 'batch-complete'
    })
    
    assert.strictEqual(result, 'batch-complete')
    assert.deepStrictEqual(updates, ['s1: 10', 's2: 20'])
  })
})
