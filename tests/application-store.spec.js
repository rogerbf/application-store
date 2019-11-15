const { createStore, reduxMiddleware } = require(process.env.NODE_ENV ===
  `development`
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

    expect(reducer.mock.calls).toEqual([])

    store.replaceReducer({ a: reducer })

    expect(reducer.mock.calls).toEqual([[undefined, undefined]])

    store.dispatch(action)

    expect(reducer.mock.calls).toEqual([
      [undefined, undefined],
      [undefined, action],
    ])
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

    const reducer = (state = `testing`, action) =>
      action === "upper" ? state.toUpperCase() : state

    const rootSubscriber = jest.fn()
    const treeSubscriber = jest.fn()

    store.replaceReducer({ testing: reducer })

    expect(store.getState()).toEqual({ testing: "testing" })

    store.subscribe(rootSubscriber)
    store.subscribe({ testing: treeSubscriber })

    expect(rootSubscriber).not.toHaveBeenCalled()
    expect(treeSubscriber).not.toHaveBeenCalled()

    store.dispatch()

    expect(rootSubscriber).toHaveBeenCalledWith(store)
    expect(treeSubscriber).not.toHaveBeenCalledWith(store) // No state change

    store.dispatch("upper")

    expect(rootSubscriber.mock.calls).toEqual([[store], [store]])
    expect(treeSubscriber.mock.calls).toEqual([["TESTING", store]])
  })

  it(`returns the current middleware`, () => {
    const store = createStore()

    expect(store.getMiddleware()).toEqual([expect.any(Function)])
  })

  it(`adds middleware`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(middleware)

    expect(store.getMiddleware()).toEqual([middleware, expect.any(Function)])
  })

  it(`adds middleware as last in chain`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(1, middleware)

    expect(store.getMiddleware()).toEqual([expect.any(Function), middleware])
  })

  it(`doesn't add the same middleware more than once`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    store.insertMiddleware(middleware)
    store.insertMiddleware(middleware)

    expect(store.getMiddleware()).toEqual([middleware, expect.any(Function)])
  })

  it(`updates state with result of reducer`, () => {
    const store = createStore()
    const reducer = (state = true) => state

    store.replaceReducer({ testing: reducer })

    store.dispatch()

    expect(store.getState()).toEqual({ testing: true })
  })

  it(`preserves last state when reducer is removed`, () => {
    const store = createStore()
    const reducer = () => {}

    const removeReducer = store.replaceReducer({ testing: reducer })
    store.dispatch()

    expect(store.getState()).toEqual({ testing: undefined })

    removeReducer()

    expect(store.getReducer()).toEqual({})
    expect(store.getState()).toEqual({ testing: undefined })
  })

  it(`discards relevant state slice after dispatch when reducer has been removed`, () => {
    const store = createStore()
    const reducerA = () => {}
    const reducerB = () => {}

    const removeA = store.extendReducer({ a: reducerA })
    store.extendReducer({ b: reducerB })
    store.dispatch()

    expect(store.getState()).toEqual({ a: undefined, b: undefined })

    removeA()
    store.dispatch()

    expect(store.getState()).toEqual({ b: undefined })
  })

  it(`removes the relevant middleware`, () => {
    const store = createStore()
    const middleware = () => () => () => {}

    const [removeMiddleware] = store.insertMiddleware(middleware)
    removeMiddleware()

    expect(store.getMiddleware()).toEqual([expect.any(Function)])
  })

  it(`rethrows error when adding erroneous middleware`, () => {
    const store = createStore()
    const middleware = undefined

    expect(() => store.insertMiddleware(middleware)).toThrow()
  })

  it(`returns a function with an operations property when adding middleware which can be used to remove specific middleware`, () => {
    const store = createStore()
    const middlewareA = () => () => () => {}
    const middlewareB = () => () => () => {}
    const insertedMiddleware = store.insertMiddleware(middlewareA, middlewareB)

    expect(insertedMiddleware).toEqual([
      expect.any(Function),
      expect.any(Function),
    ])

    insertedMiddleware[1]()

    expect(store.getMiddleware()).toEqual([middlewareA, expect.any(Function)])

    insertedMiddleware.forEach(remove => remove())

    expect(store.getMiddleware()[0].name).toEqual(`core`)
  })
})

describe(`reduxMiddleware`, () => {
  it(`is a function`, () => {
    expect(reduxMiddleware).toEqual(expect.any(Function))
  })

  it(`returns a function`, () => {
    const middleware = jest.fn()

    expect(reduxMiddleware(middleware)).toEqual(expect.any(Function))
  })

  it(`receives the store`, () => {
    const middleware = jest.fn()
    const store = {}
    reduxMiddleware(middleware)(undefined, store)

    expect(middleware).toHaveBeenCalledWith(store)
  })
})
