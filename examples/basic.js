const { createStore } = require(`../`)

const store = createStore()

store.extendReducer({
  name: (state = `unnamed`, action = {}) =>
    action.type === `rename` ? action.payload : state,
})

store.dispatch()

const rename = payload => store.dispatch({ type: `rename`, payload })
