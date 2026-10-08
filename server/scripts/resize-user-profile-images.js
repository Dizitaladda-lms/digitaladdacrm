import pool from "../config/db.js";
import { resizeProfileImageBuffer } from "../utils/profileImage.js";

const MAX_IMAGE_BYTES = 200 * 1024;
const applyChanges = process.argv.includes("--apply");

const main = async () => {
  const { rows } = await pool.query(
    `SELECT id, profile_image
     FROM users
     WHERE profile_image LIKE 'data:image/%;base64,%'
       AND octet_length(profile_image) > $1
     ORDER BY id;`,
    [MAX_IMAGE_BYTES]
  );

  const updates = [];
  for (const row of rows) {
    const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      row.profile_image
    );
    if (!match) {
      throw new Error(`User ${row.id} has an unsupported profile image data URL.`);
    }

    const original = Buffer.from(match[1], "base64");
    if (original.toString("base64") !== match[1]) {
      throw new Error(`User ${row.id} has an invalid profile image encoding.`);
    }
    if (original.length <= MAX_IMAGE_BYTES) continue;

    const compressed = await resizeProfileImageBuffer(original);
    const dataUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`;
    updates.push({ id: row.id, dataUrl });
    console.log(
      `User ${row.id}: before ${original.length} bytes (${Buffer.byteLength(row.profile_image)} bytes stored), ` +
      `after ${compressed.length} bytes (${Buffer.byteLength(dataUrl)} bytes stored).`
    );
  }

  if (!applyChanges) {
    console.log(`Dry run only: ${updates.length} user image(s) would be resized. No rows were updated.`);
    console.log("Review the sizes above, then run with --apply to update these images.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const image of updates) {
      await client.query(
        `UPDATE users SET profile_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [image.dataUrl, image.id]
      );
    }
    await client.query("COMMIT");
    console.log(`Updated ${updates.length} user profile image(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

try {
  await main();
} catch (error) {
  console.error("Profile image resize failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
