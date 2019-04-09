const { createStore } = require(process.env.NODE_ENV === `development`
  ? `../source/index`
  : `../`)

describe(`createStore`, () => {
  it(`is a function`, () => {
    expect(typeof createStore).toEqual(`function`)
  })

  it(`has the expected store api`, () => {
    const store = createStore()

    expect(Object.keys(store)).toEqual(
      expect.arrayContaining([
        `getState`,
        `getReducer`,
        `getMiddleware`,
        `dispatch`,
        `replaceReducer`,
        `extendReducer`,
        `insertMiddleware`,
        `subscribe`,
      ])
    )
  })

  it(`passes the initial state`, () => {
    const store = createStore({ testing: true })

    expect(store.getState()).toEqual({ testing: true })
  })

  it(`calls custom enhancer with the expected object`, () => {
    const enhancer = jest.fn()
    createStore(undefined, enhancer)

    expect(enhancer.mock.calls[0][0]).toHaveProperty(`store`)
    expect(enhancer.mock.calls[0][0]).toHaveProperty(`state`)
    expect(enhancer.mock.calls[0][0]).toHaveProperty(`reducer`)
    expect(enhancer.mock.calls[0][0]).toHaveProperty(`middleware`)
    expect(enhancer.mock.calls[0][0]).toHaveProperty(`subscriptions`)
  })

  it(`replaces reducer`, () => {
    const store = createStore()
    const reducerA = { a: jest.fn() }

    expect(store.getReducer()).toEqual({})

    store.replaceReducer(reducerA)

    expect(store.getReducer()).toEqual({ a: reducerA.a })
  })

  it(`extends reducer`, () => {
    const store = createStore()
    const reducerA = { a: jest.fn() }
    const reducerB = { b: jest.fn() }

    store.replaceReducer(reducerA)
    store.extendReducer(reducerB)

    expect(store.getReducer()).toEqual({ a: reducerA.a, b: reducerB.b })
  })

  it(`calls reducer with previous state and action`, () => {
    const store = createStore()
    const action = { type: `test` }
    const reducer = jest.fn()

    store.replaceReducer({ a: reducer })
    store.dispatch(action)

    expect(reducer.mock.calls[0]).toEqual([ undefined, action ])
  })

  it(`doesn't add the same reducer more than once`, () => {
    const store = createStore()
    const reducer = () => {}

    store.extendReducer({ testing: reducer })
    store.extendReducer({ testing: reducer })

    expect(store.getReducer()).toEqual({ testing: reducer })
  })

  it(`notifies subscribers`, () => {
    const store = createStore()
    const reducer = (state = `testing`, action = {}) => state
    const rootSubscriber = jest.fn()
    const testingSubscriber = jest.fn()

    store.replaceReducer({ testing: reducer })
    store.subscribe(rootSubscriber)
    store.subscribe({ testing: testingSubscriber })
    store.dispatch()

    expect(rootSubscriber.mock.calls[0]).toEqual([ store ])
    expect(testingSubscriber.mock.calls[0]).toEqual([ `testing`, store ])
  })

  it(`returns the current middleware`, () => {
    const store = createStore()

    expect(store.getMiddleware()).toEqual([ expect.any(Function) ])
  })

  it(`adds middleware`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(middleware)

    expect(store.getMiddleware()).toEqual([ middleware, expect.any(Function) ])
  })

  it(`adds middleware as last in chain`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(1, middleware)

    expect(store.getMiddleware()).toEqual([ expect.any(Function), middleware ])
  })

  it(`doesn't add the same middleware more than once`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(middleware)
    store.insertMiddleware(middleware)

    expect(store.getMiddleware()).toEqual([ middleware, expect.any(Function) ])
  })
})
