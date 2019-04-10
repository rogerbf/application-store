import { create as createCallTree } from "call-tree"
import { dynamicMiddleware } from "dispatch-next-action"
import { root as createRootSubscriptions } from "enroll"
import { createState } from "state-maker"
import { createCore } from "./create-core"

export const createStore = (initialState, enhancer = createCore) => {
  const store = {}
  const state = createState(initialState)
  const reducer = createCallTree()
  const middleware = dynamicMiddleware(store)

  const subscriptions = {
    root: createRootSubscriptions(),
    tree: createCallTree(),
  }

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

  store.insertMiddleware = (start, ...additions) => {
    if (typeof start === `function`) {
      additions.unshift(start)
      start = 0
    }

    try {
      middleware.splice(start, ...additions)

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

  store.subscribe = listener =>
    typeof listener === `function`
      ? subscriptions.root.subscribe(listener)
      : subscriptions.tree.attach(listener)

  return enhancer({ store, state, reducer, middleware, subscriptions })
}
