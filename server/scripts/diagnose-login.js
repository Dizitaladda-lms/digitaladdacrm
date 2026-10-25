import "dotenv/config";
import pool from "../config/db.js";
import {
  findUserByEmailWithPasswordRepository,
  findUsersByIdentifierWithPasswordRepository,
} from "../repositories/authRepository.js";
import { verifyPasswordWithRehashCheck } from "../utils/passwordUtils.js";

// Read-only production diagnostic. It deliberately does not call loginUserService,
// so it cannot increment failed attempts, lock an account, issue tokens, or alter data.
const identifier = String(process.env.LOGIN_DIAGNOSTIC_IDENTIFIER || "").trim();
const password = String(process.env.LOGIN_DIAGNOSTIC_PASSWORD || "");

if (!identifier || !password) {
  console.error(
    "Set LOGIN_DIAGNOSTIC_IDENTIFIER and LOGIN_DIAGNOSTIC_PASSWORD for this command."
  );
  process.exitCode = 1;
} else {
  try {
    let candidates = await findUsersByIdentifierWithPasswordRepository(identifier);
    if (!candidates.length) {
      const single = await findUserByEmailWithPasswordRepository(identifier);
      if (single) candidates = [single];
    }

    if (!candidates.length) {
      console.log(JSON.stringify({ result: "user_not_found" }));
    } else {
      let matchedUser = null;
      let needsRehash = false;
      for (const candidate of candidates) {
        const check = await verifyPasswordWithRehashCheck(password, candidate.password);
        if (check.isValid) {
          matchedUser = candidate;
          needsRehash = check.needsRehash;
          break;
        }
      }

      if (!matchedUser) {
        console.log(JSON.stringify({
          result: "password_mismatch",
          matchedAccounts: candidates.length,
        }));
      } else if (!matchedUser.is_active || matchedUser.is_deleted) {
        console.log(JSON.stringify({ result: "account_inactive" }));
      } else if (matchedUser.lockout_until && new Date(matchedUser.lockout_until) > new Date()) {
        console.log(JSON.stringify({ result: "account_locked" }));
      } else {
        console.log(JSON.stringify({
          result: "login_would_succeed",
          passwordHashNeedsUpgrade: needsRehash,
        }));
      }
    }
  } catch (error) {
    console.error("Login diagnostic failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
