import { describe, it, expect } from 'vitest';
import { scale as s, compost as c } from '../src/compost/compost.fs.js';

// Collect all elements matching a predicate using the F# foldDom helper.
// The fold callback receives (acc, tag, attrs) where attrs is a plain
// object with string attribute values (Events/Properties are excluded).
function findElements(node, pred) {
  return c.foldDom((acc, tag, attrs) => {
    if (pred(tag, attrs)) acc.push({ tag, attrs });
    return acc;
  }, [], node);
}

// Parse an SVG path "d" attribute into an array of {cmd, x, y} objects.
// Handles format like "M0 200 L200 0 " where command letter is directly
// followed by the x coordinate.
function parsePath(d) {
  const coords = [];
  for (const m of d.matchAll(/([ML])(-?[\d.]+)\s+(-?[\d.]+)/g)) {
    coords.push({ cmd: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }
  return coords;
}

describe('style rendering', () => {
  it('renders a shape with fill color set', () => {
    const sh = c.shape([[0, 0], [1, 0], [1, 1], [0, 1]]);
    const svg = c.svg(200, 200, c.fillColor("red", sh));
    const paths = findElements(svg, (tag) => tag === 'path');
    expect(paths.length).toBe(1);
    expect(paths[0].attrs.style).toContain('fill:red');
  });

  it('renders a line with stroke color set', () => {
    const line = c.line([[0, 0], [1, 1]]);
    const svg = c.svg(200, 200, c.strokeColor("blue", line));
    const paths = findElements(svg, (tag) => tag === 'path');
    expect(paths.length).toBe(1);
    expect(paths[0].attrs.style).toContain('stroke:blue');
  });
});

describe('svg rendering', () => {
  it('renders a line from (0,0) to (1,1) as an SVG path', () => {
    const line = c.line([[0, 0], [1, 1]]);
    const svg = c.svg(200, 200, line);

    const paths = findElements(svg, (tag) => tag === 'path');
    expect(paths.length).toBe(1);

    const coords = parsePath(paths[0].attrs.d);

    // X: 0->0, 1->200.  Y: 0->200, 1->0 (SVG Y-axis is inverted)
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual({ cmd: 'M', x: 0, y: 200 });
    expect(coords[1]).toEqual({ cmd: 'L', x: 200, y: 0 });
  });

  it('renders a column as a path filling the full SVG area', () => {
    const col = c.column("test", 10);
    const svg = c.svg(200, 200, col);

    const paths = findElements(svg, (tag) => tag === 'path');
    expect(paths.length).toBe(1);

    const coords = parsePath(paths[0].attrs.d);

    // Single column auto-scales to fill the entire 200x200 area
    // Closed path covering all four corners
    expect(coords).toHaveLength(5);
    expect(coords[0]).toEqual({ cmd: 'M', x: 0,   y: 0 });
    expect(coords[1]).toEqual({ cmd: 'L', x: 200, y: 0 });
    expect(coords[2]).toEqual({ cmd: 'L', x: 200, y: 200 });
    expect(coords[3]).toEqual({ cmd: 'L', x: 0,   y: 200 });
    expect(coords[4]).toEqual({ cmd: 'L', x: 0,   y: 0 });
  });
});

describe('serialization', () => {
  it('round-trips a line through serialize/deserialize', () => {
    const line = c.line([[0, 0], [1, 1]]);
    const line2 = c.deserialize(c.serialize(line));
    const paths1 = findElements(c.svg(200, 200, line), (tag) => tag === 'path');
    const paths2 = findElements(c.svg(200, 200, line2), (tag) => tag === 'path');
    expect(paths2[0].attrs.d).toEqual(paths1[0].attrs.d);
  });

  it('round-trips a styled shape through serialize/deserialize', () => {
    const shape = c.fillColor("red", c.strokeColor("blue", c.line([[0, 0], [1, 1]])));
    const shape2 = c.deserialize(c.serialize(shape));
    const paths1 = findElements(c.svg(200, 200, shape), (tag) => tag === 'path');
    const paths2 = findElements(c.svg(200, 200, shape2), (tag) => tag === 'path');
    expect(paths2[0].attrs.style).toEqual(paths1[0].attrs.style);
    expect(paths2[0].attrs.d).toEqual(paths1[0].attrs.d);
  });

  it('round-trips a multi-series bar chart through serialize/deserialize', () => {
    const chart = c.axes("left bottom",
      c.scaleY(s.continuous(0, 50),
        c.overlay([
          c.padding(0, 5, 0, 5, c.fillColor("#DC4B4A", c.column("apples", 30))),
          c.padding(0, 5, 0, 5, c.fillColor("#424498", c.column("plums", 20))),
          c.padding(0, 5, 0, 5, c.fillColor("#A0CB5B", c.column("kiwi", 40))),
        ])
      )
    );
    const chart2 = c.deserialize(c.serialize(chart));
    const paths1 = findElements(c.svg(400, 300, chart), (tag) => tag === 'path');
    const paths2 = findElements(c.svg(400, 300, chart2), (tag) => tag === 'path');
    expect(paths2.length).toBe(paths1.length);
    paths1.forEach((p, i) => {
      expect(paths2[i].attrs.d).toEqual(p.attrs.d);
      expect(paths2[i].attrs.style).toEqual(p.attrs.style);
    });
  });
});
