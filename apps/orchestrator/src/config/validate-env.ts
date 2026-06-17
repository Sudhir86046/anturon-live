export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "SARVAM_API_KEY",
    "DEEPGRAM_API_KEY",
  ];

  const optional = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "PUBLIC_BASE_URL",
  ];

  const missingRequired = required.filter((key) => !process.env[key]);
  const missingOptional = optional.filter((key) => !process.env[key]);

  if (missingRequired.length) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(", ")}`
    );
  }

  if (missingOptional.length) {
    console.warn(
      `Optional environment variables missing: ${missingOptional.join(", ")}`
    );
  }

  console.log("✅ Environment validation passed");
}
