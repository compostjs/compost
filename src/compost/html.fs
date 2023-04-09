module Compost.Html

open Fable.Core
open Browser.Types
open Fable.Core.JsInterop

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
let inline s (tag: string) (props: (string * obj) list) = React.createElement tag (createObj props)
let inline text (text: string) = unbox<DomNode> text
