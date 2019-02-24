import { call, create as createTree, includes } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { mask } from "mask-properties"
import { difference } from "simple-difference"

const EXTEND_REDUCER = `${ Math.random()
  .toString(36)
  .substring(2, 10) }/EXTEND_REDUCER`

export const createStore = ({ middleware = [], reducer, state } = {}) => {
  const context = {
    state,
    reducer: createTree(reducer),
    subscribers: {
      root: [],
      tree: createTree(),
    },
  }

  const core = (_, store) => {
    let previousState = context.state

    return _ => action => {
      context.state = context.reducer(context.state, action)

      call(
        mask(
          context.subscribers.tree.current,
          difference(previousState, context.state) || {}
        ),
        context.state,
        store
      )

      context.subscribers.root.forEach(listener => listener(store))

      previousState = context.state

      return context.state
    }
  }

  const store = Object.assign(
    Object.create(null, {
      middleware: {
        get() {
          return context.middleware.current
        },
      },
      reducer: {
        get() {
          return context.reducer.current
        },
      },
      state: {
        get() {
          return context.state
        },
      },
    }),
    {
      extendReducer: reducer => {
        if (includes(context.reducer.current, reducer)) {
          throw new Error(`Tried to extend reducer with on that already exists`)
        } else {
          context.reducer.attach(reducer)

          store.dispatch(EXTEND_REDUCER)

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

  context.middleware = dynamicMiddleware(store, ...middleware.concat(core))

  store.dispatch = (...args) => context.middleware(...args)

  return store
}
