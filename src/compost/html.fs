module Compost.Html

open Fable.Core
open Browser
open Browser.Types
open Fable.Core.JsInterop

module FsOption = FSharp.Core.Option

module Common = 
  [<Emit("Object.keys($0)")>]
  let keys<'T> (obj:obj) : string[] = failwith "never"

  [<Emit("$0(...$1)")>]
  let apply<'A, 'R> (f:obj) (args:'A[]) : 'R = failwith "never"

  [<Emit("$0[$1]")>]
  let getProperty<'T> (obj:obj) (name:string) : 'T = failwith "never"

  [<Emit("$0[$1] = $2")>]
  let setProperty (o:obj) (s:string) (v:obj) = failwith "!"

  [<Fable.Core.Emit("event")>]
  let event () : Event = failwith "JS"

  [<Emit("parseInt($0, $1)")>]
  let parseInt (s:string) (b:int) : int = failwith "JS"

  [<Emit("$0.toString($1)")>]
  let formatInt (i:int) (b:int) : string = failwith "JS"

  [<Emit("typeof($0)")>]
  let typeOf(n:obj) : string = failwith "!"

  [<Emit("(typeof($0)=='number')")>]
  let isNumber(n:obj) : bool = failwith "!"

  [<Emit("($0 instanceof Date)")>]
  let isDate(n:obj) : bool = failwith "!"

  [<Emit("$0.toISOString()")>]
  let toISOString(o:obj) : string = failwith "!"

  [<Emit("new Date($0)")>]
  let asDate(n:float) : System.DateTime = failwith "!"

  [<Emit("($0 instanceof Date) ? $0.getTime() : $0")>]
  let dateOrNumberAsNumber(n:obj) : float = failwith "!"

  [<Emit("""($0.toLocaleString("en-US",{day:"numeric",year:"numeric",month:"short"}))""")>]
  let formatDate(d:obj) : string = failwith "!"

  [<Emit("""$0.toLocaleString("en-GB",{day:"numeric",year:"numeric",month:"long"})""")>]
  let formatLongDate(d:obj) : string = failwith "!"

  [<Emit("""($0.toLocaleString("en-US",{hour:"numeric",minute:"numeric",second:"numeric"}))""")>]
  let formatTime(d:obj) : string = failwith "!"

  [<Emit("""($0.toLocaleString("en-US",{hour:"numeric",minute:"numeric",second:"numeric"}) + ", " +
      $0.toLocaleString("en-US",{day:"numeric",year:"numeric",month:"short"}))""")>]
  let formatDateTime(d:obj) : string = failwith "!"

  [<Emit("(typeof($0)=='object')")>]
  let isObject(n:obj) : bool = failwith "!"

  [<Emit("Array.isArray($0)")>]
  let isArray(n:obj) : bool = failwith "!"

  [<Emit("isNaN($0)")>]
  let isNaN(n:float) : bool = failwith "!"

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

module Virtualdom = 
  [<Import("h","virtual-dom")>]
  let h(arg1: string, arg2: obj, arg3: obj[]): obj = failwith "JS only"

  [<Import("diff","virtual-dom")>]
  let diff (tree1:obj) (tree2:obj): obj = failwith "JS only"

  [<Import("patch","virtual-dom")>]
  let patch (node:obj) (patches:obj): Node = failwith "JS only"

  [<Import("create","virtual-dom")>]
  let createElement (e:obj): Node = failwith "JS only"

type DomAttribute = 
  | Event of (HTMLElement -> Event -> unit)
  | Attribute of string
  | Property of obj

type DomNode = 
  | Text of string
  | Element of ns:string * tag:string * attributes:(string * DomAttribute)[] * children : DomNode[]

let createTree ns tag args children =
    let attrs = ResizeArray<_>()
    let props = ResizeArray<_>()
    for k, v in args do
      match k, v with 
      | k, Attribute v ->
          attrs.Add (k, box v)
      | k, Property o ->
          props.Add(k, o)
      | k, Event f ->
          props.Add ("on" + k, box (fun o -> f (Common.getProperty o "target") (Common.event()) ))
    let attrs = JsInterop.createObj attrs
    let ns = if ns = null || ns = "" then [] else ["namespace", box ns]
    let props = JsInterop.createObj (Seq.append (ns @ ["attributes", attrs]) props)
    let elem = Virtualdom.h(tag, props, children)
    elem

let mutable counter = 0

let rec renderVirtual node = 
  match node with
  | Text(s) -> 
      box s
  | Element(ns, tag, attrs, children) ->
      createTree ns tag attrs (Array.map renderVirtual children)

let rec render node = 
  match node with
  | Text(s) -> 
      document.createTextNode(s) :> Node

  | Element(ns, tag, attrs, children) ->
      let el = 
        if ns = null || ns = "" then document.createElement(tag)
        else document.createElementNS(ns, tag) :?> HTMLElement
      let rc = Array.map render children
      for c in rc do el.appendChild(c) |> ignore
      for k, a in attrs do 
        match a with
        | Property(o) -> Common.setProperty el k o
        | Attribute(v) -> el.setAttribute(k, v)
        | Event(f) -> () //el.addEventListener(k, U2.Case1(EventListener(f el)))
      el :> Node

let renderTo (node:HTMLElement) dom = 
  while box node.lastChild <> null do ignore(node.removeChild(node.lastChild))
  let el = render dom
  node.appendChild(el) |> ignore

let createVirtualDomAsyncApp id initial r u = 
  let event = new Event<'T>()
  let trigger e = event.Trigger(e)  
  let mutable container = document.createElement("div") :> Node
  document.getElementById(id).innerHTML <- ""
  document.getElementById(id).appendChild(container) |> ignore
  let mutable tree = Fable.Core.JsInterop.createObj []
  let mutable state = initial

  let handleEvent evt = Async.StartImmediate <| async {
    match evt with 
    | Some e -> 
        let! ns = u state e 
        state <- ns
    | _ -> ()
    let newTree = r trigger state |> renderVirtual
    let patches = Virtualdom.diff tree newTree
    container <- Virtualdom.patch container patches
    tree <- newTree }
  
  handleEvent None
  event.Publish.Add(Some >> handleEvent)

let createVirtualDomApp id initial r u = 
  let event = new Event<'T>()
  let trigger e = event.Trigger(e)  
  let mutable container = document.createElement("div") :> Node
  document.getElementById(id).innerHTML <- ""
  document.getElementById(id).appendChild(container) |> ignore
  let mutable tree = Fable.Core.JsInterop.createObj []
  let mutable state = initial

  let handleEvent evt = 
    state <- match evt with Some e -> u state e | _ -> state
    let newTree = r trigger state |> renderVirtual
    let patches = Virtualdom.diff tree newTree
    container <- Virtualdom.patch container patches
    tree <- newTree
  
  handleEvent None
  event.Publish.Add(Some >> handleEvent)
  
let rec foldDom f acc node =
  match node with
  | Text _ -> acc
  | Element(ns, tag, attrs, children) ->
      let acc = f acc ns tag attrs
      Array.fold (foldDom f) acc children

let text s = Text(s)
let (=>) k v = k, Attribute(v)
let (=!>) k f = k, Event(f)


type El(ns) = 
  member x.Namespace = ns
  static member (?) (el:El, n:string) = fun a b ->
    Element(el.Namespace, n, Array.ofList a, Array.ofList b)

let h = El(null)
let s = El("http://www.w3.org/2000/svg")
