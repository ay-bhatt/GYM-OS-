/**
 * Test script: Login + Role-Based Access Control verification
 *
 * Run with: node test-login-rbac.js
 * Requires the Next.js dev server running on http://localhost:3000
 * and the local Supabase stack running (supabase start)
 *
 * NOTE: The platform now starts with ZERO demo data. Only the Super Admin
 * account is seeded. Gym admins are created through the Super Admin panel
 * (Gyms -> Add Gym), so the gym-admin login RBAC tests have been removed.
 */

const API = "http://localhost:3000";

async function login(username, password) {
  const res = await fetch(API + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");
  const sessionCookie = setCookie ? setCookie.split(";")[0] : null;
  const body = await res.text();

  return { status: res.status, cookie: sessionCookie, body };
}

async function accessProtected(cookie, path) {
  const res = await fetch(API + path, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });

  const location = res.headers.get("location");
  return { status: res.status, location };
}

async function run() {
  let passed = 0;
  let failed = 0;

  function check(name, condition) {
    if (condition) {
      console.log("  ✓ " + name + " — PASS");
      passed++;
    } else {
      console.log("  ✗ " + name + " — FAIL");
      failed++;
    }
  }

  // ── Test 1: Superadmin login ─────────────────────────────────────────────
  console.log("\n── Test 1: Superadmin login ──");
  const sa = await login("superadmin", "Super@2026#Admin");
  console.log("  Status:", sa.status);
  console.log("  Cookie set:", !!sa.cookie);
  console.log("  Body:", sa.body);
  check("Login returns 200", sa.status === 200);
  check("Cookie is set", !!sa.cookie);
  check("Redirects to /super-admin/dashboard", sa.body.includes("/super-admin/dashboard"));
  check("Role is SUPER_ADMIN", sa.body.includes("SUPER_ADMIN"));

  // ── Test 2: Wrong credentials ────────────────────────────────────────────
  console.log("\n── Test 2: Wrong credentials ──");
  const bad = await login("superadmin", "wrong-password");
  console.log("  Status:", bad.status, "(expected 401)");
  console.log("  Body:", bad.body);
  check("Returns 401", bad.status === 401);

  // ── Test 3: RBAC — superadmin CAN access /super-admin/dashboard ───────────
  console.log("\n── Test 3: RBAC — superadmin accessing /super-admin/dashboard ──");
  const saAllowed = await accessProtected(sa.cookie, "/super-admin/dashboard");
  console.log("  Status:", saAllowed.status, "(expected 200)");
  check("Access granted", saAllowed.status === 200);

  // ── Test 4: Unauthenticated access is blocked ─────────────────────────────
  console.log("\n── Test 4: Unauthenticated access to /gym/dashboard ──");
  const noAuth = await accessProtected(null, "/gym/dashboard");
  console.log("  Status:", noAuth.status, "(expected 307 redirect)");
  console.log("  Location:", noAuth.location);
  check("Redirected to login", noAuth.status === 307);
  check("Redirects to /login", noAuth.location && noAuth.location.includes("/login"));

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "-".repeat(50));
  console.log("Results: " + passed + " passed, " + failed + " failed");
  console.log(failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED");
  console.log("-".repeat(50));
}

run().catch((err) => {
  console.error("Test error:", err.message);
  process.exit(1);
});
