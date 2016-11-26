#!/usr/bin/env node
'use strict'
const meow = require('meow')
const stl = require('stl')
const simplify = require('simplify-path')

const fs = require('fs')

const slicer = require('./')

const cli = meow(`
    Usage
      $ cli.js <stl file>

    Options
      -f Position of first slice. (default: lowest vertex of stl)
      -l Position of last slice. (default: highest vertex of stl)
      -s Distance between two slices

    Examples
      $ cli.js -s 0.1 example.stl
`, {
  alias: {
    f: 'first',
    l: 'last',
    s: 'step'
  }
})

let stlFilename = cli.input[0]
if (stlFilename === undefined) {
  cli.showHelp()
}
let stlFile
try {
  stlFile = fs.readFileSync(stlFilename)
} catch (err) {
  console.log(`Could not open "${stlFilename}"`)
  process.exit(1)
}
let facets
try {
  facets = stl.toObject(stlFile).facets
} catch (err) {
  console.log(`Error parsing "${stlFilename}" - maybe not a valid stl file?`)
  process.exit(1)
}

let first, last, step
if (cli.flags.step === undefined || isNaN(cli.flags.step) || cli.flags.step <= 0) {
  console.log(`Invalid value "${cli.flags.step}" for argument "steps"`)
  process.exit(1)
}
step = cli.flags.step
if (cli.flags.first && isNaN(cli.flags.first)) {
  console.log(`Invalid value "${cli.flags.step}" for argument "first"`)
  process.exit(1)
}
if (cli.flags.last && isNaN(cli.flags.last)) {
  console.log(`Invalid value "${cli.flags.step}" for argument "last"`)
  process.exit(1)
}

let svg = slicer.slice(facets, first, last, step, polygons => polygons.map(polygon => simplify(polygon, 0.1)))

fs.writeFile('out.svg', svg, function (err) {
  if (err) {
    return console.log(err)
  }
  console.log('saved results as out.svg')
})
