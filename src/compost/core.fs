namespace Compost

open Compost.Html
open Browser.Types

// ------------------------------------------------------------------------------------------------
// Domain that users see
// ------------------------------------------------------------------------------------------------
  
type Color =
  | RGB of int * int * int
  | HTML of string

type AlphaColor = float * Color 
type Width = Pixels of int
type GradientStop = float * AlphaColor

type FillStyle =
  | Solid of AlphaColor
  | LinearGradient of seq<GradientStop>

type Number =
  | Integer of int
  | Percentage of float

type HorizontalAlign = Start | Center | End
type VerticalAlign = Baseline | Middle | Hanging

type continuous<[<Measure>] 'u> = CO of float<'u> 
type categorical<[<Measure>] 'u> = CA of string

type Value<[<Measure>] 'u> = 
  | CAR of categorical<'u> * float
  | COV of continuous<'u>

type Scale<[<Measure>] 'v> =
  | Continuous of continuous<'v> * continuous<'v>
  | Categorical of categorical<'v>[]

type Style = 
  { StrokeColor : AlphaColor
    StrokeWidth : Width
    StrokeDashArray : seq<Number>
    Fill : FillStyle 
    Animation : option<int * string * (Style -> Style)>
    Font : string
    Cursor : string
    PreserveAspectRatio : string
    FormatAxisXLabel : Scale<1> -> Value<1> -> string
    FormatAxisYLabel : Scale<1> -> Value<1> -> string }

type EventHandler<[<Measure>] 'vx, [<Measure>] 'vy> = 
  | MouseMove of (MouseEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | MouseUp of (MouseEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | MouseDown of (MouseEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | Click of (MouseEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | TouchStart of (TouchEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | TouchMove of (TouchEvent -> (Value<'vx> * Value<'vy>) -> unit)
  | TouchEnd of (TouchEvent -> unit)
  | MouseLeave of (MouseEvent -> unit)

type Orientation = 
  | Vertical
  | Horizontal

type Shape<[<Measure>] 'vx, [<Measure>] 'vy> = 
  | Image of string * (Value<'vx> * Value<'vy>) * (Value<'vx> * Value<'vy>)
  | Style of (Style -> Style) * Shape<'vx, 'vy>
  | Text of Value<'vx> * Value<'vy> * VerticalAlign * HorizontalAlign * float * string
  | AutoScale of bool * bool * Shape<'vx, 'vy>
  | InnerScale of option<Scale<'vx>> * option<Scale<'vy>> * Shape<'vx, 'vy>
  | NestX of Value<'vx> * Value<'vx> * Shape<'vx, 'vy>
  | NestY of Value<'vy> * Value<'vy> * Shape<'vx, 'vy>
  | Line of seq<Value<'vx> * Value<'vy>>
  | Bubble of Value<'vx> * Value<'vy> * float * float
  | Shape of seq<Value<'vx> * Value<'vy>>
  //| Stack of Orientation * seq<Shape<'vx, 'vy>>
  | Layered of seq<Shape<'vx, 'vy>>
  | Axes of bool * bool * bool * bool * Shape<'vx, 'vy>
  | Interactive of seq<EventHandler<'vx, 'vy>> * Shape<'vx, 'vy>
  | Padding of (float * float * float * float) * Shape<'vx, 'vy>
  | Offset of (float * float) * Shape<'vx, 'vy>
 
// ------------------------------------------------------------------------------------------------
// SVG stuff
// ------------------------------------------------------------------------------------------------

module Svg =   

  type StringBuilder() = 
    let mutable strs = [] 
    member x.Append(s) = strs <- s::strs
    override x.ToString() = String.concat "" (List.rev strs)

  type PathSegment = 
    | MoveTo of (float * float)
    | LineTo of (float * float)

  type SvgStyle = string
  
  type Svg =
    | Image of string * (float * float) * (float * float) * string
    | Path of PathSegment[] * SvgStyle
    | Ellipse of (float * float) * (float * float) * SvgStyle
    | Rect of (float * float) * (float * float) * SvgStyle
    | Text of (float * float) * string * float * SvgStyle 
    | Combine of Svg[]
    | Empty

  let rec mapSvg f = function
    | Combine svgs -> Combine(Array.map (mapSvg f) svgs)
    | svg -> f svg

  let formatPath path = 
    let sb = StringBuilder()
    for ps in path do
      match ps with
      | MoveTo(x, y) -> sb.Append("M" + string x + " " + string y + " ")
      | LineTo(x, y) -> sb.Append("L" + string x + " " + string y + " ")
    sb.ToString()

  type RenderingContext = 
    { Definitions : ResizeArray<DomNode> }

  let rec renderSvg ctx svg = seq { 
    match svg with
    | Empty -> ()
    | Text((x,y), t, rotation, style) ->
        let attrs = 
          [ yield "style" => style 
            if rotation = 0.0 then
              yield "x" => string x
              yield "y" => string y
            else
              yield "x" => "0"
              yield "y" => "0"
              yield "transform" => sprintf "translate(%f,%f) rotate(%f)" x y rotation ]
        yield s?text attrs [ text t ]

    | Combine ss ->
        for s in ss do yield! renderSvg ctx s

    | Ellipse((cx, cy),(rx, ry), style) ->
        let attrs = 
          [ "cx" => string cx; "cy" => string cy;
            "rx" => string rx; "ry" => string ry; "style" => style ]
        yield s?ellipse attrs []

    | Image(href, (x, y), (w, h), preserveAspectRatio) ->
        let attrs = 
          [ "href" => href; "preserveAspectRatio" => preserveAspectRatio
            "x" => string x; "y" => string y 
            "width" => string w; "height" => string h ]
        yield s?image attrs []

    | Rect((x1, y1),(x2, y2), style) ->
        let l, t = min x1 x2, min y1 y2
        let w, h = abs (x1 - x2), abs (y1 - y2)
        let attrs = 
          [ "x" => string l; "y" => string t; "width" => string w; 
            "height" => string h; "style" => style ]
        yield s?rect attrs []

    | Path(p, style) ->
        let attrs = [ "d" => formatPath p; "style" => style ]
        yield s?path attrs  [] }

  let formatColor = function
    | RGB(r,g,b) -> sprintf "rgb(%d, %d, %d)" r g b
    | HTML(clr) -> clr

  let formatNumber = function
    | Integer n -> string n
    | Percentage p -> string p + "%"

  let rec formatStyle (defs:ResizeArray<_>) style = 
    let style, anim =
      match style.Animation with 
      | Some (ms, ease, anim) ->
          let id = "anim_" + System.Guid.NewGuid().ToString().Replace("-", "")
          let fromstyle = formatStyle defs { style with Animation = None }
          let tostyle = formatStyle defs { anim style with Animation = None }
          h?style [] [ text (sprintf "@keyframes %s { from { %s } to { %s } }" id fromstyle tostyle) ] |> defs.Add
          anim style, sprintf "animation: %s %dms %s; " id ms ease
      | None -> style, ""

    anim +
    ( String.concat "" [ for c in style.Cursor.Split(',') -> "cursor:" + c + ";" ] ) +
    ( "font:" + style.Font + ";" ) +
    ( let (so, clr) = style.StrokeColor 
      let (Pixels sw) = style.StrokeWidth
      sprintf "stroke-opacity:%f; stroke-width:%dpx; stroke:%s; " so sw (formatColor clr) ) +
    ( if Seq.isEmpty style.StrokeDashArray then "" 
      else "stroke-dasharray:" + String.concat "," (Seq.map formatNumber style.StrokeDashArray) + ";" ) +
    ( match style.Fill with
      | LinearGradient(points) ->
          let id = "gradient_" + System.Guid.NewGuid().ToString().Replace("-", "")
          s?linearGradient ["id"=>id] 
            [ for pt, (o, clr) in points ->
                s?stop ["offset"=> string pt + "%"; "stop-color" => formatColor clr; "stop-opacity" => string o ] [] ]
          |> defs.Add
          sprintf "fill:url(#%s)" id
      | Solid(fo, clr) ->
          sprintf "fill-opacity:%f; fill:%s; " fo (formatColor clr) )

// ------------------------------------------------------------------------------------------------
// Calculating scales
// ------------------------------------------------------------------------------------------------

module Scales = 

  type ScaledShape<[<Measure>] 'vx, [<Measure>] 'vy> = 
    | ScaledStyle of (Style -> Style) * ScaledShape<'vx, 'vy>
    | ScaledText of Value<'vx> * Value<'vy> * VerticalAlign * HorizontalAlign * float * string    
    | ScaledLine of (Value<'vx> * Value<'vy>)[]
    | ScaledBubble of Value<'vx> * Value<'vy> * float * float
    | ScaledShape of (Value<'vx> * Value<'vy>)[]
    | ScaledImage of string * (Value<'vx> * Value<'vy>) * (Value<'vx> * Value<'vy>)
    | ScaledLayered of ScaledShape<'vx, 'vy>[]
    | ScaledInteractive of seq<EventHandler<'vx, 'vy>> * Scale<'vx> * Scale<'vy> * ScaledShape<'vx, 'vy>
    | ScaledPadding of (float * float * float * float) * Scale<'vx> * Scale<'vy> * ScaledShape<'vx, 'vy>
    | ScaledOffset of (float * float) * ScaledShape<'vx, 'vy>
    
    | ScaledNestX of Value<'vx> * Value<'vx> * Scale<'vx> * ScaledShape<'vx, 'vy>
    | ScaledNestY of Value<'vy> * Value<'vy> * Scale<'vy> * ScaledShape<'vx, 'vy>

  let getExtremes = function
    | Continuous(l, h) -> COV l, COV h
    | Categorical(vals) ->  CAR(vals.[0], 0.0), CAR(vals.[vals.Length-1], 1.0)

  /// Given a range, return a new aligned range together with the magnitude  
  let calculateMagnitudeAndRange (lo:float, hi:float) = 
    let magnitude = 10. ** round (log10 (hi - lo))
    let magnitude = magnitude / 2.
    magnitude, (floor (lo / magnitude) * magnitude, ceil (hi / magnitude) * magnitude)

  /// Get number of decimal points to show for the given range
  let decimalPoints range = 
    let magnitude, _ = calculateMagnitudeAndRange range
    max 0. (ceil (-(log10 magnitude)))

  /// Extend the given range to a nicely adjusted size
  let adjustRange range = snd (calculateMagnitudeAndRange range)
  let adjustRangeUnits (l:float<'u>,h:float<'u>) : float<'u> * float<'u> =
    let l, h = adjustRange (unbox l, unbox h) in unbox l, unbox h

  let toArray s = Array.ofSeq s // REVIEW: Hack to avoid Float64Array (which behaves oddly in Safari) see https://github.com/zloirock/core-js/issues/285

  /// Generate points for a grid. Count specifies how many points to generate
  /// (this is minimm - the result will be up to 5x more).
  let generateSteps count k (lo, hi) = 
    let magnitude, (nlo, nhi) = calculateMagnitudeAndRange (lo, hi)
    let dividers = [0.2; 0.5; 1.; 2.; 5.; 10.; 20.; 40.; 50.; 60.; 80.; 100.]
    let magnitudes = dividers |> Seq.map (fun d -> magnitude / d)
    let step = magnitudes |> Seq.filter (fun m -> (hi - lo) / m >= count) |> Seq.tryHead
    let step = defaultArg step (magnitude / 100.)
    seq { for v in nlo .. step * k .. nhi do
            if v >= lo && v <= hi then yield v } |> toArray

  let generateAxisSteps s =
    match s with 
    | Continuous(CO l, CO h) ->
        generateSteps 6. 1. (float l, float h) |> Array.map (fun f -> COV(CO (unbox f)))
    | Categorical vs -> [| for CA s in vs -> CAR(CA s, 0.5) |]

  let generateAxisLabels fmt (s:Scale<'v>) : (Value<'v> * string)[] =
    let sunit = unbox<Scale<1>> s
    match s with 
    | Continuous(CO l, CO h) ->
        generateSteps 6. 2. (float l, float h) 
        |> Array.map (fun f -> COV(CO (unbox f)), fmt sunit (COV(CO(unbox<float<1>> f))))
    | Categorical vs -> [| for v & CA s in vs -> CAR(CA s, 0.5), fmt sunit (CAR(CA s, 0.5)) |]

  let unionScales s1 s2 =
    match s1, s2 with
    | Continuous(l1, h1), Continuous(l2, h2) -> Continuous(min l1 l2, max h1 h2)
    | Categorical(v1), Categorical(v2) -> Categorical(Array.distinct (Array.append v1 v2))
    | _ -> 
        failwith "Cannot union continuous with categorical"

  let calculateShapeScale vals = 
    let scales =
      vals |> Array.fold (fun state value ->
        match state, value with 
        | Choice1Of3(), COV(CO v) -> Choice2Of3([v])
        | Choice2Of3(vs), COV(CO v) -> Choice2Of3(v::vs)
        | Choice1Of3(), CAR(CA x, _) -> Choice3Of3([x])
        | Choice3Of3(xs), CAR(CA x, _) -> Choice3Of3(x::xs)
        | _ -> failwith "Values with mismatching scales") (Choice1Of3())
    match scales with
    | Choice1Of3() -> failwith "No values for calculating a scale"
    | Choice2Of3(vs) -> Continuous (CO (List.min vs), CO (List.max vs))
    | Choice3Of3(xs) -> Categorical (Array.distinct [| for x in List.rev xs -> CA x |])

  let calculateShapeScales points = 
    let xs = points |> Array.map fst 
    let ys = points |> Array.map snd
    calculateShapeScale xs, calculateShapeScale ys

  // Always returns objects with the same inner and outer scales
  // but outer scales can be replaced later by replaceScales
  let rec calculateScales<[<Measure>] 'ux, [<Measure>] 'uy> style (shape:Shape<'ux, 'uy>) = 
    let calculateScalesStyle = calculateScales 
    let calculateScales = calculateScales style
    match shape with
    | Style(f, shape) ->
        let scales, shape = calculateScalesStyle (f style) shape
        scales, ScaledStyle(f, shape)

    | NestX(nx1, nx2, shape) ->
        let (isx, isy), shape = calculateScales shape
        (calculateShapeScale [| nx1; nx2 |], isy), ScaledNestX(nx1, nx2, isx, shape)

    | NestY(ny1, ny2, shape) ->
        let (isx, isy), shape = calculateScales shape
        (isx, calculateShapeScale [| ny1; ny2 |]), ScaledNestY(ny1, ny2, isy, shape)

    | InnerScale(sx, sy, shape) ->
        let (isx, isy), shape = calculateScales shape
        let sx = match sx with Some sx -> sx | _ -> isx // TODO: check that 'sx' is compatible with 'isx'
        let sy = match sy with Some sy -> sy | _ -> isy // TODO: check that 'sy' is compatible with 'isy'
        (sx, sy), shape

    | AutoScale(ax, ay, shape) ->
        let (isx, isy), shape = calculateScales shape
        let autoScale = function
          | Continuous(CO l, CO h) -> let l, h = adjustRangeUnits (l, h) in Continuous(CO l, CO h)
          | scale -> scale
        let scales = 
          ( if ax then autoScale isx else isx ),
          ( if ay then autoScale isy else isy )
        scales, shape

    | Offset(offs, shape) ->
        let scales, shape = calculateScales shape
        scales, ScaledOffset(offs, shape)

    | Padding(pads, shape) ->
        let (sx, sy), shape = calculateScales shape
        (sx, sy), ScaledPadding(pads, sx, sy, shape)

    | Bubble(x, y, rx, ry) ->
        let makeSingletonScale = function COV(v) -> Continuous(v, v) | CAR(v, _) -> Categorical [| v |]
        let scales = makeSingletonScale x, makeSingletonScale y
        scales, ScaledBubble(x, y, rx, ry)

    | Shape.Text(x, y, va, ha, r, t) ->
        let makeSingletonScale = function COV(v) -> Continuous(v, v) | CAR(v, _) -> Categorical [| v |]
        let scales = makeSingletonScale x, makeSingletonScale y
        scales, ScaledText(x, y, va, ha, r, t)

    | Line line -> 
        let line = Seq.toArray line 
        let scales = calculateShapeScales line
        scales, ScaledLine(line)

    | Image(href, pt1, pt2) -> 
        let scales = calculateShapeScales [| pt1; pt2 |]
        scales, ScaledImage(href, pt1, pt2)

    | Shape points -> 
        let points = Seq.toArray points
        let scales = calculateShapeScales points
        scales, ScaledShape(points)
    
    | Axes(showTop, showRight, showBottom, showLeft, shape) ->
        
        let (origScales & (sx, sy)), _ = calculateScales shape 
        let (lx, hx), (ly, hy) = getExtremes sx, getExtremes sy
       
        let LineStyle clr alpha width shape = 
          Style((fun s -> { s with Fill = Solid(1.0, HTML "transparent"); StrokeWidth = Pixels width; StrokeColor=alpha, HTML clr }), shape)
        let FontStyle style shape = 
          Style((fun s -> { s with Font = style; Fill = Solid(1.0, HTML "black"); StrokeColor = 0.0, HTML "transparent" }), shape)

        let shape = 
          Layered [ 
            yield InnerScale(Some sx, Some sy, Layered [
              for x in generateAxisSteps sx do
                yield Line [x,ly; x,hy] |> LineStyle "#e4e4e4" 1.0 1
              for y in generateAxisSteps sy do
                yield Line [lx,y; hx,y] |> LineStyle "#e4e4e4" 1.0 1 ])
            if showTop then
              yield Line [lx,hy; hx,hy] |> LineStyle "black" 1.0 2
              for x, l in generateAxisLabels style.FormatAxisXLabel sx do
                yield Offset((0., -10.), Text(x, hy, VerticalAlign.Baseline, HorizontalAlign.Center, 0.0, l)) |> FontStyle "9pt sans-serif"
            if showRight then
              yield Line [hx,hy; hx,ly] |> LineStyle "black" 1.0 2
              for y, l in generateAxisLabels style.FormatAxisYLabel sy do
                yield Offset((10., 0.), Text(hx, y, VerticalAlign.Middle, HorizontalAlign.Start, 0.0, l)) |> FontStyle "9pt sans-serif"
            if showBottom then
              yield Line [lx,ly; hx,ly] |> LineStyle "black" 1.0 2
              for x, l in generateAxisLabels style.FormatAxisXLabel sx do
                yield Offset((0., 10.), Text(x, ly, VerticalAlign.Hanging, HorizontalAlign.Center, 0.0, l)) |> FontStyle "9pt sans-serif"
            if showLeft then
              yield Line [lx,hy; lx,ly] |> LineStyle "black" 1.0 2
              for y, l in generateAxisLabels style.FormatAxisYLabel sy do
                yield Offset((-10., 0.), Text(lx, y, VerticalAlign.Middle, HorizontalAlign.End, 0.0, l)) |> FontStyle "9pt sans-serif"
            yield shape ]
            
        let padding = 
          (if showTop then 30. else 0.), (if showRight then 50. else 0.),
          (if showBottom then 30. else 0.), (if showLeft then 50. else 0.) 
        calculateScales (Padding(padding, shape))

    | Layered shapes ->
        let shapes = shapes |> Array.ofSeq
        let scaled = shapes |> Array.map calculateScales 
        let sxs = scaled |> Array.map (fun ((sx, _), _) -> sx)
        let sys = scaled |> Array.map (fun ((_, sy), _) -> sy)
        let scales = (Array.reduce unionScales sxs, Array.reduce unionScales sys)
        scales, ScaledLayered (Array.map snd scaled)

    | Interactive(f, shape) ->
        let scales, shape = calculateScales shape
        scales, ScaledInteractive(f, fst scales, snd scales, shape)


// ------------------------------------------------------------------------------------------------
// Projections
// ------------------------------------------------------------------------------------------------

module Projections = 
  let projectOne reversed (tlv:float<_>, thv:float<_>) scale coord = 
    match scale, coord with
    | Categorical(vals), (CAR(CA v,f)) ->
        let size = (thv - tlv) / float vals.Length
        let i = vals |> Array.findIndex (fun (CA vv) -> v = vv)
        let i = float i + f
        if reversed then thv - (i * size) else tlv + (i * size)
    | Continuous(CO slv, CO shv), (COV (CO v)) ->
        if reversed then thv - (v - slv) / (shv - slv) * (thv - tlv)
        else tlv + (v - slv) / (shv - slv) * (thv - tlv)
    | Categorical _, COV _ -> failwithf "Cannot project continuous value (%A) on a categorical scale (%A)." coord scale
    | Continuous _, CAR _ -> failwithf "Cannot project categorical value (%A) on a continuous scale (%A)." coord scale

  let projectOneX a = projectOne false a
  let projectOneY a = projectOne true a

  let projectInvOne reversed (l:float, h:float) s (v:float) = 
    match s with 
    | Continuous(CO slv, CO shv) ->
        if reversed then COV(CO (shv - (v - l) / (h - l) * (shv - slv)))
        else COV(CO (slv + (v - l) / (h - l) * (shv - slv)))

    | Categorical(cats) ->
        let size = (h - l) / float cats.Length
        let i = if reversed then floor ((h - v) / size) else floor ((v - l) / size)
        let f = if reversed then ((h - v) / size) - i else ((v - l) / size) - i
        let i = if size < 0. then (float cats.Length) + i else i // Negative when thv < tlv
        if int i < 0 || int i >= cats.Length then CAR(CA "<outside-of-range>", f)
        else CAR(cats.[int i], f)

  let projectInv (x1, y1, x2, y2) (sx, sy) (x, y) =
    projectInvOne false (x1, x2) sx x, 
    projectInvOne true (y1, y2) sy y

// ------------------------------------------------------------------------------------------------
// Drawing
// ------------------------------------------------------------------------------------------------


module Drawing = 
  open Svg
  open Scales
  open Projections

  type DrawingContext = 
    { Style : Style
      Definitions : ResizeArray<DomNode> }

  let rec hideFill style = 
    { style with Fill = Solid(0.0, RGB(0, 0, 0)); Animation = match style.Animation with Some(n,e,f) -> Some(n,e,f >> hideFill) | _ -> None }
  let rec hideStroke style = 
    { style with StrokeColor = (0.0, snd style.StrokeColor); Animation = match style.Animation with Some(n,e,f) -> Some(n,e,f >> hideStroke) | _ -> None }

  let rec drawShape ctx ((x1, y1, x2, y2) as area) ((sx, sy) as scales) (shape:ScaledShape<'ux, 'uy>) =     

    let project (vx, vy) =
      projectOneX (x1, x2) sx vx, projectOneY (y1, y2) sy vy

    match shape with
    | ScaledNestX(p1, p2, isx, shape) -> 
        let x1' = projectOneX (x1, x2) sx p1
        let x2' = projectOneX (x1, x2) sx p2        
        //let x1', x2' = if x2 < x1 then max x1' x2', min x1' x2' else min x1' x2', max x1' x2'
        drawShape ctx (x1', y1, x2', y2) (isx, sy) shape

    | ScaledNestY(p1, p2, isy, shape) -> 
        let y1' = projectOneY (y1, y2) sy p1
        let y2' = projectOneY (y1, y2) sy p2
        //let y1', y2' = if y2 < y1 then  min y1' y2', max y1' y2' else max y1' y2', min y1' y2' 
        drawShape ctx (x1, y1', x2, y2') (sx, isy) shape

    | ScaledOffset((dx, dy), shape) ->
        drawShape ctx (x1 + dx, y1 + dy, x2 + dx, y2 + dy) scales shape

    | ScaledLayered shapes ->
        Combine(Array.map (drawShape ctx area scales) shapes)

    | ScaledStyle(f, shape) ->
        drawShape { ctx with Style = f ctx.Style } area scales shape

    | ScaledShape(points) -> 
        let path = 
          [| yield MoveTo(project (points.[0]))
             for pt in Seq.skip 1 points do yield LineTo(project pt) 
             yield LineTo(project (points.[0])) |]
        Path(path, formatStyle ctx.Definitions (hideStroke ctx.Style)) 

    | ScaledImage(href, pt1, pt2) ->
        let x1, y1 = project pt1
        let x2, y2 = project pt2
        Image(href, (min x1 x2, min y1 y2), (abs(x2 - x1), abs(y2 - y1)), ctx.Style.PreserveAspectRatio)

    | ScaledPadding((t, r, b, l), isx, isy, shape) ->
        let calculateNestedRange rev (v1, v2) ins outs =
          match ins with 
          | Continuous(CO l, CO h) -> 
              let pos = 
                [ projectOne rev (v1, v2) outs (COV (CO l))
                  projectOne rev (v1, v2) outs (COV (CO h)) ]
              Seq.min pos, Seq.max pos
          | Categorical(vals) ->              
              let pos = vals |> Seq.collect (fun v -> 
                [ projectOne rev (v1, v2) outs (CAR(v, 0.0))
                  projectOne rev (v1, v2) outs (CAR(v, 1.0)) ])
              Seq.min pos, Seq.max pos
          //|> fun rs -> printfn "calculateNestedRange %A %A %A = %A" (v1, v2) ins outs rs; rs
          
        let x1', x2' = calculateNestedRange false (x1, x2) isx sx
        let y1', y2' = calculateNestedRange true (y1, y2) isy sy
        //printfn "PADDING: %A\nAXES: %A\nAREA: %A\nNEW AREA: %A\nAFTER PAD: %A\n\n" (t, r, b, l) (isx, isy)  area (x1', y1', x2', y2') (x1' + l, y1' + t, x2' - r, y2' - b)
        drawShape ctx (x1'+l, y1'+t, x2'-r, y2'-b) (isx, isy) shape

    | ScaledLine line -> 
        let path = 
          [ yield MoveTo(project (Seq.head line)) 
            for pt in Seq.skip 1 line do yield LineTo (project pt) ]
          |> Array.ofList
        Path(path, formatStyle ctx.Definitions (hideFill ctx.Style))

    | ScaledText(x, y, va, ha, r, t) -> 
        let va = match va with Baseline -> "baseline" | Hanging -> "hanging" | Middle -> "middle"
        let ha = match ha with Start -> "start" | Center -> "middle" | End -> "end"
        let xy = project (x, y)
        Text(xy, t, r, sprintf "alignment-baseline:%s; text-anchor:%s;" va ha + formatStyle ctx.Definitions ctx.Style)

    | ScaledBubble(x, y, rx, ry) -> 
        Ellipse(project (x, y), (rx, ry), formatStyle ctx.Definitions ctx.Style)

    | ScaledInteractive(f, _, _, shape) ->
        drawShape ctx area scales shape


// ------------------------------------------------------------------------------------------------
// Event handling
// ------------------------------------------------------------------------------------------------

module Events = 
  open Scales
  open Projections

  type MouseEventKind = Click | Move | Up | Down
  type TouchEventKind = Move | Start 

  type InteractiveEvent<[<Measure>] 'vx, [<Measure>] 'vy> = 
    | MouseEvent of MouseEventKind * (Value<'vx> * Value<'vy>)    
    | TouchEvent of TouchEventKind * (Value<'vx> * Value<'vy>)    
    | TouchEnd
    | MouseLeave

  let projectEvent area scales event =
    match event with
    | MouseEvent(kind, (COV (CO x), COV (CO y))) -> MouseEvent(kind, projectInv area scales (x, y))
    | TouchEvent(kind, (COV (CO x), COV (CO y))) -> TouchEvent(kind, projectInv area scales (x, y))
    | MouseEvent _
    | TouchEvent _ -> failwith "TODO: projectEvent - not continuous"
    | TouchEnd -> TouchEnd
    | MouseLeave -> MouseLeave

  let inScale s v = 
    match s, v with
    | Continuous(CO l, CO h), COV(CO v) -> v >= min l h && v <= max l h
    | Categorical(cats), CAR(v, _) -> cats |> Seq.exists ((=) v)
    | Continuous _, CAR _ -> failwith "inScale: Cannot test if categorical value is in continuous scale"
    | Categorical _, COV _ -> failwith "inScale: Cannot test if continuous value is in categorical scale"

  let inScales (sx, sy) event =
    match event with
    | MouseLeave -> true
    | TouchEnd -> true
    | MouseEvent(_, (x, y)) 
    | TouchEvent(_, (x, y)) -> inScale sx x && inScale sy y

  let rec triggerEvent<[<Measure>] 'ux, [<Measure>] 'uy> 
      ((x1, y1, x2, y2) as area) ((sx, sy) as scales) (shape:ScaledShape<'ux, 'uy>) 
      (jse:Event) (event:InteractiveEvent<1,1>) = 
    match shape with
    | ScaledLine _
    | ScaledText _
    | ScaledImage _ 
    | ScaledBubble _
    | ScaledShape _ -> ()
    | ScaledStyle(_, shape) -> triggerEvent area scales shape jse event
    | ScaledOffset((dx, dy), shape) ->
        triggerEvent (x1 + dx, y1 + dy, x2 + dx, y2 + dy) scales shape jse event
    | ScaledNestX(p1, p2, isx, shape) -> 
        let x1' = projectOneX (x1, x2) sx p1
        let x2' = projectOneX (x1, x2) sx p2        
        //let x1', x2' = if x2 < x1 then max x1' x2', min x1' x2' else min x1' x2', max x1' x2'
        triggerEvent (x1', y1, x2', y2) (isx, sy) shape jse event

    | ScaledNestY(p1, p2, isy, shape) -> 
        let y1' = projectOneY (y1, y2) sy p1
        let y2' = projectOneY (y1, y2) sy p2
        //let y1', y2' = if y2 < y1 then  min y1' y2', max y1' y2' else max y1' y2', min y1' y2' 
        triggerEvent (x1, y1', x2, y2') (sx, isy) shape jse event
    | ScaledPadding((t, r, b, l), isx, isy, shape) ->
        let calculateNestedRange rev (v1, v2) ins outs =
          match ins with 
          | Continuous(CO l, CO h) -> 
              let pos = 
                [ projectOne rev (v1, v2) outs (COV (CO l))
                  projectOne rev (v1, v2) outs (COV (CO h)) ]
              Seq.min pos, Seq.max pos
          | Categorical(vals) ->              
              let pos = vals |> Seq.collect (fun v -> 
                [ projectOne rev (v1, v2) outs (CAR(v, 0.0))
                  projectOne rev (v1, v2) outs (CAR(v, 1.0)) ])
              Seq.min pos, Seq.max pos
          //|> fun rs -> printfn "calculateNestedRange %A %A %A = %A" (v1, v2) ins outs rs; rs
          
        let x1', x2' = calculateNestedRange false (x1, x2) isx sx
        let y1', y2' = calculateNestedRange true (y1, y2) isy sy
        //printfn "PADDING: %A\nAXES: %A\nAREA: %A\nNEW AREA: %A\nAFTER PAD: %A\n\n" (t, r, b, l) (isx, isy)  area (x1', y1', x2', y2') (x1' + l, y1' + t, x2' - r, y2' - b)
        triggerEvent (x1' + l, y1' + t, x2' - r, y2' - b) (isx, isy) shape jse event

    | ScaledLayered shapes -> for shape in shapes do triggerEvent area scales shape jse event
    | ScaledInteractive(handlers, sx, sy, shape) ->
        let localEvent = projectEvent area scales event
        if inScales scales localEvent then 
          for handler in handlers do 
            match localEvent, handler with
            | MouseEvent(MouseEventKind.Click, pt), EventHandler.Click(f) 
            | MouseEvent(MouseEventKind.Move, pt), MouseMove(f) 
            | MouseEvent(MouseEventKind.Up, pt), MouseUp(f) 
            | MouseEvent(MouseEventKind.Down, pt), MouseDown(f) -> 
                if jse <> null then jse.preventDefault()
                f (unbox jse) pt
            | TouchEvent(TouchEventKind.Move, pt), TouchMove(f) 
            | TouchEvent(TouchEventKind.Start, pt), TouchStart(f) ->
                if jse <> null then jse.preventDefault()
                f (unbox jse) pt
            | TouchEnd, EventHandler.TouchEnd f -> f (unbox jse) 
            | MouseLeave, EventHandler.MouseLeave f -> f (unbox jse) 
            | MouseLeave, _ 
            | TouchEnd, _
            | TouchEvent(_, _), _  
            | MouseEvent(_, _), _  -> ()
        triggerEvent area scales shape jse event


// ------------------------------------------------------------------------------------------------
// Derived
// ------------------------------------------------------------------------------------------------

module Derived = 
  let PreserveAspectRatio(pa, s) = 
    Shape.Style((fun s -> { s with PreserveAspectRatio = pa }), s)

  let StrokeColor(clr, s) = 
    Shape.Style((fun s -> { s with StrokeColor = (1.0, HTML clr) }), s)

  let FillColor(clr, s) = 
    Shape.Style((fun s -> { s with Fill = Solid(1.0, HTML clr) }), s)

  let Font(font, clr, s) =
    Shape.Style((fun s -> { s with Fill = Solid(1.0, HTML clr); StrokeColor = (0.0, HTML clr); Font = font }), s)

  let Area(line) = Shape <| seq {
    let line = Array.ofSeq line
    let firstX, lastX = fst line.[0], fst line.[line.Length - 1]
    yield firstX, COV (CO 0.0)
    yield! line
    yield lastX, COV (CO 0.0)
    yield firstX, COV (CO 0.0) }

  let VArea(line) = Shape <| seq {
    let line = Array.ofSeq line
    let firstY, lastY = snd line.[0], snd line.[line.Length - 1]
    yield COV (CO 0.0), firstY
    yield! line
    yield COV (CO 0.0), lastY
    yield COV (CO 0.0), firstY }

  let VShiftedArea(offs, line) = Shape <| seq {
    let line = Array.ofSeq line
    let firstY, lastY = snd line.[0], snd line.[line.Length - 1]
    yield COV (CO offs), firstY
    yield! line
    yield COV (CO offs), lastY
    yield COV (CO offs), firstY }

  let Bar(x, y) = Shape <| seq {
    yield COV x, CAR(y, 0.0)
    yield COV x, CAR(y, 1.0)
    yield COV (CO 0.0), CAR(y, 1.0)
    yield COV (CO 0.0), CAR(y, 0.0) }
    
  let Column(x, y) : Shape<1, 1> = Shape <| seq {
    yield CAR(x, 0.0), COV y
    yield CAR(x, 1.0), COV y
    yield CAR(x, 1.0), COV (CO 0.0)
    yield CAR(x, 0.0), COV (CO 0.0) }

// ------------------------------------------------------------------------------------------------
// integration
// ------------------------------------------------------------------------------------------------

module Compost = 
  open Scales
  open Svg
  open Drawing
  open Events

  let niceNumber num decs =
    let str = string num
    let dot = str.IndexOf('.')
    let before, after = 
      if dot = -1 then str, ""
      else str.Substring(0, dot), str.Substring(dot + 1, min decs (str.Length - dot - 1))
    let after = 
      if after.Length < decs then after + System.String [| for i in 1 .. (decs - after.Length) -> '0' |]
      else after 
    let mutable res = before
    if before.Length > 5 then
      for i in before.Length-1 .. -1 .. 0 do
        let j = before.Length - i
        if i <> 0 && j % 3 = 0 then res <- res.Insert(i, ",")
    if Seq.forall ((=) '0') after then res
    else res + "." + after    

  let defaultFormat scale value = 
    match value with
    | CAR(CA s, _) -> s
    | COV(CO v) ->
        let dec = 
          match scale with
          | Continuous(CO l, CO h) -> decimalPoints (unbox l, unbox h)
          | _ -> 0.
        niceNumber (System.Math.Round(unbox<float> v, int dec)) (int dec)    

  let defstyle = 
    { Fill = Solid(1.0, RGB(196, 196, 196))
      StrokeColor = (1.0, RGB(256, 0, 0))
      StrokeDashArray = []
      StrokeWidth = Pixels 2
      Animation = None 
      PreserveAspectRatio = ""
      Cursor = "default"
      Font = "10pt sans-serif"
      FormatAxisXLabel = defaultFormat
      FormatAxisYLabel = defaultFormat }

  let getRelativeLocation el x y =
    let rec getOffset (parent:HTMLElement) (x, y) = 
      if parent = null then (x, y)
      else getOffset (unbox parent.offsetParent) (x-parent.offsetLeft, y-parent.offsetTop)
    let rec getParent (parent:HTMLElement) = 
      // Safari: Skip over all the elements nested inside <svg> as they are weird
      // IE: Use parentNode when parentElement is not available (inside <svg>?)
      if parent.namespaceURI = "http://www.w3.org/2000/svg" && parent.tagName <> "svg" then
        if parent.parentElement <> null then getParent parent.parentElement
        else getParent (unbox parent.parentNode)
      elif parent.offsetParent <> null then parent 
      elif parent.parentElement <> null then getParent parent.parentElement
      else getParent (unbox parent.parentNode)
    getOffset (getParent el) (x, y)

  let createSvg revX revY (width, height) viz = 
    let (sx, sy), shape = calculateScales defstyle viz

    let defs = ResizeArray<_>()
    let area = (0.0, 0.0, width, height)
    let svg = drawShape { Definitions = defs; Style = defstyle } area (sx, sy) shape

    let triggerEvent (e:Event) = triggerEvent area (sx, sy) shape e

    let mouseHandler kind el (evt:Event) =
      let evt = evt :?> MouseEvent
      let x, y = getRelativeLocation el evt.pageX evt.pageY
      triggerEvent evt (MouseEvent(kind, (COV(CO x), COV(CO y))))

    let touchHandler kind el (evt:Event) =
      let evt = evt :?> TouchEvent
      let touch = evt.touches.[0]
      let x, y = getRelativeLocation el touch.pageX touch.pageY
      triggerEvent evt (TouchEvent(kind, (COV(CO x), COV(CO y))))


    h?div [] [ 
      s?svg [
          "style"=>"overflow:visible"
          "width"=>string (int width); "height"=> string(int height); 
          "click" =!> mouseHandler MouseEventKind.Click
          "mousemove" =!> mouseHandler MouseEventKind.Move
          "mousedown" =!> mouseHandler MouseEventKind.Down
          "mouseup" =!> mouseHandler MouseEventKind.Up
          "mouseleave" =!> fun _ evt -> triggerEvent evt MouseLeave
          "touchmove" =!> touchHandler TouchEventKind.Move
          "touchstart" =!> touchHandler TouchEventKind.Start
          "touchend" =!> fun _ evt -> triggerEvent evt TouchEnd
        ] [
          let renderCtx = { Definitions = defs }
          let body = renderSvg renderCtx svg |> Array.ofSeq
          yield! defs
          yield! body
        ]
    ]
