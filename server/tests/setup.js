if (
  process.env.NODE_ENV === "test" &&
  process.env.DATABASE_URL?.toLowerCase().includes("neon.tech")
) {
  throw new Error("Refusing to run tests against Neon when NODE_ENV=test.");
}
