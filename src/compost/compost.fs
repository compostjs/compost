module main

open Compost
open Compost.Html
open Browser

module Helpers = 
  let formatValue v = 
    match v with 
    | CAR(CA c, r) -> box [| box c; box r |]
    | COV(CO v) -> box v

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
  abstract categorical : string[] -> Scale

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
  abstract column : string * float -> Shape
  abstract bar : float * string -> Shape
  abstract bubble : obj * obj * float * float -> Shape
  abstract shape : obj[][] -> Shape
  abstract line : obj[][] -> Shape
  abstract on : obj * Shape -> Shape
  abstract axes : string * Shape -> Shape
  abstract render : string * Shape -> unit
  abstract interactive<'e, 's> : string * 's * ('s -> 'e -> 's) * (('e -> unit) -> 's -> Shape) -> unit
  abstract hack : Shape -> Shape

let scale = 
  { new JsScale with 
      member x.continuous(lo, hi) = Continuous(CO lo, CO hi) 
      member x.categorical(cats) = Categorical [| for c in cats -> CA c |] }
  
let compost = 
  { new JsCompost with
      member x.hack(sh) = Shape.Style((fun sty -> 
        { sty with FormatAxisXLabel = fun _ (COV (CO v)) -> 
            System.DateTime(2020,2,10).AddDays(v*14.).ToString("d/M") }), sh)
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
      member x.column(xp, yp) = Derived.Column(CA xp, CO yp)
      member x.bar(xp, yp) = Derived.Bar(CO xp, CA yp)
      member x.bubble(xp, yp, w, h) = Shape.Bubble(parseValue xp, parseValue yp, w, h)
      member x.text(xp, yp, t, s, r) = 
        let r = if box r = null then 0.0 else r
        let s = if box s = null then "" else s
        let va = if s.Contains("baseline") then Baseline elif s.Contains("hanging") then Hanging else Middle
        let ha = if s.Contains("start") then Start elif s.Contains("end") then End else Center
        Shape.Text(parseValue xp, parseValue yp, va, ha, r, t)
      member x.shape(a) = Shape.Shape [ for p in a -> parseValue p.[0], parseValue p.[1] ] 
      member x.line(a) = Shape.Line [ for p in a -> parseValue p.[0], parseValue p.[1] ] 
      member x.axes(a, s) = Shape.Axes(a.Contains("top"), a.Contains("right"), a.Contains("bottom"), a.Contains("left"), s)
      member x.on(o, s) =
        Shape.Interactive
         ([ for k in Common.keys(o) ->
              let f = Common.apply (Common.getProperty o k)
              match k with 
              | "mousedown" -> MouseDown(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "mouseup" -> MouseUp(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "mousemove" -> MouseMove(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "touchstart" -> TouchStart(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "touchmove" -> TouchMove(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "click"   -> Click(fun me (x, y) -> f [| box (formatValue x); box (formatValue y); box me |])
              | "mouseleave" -> MouseLeave(fun me -> f [| me |])
              | "touchend" -> TouchEnd(fun me -> f [| me |])
              | s -> failwithf "Unsupported event type '%s' passed to the 'on' primitive." s
        ], s)
      member x.interactive(id, init, update, render) =
        let render t s =
          let el = document.getElementById(id)
          Compost.createSvg false false (el.clientWidth, el.clientHeight) (render t s)
        Html.createVirtualDomApp id init render update
      member x.render(id, viz) = 
        let el = document.getElementById(id)
        let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
        svg |> Html.renderTo el }