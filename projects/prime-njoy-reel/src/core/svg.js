// Chargeur SVG -> tracés animables (Path2D + longueur + échantillonnage de points).
// Les fichiers de assets/svg/ sont de vrais SVG. On les parse, on convertit chaque
// primitive (circle, rect, line, polyline, polygon, path) en données de chemin, puis on
// les mesure avec SVGPathElement (getTotalLength/getPointAtLength) pour :
//   - le tracé progressif (draw-on / draw-off) ;
//   - le morphing entre deux formes ;
//   - la formation de particules sur les lignes.

const NS = 'http://www.w3.org/2000/svg';
let measureRoot = null;

function measurer() {
  if (!measureRoot) {
    measureRoot = document.createElementNS(NS, 'svg');
    measureRoot.setAttribute('width', '0');
    measureRoot.setAttribute('height', '0');
    measureRoot.style.position = 'absolute';
    measureRoot.style.visibility = 'hidden';
    document.body.appendChild(measureRoot);
  }
  return measureRoot;
}

const n = (el, k, d = 0) => (el.hasAttribute(k) ? parseFloat(el.getAttribute(k)) : d);

function toPathData(el) {
  switch (el.tagName.toLowerCase()) {
    case 'path':
      return el.getAttribute('d');
    case 'circle': {
      const cx = n(el, 'cx'), cy = n(el, 'cy'), r = n(el, 'r');
      // démarre en haut, sens horaire (cohérent avec les autres formes pour le morphing)
      return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    }
    case 'rect': {
      const x = n(el, 'x'), y = n(el, 'y'), w = n(el, 'width'), h = n(el, 'height');
      const r = Math.min(n(el, 'rx', n(el, 'ry', 0)), w / 2, h / 2);
      const cx = x + w / 2;
      return `M${cx} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }
    case 'line':
      return `M${n(el, 'x1')} ${n(el, 'y1')} L${n(el, 'x2')} ${n(el, 'y2')}`;
    case 'polyline':
    case 'polygon': {
      const pts = el.getAttribute('points').trim().split(/[\s,]+/).map(Number);
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i < pts.length; i += 2) d += ` L${pts[i]} ${pts[i + 1]}`;
      return el.tagName.toLowerCase() === 'polygon' ? d + ' Z' : d;
    }
    default:
      return null;
  }
}

export function makeShape(d, meta = {}) {
  const el = document.createElementNS(NS, 'path');
  el.setAttribute('d', d);
  measurer().appendChild(el);
  const length = el.getTotalLength();
  const closed = /z\s*$/i.test(d.trim());
  const cache = new Map();
  return {
    ...meta,
    d,
    closed,
    length,
    path2d: new Path2D(d),
    point: (s) => {
      const p = el.getPointAtLength(s);
      return [p.x, p.y];
    },
    // n points uniformément répartis le long du tracé
    sample(count) {
      if (cache.has(count)) return cache.get(count);
      const pts = [];
      const den = closed ? count : Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const p = el.getPointAtLength((i / den) * length);
        pts.push([p.x, p.y]);
      }
      cache.set(count, pts);
      return pts;
    },
  };
}

export async function loadSVG(url) {
  const txt = await (await fetch(url)).text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const root = doc.documentElement;
  const vb = (root.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
  const items = [];
  const walk = (node, group) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'defs') continue;
      if (tag === 'g') {
        walk(el, el.id || group);
        continue;
      }
      const d = toPathData(el);
      if (!d) continue;
      items.push(makeShape(d, { id: el.id || null, group, cls: el.getAttribute('class') }));
    }
  };
  walk(root, null);
  return {
    viewBox: vb,
    center: [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2],
    items,
    get: (id) => items.find((i) => i.id === id),
    group: (g) => items.filter((i) => i.group === g),
  };
}

// Morphing : interpolation de deux tracés échantillonnés au même nombre de points.
// a et b sont des tableaux de points déjà transformés en espace écran.
export function morphPoints(a, b, t) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = [a[i][0] + (b[i][0] - a[i][0]) * t, a[i][1] + (b[i][1] - a[i][1]) * t];
  }
  return out;
}

export function polyPath(g, pts, closed = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (closed) g.closePath();
}
