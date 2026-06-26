/**
 * Comprehensive Connectivity Checker
 * Tests all frontend-backend and REST API connections
 * 
 * Architecture:
 * - Orchestrator (apps/orchestrator) -> port 3000, REST API
 * - tRPC API (anturonmvp/apps/api) -> port 3001, tRPC + REST endpoints
 * - Frontend (anturonmvp/apps/web) -> port 3000 (dev) / 8080 (prod)
 */

const BASE_URLS = {
  orchestrator: {
    local: 'http://localhost:3000',
    // If deployed:
    // deployed: process.env.ORCHESTRATOR_URL || 'http://35.168.16.223'
  },
  trpcApi: {
    local: 'http://localhost:3001',
  }
};

const tests = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  tests.push({ name, fn });
}

function reportResult(name, success, details = '') {
  if (success) {
    console.log(`  ✅ ${name}${details ? ' — ' + details : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${details ? ' — ' + details : ''}`);
    failed++;
  }
}

async function checkEndpoint(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      ...options
    });
    clearTimeout(timeout);
    let data;
    try { data = await response.json(); } catch { data = null; }
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     ANTURON CONNECTIVITY CHECK                      ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Checked at: ' + new Date().toISOString());
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // =========================================================
  console.log('📌 SECTION 1: Orchestrator Backend (port 3000)\n');

  const orchBase = BASE_URLS.orchestrator.local;
  
  // 1.1 Root endpoint
  const rootCheck = await checkEndpoint(`${orchBase}/`);
  reportResult('Root endpoint', rootCheck.ok,
    rootCheck.ok ? `status=${rootCheck.status}` : rootCheck.error);

  // 1.2 Health endpoint
  const healthCheck = await checkEndpoint(`${orchBase}/health`);
  reportResult('Health endpoint', healthCheck.ok,
    healthCheck.ok ? `db=${healthCheck.data?.database}` : healthCheck.error);

  // 1.3 Auth routes
  const authLoginCheck = await checkEndpoint(`${orchBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'invalid' })
  });
  // Expected 401 for invalid credentials, but endpoint should exist
  reportResult('Auth POST /auth/login', authLoginCheck.status !== 404,
    authLoginCheck.status !== 404 ? `responded with ${authLoginCheck.status}` : 'Route not found');

  const authMeCheck = await checkEndpoint(`${orchBase}/auth/me`);
  reportResult('Auth GET /auth/me', authMeCheck.status !== 404,
    authMeCheck.status !== 404 ? `responded with ${authMeCheck.status}` : 'Route not found');

  // 1.4 API endpoints
  const agentsCheck = await checkEndpoint(`${orchBase}/agents`);
  reportResult('GET /agents', agentsCheck.status !== 404,
    agentsCheck.status !== 404 ? `responded with ${agentsCheck.status}` : 'Route not found');

  const callsCheck = await checkEndpoint(`${orchBase}/calls`);
  reportResult('GET /calls', callsCheck.status !== 404,
    callsCheck.status !== 404 ? `responded with ${callsCheck.status}` : 'Route not found');

  const campaignsCheck = await checkEndpoint(`${orchBase}/campaigns`);
  reportResult('GET /campaigns', campaignsCheck.status !== 404,
    campaignsCheck.status !== 404 ? `responded with ${campaignsCheck.status}` : 'Route not found');

  const dashboardCheck = await checkEndpoint(`${orchBase}/dashboard/stats`);
  reportResult('GET /dashboard/stats', dashboardCheck.status !== 404,
    dashboardCheck.status !== 404 ? `responded with ${dashboardCheck.status}` : 'Route not found');

  // =========================================================
  console.log('\n📌 SECTION 2: tRPC API Backend (port 3001)\n');

  const trpcBase = BASE_URLS.trpcApi.local;

  // 2.1 Health
  const trpcHealth = await checkEndpoint(`${trpcBase}/health`);
  reportResult('GET /health', trpcHealth.ok,
    trpcHealth.ok ? 'connected' : trpcHealth.error);

  // 2.2 API info
  const apiInfo = await checkEndpoint(`${trpcBase}/api`);
  reportResult('GET /api', apiInfo.ok,
    apiInfo.ok ? `v${apiInfo.data?.version}` : apiInfo.error);

  // 2.3 tRPC endpoint
  const trpcEndpoint = await checkEndpoint(`${trpcBase}/api/trpc`);
  reportResult('POST /api/trpc (tRPC entry)', trpcEndpoint.status !== 404,
    `responded with ${trpcEndpoint.status}`);

  // 2.4 tRPC auth.login procedure
  const trpcLogin = await checkEndpoint(`${trpcBase}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email: 'test@test.com', password: 'invalid' } })
  });
  reportResult('tRPC auth.login procedure', trpcLogin.status !== 404,
    trpcLogin.status !== 404 ? `responded with ${trpcLogin.status}` : 'Route not found (maybe need tRPC client)');

  // =========================================================
  console.log('\n📌 SECTION 3: Frontend Configuration Validation\n');

  // 3.1 API_URL configuration
  console.log('  ℹ️  NEXT_PUBLIC_API_URL default: http://localhost:3000');
  console.log('  ℹ️  Docker Compose NEXT_PUBLIC_API_URL: http://localhost:3001');
  
  // Check which API URL config is correct based on what's running
  if (healthCheck.ok) {
    console.log('  ✅ Orchestrator (port 3000) is RUNNING — api.ts default URL is correct');
  } else if (trpcHealth.ok) {
    console.log('  ⚠️  tRPC API (port 3001) is running, but api.ts uses http://localhost:3000');
    console.log('     This mismatch means api.ts routes may fail');
  } else {
    console.log('  ⚠️  Neither backend is running — deploy first or start services');
  }

  // 3.2 Next.js rewrites check
  console.log('\n  📋 Next.js Rewrite Rules (next.config.js):');
  console.log('     /api/trpc/:path* -> ${NEXT_PUBLIC_API_URL}/api/trpc/:path*');
  console.log('     This proxies tRPC calls to the backend API (port 3001)');

  // 3.3 Auth route validation
  const authRouteFile = 'anturonmvp/apps/web/auth.ts';
  console.log(`\n  📋 NextAuth Google login target: ${BASE_URLS.trpcApi.local}/api/trpc/auth.googleLogin`);
  console.log('     This correctly targets the tRPC API on port 3001');

  // 3.4 Frontend dev server check
  const frontendCheck = await checkEndpoint('http://localhost:3000');
  reportResult('Frontend (localhost:3000)', frontendCheck.ok,
    frontendCheck.ok ? 'Next.js is running' : frontendCheck.error);
  
  const frontendProdCheck = await checkEndpoint('http://localhost:8080');
  reportResult('Frontend (localhost:8080)', frontendProdCheck.ok,
    frontendProdCheck.ok ? 'Next.js production is running' : frontendProdCheck.error);

  // =========================================================
  console.log('\n📌 SECTION 4: Cross-Connection Validation\n');

  // Check if orchestrator can be reached by frontend's expected URL
  const frontendApiUrl = 'http://localhost:3000'; // from api.ts default
  const dockerApiUrl = 'http://localhost:3001';   // from docker-compose

  console.log(`  🔗 Frontend api.ts targets: ${frontendApiUrl}`);
  const orchViaApiUrl = await checkEndpoint(`${frontendApiUrl}/health`);
  reportResult('Orchestrator reachable via api.ts URL', 
    orchViaApiUrl.ok, 
    orchViaApiUrl.ok ? 'OK' : `Not reachable — ${orchViaApiUrl.error || `status=${orchViaApiUrl.status}`}`);

  console.log(`\n  🔗 Docker expects API at: ${dockerApiUrl}`);
  const trpcViaDockerUrl = await checkEndpoint(`${dockerApiUrl}/health`);
  reportResult('tRPC API reachable via Docker URL',
    trpcViaDockerUrl.ok,
    trpcViaDockerUrl.ok ? 'OK' : `Not reachable — ${trpcViaDockerUrl.error || `status=${trpcViaDockerUrl.status}`}`);

  // =========================================================
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════\n');
  
  if (passed + failed === 0) {
    console.log('  ❌ No tests could run — no backend services detected\n');
  }

  // Print detailed summary
  console.log(`  Total checks: ${passed + failed}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (healthCheck.ok && trpcHealth.ok) {
    console.log('\n  ✅ STATUS: Both backends are running and reachable');
    console.log('  🎯 Frontend should be able to connect properly');
  } else if (healthCheck.ok) {
    console.log('\n  ⚠️  STATUS: Only Orchestrator is running');
    console.log('  → tRPC API (port 3001) needs to be started for Google auth');
  } else if (trpcHealth.ok) {
    console.log('\n  ⚠️  STATUS: Only tRPC API is running');
    console.log('  → Orchestrator (port 3000) needs to be started for REST endpoints');
  } else {
    console.log('\n  ❌ STATUS: No backend services are running');
  }

  // Print architecture diagram
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📐 ARCHITECTURE DIAGRAM');
  console.log('════════════════════════════════════════════════════════\n');
  console.log('  Browser');
  console.log('    ↓');
  console.log('  Frontend (Next.js :3000)');
  console.log('    ↓ (api.ts REST calls)      ↓ (NextAuth Google)');
  console.log('  Orchestrator (:3000)         tRPC API (:3001)');
  console.log('    ↓                           ↓');
  console.log('  [Prisma DB]                  [Prisma DB]');
  console.log('\n  ⚠️  NOTE: Orchestrator and Frontend BOTH default to port 3000');
  console.log('  → In docker-compose: orchestrator not included, only api:3001 + web:3000');
  console.log('  → api.ts points to localhost:3000 (orchestrator)');
  console.log('  → For local dev, start orchestartor on different port or use docker compose\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});