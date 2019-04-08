import { difference } from "simple-difference"
import { mask } from "mask-properties"

export const createCore = ({
  store,
  state,
  reducer,
  middleware,
  subscriptions,
}) => {
  const core = (_, store) => next => action => {
    const snapshot = state.current

    state(reducer(snapshot, action))

    subscriptions.root.broadcast(store)

    subscriptions.tree.prepare(tree =>
      mask(tree, difference(snapshot, state.current) || {})
    )(state.current, store)

    return next(action)
  }

  middleware.push(core)

  return store
}
