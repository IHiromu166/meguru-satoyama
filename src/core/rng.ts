/** 乱数を1つ消費し、[0,1) の値と次の状態を返す */
export function next(state: number): { value: number; state: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { value: ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296, state: nextState };
}

/** [0, n) の整数 */
export function nextInt(state: number, n: number): { value: number; state: number } {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("n は正の整数である必要があります");
  }

  const result = next(state);
  return { value: Math.floor(result.value * n), state: result.state };
}

/** 配列をシャッフルした新しい配列と次の状態を返す(Fisher-Yates) */
export function shuffle<T>(state: number, xs: readonly T[]): { value: T[]; state: number } {
  const value = [...xs];
  let nextState = state;

  for (let index = value.length - 1; index > 0; index -= 1) {
    const result = nextInt(nextState, index + 1);
    nextState = result.state;
    [value[index], value[result.value]] = [value[result.value], value[index]];
  }

  return { value, state: nextState };
}
