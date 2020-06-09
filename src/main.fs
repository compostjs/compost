module Demo.Main

open Compost
open Compost.Html
open Browser

let render out viz = 
  let el = document.getElementById(out)
  let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
  svg |> Html.renderTo el

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

// http://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?Travel=NIxRSxSUx&FromSeries=1&ToSeries=50&DAT=RNG&FD=1&FM=Jan&FY=2016&TD=1&TM=Jan&TY=2017&VFD=N&csv.x=17&csv.y=24&CSVF=TN&C=C8P&Filter=N

let elections = 
  [ "Conservative", "#1F77B4", 317, 365; "Labour", "#D62728", 262, 202; 
    "LibDem", "#FF7F0E", 12, 11; "SNP", "#BCBD22", 35, 48; 
    "Green", "#2CA02C", 1, 1; "DUP", "#8C564B", 10, 8 ]

let gbpusd = [ 1.3206; 1.3267; 1.312; 1.3114; 1.3116; 1.3122; 1.3085; 1.3211; 1.3175; 1.3136; 1.3286; 1.3231; 1.3323; 1.3215; 1.3186; 1.2987; 1.296; 1.2932; 1.2885; 1.3048; 1.3287; 1.327; 1.3429; 1.3523; 1.3322; 1.3152; 1.3621; 1.4798; 1.4687; 1.467; 1.4694; 1.4293; 1.4064; 1.4196; 1.4114; 1.4282; 1.4334; 1.4465; 1.4552; 1.456; 1.4464; 1.4517; 1.4447; 1.4414 ] |> List.rev
let gbpeur = [ 1.1823; 1.1867; 1.1838; 1.1936; 1.1944; 1.1961; 1.1917; 1.2017; 1.1969; 1.193; 1.2006; 1.1952; 1.1998; 1.1903; 1.1909; 1.1759; 1.1743; 1.168; 1.1639; 1.175; 1.1929; 1.192; 1.2081; 1.2177; 1.2054; 1.1986; 1.2254; 1.3039; 1.3018; 1.3018; 1.296; 1.2709; 1.2617; 1.2634; 1.2589; 1.2639; 1.2687; 1.2771; 1.2773; 1.2823; 1.2726; 1.2814; 1.2947; 1.2898 ] |> List.rev

let inline i a b c d s = 
  dict ["sepal.length", float a;"sepal.width", float b;"petal.length",float c; "petal.width",float d], s
let iris = 
  [ i 5.1 3.5 1.4 0.2 "Setosa"; i 4.9 3 1.4 0.2 "Setosa"; i 4.7 3.2 1.3 0.2 "Setosa"; i 4.6 3.1 1.5 0.2 "Setosa"; i 5 3.6 1.4 0.2 "Setosa"; i 5.4 3.9 1.7 0.4 "Setosa"; i 4.6 3.4 1.4 0.3 "Setosa"; i 5 3.4 1.5 0.2 "Setosa"; i 4.4 2.9 1.4 0.2 "Setosa"; i 4.9 3.1 1.5 0.1 "Setosa"; i 5.4 3.7 1.5 0.2 "Setosa"; i 4.8 3.4 1.6 0.2 "Setosa"; i 4.8 3 1.4 0.1 "Setosa"; i 4.3 3 1.1 0.1 "Setosa"; i 5.8 4 1.2 0.2 "Setosa"; i 5.7 4.4 1.5 0.4 "Setosa"; i 5.4 3.9 1.3 0.4 "Setosa"; i 5.1 3.5 1.4 0.3 "Setosa"; i 5.7 3.8 1.7 0.3 "Setosa"; i 5.1 3.8 1.5 0.3 "Setosa"; i 5.4 3.4 1.7 0.2 "Setosa"; i 5.1 3.7 1.5 0.4 "Setosa"; i 4.6 3.6 1 0.2 "Setosa"; i 5.1 3.3 1.7 0.5 "Setosa"; i 4.8 3.4 1.9 0.2 "Setosa"; i 5 3 1.6 0.2 "Setosa"; i 5 3.4 1.6 0.4 "Setosa"; i 5.2 3.5 1.5 0.2 "Setosa"; i 5.2 3.4 1.4 0.2 "Setosa"; i 4.7 3.2 1.6 0.2 "Setosa"; i 4.8 3.1 1.6 0.2 "Setosa"; i 5.4 3.4 1.5 0.4 "Setosa"; i 5.2 4.1 1.5 0.1 "Setosa"; i 5.5 4.2 1.4 0.2 "Setosa"; i 4.9 3.1 1.5 0.2 "Setosa"; i 5 3.2 1.2 0.2 "Setosa"; i 5.5 3.5 1.3 0.2 "Setosa"; i 4.9 3.6 1.4 0.1 "Setosa"; i 4.4 3 1.3 0.2 "Setosa"; i 5.1 3.4 1.5 0.2 "Setosa"; i 5 3.5 1.3 0.3 "Setosa"; i 4.5 2.3 1.3 0.3 "Setosa"; 
    i 4.4 3.2 1.3 0.2 "Setosa"; i 5 3.5 1.6 0.6 "Setosa"; i 5.1 3.8 1.9 0.4 "Setosa"; i 4.8 3 1.4 0.3 "Setosa"; i 5.1 3.8 1.6 0.2 "Setosa"; i 4.6 3.2 1.4 0.2 "Setosa"; i 5.3 3.7 1.5 0.2 "Setosa"; i 5 3.3 1.4 0.2 "Setosa"; i 7 3.2 4.7 1.4 "Versicolor"; i 6.4 3.2 4.5 1.5 "Versicolor"; i 6.9 3.1 4.9 1.5 "Versicolor"; i 5.5 2.3 4 1.3 "Versicolor"; i 6.5 2.8 4.6 1.5 "Versicolor"; i 5.7 2.8 4.5 1.3 "Versicolor"; i 6.3 3.3 4.7 1.6 "Versicolor"; i 4.9 2.4 3.3 1 "Versicolor"; i 6.6 2.9 4.6 1.3 "Versicolor"; i 5.2 2.7 3.9 1.4 "Versicolor"; i 5 2 3.5 1 "Versicolor"; i 5.9 3 4.2 1.5 "Versicolor"; i 6 2.2 4 1 "Versicolor"; i 6.1 2.9 4.7 1.4 "Versicolor"; i 5.6 2.9 3.6 1.3 "Versicolor"; i 6.7 3.1 4.4 1.4 "Versicolor"; i 5.6 3 4.5 1.5 "Versicolor"; i 5.8 2.7 4.1 1 "Versicolor"; i 6.2 2.2 4.5 1.5 "Versicolor"; i 5.6 2.5 3.9 1.1 "Versicolor"; i 5.9 3.2 4.8 1.8 "Versicolor"; i 6.1 2.8 4 1.3 "Versicolor"; i 6.3 2.5 4.9 1.5 "Versicolor"; i 6.1 2.8 4.7 1.2 "Versicolor"; i 6.4 2.9 4.3 1.3 "Versicolor"; i 6.6 3 4.4 1.4 "Versicolor"; i 6.8 2.8 4.8 1.4 "Versicolor"; i 6.7 3 5 1.7 "Versicolor"; i 6 2.9 4.5 1.5 "Versicolor"; 
    i 5.7 2.6 3.5 1 "Versicolor"; i 5.5 2.4 3.8 1.1 "Versicolor"; i 5.5 2.4 3.7 1 "Versicolor"; i 5.8 2.7 3.9 1.2 "Versicolor"; i 6 2.7 5.1 1.6 "Versicolor"; i 5.4 3 4.5 1.5 "Versicolor"; i 6 3.4 4.5 1.6 "Versicolor"; i 6.7 3.1 4.7 1.5 "Versicolor"; i 6.3 2.3 4.4 1.3 "Versicolor"; i 5.6 3 4.1 1.3 "Versicolor"; i 5.5 2.5 4 1.3 "Versicolor"; i 5.5 2.6 4.4 1.2 "Versicolor"; i 6.1 3 4.6 1.4 "Versicolor"; i 5.8 2.6 4 1.2 "Versicolor"; i 5 2.3 3.3 1 "Versicolor"; i 5.6 2.7 4.2 1.3 "Versicolor"; i 5.7 3 4.2 1.2 "Versicolor"; i 5.7 2.9 4.2 1.3 "Versicolor"; i 6.2 2.9 4.3 1.3 "Versicolor"; i 5.1 2.5 3 1.1 "Versicolor"; i 5.7 2.8 4.1 1.3 "Versicolor"; i 6.3 3.3 6 2.5 "Virginica"; i 5.8 2.7 5.1 1.9 "Virginica"; i 7.1 3 5.9 2.1 "Virginica"; i 6.3 2.9 5.6 1.8 "Virginica"; i 6.5 3 5.8 2.2 "Virginica"; i 7.6 3 6.6 2.1 "Virginica"; i 4.9 2.5 4.5 1.7 "Virginica"; i 7.3 2.9 6.3 1.8 "Virginica"; i 6.7 2.5 5.8 1.8 "Virginica"; i 7.2 3.6 6.1 2.5 "Virginica"; i 6.5 3.2 5.1 2 "Virginica"; i 6.4 2.7 5.3 1.9 "Virginica"; i 6.8 3 5.5 2.1 "Virginica"; i 5.7 2.5 5 2 "Virginica"; i 5.8 2.8 5.1 2.4 "Virginica"; 
    i 6.4 3.2 5.3 2.3 "Virginica"; i 6.5 3 5.5 1.8 "Virginica"; i 7.7 3.8 6.7 2.2 "Virginica"; i 7.7 2.6 6.9 2.3 "Virginica"; i 6 2.2 5 1.5 "Virginica"; i 6.9 3.2 5.7 2.3 "Virginica"; i 5.6 2.8 4.9 2 "Virginica"; i 7.7 2.8 6.7 2 "Virginica"; i 6.3 2.7 4.9 1.8 "Virginica"; i 6.7 3.3 5.7 2.1 "Virginica"; i 7.2 3.2 6 1.8 "Virginica"; i 6.2 2.8 4.8 1.8 "Virginica"; i 6.1 3 4.9 1.8 "Virginica"; i 6.4 2.8 5.6 2.1 "Virginica"; i 7.2 3 5.8 1.6 "Virginica"; i 7.4 2.8 6.1 1.9 "Virginica"; i 7.9 3.8 6.4 2 "Virginica"; i 6.4 2.8 5.6 2.2 "Virginica"; i 6.3 2.8 5.1 1.5 "Virginica"; i 6.1 2.6 5.6 1.4 "Virginica"; i 7.7 3 6.1 2.3 "Virginica"; i 6.3 3.4 5.6 2.4 "Virginica"; i 6.4 3.1 5.5 1.8 "Virginica"; i 6 3 4.8 1.8 "Virginica"; i 6.9 3.1 5.4 2.1 "Virginica"; i 6.7 3.1 5.6 2.4 "Virginica"; i 6.9 3.1 5.1 2.3 "Virginica"; i 5.8 2.7 5.1 1.9 "Virginica"; i 6.8 3.2 5.9 2.3 "Virginica"; i 6.7 3.3 5.7 2.5 "Virginica"; i 6.7 3 5.2 2.3 "Virginica"; i 6.3 2.5 5 1.9 "Virginica"; i 6.5 3 5.2 2 "Virginica"; i 6.2 3.4 5.4 2.3 "Virginica"; i 5.9 3 5.1 1.8 "Virginica" ]

// ----------------------------------------------------------------------------
// DEMO #1: Creating a bar chart
// ----------------------------------------------------------------------------

// TODO: 'Shape.Layered' of 'Derived.Column' (ca, co) 
// TODO: Add 'Derived.FillColor' and 'Shape.Padding'
// TODO: Add 'Shape.Axes'





// ----------------------------------------------------------------------------
// DEMO #2: Creating a colored line chart
// ----------------------------------------------------------------------------

// TODO: Create a line chart using 'Seq.indexed gbpusd' (numv i, numv v)
// TODO: Use 'Derived.StrokeColor' to make it black
// TODO: Add a 'Shape' (numv 0, numv 1) --> (numv 16, numv 1.8))
// TODO: Make it #aec7e8 using 'Derived.FillColor' 
// DEMO: Add second background box
// DEMO: Add axes using 'Shape.Axes(f, t, t, t, body)'

// DEMO: Create 'title' chart element
// TODO: Align with chart using OuterScale (Some(Continuous(co 0, co 100))





// ----------------------------------------------------------------------------
// DEMO #3: Refactoring
// ----------------------------------------------------------------------------

// TODO: Extract the 'Title' function




// ----------------------------------------------------------------------------
// DEMO #4: Creating a colored line chart
// ----------------------------------------------------------------------------

// TODO: Render simple barchart using 'renderAnim state render update' & 'svg'
// TODO: Define Start and Anim events, 'update' function and add button
// TODO: Scale data based on state, trigger timeout


let adjust k (hex:string) =
  let r = System.Int32.Parse(hex.Substring(1, 2), System.Globalization.NumberStyles.HexNumber)
  let g = System.Int32.Parse(hex.Substring(3, 2), System.Globalization.NumberStyles.HexNumber)
  let b = System.Int32.Parse(hex.Substring(5, 2), System.Globalization.NumberStyles.HexNumber)
  let f n = min 255 (int (k * float n))
  "#" + ((f r <<< 16) + (f g <<< 8) + (f b)).ToString("X")
  
let partColumn f t x y = 
  Shape [ CAR(x, f), COV y; CAR(x, t), COV y; CAR(x, t), COV (CO f); CAR(x, f), COV (CO t) ]

Axes(false, false, true, true, Shape.Layered [ 
    for p, clr, s17, s19 in elections -> 
      Shape.Padding((0., 5., 0., 5.), 
        Shape.Layered [
          Derived.FillColor(adjust 0.8 clr, partColumn 0.0 0.5 (ca p) (co s17))
          Derived.FillColor(adjust 1.2 clr, partColumn 0.5 1.0 (ca p) (co s19))
        ]          
        ) ]) |> render "out1"


let Title(text, chart) = 
  let title =
    Shape.InnerScale(Some(Continuous(co 0, co 100)), Some(Continuous(co 0, co 100)),
      Derived.Font("12pt arial", "black",
        Shape.Text(numv 50, numv 80, Middle, 
          Center, 0.0, text) ))

  Shape.Layered [  
    NestX(numv 0, numv 100, NestY(numv 85, numv 100, title))
    NestX(numv 0, numv 100, NestY(numv 0, numv 85, chart))
  ]


let bars : Shape<1, 1> = 
  Shape.InnerScale(None, Some(Continuous(co 0, co 410)), Shape.Layered [ 
    for p, clr, s17, s19 in elections -> 
      Shape.Padding((0., 10., 0., 10.), 
        Shape.Layered [
          Derived.FillColor(adjust 0.8 clr, partColumn 0.0 0.5 (ca p) (co s17))
          Derived.FillColor(adjust 1.2 clr, partColumn 0.5 1.0 (ca p) (co s19))
        ]          
        ) ])

Title("United Kingdom general elections (2017 vs 2019)", Shape.Axes(false, false, true, true, bars)) |> render "out1"

let line data = 
  Shape.Line [
    for i, v in Seq.indexed data -> numv i, numv v
  ]

let body lo hi data = 
  Shape.Axes(false, true, true, true, Shape.Layered [
    Derived.FillColor("#1F77B460", 
      Shape.Shape [
        (numv 0, numv lo); (numv 16, numv lo); 
        (numv 16, numv hi); (numv 0, numv hi) ] )
    Derived.FillColor("#D6272860",
      Shape.Shape [ 
        (numv (List.length gbpusd - 1), numv lo); (numv 16, numv lo); 
        (numv 16, numv hi); (numv (List.length gbpusd - 1), numv hi) ] )
    Derived.StrokeColor("#202020", line data)
  ])

let chart = 
  Shape.Layered [
    NestY(numv 0, numv 50, body 1.25 1.52 gbpusd)
    NestY(numv 50, numv 100, body 1.15 1.32 gbpeur)
  ]

Title("GBP-USD and GBP-EUR rates (June-July 2016)", chart) |> render "out2"



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