/**
 * Authentication & User Access Security Tests
 *
 * Run: npx ts-node -r tsconfig-paths/register test/auth-security.ts
 *
 * What it tests:
 * 1. Inactive users cannot log in
 * 2. Inactive users cannot refresh, and their remaining sessions are revoked
 * 3. Refresh tokens rotate on use
 * 4. Reusing a rotated refresh token revokes all active sessions for that user
 * 5. Logout by refresh token revokes active sessions, while missing/invalid tokens are safe no-ops
 * 6. Workshop admins cannot manage users outside their selected workshop
 * 7. Deactivating a manageable user revokes their sessions
 */

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';

const green = (s: string) => `\x1b[32m✓ ${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m✗ ${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(green(label));
    passed++;
  } else {
    console.log(red(label));
    failed++;
  }
}

async function assertRejects(fn: () => Promise<unknown>, label: string, matcher?: (err: any) => boolean) {
  try {
    await fn();
    assert(false, label);
  } catch (err: any) {
    assert(matcher ? matcher(err) : true, label);
  }
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const raw = new PrismaClient();
const prisma = { raw } as any;
const auth = new AuthService(
  prisma,
  new JwtService({ secret: 'test-auth-security-secret' }),
  { get: () => undefined } as any,
  { enqueue: async () => undefined } as any,
);
const usersService = new UsersService(prisma);

const workshopA = 'test-auth-ws-a-0001';
const workshopB = 'test-auth-ws-b-0001';
const roleAdvisor = 'test-auth-role-advisor';
const roleAdmin = 'test-auth-role-admin';
const activeUserA = 'test-auth-user-active-a';
const inactiveUserA = 'test-auth-user-inactive-a';
const activeUserB = 'test-auth-user-active-b';
const adminA = 'test-auth-admin-a';
const password = 'AuthSecurity123!';

async function setup() {
  console.log('\nSetting up auth security test data...\n');

  await cleanup();

  const passwordHash = await bcrypt.hash(password, 10);

  await raw.workshops.createMany({
    data: [
      { id: workshopA, name: 'Auth Test Workshop A', slug: 'auth-test-a', is_active: true },
      { id: workshopB, name: 'Auth Test Workshop B', slug: 'auth-test-b', is_active: true },
    ],
  });

  await raw.roles.createMany({
    data: [
      { id: roleAdvisor, name: 'test_auth_advisor', permissions: '[]' },
      { id: roleAdmin, name: 'test_auth_workshop_admin', permissions: '[]' },
    ],
  });

  await raw.users.createMany({
    data: [
      {
        id: activeUserA,
        email: 'auth-active-a@test.prioraflow.com',
        name: 'Auth Active A',
        password_hash: passwordHash,
        role_id: roleAdvisor,
        is_active: true,
      },
      {
        id: inactiveUserA,
        email: 'auth-inactive-a@test.prioraflow.com',
        name: 'Auth Inactive A',
        password_hash: passwordHash,
        role_id: roleAdvisor,
        is_active: false,
      },
      {
        id: activeUserB,
        email: 'auth-active-b@test.prioraflow.com',
        name: 'Auth Active B',
        password_hash: passwordHash,
        role_id: roleAdvisor,
        is_active: true,
      },
      {
        id: adminA,
        email: 'auth-admin-a@test.prioraflow.com',
        name: 'Auth Admin A',
        password_hash: passwordHash,
        role_id: roleAdmin,
        is_active: true,
      },
    ],
  });

  await raw.user_workshop_access.createMany({
    data: [
      { id: 'test-auth-uwa-active-a', user_id: activeUserA, workshop_id: workshopA },
      { id: 'test-auth-uwa-inactive-a', user_id: inactiveUserA, workshop_id: workshopA },
      { id: 'test-auth-uwa-active-b', user_id: activeUserB, workshop_id: workshopB },
      { id: 'test-auth-uwa-admin-a', user_id: adminA, workshop_id: workshopA },
    ],
  });
}

async function cleanup() {
  await raw.refresh_tokens.deleteMany({ where: { user_id: { startsWith: 'test-auth-user-' } } });
  await raw.refresh_tokens.deleteMany({ where: { user_id: adminA } });
  await raw.user_workshop_access.deleteMany({ where: { id: { startsWith: 'test-auth-uwa-' } } });
  await raw.users.deleteMany({ where: { id: { startsWith: 'test-auth-user-' } } });
  await raw.users.deleteMany({ where: { id: adminA } });
  await raw.roles.deleteMany({ where: { id: { startsWith: 'test-auth-role-' } } });
  await raw.workshops.deleteMany({ where: { id: { in: [workshopA, workshopB] } } });
}

async function testInactiveLoginBlocked() {
  console.log('\nAUTH — inactive login is blocked\n');

  await assertRejects(
    () => auth.login('auth-inactive-a@test.prioraflow.com', password),
    'Inactive user cannot log in',
    (err) => err instanceof UnauthorizedException || err?.status === 401,
  );
}

async function testRefreshRotationAndReuseDetection() {
  console.log('\nAUTH — refresh token rotation and reuse detection\n');

  const login = await auth.login('auth-active-a@test.prioraflow.com', password);
  assert(!!login.refreshToken, 'Login returns an initial refresh token');

  const firstTokenRow = await raw.refresh_tokens.findUnique({
    where: { token_hash: hashRefreshToken(login.refreshToken) },
  });
  assert(!!firstTokenRow && firstTokenRow.user_id === activeUserA, 'Refresh token is stored as a hash for the user');

  const refreshed = await auth.refresh(login.refreshToken);
  assert(!!refreshed.refreshToken && refreshed.refreshToken !== login.refreshToken, 'Refresh rotates to a new refresh token');

  const oldRow = await raw.refresh_tokens.findUnique({ where: { token_hash: hashRefreshToken(login.refreshToken) } });
  const newRow = await raw.refresh_tokens.findUnique({ where: { token_hash: hashRefreshToken(refreshed.refreshToken) } });
  assert(!!oldRow?.revoked_at, 'Old refresh token row is revoked after rotation');
  assert(!!newRow && !newRow.revoked_at, 'New refresh token row remains active after rotation');

  await assertRejects(
    () => auth.refresh(login.refreshToken),
    'Reusing a rotated refresh token is rejected',
    (err) => err instanceof UnauthorizedException || err?.status === 401,
  );

  const activeSessions = await raw.refresh_tokens.count({
    where: { user_id: activeUserA, revoked_at: null, expires_at: { gt: new Date() } },
  });
  assert(activeSessions === 0, 'Refresh token reuse revokes all active sessions for that user');
}

async function testInactiveRefreshRevokesSessions() {
  console.log('\nAUTH — inactive refresh is blocked and sessions are revoked\n');

  const inactiveToken = 'test-inactive-refresh-token';
  await raw.refresh_tokens.create({
    data: {
      id: 'test-auth-inactive-session',
      user_id: inactiveUserA,
      token_hash: hashRefreshToken(inactiveToken),
      workshop_id: workshopA,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await raw.refresh_tokens.create({
    data: {
      id: 'test-auth-inactive-extra-session',
      user_id: inactiveUserA,
      token_hash: hashRefreshToken('test-inactive-extra-refresh-token'),
      workshop_id: workshopA,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await assertRejects(
    () => auth.refresh(inactiveToken),
    'Inactive user cannot refresh',
    (err) => err instanceof UnauthorizedException || err?.status === 401,
  );

  const remaining = await raw.refresh_tokens.count({
    where: { user_id: inactiveUserA, revoked_at: null, expires_at: { gt: new Date() } },
  });
  assert(remaining === 0, 'Inactive refresh revokes remaining sessions for the inactive user');
}

async function testLogoutRefreshToken() {
  console.log('\nAUTH — logout by refresh token\n');

  const login = await auth.login('auth-active-b@test.prioraflow.com', password);
  await auth.logoutRefreshToken('');
  await auth.logoutRefreshToken('not-a-real-token');

  const beforeLogout = await raw.refresh_tokens.count({
    where: { user_id: activeUserB, revoked_at: null, expires_at: { gt: new Date() } },
  });
  assert(beforeLogout === 1, 'Missing or invalid logout token is a safe no-op');

  await auth.logoutRefreshToken(login.refreshToken);
  const afterLogout = await raw.refresh_tokens.count({
    where: { user_id: activeUserB, revoked_at: null, expires_at: { gt: new Date() } },
  });
  assert(afterLogout === 0, 'Logout by refresh token revokes active sessions');
}

async function testWorkshopUserManagementBoundary() {
  console.log('\nUSERS — workshop admin management boundary\n');

  const adminContext = { sub: adminA, role: 'workshop_admin', workshopId: workshopA };

  await assertRejects(
    () => usersService.findOne(activeUserB, adminContext),
    'Workshop admin cannot read a user outside their workshop',
    (err) => err?.status === 404,
  );

  await assertRejects(
    () => usersService.update(activeUserB, { is_active: false }, adminContext),
    'Workshop admin cannot update a user outside their workshop',
    (err) => err?.status === 404,
  );

  const targetLogin = await auth.login('auth-active-a@test.prioraflow.com', password);
  assert(!!targetLogin.refreshToken, 'Target user has an active session before deactivation');

  await usersService.update(activeUserA, { is_active: false }, adminContext);
  const updatedUser = await raw.users.findUnique({ where: { id: activeUserA } });
  const activeSessions = await raw.refresh_tokens.count({
    where: { user_id: activeUserA, revoked_at: null, expires_at: { gt: new Date() } },
  });

  assert(updatedUser?.is_active === false, 'Workshop admin can deactivate a user in their own workshop');
  assert(activeSessions === 0, 'Deactivating a user revokes their active sessions');
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  PrioraFlow — Auth Security Test Suite');
  console.log('═══════════════════════════════════════════════════');

  try {
    await setup();
    await testInactiveLoginBlocked();
    await testRefreshRotationAndReuseDetection();
    await testInactiveRefreshRevokesSessions();
    await testLogoutRefreshToken();
    await testWorkshopUserManagementBoundary();
    await cleanup();

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Results: ${green(`${passed} passed`)} ${failed > 0 ? red(`${failed} failed`) : ''}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\nTest runner error:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await raw.$disconnect();
  }
}

main();
