let getBoundingBox = (facets) => {
  let min = [0, 0, 0]
  let max = [0, 0, 0]
  for (let i = 0, l = facets.length; i < l; i++) {
    let verts = facets[i].verts
    min[0] = Math.min(min[0], verts[0][0], verts[1][0], verts[2][0])
    min[1] = Math.min(min[1], verts[0][1], verts[1][1], verts[2][1])
    min[2] = Math.min(min[2], verts[0][2], verts[1][2], verts[2][2])
    max[0] = Math.max(max[0], verts[0][0], verts[1][0], verts[2][0])
    max[1] = Math.max(max[1], verts[0][1], verts[1][1], verts[2][1])
    max[2] = Math.max(max[2], verts[0][2], verts[1][2], verts[2][2])
  }
  return {
    position: {x: min[0], y: min[1], z: min[2]},
    size: {x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2]}
  }
}

let hasIntersection = (facet, z) => {
  let z1 = facet.verts[0][2]
  let z2 = facet.verts[1][2]
  let z3 = facet.verts[2][2]
  return (z1 <= z || z2 <= z || z3 <= z) && (z1 > z || z2 > z || z3 > z) || (z1 < z || z2 < z || z3 < z) && (z1 >= z || z2 >= z || z3 >= z)
}
let getIntersection = (p1, p2, z) => { // two points and xyPlane at position z
  let t = (z - p1[2]) / (p2[2] - p1[2])
  let x = p1[0] + (p2[0] - p1[0]) * t
  let y = p1[1] + (p2[1] - p1[1]) * t
  return [x, y, z]
}
let getIntersections = (facets, zPos) => {
  let lines = []
  for (let i = 0, l = facets.length; i < l; i++) {
    if (!hasIntersection(facets[i], zPos)) continue
    let verts = facets[i].verts

    let a // index of last vertex above zPos (in circular 0->1->2->0->... order)
    let c = 0 // count vertices above zPos
    if (verts[0][2] > zPos) { c++; a = 0 }
    if (verts[1][2] > zPos) { c++; a = 1 }
    if (verts[2][2] > zPos) { c++; a = a === 0 ? 0 : 2 }
    if (c === 0 || c === 3) continue
    let v1 = verts[a]
    let v2 = verts[(a + 1) % 3]
    let v3 = verts[(a + 2) % 3]

    if (c === 1) { // one vertex above - two vertices below zPos
      lines.push([getIntersection(v1, v2, zPos), getIntersection(v1, v3, zPos)])
    } else { // two vertices above - one vertex below zPos
      lines.push([getIntersection(v1, v2, zPos), getIntersection(v3, v2, zPos)])
    }
  }
  return lines
}

let isSameValue = (v1, v2) => Math.abs(v1 - v2) <= 0.001 // TODO set value acording to stl file scale
let isSamePoint = (p1, p2) => isSameValue(p1[0], p2[0]) && isSameValue(p1[1], p2[1])
let polygonsFromLines = (lines) => {
  var openPolygons = []
  var closedPolygons = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]

    let leftIndex, rightIndex
    for (let j = 0; j < openPolygons.length; j++) {
      let p = openPolygons[j]
      if (p === undefined) continue
      if (isSamePoint(l[0], p[p.length - 1])) leftIndex = j
      if (isSamePoint(l[1], p[0])) rightIndex = j
    }

    let left = openPolygons[leftIndex]
    let right = openPolygons[rightIndex]
    openPolygons[leftIndex] = undefined
    openPolygons[rightIndex] = undefined

    let newPolygon
    let closed = false
    if ((left !== undefined) && left === right) {
      right = undefined
      closed = true
    }

    if (left !== undefined && right !== undefined) {
      newPolygon = [...left, ...right]
    } else if (left !== undefined) {
      newPolygon = [...left, l[1]]
    } else if (right !== undefined) {
      newPolygon = [l[0], ...right]
    } else {
      newPolygon = l
    }

    if (closed) {
      closedPolygons.push(newPolygon)
    } else {
      openPolygons.push(newPolygon)
    }
  }

  openPolygons = openPolygons.filter(polygon => polygon !== undefined)

  if (openPolygons.length) { console.log(`${openPolygons.length} of ${openPolygons.length + closedPolygons.length} polygons were not closed!`) }

  return [...closedPolygons, ...openPolygons]
}

let svgPathFromPolygons = (polygons) => {
  let path = '<path d="'
  for (let i = 0; i < polygons.length; i++) {
    let polygon = polygons[i]
    let c = 'M'
    for (let i = 0; i < polygon.length; i++) {
      let x = polygon[i][0]
      let y = polygon[i][1]
      path += c + x + ' ' + y
      c = 'L'
    }
  }
  path += '" />'
  return path
}

let slice = (facets, first, last, step, optimizePolygons = polygons => polygons) => {
  let boundingBox = getBoundingBox(facets)
  first = first === undefined ? (boundingBox.position.z) : first
  last = last === undefined ? (boundingBox.position.z + boundingBox.size.z) : last

  let svg =
  `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <svg version="1.1"
    viewBox="${boundingBox.position.x} ${boundingBox.position.y} ${boundingBox.size.x} ${boundingBox.size.y}"
    width="${boundingBox.size.x}"
    height="${boundingBox.size.y}"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:slicer="https://github.com/dlpi/slicer"
  >
  <style>
    path {
      fill: white;
      stroke: none;
    }
  </style>
  `
  for (let z = first, i = 0; z <= last; z += step, i++) {
    let path = svgPathFromPolygons(optimizePolygons(polygonsFromLines(getIntersections(facets, z))))
    svg += `<g id="layer${i}" slicer:z="${z.toFixed(2)}">${path}</g>\n`
  }
  svg += '</svg>'
  return svg
}

module.exports = {slice, svgPathFromPolygons, polygonsFromLines, getIntersections}
