const path = require('path')
const resolve = str => path.join(__dirname, str)
module.exports = {
  mode: "production",//production  development
  entry: resolve("./src/index.js"),
  output: {
    path: resolve('dist'),
    filename: "index.js",
    libraryTarget: "commonjs2"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader']
      }
    ]
  }
}