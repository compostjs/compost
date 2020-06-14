# Compost.js: Composable data visualization library

Compost is a data visualization library that lets you compose rich interactive data visualizations
from a small number of basic primitives. The library is based on the functional programming idea of
composable domain-specific languages. Compost is simple (implemented in just 700 lines of code) and
easy to understand. Compost is a plain JavaScript library. You use it by writing JavaScript code
that generates a chart using some 15 basic Compost primitives.

For more information, see the [Compost web page and documentation](https://compostjs.github.io/compost).

## Getting started with Compost

Compost is written using [the F# language](https://fsharp.org) and compiled to JavaScript
using [the Fable compiler](https://fable.io). To build Compost, you will need to install
[.NET Core](https://dotnet.microsoft.com/download). You may also want to get the
[Ionide plugin](http://ionide.io/) for Visual Studio Code.

### Developing Compost
To work on Compost, you can use the WebPack dev server. The following will serve the
`public/index.html` file and compile the `src/project/demos.js` source code at
http://localhost:8080

```
npm start
```

### Building Compost
`npm run standalone` `npm run build`



![Compost](https://github.com/compostjs/compost/raw/master/compost.gif)
