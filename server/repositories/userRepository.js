import pool from "../config/db.js";

/* ===========================
   CREATE USER
=========================== */

export const createUserRepository = async (
    client,
    user
) => {

    const query = `
        INSERT INTO users (

            full_name,
            email,
            password,
            role

        )

        VALUES ($1,$2,$3,$4)

        RETURNING id, full_name, email, role, is_active, is_deleted,
                  email_verified, last_login, created_at, updated_at;
    `;

    const values = [

        user.full_name,
        user.email,
        user.password,
        user.role

    ];

    const result =
    await client.query(query, values);

    return result.rows[0];

};

/* ===========================
   FIND USER BY EMAIL
=========================== */

export const findUserByEmailRepository = async (
    email
) => {

    const query = `

        SELECT id, full_name, email, role, is_active, is_deleted,
               email_verified, last_login, created_at, updated_at

        FROM users

        WHERE email = $1

        AND is_deleted = FALSE;

    `;

    const result =
    await pool.query(query,[email]);

    return result.rows[0];

};

/* ===========================
   FIND USER BY ID
=========================== */

export const findUserByIdRepository = async (
    id
) => {

    const query = `

        SELECT id, full_name, email, role, is_active, is_deleted,
               email_verified, last_login, created_at, updated_at

        FROM users

        WHERE id = $1

        AND is_deleted = FALSE;

    `;

    const result =
    await pool.query(query,[id]);

    return result.rows[0];

};

export const updateUserRepository = async (
    client,
    id,
    user
) => {
    const fields = [];
    const values = [];
    let idx = 1;

    if (user.full_name !== undefined) {
        fields.push(`full_name = $${idx++}`);
        values.push(user.full_name);
    }
    if (user.email !== undefined) {
        fields.push(`email = $${idx++}`);
        values.push(user.email);
    }
    if (user.password !== undefined) {
        fields.push(`password = $${idx++}`);
        values.push(user.password);
    }
    if (user.role !== undefined) {
        fields.push(`role = $${idx++}`);
        values.push(user.role);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        AND is_deleted = FALSE
        RETURNING id, full_name, email, role, is_active, is_deleted,
                  email_verified, last_login, created_at, updated_at;
    `;

    const result = await client.query(query, values);

    return result.rows[0];

};

export const softDeleteUserRepository = async (
    client,
    id
) => {

    const query = `
        UPDATE users
        SET
            is_deleted = TRUE,
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND is_deleted = FALSE
        RETURNING id, full_name, email, role, is_active, is_deleted,
                  email_verified, last_login, created_at, updated_at;
    `;

    const result = await client.query(query,[id]);

    return result.rows[0];

};

export const restoreUserRepository = async (
    client,
    id
) => {

    const query = `
        UPDATE users
        SET
            is_deleted = FALSE,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND is_deleted = TRUE
        RETURNING id, full_name, email, role, is_active, is_deleted,
                  email_verified, last_login, created_at, updated_at;
    `;

    const result = await client.query(query,[id]);

    return result.rows[0];

};

export const updateLastLoginRepository = async (
    client,
    id
) => {

    const query = `
        UPDATE users
        SET
            last_login = CURRENT_TIMESTAMP
        WHERE id = $1;
    `;

    await client.query(query,[id]);

};
