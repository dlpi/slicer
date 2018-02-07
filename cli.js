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

var options = {
  firstLayerPosition: 8.9,
  lastLayerPosition: 8.9,
  layerHeight: step,
  infillPattern:
  `<pattern id="pattern" x="0" y="0" width="5" height="2.88" patternUnits="userSpaceOnUse">
    <path fill='none' stroke='#fff' stroke-width="0.75" d='M0 0 l0.83 0 l0.83 1.44 l1.66 0 l0.83 -1.44 l0.83 0 M0 2.88 l0.83 0 l0.83 -1.44 m1.66 0 l0.83 1.44l0.83 0' />
  </pattern>`,
  wallThickness: 2,
  optimizePolygons: polygons => polygons.map(polygon => simplify(polygon, 0.1))
}

let svg = slicer.slice(facets, options)

fs.writeFile('out.svg', svg, function (err) {
  if (err) {
    return console.log(err)
  }
  console.log('saved results as out.svg')
})
