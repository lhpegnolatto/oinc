// Deferred: no domain module (e.g. modules/wallets) exists yet to seed real
// default data into, so this only logs for now. Wire real seeding here once
// one of those modules is prioritized — shared/auth's hook call into this
// command stays the same either way.
export async function seedNewUserDefaults(userId: string): Promise<void> {
  console.log(
    `[modules/users] seedNewUserDefaults: no default data module exists yet, skipping seed for user ${userId} (TODO: wire once e.g. modules/wallets exists)`,
  );
}
