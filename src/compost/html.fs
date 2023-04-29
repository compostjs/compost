module rec Html

#if FABLE_COMPILER
open Fable.Core
open Fable.Core.JsInterop
open Browser.Types

module React =
  [<ImportMember(from="react")>]
  type ReactElement = interface end

  [<ImportMember(from="react")>]
  let createElement (tag: string) (props: obj): ReactElement = nativeOnly

  [<Import("Children.toArray", from="react")>]
  let toArray (children: ReactElement seq): ReactElement[] = nativeOnly

type DomNode = React.ReactElement

let transformStyles =
  let regex = System.Text.RegularExpressions.Regex("-[a-z]")
  fun (rules: string) ->
    rules.Split(';')
    |> Array.map (fun d -> d.Split(':'))
    |> Array.fold (fun (styles: obj) (rule: string[]) ->
      if rule.Length > 1 then
        let ruleName = regex.Replace(rule.[0], fun m -> m.Value[1].ToString().ToUpper()).Trim()
        styles?(ruleName) <- rule.[1].Trim()
        styles
      else
        styles) (obj())

let inline (=>) (key: string) (value: obj) = key, value
let inline (=!>) (key: string) (handler: System.Action<Event>) = key, box handler
let inline children (children: DomNode list) = "children", box(React.toArray children)
let inline style (rules: string) = "style", transformStyles rules
let inline h (tag: string) (props: (string * obj) list) = React.createElement tag (createObj props)
let inline s (props: (string * obj) list) = React.createElement "svg" (createObj props)
let inline text (text: string) = unbox<DomNode> text

#else

open System.IO

let private printElement (stream: TextWriter) (tag: string) (attributes: DomAttribute list) =
    let children =
      attributes
      |> List.tryPick (fun a -> match a with DomAttribute.Children els -> Some els | _ -> None)
      |> Option.defaultValue []
    let attributes =
      attributes
      |> List.choose (fun a -> match a with DomAttribute.Attr(k, v) -> Some(k, v) | _ -> None)

    stream.Write($"<{tag}")
    for (k, v) in attributes do
      stream.Write($" {k}=\"{v}\"")
    stream.Write($">")
    for el in children do
      printNode stream el
    stream.Write($"</{tag}>")
  
let printNode stream = function
    | DomNode.Text text -> stream.Write(text)
    | DomNode.El(tag, attributes) -> printElement stream tag attributes
    | DomNode.Svg(attributes) ->
      let attributes = DomAttribute.Attr("xmlns", "http://www.w3.org/2000/svg") :: attributes
      printElement stream "svg" attributes

[<RequireQualifiedAccess>]
type DomAttribute =
  | Attr of key: string * value: string
  | Children of DomNode list
  | Ev // Events are ignored in the server

[<RequireQualifiedAccess>]
type DomNode =
  | Text of string
  | El of tag: string * attributes: DomAttribute list
  | Svg of attributes: DomAttribute list    


let (=>) (key: string) (value: obj) = DomAttribute.Attr(key, string value)
let (=!>) (key: string) (handler: obj) = DomAttribute.Ev
let children (children: DomNode list) = DomAttribute.Children children
let style (rules: string) = DomAttribute.Attr("style", rules)
let h (tag: string) (props: DomAttribute list) = DomNode.El(tag, props)
let s (props: DomAttribute list) = DomNode.Svg(props)
let text (text: string) = DomNode.Text text
#endif
