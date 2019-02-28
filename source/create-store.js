import { call, create as tree, includes } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { mask } from "mask-properties"
import { difference } from "simple-difference"

export const core = (_, store) => {
  let previousState = store.context.state

  return _ => action => {
    store.context.state = store.context.reducer(store.context.state, action)

    store.context.subscribers.root.forEach(listener => listener(store))

    call(
      mask(
        store.context.subscribers.tree.current,
        difference(previousState, store.context.state) || {}
      ),
      store.context.state,
      store
    )

    previousState = store.context.state

    return store.state
  }
}

export const reducer = store =>
  Object.assign(store, {
    context: Object.assign(store.context, {
      reducer: tree(),
    }),
    extendReducer: reducer => {
      if (includes(store.context.reducer.current, reducer)) {
        throw new Error(`Reducer already exists`)
      } else {
        store.context.reducer.attach(reducer)

        return () => store.context.reducer.detach(reducer)
      }
    },
  })

export const middleware = store =>
  Object.assign(store, {
    context: Object.assign(store.context, {
      middleware: dynamicMiddleware(store, core),
    }),
    insertMiddleware: (start, ...args) => {
      if (args.length) {
        store.context.middleware.splice(
          typeof start === `number`
            ? start
            : store.context.middleware.current.findIndex(
                ({ dispatchConsumer }) => dispatchConsumer === start
              ),
          0,
          ...args
        )

        const undo = args.map(middleware => () =>
          store.context.middleware.delete(middleware)
        )

        return undo.length > 1 ? undo : undo.pop()
      } else {
        store.context.middleware.unshift(start)

        return () => store.context.middleware.delete(start)
      }
    },
  })

export const subscriptions = store =>
  Object.assign(store, {
    context: Object.assign(store.context, {
      subscribers: {
        root: [],
        tree: tree(),
      },
    }),
    subscribe: listener => {
      if (typeof listener === `function`) {
        store.context.subscribers.root.push(listener)

        return () =>
          store.context.subscribers.root
            .splice(store.context.subscribers.root.findIndex(listener), 1)
            .pop()
      } else {
        store.context.subscribers.tree.attach(listener)

        return () => {
          store.context.subscribers.tree.detach(listener)

          return listener
        }
      }
    },
  })

export const api = ({ context, extendReducer, insertMiddleware, subscribe }) =>
  Object.assign(
    Object.create(
      {},
      {
        state: {
          get() {
            return context.state
          },
        },
        reducer: {
          get() {
            return context.reducer.current
          },
        },
        middleware: {
          get() {
            return context.middleware.current
          },
        },
      }
    ),
    {
      dispatch: (...args) => context.middleware(...args),
      extendReducer,
      insertMiddleware,
      subscribe,
    }
  )

export const createStore = (initialState, ...factories) => {
  if (!factories.length) {
    factories = [ reducer, subscriptions, middleware, api ]
  }

  return factories.reduce((store, factory) => factory(store), {
    context: { state: initialState },
  })
}
