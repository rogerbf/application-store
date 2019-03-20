const { createStore } = require(`../`)

const nameReducer = (state = `unnamed`, action = {}) =>
  action.type === `rename` ? action.payload : state

const store = createStore()

store.extendReducer({ name: nameReducer })

store.dispatch()

const rename = payload => store.dispatch({ type: `rename`, payload })
