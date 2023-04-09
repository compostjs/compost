import React, { useState } from 'react'
import * as CompostApi from "../dist/compost"
import * as Compost from "../dist/core"
import * as data from "../src/project/data"

const c = CompostApi.compost;
const s = CompostApi.scale;

// Calculate bins of a histogram. The function splits the data into 10
// equally sized bins, counts the values in each bin and returns an array
// of three-element arrays with start of the bin, end of the bin and count
function bins(data: number[]) {
  let lo = Math.min(...data), hi = Math.max(...data);
  let bins: { [key: number]: number } = {}
  for (var i = 0; i < data.length; i++) {
    let k = Math.round((data[i] - lo) / (hi - lo) * 9);
    if (bins[k] == undefined) bins[k] = 1; else bins[k]++;
  }
  let keys = Object.keys(bins).map(k => parseInt(k)).sort()
  return keys.map(k =>
    [lo + (hi - lo) * (k / 10),
    lo + (hi - lo) * ((k + 1) / 10), bins[k]]);
}

// A derived Compost operation that adds a title to any given chart.
// This works by creating text element and using 'nest' to allocate top
// 15% of space for the title and the remaining 85% of space for the title.
function title(text: string, chart: Compost.Shape) {
  let title = c.scale(s.continuous(0, 100), s.continuous(0, 100),
    c.font("11pt arial", "black", c.text(50, 80, text)))
  return c.overlay([
    c.nest(0, 100, 85, 100, title),
    c.nest(0, 100, 0, 85, chart)
  ])
}

function Demo2() {
  let gbpusd = data.gbpusd;
  let lo = 1.25, hi = 1.52
  let rates = c.axes("left right bottom", c.overlay([
      c.fillColor("#1F77B460",  c.shape(
        gbpusd.slice(0, 17).map((v, i) => [i, v] as [number, number])
          .concat([[16, lo], [0, lo]]) )),
      c.fillColor("#D6272860",  c.shape(
        gbpusd.slice(16).map((v, i) => [i+16, v] as [number, number])
          .concat([[gbpusd.length-1, lo], [16, lo]]) )),
      c.strokeColor("#202020",
        c.line(gbpusd.map((v, i) => [i, v])))
    ]))
  return c.svg(500, 200, rates);
}

function Demo3() {
  let iris = data.iris;
  let irisColors = { Setosa: "blue", Virginica: "green", Versicolor: "red" }
  let cats: ("sepal_width" | "petal_length" | "petal_width")[] = ["sepal_width", "petal_length", "petal_width"]

  let pairplot =
    c.overlay(cats.map(x => cats.map(y =>
      c.nest([x, 0], [x, 1], [y, 0], [y, 1],
        c.axes("left bottom", c.overlay(
          x == y
            ? bins(iris.map(i => i[x] as number)).map(b =>
              c.fillColor("#808080", c.shape(
                [[b[0], b[2]], [b[1], b[2]], [b[1], 0], [b[0], 0]])))
            : iris.map(i => c.strokeColor(irisColors[i.species as keyof (typeof irisColors)],
              c.bubble(i[x] as number, i[y] as number, 1, 1)))
        ))))).flat())

  return c.svg(
    500,
    500,
    c.on({
        click: (x, y) => console.log("CLICK!", x, y)
      },
      title("Pairplot comparing sepal width, petal length and petal width of irises", pairplot)
    )
  )
}

function App() {
  return (
    <div className="App">
      <Demo2 />
      <Demo3 />
    </div>
  )
}

export default App
