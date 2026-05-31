const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Reset a user's password.
 *
 * Usage:
 *   node scripts/reset-pwd.js
 *
 * Required env vars:
 *   RESET_PWD_EMAIL    — the user email to reset
 *   RESET_PWD_PASSWORD  — the new password
 */
async function main() {
  const email = process.env.RESET_PWD_EMAIL;
  const password = process.env.RESET_PWD_PASSWORD;

  if (!email || !password) {
    console.error('Missing RESET_PWD_EMAIL or RESET_PWD_PASSWORD env vars');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { password_hash: hash } });
  console.log(`Password reset for ${email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});