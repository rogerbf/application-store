import { create as createTree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root as enroll } from "enroll"
import { mask } from "mask-properties"
import { difference } from "simple-difference"
import { createState } from "state-maker"

export const createCore = ({ state, reducer, subscriptions }) => (
  _,
  store
) => () => action => {
  const snapshot = state.current

  state(reducer(snapshot, action))

  subscriptions.root.broadcast(store)

  const broadcast = subscriptions.tree.prepare(tree =>
    mask(tree, difference(snapshot, state.current) || {})
  )

  broadcast(state.current, store)

  return store
}

export const createStore = (initialState, _createCore = createCore) => {
  const store = {}

  const state = createState(initialState)

  const reducer = createTree()

  const subscriptions = {
    root: enroll(),
    tree: createTree(),
  }

  const middleware = dynamicMiddleware(
    store,
    _createCore({ state, reducer, subscriptions })
  )

  store.insertMiddleware = (start, ...args) => {
    if (args.length) {
      middleware.splice(
        typeof start === `number`
          ? start
          : middleware.current.findIndex(
              ({ dispatchConsumer }) => dispatchConsumer === start
            ),
        0,
        ...args
      )

      const undo = args.map(middleware => () => middleware.delete(middleware))

      return () => {
        undo.forEach(deleteMiddleware => deleteMiddleware())
      }
    } else {
      middleware.unshift(start)

      return () => middleware.delete(start)
    }
  }

  store.extendReducer = addition => reducer.attach(addition)

  store.replaceReducer = nextReducer => createTree(nextReducer)

  store.subscribe = listener => {
    if (typeof listener === `function`) {
      return subscriptions.root.subscribe(listener)
    } else {
      return subscriptions.tree.attach(listener)
    }
  }

  store.dispatch = (...args) => middleware(...args)

  store.getState = () => state.current

  store.getReducer = () => reducer.current

  store.getMiddleware = () => middleware.current

  return store
}
