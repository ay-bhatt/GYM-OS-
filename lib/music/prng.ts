/**
 * Deterministic pseudo-random number generator (seeded).
 *
 * The playlist engine uses a SEEDED RNG (requirement 14: "deterministic or
 * weighted shuffle") so that a queue generated for a given catalog + history
 * is reproducible within a session, while still feeling random to listeners.
 * Seeding also makes the generator unit-testable.
 *
 * Algorithm: splitmix32 — small, fast, well-distributed, no dependencies.
 */

export class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // splitmix32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** random in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  /** random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /** Fisher–Yates shuffle of an array (returns a new array). */
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function hashStringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h || 0x9e3779b9;
}
