const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Test1234', 10);
  await prisma.user.update({ where: { email: 'haitham@prioraflow.app' }, data: { password_hash: hash } });
  console.log('Password reset for haitham@prioraflow.app to Test1234');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
