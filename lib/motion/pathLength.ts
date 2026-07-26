// Plain arithmetic (no browser APIs), so diagram components can stay
// Server Components and still compute an accurate stroke-dasharray/
// stroke-dashoffset for the DRAW motion primitive, instead of guessing a
// dasharray far longer than the real path (which would make the line
// appear almost fully drawn the instant the animation starts).
export interface Point {
  x: number
  y: number
}

export function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}

export function polygonLength(points: Point[]): number {
  if (points.length === 0) return 0
  return polylineLength([...points, points[0]])
}
