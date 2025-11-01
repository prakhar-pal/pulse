# Design Document

## Overview

The Reactive Frontend Library is a lightweight, fine-grained reactive system that provides automatic dependency tracking without a virtual DOM. The architecture is inspired by Solid.js and Vue 3's reactivity system, focusing on direct DOM manipulation and efficient updates through a sophisticated dependency tracking mechanism.

The library consists of five core modules:
1. **Reactivity Core** - Signal, Computed, and dependency tracking
2. **Reactive Objects** - Proxy-based reactive state management  
3. **Effects System** - Side effect management with automatic cleanup
4. **Component System** - Base component class with lifecycle management
5. **Router** - Client-side routing with reactive integration

## Architecture

```mermaid
graph TB
    subgraph "Reactivity Core"
        DT[Dependency Tracker]
        S[Signal]
        C[Computed]
        DT --> S
        DT --> C
        S --> C
    end
    
    subgraph "Effects & Objects"
        E[Effect]
        RO[Reactive Object]
        DT --> E
        DT --> RO
    end
    
    subgraph "UI Layer"
        COMP[Component]
        R[Router]
        E --> COMP
        RO --> COMP
        S --> COMP
        C --> COMP
        R --> COMP
    end
    
    subgraph "DOM"
        DOM[DOM Elements]
        COMP --> DOM
    end
```

### Core Architectural Principles

1. **Fine-grained Reactivity**: Track dependencies at the individual value level
2. **Direct DOM Updates**: No virtual DOM - update DOM elements directly
3. **Automatic Dependency Tracking**: Use execution context to track dependencies
4. **Lazy Evaluation**: Computed values only recalculate when accessed and dirty
5. **Batched Updates**: Group multiple updates to prevent unnecessary re-renders

## Components and Interfaces

### 1. Dependency Tracker

The central nervous system that manages reactive dependencies using a global execution context stack.

```javascript
class DependencyTracker {
  #executionStack = []
  #dependencies = new WeakMap()
  #subscribers = new WeakMap()
  
  // Track dependency during reactive reads
  track(target, key)
  
  // Trigger updates when reactive values change
  trigger(target, key)
  
  // Execute function with dependency tracking
  withTracking(fn, context)
}
```

**Key Design Decisions:**
- Uses WeakMap for memory-efficient dependency storage
- Execution stack allows nested reactive contexts
- Batching mechanism prevents cascading updates

### 2. Signal Implementation

Reactive primitives that hold values and notify dependents of changes.

```javascript
class Signal {
  #value
  #subscribers = new Set()
  
  constructor(initialValue)
  
  // Getter that registers dependencies
  get value()
  
  // Setter that triggers updates
  set value(newValue)
  
  // Subscribe to changes (internal)
  #subscribe(subscriber)
  
  // Unsubscribe from changes (internal)
  #unsubscribe(subscriber)
}
```

**Key Design Decisions:**
- Private fields for encapsulation
- Set-based subscriber management for O(1) operations
- Automatic dependency registration in getter

### 3. Computed Values

Derived reactive values that automatically update when dependencies change.

```javascript
class Computed {
  #fn
  #value
  #dirty = true
  #dependencies = new Set()
  
  constructor(computeFn)
  
  // Lazy getter that recalculates when dirty
  get value()
  
  // Internal method to mark as dirty
  #markDirty()
  
  // Internal method to update dependencies
  #updateDependencies()
}
```

**Key Design Decisions:**
- Lazy evaluation - only computes when accessed and dirty
- Dependency caching to avoid redundant subscriptions
- Dirty flag for efficient change detection

### 4. Reactive Objects

Proxy-based reactive objects that make all properties reactive.

```javascript
class ReactiveObject {
  static create(target) {
    return new Proxy(target, {
      get(target, key, receiver) {
        // Track property access
        // Return reactive nested objects
      },
      
      set(target, key, value, receiver) {
        // Trigger updates for property changes
        // Make new nested objects reactive
      },
      
      has(target, key) {
        // Track 'in' operator usage
      },
      
      ownKeys(target) {
        // Track Object.keys() usage
      }
    })
  }
}
```

**Key Design Decisions:**
- Proxy traps for comprehensive reactivity
- Recursive reactivity for nested objects
- Special handling for arrays and built-in methods

### 5. Effects System

Manages side effects with automatic dependency tracking and cleanup.

```javascript
class Effect {
  #fn
  #cleanup
  #dependencies = new Set()
  #active = true
  
  constructor(effectFn)
  
  // Execute effect with dependency tracking
  #run()
  
  // Dispose effect and cleanup
  dispose()
  
  // Internal method to handle dependency changes
  #onDependencyChange()
}
```

**Key Design Decisions:**
- Immediate execution with dependency tracking
- Cleanup function support for resource management
- Disposal mechanism for memory management

### 6. Component System

Base component class with reactive rendering and lifecycle management.

```javascript
class Component {
  #element
  #effects = new Set()
  #mounted = false
  
  constructor(props = {})
  
  // Lifecycle methods
  onMount() {}
  onUnmount() {}
  onUpdate() {}
  
  // Reactive render method
  render()
  
  // Mount component to DOM
  mount(container)
  
  // Unmount and cleanup
  unmount()
  
  // Internal reactive render effect
  #createRenderEffect()
}
```

**Key Design Decisions:**
- Template literal support for HTML
- Automatic re-rendering through effects
- Lifecycle hooks for component management
- Effect cleanup on unmount

### 7. Router System

Simple client-side router with reactive integration.

```javascript
class Router {
  #routes = new Map()
  #currentRoute = signal(null)
  #container
  #currentComponent
  
  constructor(container)
  
  // Define routes
  route(path, component)
  
  // Navigate programmatically
  navigate(path)
  
  // Start router
  start()
  
  // Internal route matching
  #matchRoute(path)
  
  // Internal component rendering
  #renderRoute(route, params)
}
```

**Key Design Decisions:**
- Signal-based current route tracking
- Simple pattern matching for routes
- Component-based route handlers
- Browser history integration

## Data Models

### Dependency Graph Structure

```javascript
// Dependency relationships
const dependencyGraph = {
  signals: Map<Signal, Set<Subscriber>>,
  computed: Map<Computed, Set<Dependency>>,
  effects: Map<Effect, Set<Dependency>>,
  components: Map<Component, Set<Dependency>>
}

// Subscriber types
const subscriberTypes = {
  COMPUTED: 'computed',
  EFFECT: 'effect', 
  COMPONENT: 'component'
}
```

### Reactive Context

```javascript
// Execution context for dependency tracking
const reactiveContext = {
  currentTracker: null,
  executionStack: [],
  batchDepth: 0,
  pendingUpdates: Set<Function>
}
```

## Error Handling

### 1. Circular Dependency Detection

```javascript
class CircularDependencyError extends Error {
  constructor(path) {
    super(`Circular dependency detected: ${path.join(' -> ')}`)
  }
}
```

**Strategy**: Track dependency chains during computation and detect cycles.

### 2. Memory Leak Prevention

- Automatic cleanup of disposed effects
- WeakMap usage for garbage collection
- Component unmount cleanup
- Router navigation cleanup

### 3. Invalid State Handling

- Validation for signal values
- Error boundaries in components
- Graceful degradation for missing routes
- Safe property access with optional chaining

## Testing Strategy

### 1. Unit Testing

**Reactivity Core Tests:**
- Signal creation, reading, and writing
- Computed value calculation and caching
- Dependency tracking accuracy
- Effect execution and cleanup

**Component Tests:**
- Component lifecycle methods
- Reactive rendering
- Event handling
- Mount/unmount behavior

**Router Tests:**
- Route matching and navigation
- Parameter extraction
- History management
- 404 handling

### 2. Integration Testing

**End-to-End Reactivity:**
- Signal → Computed → Effect chains
- Component reactive updates
- Router navigation with reactive state
- Memory usage and cleanup

### 3. Performance Testing

**Benchmarks:**
- Signal update performance
- Computed recalculation efficiency
- DOM update batching
- Memory usage patterns

### 4. Browser Compatibility

**Modern JavaScript Features:**
- Private class fields support
- Proxy object support
- Template literal performance
- ES6+ feature compatibility

## Performance Considerations

### 1. Batching Strategy

Updates are batched using microtasks to prevent cascading renders:

```javascript
let batchDepth = 0
const pendingUpdates = new Set()

function batchUpdates(fn) {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      flushUpdates()
    }
  }
}
```

### 2. Memory Optimization

- WeakMap for automatic garbage collection
- Subscription cleanup on disposal
- Lazy computed value evaluation
- Efficient Set/Map usage for subscribers

### 3. DOM Update Optimization

- Direct DOM manipulation without virtual DOM
- Minimal DOM queries through caching
- Event delegation for component events
- Efficient text node updates

## API Design Examples

### Basic Usage

```javascript
// Create signals
const count = signal(0)
const name = signal('World')

// Create computed values
const greeting = computed(() => `Hello, ${name.value}!`)
const doubleCount = computed(() => count.value * 2)

// Create effects
effect(() => {
  console.log(`Count is: ${count.value}`)
})

// Create reactive objects
const state = reactive({
  user: { name: 'John', age: 30 },
  items: [1, 2, 3]
})

// Create components
class Counter extends Component {
  constructor() {
    super()
    this.count = signal(0)
  }
  
  render() {
    return `
      <div>
        <p>Count: ${this.count.value}</p>
        <button onclick="${() => this.count.value++}">
          Increment
        </button>
      </div>
    `
  }
}

// Setup router
const router = new Router(document.getElementById('app'))
router.route('/', HomePage)
router.route('/about', AboutPage)
router.start()
```

This design provides a solid foundation for implementing the reactive frontend library with all the required features while maintaining performance and developer experience.
