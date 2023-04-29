open System.IO
open Compost

let c = compost
let s = scale

module Data =
    let gbpusd = 
        [ 1.3206; 1.3267; 1.312; 1.3114; 1.3116; 1.3122; 1.3085; 1.3211; 1.3175; 
          1.3136; 1.3286; 1.3231; 1.3323; 1.3215; 1.3186; 1.2987; 1.296; 1.2932; 
          1.2885; 1.3048; 1.3287; 1.327; 1.3429; 1.3523; 1.3322; 1.3152; 1.3621; 
          1.4798; 1.4687; 1.467; 1.4694; 1.4293; 1.4064; 1.4196; 1.4114; 1.4282; 
          1.4334; 1.4465; 1.4552; 1.456; 1.4464; 1.4517; 1.4447; 1.4414 ]
        |> List.rev

[<EntryPoint>]
let run arg =

    let gbpusd = Data.gbpusd
    let len = gbpusd.Length
    let lo = 1.25
//   let hi = 1.52

    let chart =
      c.overlay [
        gbpusd[..16]
        |> List.mapi (fun i v -> COV(CO(float i)), COV(CO(v)))
        |> fun ls -> List.append ls [COV(CO(16.0)), COV(CO(lo)); COV(CO(0.)), COV(CO(lo))]
        |> fun vs -> Shape vs
        |> fun s -> c.fillColor("#1F77B460", s)

        gbpusd[16..]
        |> List.mapi (fun i v -> COV(CO(float(i + 16))), COV(CO(v)))
        |> fun ls -> List.append ls [COV(CO(float(len - 1))), COV(CO(lo)); COV(CO(16.)), COV(CO(lo))]
        |> fun vs -> Shape vs
        |> fun s -> c.fillColor("#D6272860", s)

        gbpusd
        |> List.mapi (fun i v -> COV(CO(float i)), COV(CO(v)))
        |> fun vs -> Line vs
      ]

    let chart =
      chart
        .axes(left=true, right=true, bottom=true)
        .svg(500, 200)

    use sw = new StreamWriter("chart.svg", append=false)
    Html.printNode sw chart

    printfn "Printed chart.svg!"

    0