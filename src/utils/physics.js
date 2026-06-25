// Collision and geometric calculation helper functions

export function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Check if a line segment (p1 -> p2) intersects a circle (center, r)
export function lineIntersectsCircle(p1, p2, center, r) {
  const ab = { x: p2.x - p1.x, y: p2.y - p1.y };
  const ac = { x: center.x - p1.x, y: center.y - p1.y };
  
  // Project ac onto ab
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq === 0) {
    return getDistance(p1, center) <= r;
  }
  
  let t = (ac.x * ab.x + ac.y * ab.y) / abLenSq;
  // Clamp t to [0, 1] to stay on the segment
  t = Math.max(0, Math.min(1, t));
  
  const closestPoint = {
    x: p1.x + t * ab.x,
    y: p1.y + t * ab.y
  };
  
  const dist = getDistance(closestPoint, center);
  return dist <= r;
}

// Helper: check if two line segments intersect
// Segment 1: p1 -> p2, Segment 2: q1 -> q2
export function lineSegmentsIntersect(p1, p2, q1, q2) {
  const det = (p2.x - p1.x) * (q2.y - q1.y) - (q2.x - q1.x) * (p2.y - p1.y);
  if (det === 0) return false; // Parallel lines
  
  const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
  
  // Both lambda and gamma must be between 0 and 1
  return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

// Check if line segment (p1 -> p2) intersects a rectangle (x, y, w, h)
export function lineIntersectsRect(p1, p2, rect) {
  const { x, y, width: w, height: h } = rect;
  
  // Rect corners
  const tl = { x, y };
  const tr = { x: x + w, y };
  const br = { x: x + w, y: y + h };
  const bl = { x, y: y + h };
  
  // Check if either end of segment is inside the rect
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) {
    return true;
  }
  
  // Check intersection with any of the 4 edges
  return (
    lineSegmentsIntersect(p1, p2, tl, tr) ||
    lineSegmentsIntersect(p1, p2, tr, br) ||
    lineSegmentsIntersect(p1, p2, br, bl) ||
    lineSegmentsIntersect(p1, p2, bl, tl)
  );
}

// Check if a point is inside a rectangle
export function pointInRect(pt, rect) {
  return (
    pt.x >= rect.x &&
    pt.x <= rect.x + rect.width &&
    pt.y >= rect.y &&
    pt.y <= rect.y + rect.height
  );
}

// Check if a circle intersects a rectangle
export function circleIntersectsRect(center, r, rect) {
  // Find the closest point on the rect to the circle center
  const closestX = Math.max(rect.x, Math.min(center.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(center.y, rect.y + rect.height));
  
  const dist = getDistance(center, { x: closestX, y: closestY });
  return dist <= r;
}
