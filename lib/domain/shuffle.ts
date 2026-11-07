import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function newShuffleSeed(): string {
  return randomBytes(32).toString("hex");
}

export function seedCommitment(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

export function verifyCommitment(seed: string, commitment: string): boolean {
  const actual = Buffer.from(seedCommitment(seed), "hex");
  const expected = Buffer.from(commitment, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function randomInt(seed: string, counter: number, upperExclusive: number): number {
  const digest = createHmac("sha256", seed).update(String(counter)).digest();
  return digest.readUInt32BE(0) % upperExclusive;
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let counter = 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(seed, counter++, index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
