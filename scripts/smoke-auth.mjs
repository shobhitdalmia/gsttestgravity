const baseUrl = (process.env.APP_URL || "https://gst-muse-buddy.lovable.app").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/api/public/health/otp`, {
  headers: { accept: "application/json" },
  cache: "no-store",
});

let result;
try {
  result = await response.json();
} catch {
  throw new Error(`OTP readiness returned a non-JSON response (${response.status})`);
}

const required = ["supabaseUrl", "publishableKey", "serviceKey", "tempOtp", "ready"];
const failed = required.filter((key) => result[key] !== true);
if (!response.ok || failed.length > 0) {
  throw new Error(`OTP readiness failed on ${baseUrl}: ${failed.join(", ") || response.status}`);
}

console.log(`OTP readiness passed on ${baseUrl}`);