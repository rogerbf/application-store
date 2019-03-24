import { create as createTree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root as enroll } from "enroll"
import { mask } from "mask-properties"
import { difference } from "simple-difference"
import { createState } from "state-maker"

export const createCore = ({ state, reducer, subscriptions }) => {
  const core = (_, store) => () => action => {
    const snapshot = state.current

    state(reducer(snapshot, action))

    subscriptions.root.broadcast(store)

    subscriptions.tree.prepare(tree =>
      mask(tree, difference(snapshot, state.current) || {})
    )(state.current, store)

    return store
  }

  return core
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

  store.getState = () => state.current
  store.getReducer = () => reducer.current
  store.getMiddleware = () => middleware.current
  store.dispatch = (...args) => middleware(...args)
  store.replaceReducer = nextReducer => reducer.clear().attach(nextReducer)

  store.extendReducer = additionalReducer => {
    if (!reducer.includes(additionalReducer)) {
      return reducer.attach(additionalReducer)
    }
  }

  store.subscribe = listener =>
    typeof listener === `function`
      ? subscriptions.root.subscribe(listener)
      : subscriptions.tree.attach(listener)

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

  return store
}
