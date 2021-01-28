module Demo.Main

open Compost
open Compost.Html
open Demo.Helpers
open Browser

// ----------------------------------------------------------------------------
// Some *fun* input data about British politics
// ----------------------------------------------------------------------------

let elections = 
  [ "Conservative", "#1F77B4", 317, 365; "Labour", "#D62728", 262, 202; 
    "Liberal Democrats", "#FF7F0E", 12, 11; "SNP", "#BCBD22", 35, 48; 
    "Green", "#2CA02C", 1, 1; "DUP", "#8C564B", 10, 8 ]

let gbpusd = 
  [ 1.4414; 1.4447; 1.4517; 1.4464; 1.456; 1.4552; 1.4465; 1.4334; 1.4282; 
    1.4114; 1.4196; 1.4064; 1.4293; 1.4694; 1.467; 1.4687; 1.4798; 1.3621; 
    1.3152; 1.3322; 1.3523; 1.3429; 1.327; 1.3287; 1.3048; 1.2885; 1.2932; 
    1.296; 1.2987; 1.3186; 1.3215; 1.3323; 1.3231; 1.3286; 1.3136; 1.3175; 
    1.3211; 1.3085; 1.3122; 1.3116; 1.3114; 1.312; 1.3267 ]

// ----------------------------------------------------------------------------
// DEMO #1: Creating a bar chart
// ----------------------------------------------------------------------------

// TODO: 'Shape.Layered' of 'Derived.Column' (ca, co) 
// TODO: Add 'Derived.FillColor' and 'Shape.Padding'
// TODO: Add 'Shape.Axes'

Shape.Axes(false, false, true, true, Shape.Layered [ 
  for p, c, y17, y19 in elections -> 
    Derived.FillColor(c, Derived.Column(ca p, co y19)) ])
|> render





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

let Title text body = 
  let title = 
    Shape.InnerScale(Some(Continuous(co 0, co 100)), Some(Continuous(co 0, co 100)),
      Derived.Font("14pt arial", "black",
        Shape.Text(numv 50, numv 50, Middle, 
          Center, 0.0, text) ))
  Shape.Layered [
    Shape.NestX(numv 0, numv 100, Shape.NestY(numv 90, numv 100, title))
    Shape.NestX(numv 0, numv 100, Shape.NestY(numv 0, numv 90, body))
  ]

Title "GBP-USD exchange rate (June-July 2016) ....!!" 
  (Shape.Axes(false, true, true, true, Shape.Layered [
    Derived.FillColor("#aec7e8", Shape.Shape [
      (numv 0, numv 1); (numv 16, numv 1);
      (numv 16, numv 1.8); (numv 0, numv 1.8) ])
    Derived.FillColor("#ff9896", Shape.Shape [ 
        (numv (List.length gbpusd - 1), numv 1); (numv 16, numv 1); 
        (numv 16, numv 1.8); (numv (List.length gbpusd - 1), numv 1.8) ] )
    Derived.StrokeColor("black", Shape.Line [
      for i, v in Seq.indexed gbpusd -> numv i, numv v ])
  ]))
|> render








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

type Event = 
  | Start
  | Animate

let state = 0.0

let update state evt = 
  match evt with
  | Start -> 0.1
  | Animate -> state + 0.1

let render trigger state = 
  if state > 0.0 && state < 1.0 then 
    window.setTimeout((fun _ -> trigger Animate), 20) |> ignore
  h?div [] [
    Shape.Axes(false, false, true, true, 
     Shape.InnerScale(None, Some(Continuous(co 0, co 400)), Shape.Layered [ 
      for p, c, y17, y19 in elections -> 
        let v = float y17 * (1.0 - state) + float y19 * state
        Derived.FillColor(c, Derived.Column(ca p, co v)) ]))
    |> svg
    h?button ["click" =!> fun _ _ -> trigger Start ] [ text "Animate!"]
  ]

renderAnim state render update  
