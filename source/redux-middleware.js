export const reduxMiddleware = (middleware, store = {}) => dispatch =>
  store.dispatch ? middleware(store) : middleware({ ...store, dispatch })
