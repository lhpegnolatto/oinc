import type { WalletsRepository } from "../repositories/wallets-repository";

export async function createWallet(
  repo: WalletsRepository,
  input: {
    userId: string;
    name: string;
    balance: number;
    color: string;
    icon: string;
  },
) {
  return repo.create({ id: crypto.randomUUID(), ...input });
}
