// ROAD STABLE (flag ROAD_STABLE): pure helper. The canvas is W x RS device pixels wide (RS = 1.625 on a phone), so a layer at a fractional design
// y lands between device pixels and is blended by the texture filter; layers that round differently (clouds to whole design px, far scenery not at
// all) then shimmer against each other while the road moves. Everything derived from one scroll value is snapped to whole device pixels instead.

/** `v` (design px) rounded to the nearest whole device pixel for render scale `rs`; unchanged for a bad scale. */
export const snapDev = (v: number, rs: number): number => (rs > 0 && Number.isFinite(rs) ? Math.round(v * rs) / rs : v);
