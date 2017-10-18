module Counter

open Fable.Core
open Fable.Import
open Fable.Import.Browser

open Compost
open Compost.Interactive

let render viz = 
  let el = document.getElementById("out")
  let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
  svg |> Html.renderTo el
let series d = Array.ofList [ for x, y in d -> unbox x, unbox y ]
let rnd = System.Random()
let numv v = COV(CO v)
let catv n s  = CAR(CA s, n)




// BASIC CHARTS
(*
let ds = [| for x in 0.0 .. 0.1 .. 6.28 -> x, sin x |]
compost.charts.line(ds).show("out")

let db = series ["Good", 13.0; "Bad", 14.0; "Evil", 4.0]
compost.charts.bar(db).show("out")

// INTERACTIVE CHARTS

let db = series ["Good", 13.0; "Bad", 14.0; "Evil", 4.0]
youguess.bars(db).show("out")

let ds = series [ for x in 0 .. 10 -> x, rnd.Next(1, 10)   ]
youguess.line(ds).show("out")


let viz = 
  Shape.Layered [
    Shape.Style
      ( (fun s -> { s with Fill = Solid(1.0, HTML "red") }),
        Derived.Column(CA("Good"), CO(100.0)) )
    Shape.Style
      ( (fun s -> { s with Fill = Solid(1.0, HTML "blue") }),
        Derived.Bar(CO(20.0), CA("Bad")) )
  ]

render (Shape.Axes(false, false, true, true, viz))

let data = 
  [ ("Good", "#2ca02c", 13.0)
    ("Bad", "#ff7f0e", 14.0)
    ("Evil", "#8c564b", 4.0) ]

let viz = 
  [ for l, c, v in data ->
      Shape.Padding
        ( (0.0, 5.0, 0.0, 5.0),
          Shape.Style
            ( (fun s -> { s with Fill = Solid(1.0, HTML c) }),
              Derived.Column(CA(l), CO(v)) )) ]

render (Shape.Axes(false, false, true, true, Shape.Layered viz))
*)
let ln = 
  Shape.Line [
    for x in 0.0 .. 3.14/40.0 .. 6.28 -> numv x, numv (sin x)
  ]

let bb = 
  Shape.Layered [
    for x in 0.0 .. 3.14/4.0 .. 6.28 -> 
      Shape.Bubble(numv x, numv (sin x), 10.0, 10.0)
  ]

let mix = 
  Shape.Layered [ 
    Shape.Style((fun s -> { s with StrokeColor = 1.0, HTML "purple" }), ln)
    Shape.Style((fun s -> { s with Fill = Solid(1.0, HTML "green"); StrokeWidth = Pixels 0 }), bb) 
  ]
  
let sp = Shape.InnerScale(Some(CO -0.5, CO 6.5), Some(CO -1.2, CO 1.2), mix)
let ax = Shape.Axes(false, false, true, true, sp)

render ax