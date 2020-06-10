module main

open Compost
open Compost.Html
open Browser

module Helpers = 
  let parseValue v = 
    if Common.isNumber(v) then COV(CO(unbox<float> v))
    elif Common.isArray(v) then 
      let a = unbox<obj[]> v
      if a.Length <> 2 then failwithf "Cannot parse value: %A. Expected a number or an array with two elements." a
      if not (Common.isNumber(a.[1])) then failwithf "Cannot parse value: %A. The second element should be a number." a
      CAR(CA (unbox<string> a.[0]), unbox<float> a.[1])
    else failwithf "Cannot parse value: %A. Expected a number or an array with two elements." v

open Helpers

type Scale = Scale<1>
type Shape = Shape<1, 1>

type JsScale = 
  abstract continuous : float * float -> Scale

type JsCompost =
  abstract nestX : obj * obj * Shape -> Shape
  abstract nestY : obj * obj * Shape -> Shape
  abstract nest : obj * obj * obj * obj * Shape -> Shape
  abstract scaleX : Scale * Shape -> Shape
  abstract scaleY : Scale * Shape -> Shape
  abstract scale : Scale * Scale * Shape -> Shape
  abstract overlay : Shape[] -> Shape
  abstract fillColor : string * Shape -> Shape
  abstract strokeColor : string * Shape -> Shape
  abstract font : string * string * Shape -> Shape
  abstract padding : float * float * float * float * Shape -> Shape
  abstract text : obj * obj * string * string * float -> Shape
  abstract shape : obj[][] -> Shape
  abstract line : obj[][] -> Shape
  abstract axes : string * Shape -> Shape
  abstract render : string * Shape -> unit

let scale = 
  { new JsScale with 
      member x.continuous(lo, hi) = Continuous(CO lo, CO hi) }
  
let compost = 
  { new JsCompost with
      member x.scaleX(sc, sh) = Shape.InnerScale(Some(sc), None, sh) 
      member x.scaleY(sc, sh) = Shape.InnerScale(None, Some(sc), sh) 
      member x.scale(sx, sy, sh) = Shape.InnerScale(Some(sx), Some(sy), sh) 
      member x.nestX(lx, hx, s) = Shape.NestX(parseValue lx, parseValue hx, s)
      member x.nestY(ly, hy, s) = Shape.NestY(parseValue ly, parseValue hy, s)
      member x.nest(lx, hx, ly, hy, s) = Shape.NestY(parseValue ly, parseValue hy, Shape.NestX(parseValue lx, parseValue hx, s))
      member x.overlay(sh) = Shape.Layered(List.ofArray sh) 
      member x.padding(t, r, b, l, s) = Shape.Padding((t, r, b, l), s)
      member x.fillColor(c, s) = Derived.FillColor(c, s) 
      member x.strokeColor(c, s) = Derived.StrokeColor(c, s) 
      member x.font(f, c, s) = Derived.Font(f, c, s) 
      member x.text(xp, yp, t, s, r) = 
        let r = if box r = null then 0.0 else r
        let s = if box s = null then "" else s
        let va = if s.Contains("baseline") then Baseline elif s.Contains("hanging") then Hanging else Middle
        let ha = if s.Contains("start") then Start elif s.Contains("end") then End else Center
        Shape.Text(parseValue xp, parseValue yp, va, ha, r, t)
      member x.shape(a) = Shape.Shape [ for p in a -> parseValue p.[0], parseValue p.[1] ] 
      member x.line(a) = Shape.Line [ for p in a -> parseValue p.[0], parseValue p.[1] ] 
      member x.axes(a, s) = Shape.Axes(a.Contains("top"), a.Contains("right"), a.Contains("bottom"), a.Contains("left"), s)
      member x.render(id, viz) = 
        let el = document.getElementById(id)
        let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
        svg |> Html.renderTo el }

(*
let renderAnim id init render update =
  Html.createVirtualDomApp id init render update

let svg id shape =
  let el = document.getElementById(id)
  Compost.createSvg false false (el.clientWidth, el.clientHeight) shape

let series d = Array.ofList [ for x, y in d -> unbox x, unbox y ]
let rnd = System.Random()
let inline numv v = COV(CO (float v))
let catv n s  = CAR(CA s, n)
let inline co v = CO(float v)
let ca s = CA(s)

// ----------------------------------------------------------------------------
// Some *fun* input data about British politics
// ----------------------------------------------------------------------------



let inline i a b c d s = 
  dict ["sepal.length", float a;"sepal.width", float b;"petal.length",float c; "petal.width",float d], s
let iris = 
  [ i 5.1 3.5 1.4 0.2 "Setosa"; i 4.9 3 1.4 0.2 "Setosa"; i 4.7 3.2 1.3 0.2 "Setosa"; i 4.6 3.1 1.5 0.2 "Setosa"; i 5 3.6 1.4 0.2 "Setosa"; i 5.4 3.9 1.7 0.4 "Setosa"; i 4.6 3.4 1.4 0.3 "Setosa"; i 5 3.4 1.5 0.2 "Setosa"; i 4.4 2.9 1.4 0.2 "Setosa"; i 4.9 3.1 1.5 0.1 "Setosa"; i 5.4 3.7 1.5 0.2 "Setosa"; i 4.8 3.4 1.6 0.2 "Setosa"; i 4.8 3 1.4 0.1 "Setosa"; i 4.3 3 1.1 0.1 "Setosa"; i 5.8 4 1.2 0.2 "Setosa"; i 5.7 4.4 1.5 0.4 "Setosa"; i 5.4 3.9 1.3 0.4 "Setosa"; i 5.1 3.5 1.4 0.3 "Setosa"; i 5.7 3.8 1.7 0.3 "Setosa"; i 5.1 3.8 1.5 0.3 "Setosa"; i 5.4 3.4 1.7 0.2 "Setosa"; i 5.1 3.7 1.5 0.4 "Setosa"; i 4.6 3.6 1 0.2 "Setosa"; i 5.1 3.3 1.7 0.5 "Setosa"; i 4.8 3.4 1.9 0.2 "Setosa"; i 5 3 1.6 0.2 "Setosa"; i 5 3.4 1.6 0.4 "Setosa"; i 5.2 3.5 1.5 0.2 "Setosa"; i 5.2 3.4 1.4 0.2 "Setosa"; i 4.7 3.2 1.6 0.2 "Setosa"; i 4.8 3.1 1.6 0.2 "Setosa"; i 5.4 3.4 1.5 0.4 "Setosa"; i 5.2 4.1 1.5 0.1 "Setosa"; i 5.5 4.2 1.4 0.2 "Setosa"; i 4.9 3.1 1.5 0.2 "Setosa"; i 5 3.2 1.2 0.2 "Setosa"; i 5.5 3.5 1.3 0.2 "Setosa"; i 4.9 3.6 1.4 0.1 "Setosa"; i 4.4 3 1.3 0.2 "Setosa"; i 5.1 3.4 1.5 0.2 "Setosa"; i 5 3.5 1.3 0.3 "Setosa"; i 4.5 2.3 1.3 0.3 "Setosa"; 
    i 4.4 3.2 1.3 0.2 "Setosa"; i 5 3.5 1.6 0.6 "Setosa"; i 5.1 3.8 1.9 0.4 "Setosa"; i 4.8 3 1.4 0.3 "Setosa"; i 5.1 3.8 1.6 0.2 "Setosa"; i 4.6 3.2 1.4 0.2 "Setosa"; i 5.3 3.7 1.5 0.2 "Setosa"; i 5 3.3 1.4 0.2 "Setosa"; i 7 3.2 4.7 1.4 "Versicolor"; i 6.4 3.2 4.5 1.5 "Versicolor"; i 6.9 3.1 4.9 1.5 "Versicolor"; i 5.5 2.3 4 1.3 "Versicolor"; i 6.5 2.8 4.6 1.5 "Versicolor"; i 5.7 2.8 4.5 1.3 "Versicolor"; i 6.3 3.3 4.7 1.6 "Versicolor"; i 4.9 2.4 3.3 1 "Versicolor"; i 6.6 2.9 4.6 1.3 "Versicolor"; i 5.2 2.7 3.9 1.4 "Versicolor"; i 5 2 3.5 1 "Versicolor"; i 5.9 3 4.2 1.5 "Versicolor"; i 6 2.2 4 1 "Versicolor"; i 6.1 2.9 4.7 1.4 "Versicolor"; i 5.6 2.9 3.6 1.3 "Versicolor"; i 6.7 3.1 4.4 1.4 "Versicolor"; i 5.6 3 4.5 1.5 "Versicolor"; i 5.8 2.7 4.1 1 "Versicolor"; i 6.2 2.2 4.5 1.5 "Versicolor"; i 5.6 2.5 3.9 1.1 "Versicolor"; i 5.9 3.2 4.8 1.8 "Versicolor"; i 6.1 2.8 4 1.3 "Versicolor"; i 6.3 2.5 4.9 1.5 "Versicolor"; i 6.1 2.8 4.7 1.2 "Versicolor"; i 6.4 2.9 4.3 1.3 "Versicolor"; i 6.6 3 4.4 1.4 "Versicolor"; i 6.8 2.8 4.8 1.4 "Versicolor"; i 6.7 3 5 1.7 "Versicolor"; i 6 2.9 4.5 1.5 "Versicolor"; 
    i 5.7 2.6 3.5 1 "Versicolor"; i 5.5 2.4 3.8 1.1 "Versicolor"; i 5.5 2.4 3.7 1 "Versicolor"; i 5.8 2.7 3.9 1.2 "Versicolor"; i 6 2.7 5.1 1.6 "Versicolor"; i 5.4 3 4.5 1.5 "Versicolor"; i 6 3.4 4.5 1.6 "Versicolor"; i 6.7 3.1 4.7 1.5 "Versicolor"; i 6.3 2.3 4.4 1.3 "Versicolor"; i 5.6 3 4.1 1.3 "Versicolor"; i 5.5 2.5 4 1.3 "Versicolor"; i 5.5 2.6 4.4 1.2 "Versicolor"; i 6.1 3 4.6 1.4 "Versicolor"; i 5.8 2.6 4 1.2 "Versicolor"; i 5 2.3 3.3 1 "Versicolor"; i 5.6 2.7 4.2 1.3 "Versicolor"; i 5.7 3 4.2 1.2 "Versicolor"; i 5.7 2.9 4.2 1.3 "Versicolor"; i 6.2 2.9 4.3 1.3 "Versicolor"; i 5.1 2.5 3 1.1 "Versicolor"; i 5.7 2.8 4.1 1.3 "Versicolor"; i 6.3 3.3 6 2.5 "Virginica"; i 5.8 2.7 5.1 1.9 "Virginica"; i 7.1 3 5.9 2.1 "Virginica"; i 6.3 2.9 5.6 1.8 "Virginica"; i 6.5 3 5.8 2.2 "Virginica"; i 7.6 3 6.6 2.1 "Virginica"; i 4.9 2.5 4.5 1.7 "Virginica"; i 7.3 2.9 6.3 1.8 "Virginica"; i 6.7 2.5 5.8 1.8 "Virginica"; i 7.2 3.6 6.1 2.5 "Virginica"; i 6.5 3.2 5.1 2 "Virginica"; i 6.4 2.7 5.3 1.9 "Virginica"; i 6.8 3 5.5 2.1 "Virginica"; i 5.7 2.5 5 2 "Virginica"; i 5.8 2.8 5.1 2.4 "Virginica"; 
    i 6.4 3.2 5.3 2.3 "Virginica"; i 6.5 3 5.5 1.8 "Virginica"; i 7.7 3.8 6.7 2.2 "Virginica"; i 7.7 2.6 6.9 2.3 "Virginica"; i 6 2.2 5 1.5 "Virginica"; i 6.9 3.2 5.7 2.3 "Virginica"; i 5.6 2.8 4.9 2 "Virginica"; i 7.7 2.8 6.7 2 "Virginica"; i 6.3 2.7 4.9 1.8 "Virginica"; i 6.7 3.3 5.7 2.1 "Virginica"; i 7.2 3.2 6 1.8 "Virginica"; i 6.2 2.8 4.8 1.8 "Virginica"; i 6.1 3 4.9 1.8 "Virginica"; i 6.4 2.8 5.6 2.1 "Virginica"; i 7.2 3 5.8 1.6 "Virginica"; i 7.4 2.8 6.1 1.9 "Virginica"; i 7.9 3.8 6.4 2 "Virginica"; i 6.4 2.8 5.6 2.2 "Virginica"; i 6.3 2.8 5.1 1.5 "Virginica"; i 6.1 2.6 5.6 1.4 "Virginica"; i 7.7 3 6.1 2.3 "Virginica"; i 6.3 3.4 5.6 2.4 "Virginica"; i 6.4 3.1 5.5 1.8 "Virginica"; i 6 3 4.8 1.8 "Virginica"; i 6.9 3.1 5.4 2.1 "Virginica"; i 6.7 3.1 5.6 2.4 "Virginica"; i 6.9 3.1 5.1 2.3 "Virginica"; i 5.8 2.7 5.1 1.9 "Virginica"; i 6.8 3.2 5.9 2.3 "Virginica"; i 6.7 3.3 5.7 2.5 "Virginica"; i 6.7 3 5.2 2.3 "Virginica"; i 6.3 2.5 5 1.9 "Virginica"; i 6.5 3 5.2 2 "Virginica"; i 6.2 3.4 5.4 2.3 "Virginica"; i 5.9 3 5.1 1.8 "Virginica" ]






let chart1 = 
  Shape.Layered [
    NestY(numv 0, numv 50, 
      Shape.Axes(false, true, true, true, 
        Derived.StrokeColor("#202020", line gbpusd)))
    NestY(numv 50, numv 100, 
      Shape.Axes(false, true, true, true, 
        Derived.StrokeColor("#202020", line gbpeur)))
  ]

chart1 |> ignore//|> render "out1"

let colors = dict ["Setosa", "blue"; "Virginica", "green"; "Versicolor", "red"] 
//Shape.Padding((10., 10., 10., 10.), 
let cats = ["sepal.width"; "petal.length"; "petal.width"]

let bins data = 
  let lo, hi = Seq.min data, Seq.max data
  let bins = data |> Seq.countBy (fun v -> int ((v - lo) / (hi - lo) * 9. )) |> Seq.sort
  [ for k, v in bins -> (lo + (hi - lo) * (float k / 10.0)), (lo + (hi - lo) * (float (k + 1) / 10.0)), v ]

(
  let y = "sepal.width"
  let x = "petal.length"
  Title("....... Petal length (x) vs. sepal width (y)", Axes(false, false, true, true, Shape.Layered [
    if x = y then 
      for x1, x2, y in bins [ for v, _ in iris -> v.[x] ] -> Derived.FillColor("#808080", Shape [
        numv x1, numv y
        numv x2, numv y
        numv x2, numv 0.0
        numv x1, numv 0.0 ])
      
      //Derived.Column(ca (string k), co v)
    else
      for v, k in iris -> 
        Derived.StrokeColor(colors.[k], Shape.Bubble(numv v.[x], numv v.[y], 1., 1.))
  ]))
) |> render "out4"

(Shape.Layered [
  for x in cats do
    for y in cats do
      yield NestX(catv 0.0 x, catv 1.0 x, 
        NestY(catv 0.0 y, catv 1.0 y, 
          Axes(false, false, true, true, Shape.Layered [
            if x = y then 
              for x1, x2, y in bins [ for v, _ in iris -> v.[x] ] -> Derived.FillColor("#808080", Shape [
                numv x1, numv y
                numv x2, numv y
                numv x2, numv 0.0
                numv x1, numv 0.0 ])
              
              //Derived.Column(ca (string k), co v)
            else
              for v, k in iris -> 
                Derived.StrokeColor(colors.[k], Shape.Bubble(numv v.[x], numv v.[y], 1., 1.))
          ])))
]) |> render "out5"


(*
let bars1 : Shape<1,1> = 
  Shape.Layered [ 
    for p, clr, s17, s19 in Seq.take 2 elections -> 
      //Shape.Padding((0., 10., 0., 10.), 
      Derived.FillColor(adjust 1.2 clr, partColumn 0. 1. (ca p) (co s19))
        //Shape.Layered [
        //  Derived.FillColor(adjust 0.8 clr, partColumn 0.0 0.5 (ca p) (co s17))
        //  Derived.FillColor(adjust 1.2 clr, partColumn 0.5 1.0 (ca p) (co s19))
        //]          
        //] //) ]
  ]

Shape.Axes(false, false, true, true, bars1) |> render "out1"

let bars3 : Shape<1,1> = 
  Shape.InnerScale(Some(Categorical [|ca "Labour"; ca "Conservative"|]), Some(Continuous(co 0, co 420)), 
    Shape.Layered [ 
      for p, clr, s17, s19 in Seq.take 2 elections -> 
        //Shape.Padding((0., 10., 0., 10.), 
        Derived.FillColor(adjust 1.2 clr, partColumn 0. 1. (ca p) (co s19))
          //Shape.Layered [
          //  Derived.FillColor(adjust 0.8 clr, partColumn 0.0 0.5 (ca p) (co s17))
          //  Derived.FillColor(adjust 1.2 clr, partColumn 0.5 1.0 (ca p) (co s19))
          //]          
          //] //) ]
    ])

Shape.Axes(false, false, true, true, bars3) |> render "out2"

let bars2 : Shape<1,1> = 
  Shape.Layered [ 
    for p, clr, s17, s19 in elections -> 
      Shape.Padding((0., 10., 0., 10.), 
        Shape.Layered [
          Derived.FillColor(adjust 0.8 clr, partColumn 0.0 0.5 (ca p) (co s17))
          Derived.FillColor(adjust 1.2 clr, partColumn 0.5 1.0 (ca p) (co s19))
        ]) ] 
  

//Shape.Axes(false, false, true, true, bars2) |> render "out2"

let body2 lo hi data = 
  Shape.Axes(false, true, true, true, Shape.Layered [
    Derived.StrokeColor("#202020", line data)
  ])

//body2 0 0 gbpusd |> render "out2"




*)
type [<Measure>] MP

let colors2 = dict [ for p, clr, _, v in elections -> p, clr ]

type Update = 
  | Set of string * int<MP>
  | Enable of bool

let update (enabled, state) = function
  | Set(party, mp) when enabled -> enabled, state |> List.map (fun (k, v) -> if k = party then k, mp else k, v)
  | Enable(b) -> (b, state)
  | _ -> enabled, state

let renderr id trigger (_, state) = 
  (Title("Drag the bars to guess UK election results!",
    ( Shape.Axes(false, false, true, true, 
        Shape.InnerScale(None, Some(Continuous(co 0<MP>, co 400<MP>)), Shape.Style((fun sty -> sty ), //{ sty with Cursor = "row-resize" }),
          Shape.Interactive([
            MouseDown(fun e _ -> trigger(Enable(true)) )
            MouseUp(fun e _ -> trigger(Enable(false)) )
            MouseMove(fun e (CAR(CA x, _), COV(CO y)) -> trigger(Set(x, int y * 1<MP>)); printfn "CLICK: %A" (x,y) )
          ], 
            Shape.Layered [ 
            for p, v in state -> 
              Derived.FillColor(colors2.[p],
                ( Shape.Padding((0., 10., 0., 10.), 
                    Derived.Column(ca p, co v)) ))
          ]))))))) |> svg id

let state = false, [ for p, clr, _, v in elections -> p, v * 1<MP> ]
renderAnim "out1" state (renderr "out1") update 
renderAnim "out2" state (renderr "out2") update 
*)