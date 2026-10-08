import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import pool from "../config/db.js";
import {
  findUserByEmailWithPasswordRepository,
  findUserByIdRepository,
  findUserProfileImageRepository,
} from "../repositories/authRepository.js";
import {
  MAX_PROFILE_IMAGE_STORED_BYTES,
  prepareProfileImageDataUrl,
} from "../utils/profileImage.js";

describe("profile image storage and reads", () => {
  it("resizes uploads to a small JPEG bounded by 256 pixels", async () => {
    const input = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 30, g: 90, b: 160 },
      },
    })
      .png()
      .toBuffer();

    const result = await prepareProfileImageDataUrl(
      `data:image/png;base64,${input.toString("base64")}`
    );
    const output = Buffer.from(result.split(",")[1], "base64");
    const metadata = await sharp(output).metadata();

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(output.length).toBeLessThanOrEqual(MAX_PROFILE_IMAGE_STORED_BYTES);
    expect(metadata.width).toBeLessThanOrEqual(256);
    expect(metadata.height).toBeLessThanOrEqual(256);
  });

  it("rejects uploads larger than 200 KB before decoding", async () => {
    const oversized = Buffer.alloc(200 * 1024 + 1).toString("base64");

    await expect(
      prepareProfileImageDataUrl(`data:image/jpeg;base64,${oversized}`)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("does not select profile images for login or /me reads", async () => {
    const query = vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await findUserByEmailWithPasswordRepository("user@example.com");
    await findUserByIdRepository(1);

    expect(query.mock.calls[0][0]).not.toMatch(/u\.\*|profile_image/i);
    expect(query.mock.calls[1][0]).not.toMatch(/profile_image/i);
    query.mockRestore();
  });

  it("reads the image column only from the dedicated profile-image repository", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [{ profile_image: "data:image/jpeg;base64,AA==" }],
    });

    const result = await findUserProfileImageRepository(1);

    expect(query.mock.calls[0][0]).toMatch(/SELECT profile_image FROM users/);
    expect(result.profile_image).toBe("data:image/jpeg;base64,AA==");
    query.mockRestore();
  });
});
