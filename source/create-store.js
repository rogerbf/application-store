import { create as createTree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root as enroll } from "enroll"
import { mask } from "mask-properties"
import { difference } from "simple-difference"
import { createState } from "state-maker"

export const createCore = ({ state, reducer, subscriptions }) => {
  const core = (_, store) => next => action => {
    const snapshot = state.current

    state(reducer(snapshot, action))

    subscriptions.root.broadcast(store)

    subscriptions.tree.prepare(tree =>
      mask(tree, difference(snapshot, state.current) || {})
    )(state.current, store)

    return next(action)
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

  store.dispatch = (...args) => middleware(...args)
  store.getState = () => state.current
  store.getReducer = () => reducer.current
  store.getMiddleware = () => middleware.current
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

  store.insertMiddleware = (start, ...additions) => {
    if (typeof start === `function`) {
      additions.unshift(start)
      start = 0
    }

    try {
      middleware.splice(start, 0, ...additions)

      const operations = additions.map(added => () => middleware.delete(added))

      return Object.assign(
        () => {
          operations.forEach(deleteMiddleware => deleteMiddleware())
        },
        { operations }
      )
    } catch (error) {
      if (/duplicate middleware/g.test(error.message)) {
        return
      } else {
        throw error
      }
    }
  }

  return store
}
