import { scale as s, compost as c } from "./main.fs"

let elections = 
  [ { party:"Conservative", color:"#1F77B4", y17:317, y19:365}, 
    { party:"Labour", color:"#D62728", y17:262, y19:202},
    { party:"LibDem", color:"#FF7F0E", y17:12, y19:11}, 
    { party:"SNP", color:"#BCBD22", y17:35, y19:48}, 
    { party:"Green", color:"#2CA02C", y17:1, y19:1}, 
    { party:"DUP", color:"#8C564B", y17:10, y19:8} ]

let gbpusd = 
  [ 1.3206, 1.3267, 1.312, 1.3114, 1.3116, 1.3122, 1.3085, 1.3211, 1.3175, 1.3136, 1.3286, 1.3231, 1.3323, 1.3215, 1.3186, 1.2987, 1.296, 
    1.2932, 1.2885, 1.3048, 1.3287, 1.327, 1.3429, 1.3523, 1.3322, 1.3152, 1.3621, 1.4798, 1.4687, 1.467, 1.4694, 1.4293, 1.4064, 1.4196, 
    1.4114, 1.4282, 1.4334, 1.4465, 1.4552, 1.456, 1.4464, 1.4517, 1.4447, 1.4414 ].reverse() 

    let gbpeur = 
  [ 1.1823, 1.1867, 1.1838, 1.1936, 1.1944, 1.1961, 1.1917, 1.2017, 1.1969, 1.193, 1.2006, 1.1952, 1.1998, 1.1903, 1.1909, 1.1759, 1.1743, 
    1.168, 1.1639, 1.175, 1.1929, 1.192, 1.2081, 1.2177, 1.2054, 1.1986, 1.2254, 1.3039, 1.3018, 1.3018, 1.296, 1.2709, 1.2617, 1.2634, 
    1.2589, 1.2639, 1.2687, 1.2771, 1.2773, 1.2823, 1.2726, 1.2814, 1.2947, 1.2898 ].reverse()
    
function adjust(color, k) {
  let r = parseInt(color.substr(1, 2), 16)
  let g = parseInt(color.substr(3, 2), 16)
  let b = parseInt(color.substr(5, 2), 16)
  let f = n => n*k > 255 ? 255 : n*k;
  return "#" + ((f(r) << 16) + (f(g) << 8) + (f(b) << 0)).toString(16);
}

function title(text, chart) {
  let title = c.scale(s.continuous(0, 100), s.continuous(0, 100), 
    c.font("11pt arial", "black", c.text(50, 80, text)))
  return c.overlay([
    c.nest(0, 100, 85, 100, title),
    c.nest(0, 100, 0, 85, chart)
  ])
}

function partColumn(f, t, x, y) { 
  return c.shape([ [ [x,f], y ], [ [x,t], y ], [ [x,t], f ], [ [x,f], t ] ])
}

let bars =
  c.axes("left bottom", c.scaleY(s.continuous(0, 410), c.overlay(
    elections.map(e =>
      c.padding(0, 10, 0, 10, c.overlay([
        c.fillColor(adjust(e.color, 0.8), partColumn(0, 0.5, e.party, e.y17)),
        c.fillColor(adjust(e.color, 1.2), partColumn(0.5, 1, e.party, e.y19))
      ]))
    )    
  )))

c.render("out1", title("United Kingdom general elections (2017 vs 2019)", bars))

function line(data) { 
  return c.line(data.map((v, i) => [i, v]));
}

function body(lo, hi, data) {
  return c.axes("left right bottom", c.overlay([
    c.fillColor("#1F77B460",  c.shape([ [0,lo], [16,lo], [16,hi], [0,hi] ])),
    c.fillColor("#D6272860",  c.shape([ [data.length-1,lo], [16,lo], [16,hi], [data.length-1,hi] ])),
    c.strokeColor("#202020", line(data))
  ]))
}

let rates = c.overlay([
  c.nestY(0, 50, body(1.25, 1.52, gbpusd)),
  c.nestY(50, 100, body(1.15, 1.32, gbpeur)),
])

c.render("out2", title("GBP-USD and GBP-EUR rates (June-July 2016)", rates))
