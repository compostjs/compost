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
