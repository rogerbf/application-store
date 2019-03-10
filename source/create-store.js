import { includes, create as callTree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root, tree } from "enroll"
import { mask } from "mask-properties"
import { difference } from "simple-difference"

export const core = (_, store) => _ => (action, snapshot) => {
  store.context.state = store.context.reducer(snapshot.state, action)

  store.context.subscriptions.root.broadcast(store)

  const broadcast = store.context.subscriptions.tree.prepare(tree =>
    mask(tree, difference(snapshot.state, store.context.state) || {})
  )

  broadcast(store.context.state)

  return store.state
}

export const reducer = store =>
  Object.assign(store, {
    context: Object.assign(store.context, {
      reducer: callTree(),
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

export const subscriptions = store =>
  Object.assign(store, {
    context: Object.assign(store.context, {
      subscriptions: {
        root: root(),
        tree: tree(),
      },
    }),
    subscribe: listener => {
      if (typeof listener === `function`) {
        return store.context.subscriptions.root.subscribe(listener)
      } else {
        return store.context.subscriptions.tree.subscribe(listener)
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

export const store = ({
  context,
  extendReducer,
  insertMiddleware,
  subscribe,
}) =>
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
      dispatch: action => context.middleware(action, { state: context.state }),
      extendReducer,
      insertMiddleware,
      subscribe,
    }
  )

export const createStore = (initialState, ...factories) => {
  if (!factories.length) {
    factories = [ reducer, subscriptions, middleware, store ]
  }

  return factories.reduce((store, factory) => factory(store), {
    context: { state: initialState },
  })
}
