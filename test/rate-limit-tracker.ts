import { JwtService } from '@nestjs/jwt';
import { buildRateLimitTracker, getClientIp } from '../src/common/rate-limit/rate-limit-tracker';

const secret = 'test-secret';
const jwt = new JwtService({ secret });
let passed = 0;
let failed = 0;

const green = (s: string) => `\x1b[32m✓ ${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m✗ ${s}\x1b[0m`;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(green(label));
    passed++;
  } else {
    console.log(red(label));
    failed++;
  }
}

const tokenA1 = jwt.sign({ sub: 'user-a1', role: 'advisor', workshopId: 'workshop-a' });
const tokenA2 = jwt.sign({ sub: 'user-a2', role: 'advisor', workshopId: 'workshop-a' });
const tokenB = jwt.sign({ sub: 'user-b1', role: 'advisor', workshopId: 'workshop-b' });
const platformToken = jwt.sign({ sub: 'platform-1', role: 'platform_admin', workshopId: null });

console.log('\nPrioraFlow — Rate Limit Tracker Tests\n');

assert(
  buildRateLimitTracker({ headers: { authorization: `Bearer ${tokenA1}` }, ip: '1.1.1.1' }, jwt) === 'tenant:workshop-a',
  'JWT workshop user maps to tenant bucket',
);

assert(
  buildRateLimitTracker({ headers: { authorization: `Bearer ${tokenA1}` }, ip: '1.1.1.1' }, jwt) ===
    buildRateLimitTracker({ headers: { authorization: `Bearer ${tokenA2}` }, ip: '2.2.2.2' }, jwt),
  'Different users in same workshop share the same tenant bucket',
);

assert(
  buildRateLimitTracker({ headers: { authorization: `Bearer ${tokenA1}` }, ip: '1.1.1.1' }, jwt) !==
    buildRateLimitTracker({ headers: { authorization: `Bearer ${tokenB}` }, ip: '1.1.1.1' }, jwt),
  'Different workshops get separate buckets',
);

assert(
  buildRateLimitTracker({ headers: { authorization: `Bearer ${platformToken}` }, ip: '1.1.1.1' }, jwt) === 'user:platform-1',
  'Platform admin without workshop maps to user bucket',
);

assert(
  buildRateLimitTracker({ headers: { authorization: 'Bearer invalid-token' }, ip: '1.1.1.1' }, jwt) === 'ip:1_1_1_1',
  'Invalid JWT falls back to IP bucket',
);

assert(
  getClientIp({ headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }, ip: '127.0.0.1' }) === '203.0.113.10',
  'Client IP respects first x-forwarded-for value behind proxy',
);

console.log(`\nResults: ${passed} passed${failed ? `, ${failed} failed` : ''}\n`);
process.exit(failed ? 1 : 0);
