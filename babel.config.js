const { NODE_ENV } = process.env

module.exports = {
  presets: [
    [
      `@babel/preset-env`,
      {
        targets: {
          browsers: [ `ie >=11` ],
        },
        modules: false,
      },
    ],
  ],
  plugins: [
    (NODE_ENV === `test` || NODE_ENV === `development`) &&
      `@babel/transform-modules-commonjs`,
  ].filter(Boolean),
}
