module Demo.Helpers

open Browser
open Compost


let render viz = 
  let el = document.getElementById("out")
  let svg = Compost.createSvg false false (el.clientWidth, el.clientHeight) viz
  svg |> Html.renderTo el

let renderAnim init render update =
  Html.createVirtualDomApp "out" init render update

let svg shape =
  let el = document.getElementById("out")
  Compost.createSvg false false (el.clientWidth, el.clientHeight - 50.) shape

let series d = Array.ofList [ for x, y in d -> unbox x, unbox y ]
let rnd = System.Random()
let inline numv v = COV(CO (float v))
let catv n s  = CAR(CA s, n)
let inline co v = CO(float v)
let ca s = CA(s)
