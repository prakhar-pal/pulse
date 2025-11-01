# Reactive Frontend Library

A lightweight, fine-grained reactive frontend library inspired by Solid.js and Vue 3. Built with modern JavaScript features for high performance without a virtual DOM.

## Features

- **Signals** - Fine-grained reactive primitives with automatic dependency tracking
- **Computed Values** - Derived state that updates when dependencies change
- **Reactive Objects** - Proxy-based reactive state management
- **Effects** - Automatic dependency tracking for side effects
- **Component System** - Base class for building UI components
- **Router** - Simple client-side routing

## Modern JavaScript Features

- Private class fields (#)
- Proxy for reactive objects
- Template literals for HTML templating
- Class syntax with getters/setters
- Set and Map data structures
- Optional chaining (?.) and nullish coalescing (??)

## Quick Start

```javascript
import { signal, computed, effect, reactive, Component, Router } from './src/index.js'

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
        <button onclick="this.count.value++">Increment</button>
      </div>
    `
  }
}
```

## Installation

This library uses ES modules and requires Node.js 18+ or a modern browser with ES2022 support.

## Development

```bash
npm test    # Run tests
npm run dev # Start development server
```

## License

MIT
