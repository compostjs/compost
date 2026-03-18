module main

open Compost
open Compost.Html
open Fable.Core.JsInterop
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

type Scale = Compost.Scale<1>
type Shape = Compost.Shape<1, 1>

module Serialization =
  open Common

  let private serValue = formatValue
  let private deserValue = parseValue

  let private serializeVerticalAlign = function
    | Baseline -> "baseline" | Middle -> "middle" | Hanging -> "hanging"
  let private deserializeVerticalAlign = function
    | "baseline" -> Baseline | "hanging" -> Hanging | _ -> Middle

  let private serializeHorizontalAlign = function
    | Start -> "start" | Center -> "center" | End -> "end"
  let private deserializeHorizontalAlign = function
    | "start" -> Start | "end" -> End | _ -> Center

  let private serializeScale = function
    | Continuous(CO lo, CO hi) -> createObj [| "kind", box "continuous"; "lo", box lo; "hi", box hi |]
    | Categorical cats -> createObj [| "kind", box "categorical"; "cats", box [| for CA c in cats -> box c |] |]

  let private deserializeScale (o:obj) =
    match o?kind with
    | "continuous" -> Continuous(CO(o?lo), CO(o?hi))
    | "categorical" -> Categorical [| for c in (o?cats : string[]) -> CA c |]
    | k -> failwithf "Unknown scale kind: %s" k

  let private serializeStyleConfig = function
    | StyleConfig.FillColor c -> createObj [| "kind", box "fill"; "color", box c |]
    | StyleConfig.StrokeColor c -> createObj [| "kind", box "stroke"; "color", box c |]
    | StyleConfig.Font(f, c) -> createObj [| "kind", box "font"; "font", box f; "color", box c |]
    | StyleConfig.PreserveAspectRatio pa -> createObj [| "kind", box "aspect"; "value", box pa |]
    | StyleConfig.Custom _ -> failwith "Cannot serialize Custom style config"

  let private deserializeStyleConfig (o:obj) =
    match o?kind with
    | "fill" -> StyleConfig.FillColor(o?color)
    | "stroke" -> StyleConfig.StrokeColor(o?color)
    | "font" -> StyleConfig.Font(o?font, o?color)
    | "aspect" -> StyleConfig.PreserveAspectRatio(o?value)
    | k -> failwithf "Unknown style config kind: %s" k

  let private serializePoints pts =
    box [| for x, y in pts -> box [| serValue x; serValue y |] |]

  let rec serializeShape (s: Shape) : obj =
    match s with
    | Shape.Line pts ->
        createObj [| "kind", box "line"; "points", serializePoints (List.ofSeq pts) |]
    | Shape.Shape pts ->
        createObj [| "kind", box "shape"; "points", serializePoints (List.ofSeq pts) |]
    | Shape.Bubble(x, y, w, h) ->
        createObj [| "kind", box "bubble"; "x", serValue x; "y", serValue y; "w", box w; "h", box h |]
    | Shape.Text(x, y, va, ha, r, t) ->
        createObj [| "kind", box "text"; "x", serValue x; "y", serValue y
                     "valign", box (serializeVerticalAlign va); "halign", box (serializeHorizontalAlign ha)
                     "rotation", box r; "text", box t |]
    | Shape.Image(href, (x1, y1), (x2, y2)) ->
        createObj [| "kind", box "image"; "href", box href
                     "p1", box [| serValue x1; serValue y1 |]; "p2", box [| serValue x2; serValue y2 |] |]
    | Shape.Layered shapes ->
        createObj [| "kind", box "layered"; "shapes", box [| for s in shapes -> serializeShape s |] |]
    | Shape.Axes(t, r, b, l, s) ->
        let flags = [
          if t then yield "top"
          if r then yield "right"
          if b then yield "bottom"
          if l then yield "left" ]
        let a = String.concat " " flags
        createObj [| "kind", box "axes"; "axes", box a; "shape", serializeShape s |]
    | Shape.Padding((t, r, b, l), s) ->
        createObj [| "kind", box "padding"; "top", box t; "right", box r; "bottom", box b; "left", box l; "shape", serializeShape s |]
    | Shape.NestX(lx, hx, s) ->
        createObj [| "kind", box "nestx"; "lx", serValue lx; "hx", serValue hx; "shape", serializeShape s |]
    | Shape.NestY(ly, hy, s) ->
        createObj [| "kind", box "nesty"; "ly", serValue ly; "hy", serValue hy; "shape", serializeShape s |]
    | Shape.InnerScale(sx, sy, s) ->
        createObj [| "kind", box "scale"
                     "sx", (match sx with Some sc -> serializeScale sc | None -> box null)
                     "sy", (match sy with Some sc -> serializeScale sc | None -> box null)
                     "shape", serializeShape s |]
    | Shape.Style(sc, s) ->
        createObj [| "kind", box "styled"; "param", serializeStyleConfig sc; "shape", serializeShape s |]
    | Shape.AutoScale(x, y, s) ->
        createObj [| "kind", box "autoscale"; "x", box x; "y", box y; "shape", serializeShape s |]
    | Shape.Offset((dx, dy), s) ->
        createObj [| "kind", box "offset"; "dx", box dx; "dy", box dy; "shape", serializeShape s |]
    | Shape.Interactive _ ->
        failwith "Cannot serialize Interactive shapes"

  let rec deserializeShape (o: obj) : Shape =
    match o?kind with
    | "line" -> Shape.Line [ for p in (o?points : obj[][]) -> deserValue p.[0], deserValue p.[1] ]
    | "shape" -> Shape.Shape [ for p in (o?points : obj[][]) -> deserValue p.[0], deserValue p.[1] ]
    | "bubble" -> Shape.Bubble(deserValue(o?x), deserValue(o?y), o?w, o?h)
    | "text" ->
        Shape.Text(deserValue(o?x), deserValue(o?y),
          deserializeVerticalAlign(o?valign), deserializeHorizontalAlign(o?halign),
          o?rotation, o?text)
    | "image" ->
        let p1, p2 = (o?p1 : obj[]), (o?p2 : obj[])
        Shape.Image(o?href, (deserValue p1.[0], deserValue p1.[1]), (deserValue p2.[0], deserValue p2.[1]))
    | "layered" -> Shape.Layered [ for s in (o?shapes : obj[]) -> deserializeShape s ]
    | "axes" ->
        let a = (o?axes : string)
        Shape.Axes(a.Contains("top"), a.Contains("right"), a.Contains("bottom"), a.Contains("left"), deserializeShape(o?shape))
    | "padding" ->
        Shape.Padding((o?top, o?right, o?bottom, o?left), deserializeShape(o?shape))
    | "nestx" -> Shape.NestX(deserValue(o?lx), deserValue(o?hx), deserializeShape(o?shape))
    | "nesty" -> Shape.NestY(deserValue(o?ly), deserValue(o?hy), deserializeShape(o?shape))
    | "scale" ->
        let sx = if box (o?sx) = null then None else Some(deserializeScale(o?sx))
        let sy = if box (o?sy) = null then None else Some(deserializeScale(o?sy))
        Shape.InnerScale(sx, sy, deserializeShape(o?shape))
    | "styled" -> Shape.Style(deserializeStyleConfig(o?param), deserializeShape(o?shape))
    | "autoscale" -> Shape.AutoScale(o?x, o?y, deserializeShape(o?shape))
    | "offset" -> Shape.Offset((o?dx, o?dy), deserializeShape(o?shape))
    | k -> failwithf "Unknown shape kind: %s" k

open Serialization

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
  abstract preserveAspectRatio : string * Shape -> Shape
  abstract strokeColor : string * Shape -> Shape
  abstract font : string * string * Shape -> Shape
  abstract padding : float * float * float * float * Shape -> Shape
  abstract text : obj * obj * string * string * float -> Shape
  abstract column : string * float -> Shape
  abstract bar : float * string -> Shape
  abstract image : string * obj[] * obj[] -> Shape
  abstract bubble : obj * obj * float * float -> Shape
  abstract shape : obj[][] -> Shape
  abstract line : obj[][] -> Shape
  abstract on : obj * Shape -> Shape
  abstract axes : string * Shape -> Shape
  abstract render : string * Shape -> unit
  abstract svg : float * float * Shape -> DomNode
  abstract html : string * obj * DomNode[] -> DomNode
  abstract interactive<'e, 's> : string * 's * ('s -> 'e -> 's) * (('e -> unit) -> 's -> Shape) -> unit
  abstract foldDom : (obj -> string -> obj -> obj) * obj * DomNode -> obj
  abstract serialize : Shape -> obj
  abstract deserialize : obj -> Shape

let scale = 
  { new JsScale with 
      member x.continuous(lo, hi) = Continuous(CO lo, CO hi) 
      member x.categorical(cats) = Categorical [| for c in cats -> CA c |] }
  
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
      member x.preserveAspectRatio(pa, s) = Derived.PreserveAspectRatio(pa, s) 
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
      member x.image(href, pt1, pt2) = 
        Shape.Image(href, (parseValue pt1[0], parseValue pt1[1]), (parseValue pt2[0], parseValue pt2[1]))
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
      member x.svg(w, h, shape) = 
        Compost.createSvg false false (w, h) shape
      member x.html(tag, attrs, children) = 
        let attrs = 
          [| for a in Common.keys(attrs) ->
              let p = Common.getProperty attrs a
              if (Common.typeOf p = "function") then
                a, DomAttribute.Event(fun e h -> 
                  Common.apply p [| box e; box h |])
              else 
                a, DomAttribute.Attribute(unbox p) |]
        let children = children |> Array.map (fun c ->
          if Common.typeOf c = "string" then DomNode.Text(unbox c)
          else c )         
        DomNode.Element(null, tag, attrs, children)
      member x.interactive(id, init, update, render) =
        let render t s =
          let el = document.getElementById(id)
          let res = render t s
          if Common.getProperty res "constructor" = Common.getProperty (DomNode.Text "") "constructor" then
            unbox<DomNode> res
          else 
            Compost.createSvg false false (el.clientWidth, el.clientHeight) res
        Html.createVirtualDomApp id init render update
      member x.render(id, viz) =
        let el = document.getElementById(id)
        let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
        svg |> Html.renderTo el
      member x.foldDom(f, acc, node) =
        let toAttrObj (attrs:(string * DomAttribute)[]) =
          createObj [| for k, v in attrs do match v with Attribute s -> yield k, box s | _ -> () |]
        Html.foldDom (fun acc _ns tag attrs -> f acc tag (toAttrObj attrs)) acc node
      member x.serialize(s) = serializeShape s
      member x.deserialize(o) = deserializeShape o }