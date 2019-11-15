import { difference } from "simple-difference"
import { mask } from "mask-properties"

export const createCore = ({
  store,
  state,
  reducer,
  middleware,
  subscriptions,
}) => {
  const notifySubscribers = (snapshot, state) => {
    subscriptions.root.broadcast(store)

    const prunedTree = subscriptions.tree.prepare(tree =>
      mask(tree, difference(snapshot, state).diff || {})
    )

    prunedTree(state, store)
  }

  const updateState = action => {
    const snapshot = state.current

    state(reducer(snapshot, action))

    notifySubscribers(snapshot, state.current)

    return action
  }

  store.events.subscribe(event => {
    if (event.type === "replaceReducer" || event.type === "extendReducer") {
      updateState()
    }
  })

  const core = () => next => action => next(updateState(action))

  middleware.push(core)

  return store
}
