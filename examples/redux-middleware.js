const { createStore, reduxMiddleware } = require(`../`)

const logger = store => next => action => {
  console.group(action.type)
  console.info(`dispatching`, action)
  let result = next(action)
  console.log(`next state`, store.getState())
  console.groupEnd()
  return result
}

const numberReducer = (state = 0, action = {}) =>
  action.type === `number` ? action.payload : state

const store = createStore()

const removeLogger = store.insertMiddleware(reduxMiddleware(logger))

const removeNumberReducer = store.extendReducer({ number: numberReducer })

store.dispatch({ type: `reducer-extended` })

store.dispatch({ type: `update-number`, payload: 10 })

removeNumberReducer()

store.dispatch({ type: `update-number`, payload: 20 })

removeLogger()

store.dispatch({ type: `update-number`, payload: 30 })

console.log(store.getState())
