import { scale as s, compost as c } from "../compost/compost.fs"
import { elections, gbpusd, gbpeur, iris } from "./data.js"

// Calculate bins of a histogram. The function splits the data into 10
// equally sized bins, counts the values in each bin and returns an array
// of three-element arrays with start of the bin, end of the bin and count
function bins(data) {
  let lo = Math.min(...data), hi = Math.max(...data);
  let bins = {}
  for(var i=0; i<data.length; i++) {
    let k = Math.round((data[i]-lo)/(hi-lo)*9);
    if (bins[k]==undefined) bins[k]=1; else bins[k]++;
  }
  let keys = Object.keys(bins).map(k => k*1).sort()
  return keys.map(k =>
    [ lo + (hi - lo) * (k / 10),
      lo + (hi - lo) * ((k + 1) / 10), bins[k]]);
}

// Makes a color given in "#rrggbb" format darker or lighter
// (by multiplying each component by the specified number k)
function adjust(color, k) {
  let r = parseInt(color.substr(1, 2), 16)
  let g = parseInt(color.substr(3, 2), 16)
  let b = parseInt(color.substr(5, 2), 16)
  let f = n => n*k > 255 ? 255 : n*k;
  return "#" + ((f(r) << 16) + (f(g) << 8) + (f(b) << 0)).toString(16);
}

// A derived Compost operation that adds a title to any given chart.
// This works by creating text element and using 'nest' to allocate top
// 15% of space for the title and the remaining 85% of space for the title.
function title(text, chart) {
  let title = c.scale(s.continuous(0, 100), s.continuous(0, 100),
    c.font("11pt arial", "black", c.text(50, 80, text)))
  return c.overlay([
    c.nest(0, 100, 85, 100, title),
    c.nest(0, 100, 0, 85, chart)
  ])
}

// Creates a bar of height 'y' that is witin a categorical value 'x'
// starting at the offset 'f' and ending at the offset 't'.
function partColumn(f, t, x, y) {
  return c.shape([ [ [x,f], y ], [ [x,t], y ], [ [x,t], 0 ], [ [x,f], 0 ] ])
}

// Create a line using array index as the X value and array value as the Y value
function line(data) {
  return c.line(data.map((v, i) => [i, v]));
}


// ----------------------------------------------------------------------------
// DEMO #1: United Kingdom general elections (2017 vs 2019)
// ----------------------------------------------------------------------------

let bars =
  c.axes("left bottom", c.scaleY(s.continuous(0, 410), c.overlay(
    elections.map(e =>
      c.padding(0, 10, 0, 10, c.overlay([
        c.fillColor(adjust(e.color, 0.8), partColumn(0, 0.5, e.party, e.y17)),
        c.fillColor(adjust(e.color, 1.2), partColumn(0.5, 1, e.party, e.y19))
      ]))
    )
  )))

c.render("out1", title("United Kingdom general elections (2017 vs 2019)", bars))

// ----------------------------------------------------------------------------
// DEMO #2: GBP-USD and GBP-EUR rates (June-July 2016)
// ----------------------------------------------------------------------------

function body(lo, hi, data) {
  return c.axes("left right bottom", c.overlay([
    c.fillColor("#1F77B460",  c.shape(
      [ [0,lo], [16,lo], [16,hi], [0,hi] ])),
    c.fillColor("#D6272860",  c.shape(
      [ [data.length-1,lo], [16,lo], [16,hi], [data.length-1,hi] ])),
    c.strokeColor("#202020", line(data))
  ]))
}

let rates = c.overlay([
  c.nestY(0, 50, body(1.25, 1.52, gbpusd)),
  c.nestY(50, 100, body(1.15, 1.32, gbpeur)),
])

c.render("out2", title("GBP-USD and GBP-EUR rates (June-July 2016)", rates))

// ----------------------------------------------------------------------------
// DEMO #3: Pairplot comparing features of the iris data set
// ----------------------------------------------------------------------------

let irisColors = {Setosa:"blue", Virginica:"green", Versicolor:"red" }
let cats = ["sepal_width", "petal_length", "petal_width"]

let pairplot =
  c.overlay(cats.map(x => cats.map(y =>
    c.nest([x, 0], [x, 1], [y, 0], [y, 1],
      c.axes("left bottom", c.overlay(
        x == y
        ? bins(iris.map(i => i[x])).map(b =>
            c.fillColor("#808080", c.shape(
              [ [b[0], b[2]], [b[1], b[2]], [b[1], 0], [b[0], 0] ])) )
        : iris.map(i => c.strokeColor(irisColors[i.species],
            c.bubble(i[x], i[y], 1, 1)))
      ))))).flat())

c.render("out3", title("Pairplot comparing sepal width, " +
  "petal length and petal width of irises", pairplot))

// ----------------------------------------------------------------------------
// DEMO #4: Interactive 'You Draw' chart that lets you resize bars
// ----------------------------------------------------------------------------

let partyColors = {}
for(var i = 0; i < elections.length; i++)
  partyColors[elections[i].party] = elections[i].color;

function update(state, evt) {
  switch (evt.kind) {
    case 'set':
      if (!state.enabled) return state;
      let newValues = state.values.map(kv =>
        kv[0] == evt.party ? [kv[0], evt.newValue] : kv)
      return { ...state, values: newValues }
    case 'enable':
      return { ...state, enabled: evt.enabled }
  }
}

function render(trigger, state) {
  return title("Drag the bars to guess UK election results!",
    c.axes("left bottom", c.scaleY(s.continuous(0, 400),
      c.on({
        mousedown: () => trigger({ kind:'enable', enabled:true }),
        mouseup: () => trigger({ kind:'enable', enabled:false }),
        mousemove: (x, y) => trigger({ kind:'set', party:x[0], newValue:y })
      }, c.overlay(state.values.map(kv =>
        c.fillColor(partyColors[kv[0]],
          c.padding(0, 10, 0, 10, c.column(kv[0], kv[1]))) ))
    ))))
}

let init = { enabled:false, values: elections.map(e => [e.party, e.y19]) }
c.interactive("out4", init, update, render)




function bodyy(clr, data) {
  return c.hack(c.axes("left right bottom", c.overlay([
    //c.fillColor("#1F77B460",  c.shape(
    //  [ [0,lo], [16,lo], [16,hi], [0,hi] ])),
    //c.fillColor("#D6272860",  c.shape(
    //  [ [data.length-1,lo], [16,lo], [16,hi], [data.length-1,hi] ])),
    c.strokeColor(clr, line(data)),
    c.bubble(0, 0, 0, 0)
  ])))
}

let cases = [ 4, 418, 8609, 42102, 48069, 30676, 15225, 8647 ]
let donations = [ 71, 192, 805, 484, 307, 433, 167, 65 ]
let claimants = [ 1234, 1237, 1240, 1268, 2097, 2450, 2802, 3200 ]



let ratess = c.overlay([
  c.nestX(8, 100, c.nestY(0, 50, bodyy("#D62728", cases))),
  c.nestX(8, 100, c.nestY(50, 100, bodyy("#1F77B4", donations))),
  c.nestX(8, 100, c.nestY(100, 150, bodyy("#FF7F0E", claimants))),
  c.font("bold 9pt arial", "black", c.text(5, 15, "COVID cases", "middle start", -90)),
  c.font("bold 9pt arial", "black", c.text(5, 65, "Donations (£th)", "middle start", -90)),
  c.font("bold 9pt arial", "black", c.text(5, 115, "Claimants (th)", "middle start", -90))
])

c.render("out2", ratess)

