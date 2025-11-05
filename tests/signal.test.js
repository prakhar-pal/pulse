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
})
