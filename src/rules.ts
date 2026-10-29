export type Wall = { x: number; y: number; w: number; h: number };
export function blocked(x: number, y: number, radius: number, walls: Wall[]): boolean {
  return x < 70 || x > 1330 || y < 85 || y > 875 || walls.some(w => (w as Wall & {hp?:number}).hp!==0 && x > w.x-radius && x < w.x+w.w+radius && y > w.y-radius && y < w.y+w.h+radius);
}
export function resolveHit(hp: number, base: number, vulnerable: boolean, energy: number) {
  const damage = Math.min(hp, Math.round(base * (vulnerable ? 1.5 : 1)));
  return { damage, hp: hp-damage, energy: Math.min(100, energy+damage) };
}
