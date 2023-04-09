module main

open Fable.Core
open Browser.Types

type Coord = U2<float, obj * float>
type Point = Coord * Coord
type Handlers =
  abstract mousedown: (Coord -> Coord -> MouseEvent -> unit) option
  abstract mouseup: (Coord -> Coord -> MouseEvent -> unit) option
  abstract mousemove: (Coord -> Coord -> MouseEvent -> unit) option
  abstract mouseleave: (MouseEvent -> unit) option
  abstract touchstart: (Coord -> Coord -> TouchEvent -> unit) option
  abstract touchmove: (Coord -> Coord -> TouchEvent -> unit) option
  abstract touchend: (TouchEvent -> unit) option
  abstract click: (Coord -> Coord -> MouseEvent -> unit) option

module private Helpers = 
  open Compost

  let formatValue v: Coord = 
    match v with 
    | COV(CO v) -> U2.Case1 v
    | CAR(CA c, r) -> U2.Case2(c, r)

  let parseValue (v: Coord) =
    match v with
    | U2.Case1 v -> COV(CO(v))
    | U2.Case2 (a1, a2) -> CAR(CA(string a1), a2)

type Scale = Compost.Scale<1>
type Shape = Compost.Shape<1, 1>

type JsScale = 
  abstract continuous : float * float -> Scale
  abstract categorical : string seq -> Scale

type JsCompost =
  abstract nestX : Coord * Coord * Shape -> Shape
  abstract nestY : Coord * Coord * Shape -> Shape
  abstract nest : Coord * Coord * Coord * Coord * Shape -> Shape
  abstract scaleX : Scale * Shape -> Shape
  abstract scaleY : Scale * Shape -> Shape
  abstract scale : Scale * Scale * Shape -> Shape
  abstract overlay : Shape seq -> Shape
  abstract fillColor : string * Shape -> Shape
  abstract strokeColor : string * Shape -> Shape
  abstract font : string * string * Shape -> Shape
  abstract padding : float * float * float * float * Shape -> Shape
  abstract text : x: Coord * y: Coord * text: string * ?alignment: string * ?rotation: float -> Shape
  abstract column : string * float -> Shape
  abstract bar : float * string -> Shape
  abstract bubble : Coord * Coord * float * float -> Shape
  abstract shape : Point[] -> Shape
  abstract line : Point[] -> Shape
  abstract on : Handlers * Shape -> Shape
  abstract axes : string * Shape -> Shape
  abstract svg : float * float * Shape -> Compost.Html.DomNode
  // abstract render : string * Shape -> unit
  // abstract html : string * Coord * Compost.Html.DomNode[] -> Compost.Html.DomNode
  // abstract interactive : string * 's * ('s -> 'e -> 's) * (('e -> unit) -> 's -> Shape) -> unit

open Browser
open Compost
open Compost.Html
open Helpers

let scale = 
  { new JsScale with 
      member _.continuous(lo, hi) = Continuous(CO lo, CO hi) 
      member _.categorical(cats) = Categorical [| for c in cats -> CA c |] }
  
let compost = 
  { new JsCompost with
      member _.scaleX(sc, sh) = Shape.InnerScale(Some(sc), None, sh) 
      member _.scaleY(sc, sh) = Shape.InnerScale(None, Some(sc), sh) 
      member _.scale(sx, sy, sh) = Shape.InnerScale(Some(sx), Some(sy), sh) 
      member _.nestX(lx, hx, s) = Shape.NestX(parseValue lx, parseValue hx, s)
      member _.nestY(ly, hy, s) = Shape.NestY(parseValue ly, parseValue hy, s)
      member _.nest(lx, hx, ly, hy, s) = Shape.NestY(parseValue ly, parseValue hy, Shape.NestX(parseValue lx, parseValue hx, s))
      member _.overlay(sh) = Shape.Layered(List.ofSeq sh) 
      member _.padding(t, r, b, l, s) = Shape.Padding((t, r, b, l), s)
      member _.fillColor(c, s) = Derived.FillColor(c, s) 
      member _.strokeColor(c, s) = Derived.StrokeColor(c, s) 
      member _.font(f, c, s) = Derived.Font(f, c, s) 
      member _.column(xp, yp) = Derived.Column(CA xp, CO yp)
      member _.bar(xp, yp) = Derived.Bar(CO xp, CA yp)
      member _.bubble(xp, yp, w, h) = Shape.Bubble(parseValue xp, parseValue yp, w, h)
      member _.text(xp, yp, t, s, r) = 
        let r = defaultArg r 0.0
        let s = defaultArg s ""
        let va = if s.Contains("baseline") then Baseline elif s.Contains("hanging") then Hanging else Middle
        let ha = if s.Contains("start") then Start elif s.Contains("end") then End else Center
        Shape.Text(parseValue xp, parseValue yp, va, ha, r, t)
      member _.shape(a) = Shape.Shape [ for (p1, p2) in a -> parseValue p1, parseValue p2 ] 
      member _.line(a) = Shape.Line [ for (p1, p2) in a -> parseValue p1, parseValue p2 ] 
      member _.axes(a, s) = Shape.Axes(a.Contains("top"), a.Contains("right"), a.Contains("bottom"), a.Contains("left"), s)
      member _.on(o, s) =
        Shape.Interactive([
          match o.mousedown with None -> () | Some f -> yield MouseDown(fun me (x, y) -> f (formatValue x) (formatValue y) me)
          match o.mouseup with None -> () | Some f -> yield MouseUp(fun me (x, y) -> f (formatValue x) (formatValue y) me)
          match o.mousemove with None -> () | Some f -> yield MouseMove(fun me (x, y) -> f (formatValue x) (formatValue y) me)
          match o.mouseleave with None -> () | Some f -> yield MouseLeave(f)
          match o.touchstart with None -> () | Some f -> yield TouchStart(fun me (x, y) -> f (formatValue x) (formatValue y) me)
          match o.touchmove with None -> () | Some f -> yield TouchMove(fun me (x, y) -> f (formatValue x) (formatValue y) me)
          match o.touchend with None -> () | Some f -> yield TouchEnd(f)
          match o.click with None -> () | Some f -> yield Click(fun me (x, y) -> f (formatValue x) (formatValue y) me)
        ], s)
      member _.svg(w, h, shape) = 
        Compost.createSvg (w, h) shape
  }