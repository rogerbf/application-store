import { create as tree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root as channel } from "enroll"
import { createState } from "state-maker"
import { createCore } from "./create-core"

export const createStore = (initialState, enhancer = createCore) => {
  const store = {}
  const state = createState(initialState)
  const reducer = tree()
  const middleware = dynamicMiddleware(store)

  const subscriptions = {
    root: channel(),
    tree: tree(),
  }

  store.dispatch = (...args) => middleware(...args)

  store.getState = () => state.current
  store.getReducer = () => reducer.current
  store.getMiddleware = () => middleware.current

  store.events = channel()

  store.replaceReducer = nextReducer => {
    const removeReducer = reducer.clear().attach(nextReducer)

    store.events.broadcast({
      type: "replaceReducer",
      nextReducer,
      removeReducer,
    })

    return removeReducer
  }

  store.extendReducer = additionalReducer => {
    if (!reducer.includes(additionalReducer)) {
      const removeReducer = reducer.attach(additionalReducer)

      store.events.broadcast({
        type: "extendReducer",
        additionalReducer,
        removeReducer,
      })

      return removeReducer
    } else {
      throw new Error("Reducer already exists")
    }
  }

  store.insertMiddleware = (start, ...additionalMiddleware) => {
    if (typeof start === "function") {
      additionalMiddleware.unshift(start)
      start = 0
    }

    middleware.splice(start, ...additionalMiddleware)

    return additionalMiddleware.map(added => () => middleware.delete(added))
  }

  store.subscribe = listener =>
    typeof listener === "function"
      ? subscriptions.root.subscribe(listener)
      : subscriptions.tree.attach(listener)

  return enhancer({ store, state, reducer, middleware, subscriptions })
}
