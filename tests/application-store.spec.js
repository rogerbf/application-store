const { createStore } = require(process.env.NODE_ENV === `development`
  ? `../source/index`
  : `../`)

describe(`createStore`, () => {
  test(`typeof`, () => {
    expect(typeof createStore).toEqual(`function`)
  })
})
