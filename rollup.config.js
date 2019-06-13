import babel from "rollup-plugin-babel"
import commonjs from "rollup-plugin-commonjs"
import resolve from "rollup-plugin-node-resolve"
import pkg from "./package.json"

const browsers = {
  input: `source/index.js`,
  output: {
    name: `applicationStore`,
    file: pkg.browser,
    format: `umd`,
  },
  plugins: [
    resolve(),
    commonjs(),
    babel({
      exclude: [`node_modules/**`],
    }),
  ],
}

const nodeAndBundlers = {
  input: `source/index.js`,
  external: Object.keys(pkg.dependencies || {}),
  output: [
    { file: pkg.main, format: `cjs` },
    { file: pkg.module, format: `es` },
  ],
  plugins: [
    babel({
      exclude: [`node_modules/**`],
    }),
  ],
}

export default [browsers, nodeAndBundlers]
