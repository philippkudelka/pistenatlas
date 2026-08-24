/** Geodätische Hilfsfunktionen (Kugelmodell, Radius 6.371 km). */

const EARTH_R = 6371000; // m
export const METERS_PER_NM = 1852;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Großkreisdistanz in NM (Haversine). */
export function gcDistanceNm(
  a: { la: number; lo: number },
  b: { la: number; lo: number },
): number {
  const φ1 = rad(a.la);
  const φ2 = rad(b.la);
  const dφ = φ2 - φ1;
  const dλ = rad(b.lo - a.lo);
  const h =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return (2 * EARTH_R * Math.asin(Math.sqrt(h))) / METERS_PER_NM;
}

/** Zielpunkt von (la, lo) aus mit Kurs `bearingDeg` und Distanz in NM → [la, lo]. */
export function destPoint(
  la: number,
  lo: number,
  bearingDeg: number,
  distNm: number,
): [number, number] {
  const δ = (distNm * METERS_PER_NM) / EARTH_R;
  const θ = rad(bearingDeg);
  const φ1 = rad(la);
  const λ1 = rad(lo);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return [Math.max(-85, Math.min(85, deg(φ2))), ((deg(λ2) + 540) % 360) - 180];
}

/** Großkreis-Zwischenpunkte als [lo, la]-Paare (GeoJSON-Reihenfolge). */
export function gcPath(
  a: { la: number; lo: number },
  b: { la: number; lo: number },
  n = 64,
): [number, number][] {
  const φ1 = rad(a.la);
  const λ1 = rad(a.lo);
  const φ2 = rad(b.la);
  const λ2 = rad(b.lo);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d === 0) return [[a.lo, a.la]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))]);
  }
  return pts;
}
