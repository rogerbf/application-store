import { call, create as createTree, includes } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { mask } from "mask-properties"
import { difference } from "simple-difference"

export const createContext = options => {
  const { state, reducer, middleware } = Object.assign(
    { middleware: [], reducer: {}, state: undefined },
    options
  )

  return {
    state,
    reducer: createTree(reducer),
    middleware,
    subscribers: {
      root: [],
      tree: createTree(),
    },
  }
}

export const prepareStore = context => {
  const store = Object.assign(
    Object.create(
      {},
      {
        middleware: {
          get() {
            return context.middleware.current
          },
          set() {
            throw new Error(`Use insertMiddleware`)
          },
        },
        reducer: {
          get() {
            return context.reducer.current
          },
          set() {
            throw new Error(`Use extendReducer`)
          },
        },
        state: {
          get() {
            return context.state
          },
          set() {
            throw new Error(`State can only changed by dispatching an action`)
          },
        },
      }
    ),
    {
      extendReducer: reducer => {
        if (includes(context.reducer.current, reducer)) {
          throw new Error(`Reducer already exists`)
        } else {
          context.reducer.attach(reducer)

          return () => context.reducer.detach(reducer)
        }
      },
      insertMiddleware: (start, ...args) => {
        if (args.length) {
          context.middleware.splice(
            typeof start === `number`
              ? start
              : context.middleware.current.findIndex(
                  ({ dispatchConsumer }) => dispatchConsumer === start
                ),
            0,
            ...args
          )

          const undo = args.map(x => () => context.middleware.delete(x))

          return undo.length > 1 ? undo : undo.pop()
        } else {
          context.middleware.unshift(start)

          return () => context.middleware.delete(start)
        }
      },
      subscribe: listener => {
        if (typeof listener === `function`) {
          context.subscribers.root.push(listener)

          return () =>
            context.subscribers.root
              .splice(context.subscribers.root.findIndex(listener), 1)
              .pop()
        } else {
          context.subscribers.tree.attach(listener)

          return () => {
            context.subscribers.tree.detach(listener)

            return listener
          }
        }
      },
    }
  )

  return store
}

export const createStore = (
  options = {},
  context = createContext,
  store = prepareStore
) => {
  context = createContext(options)
  store = prepareStore(context)

  context.middleware = dynamicMiddleware(
    store,
    ...context.middleware.concat((_, store) => {
      let previousState = context.state

      return _ => action => {
        context.state = context.reducer(context.state, action)

        context.subscribers.root.forEach(listener => listener(store))

        call(
          mask(
            context.subscribers.tree.current,
            difference(previousState, context.state) || {}
          ),
          context.state,
          store
        )

        previousState = context.state

        return store
      }
    })
  )

  store.dispatch = (...args) => context.middleware(...args)

  return store
}
