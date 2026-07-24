import type { WalletsRepository } from "../repositories/wallets-repository";

export async function listWallets(repo: WalletsRepository, userId: string) {
  return repo.findAllByUserId(userId);
}
