import pool from "../config/db.js";

export const createEmployeeDocumentRepository = async (client, document) => {
  const { rows } = await client.query(
    `INSERT INTO employee_documents (
       employee_id, uploaded_by_user_id, document_type, document_label,
       original_filename, mime_type, size_bytes, cloudinary_public_id,
       cloudinary_resource_type, cloudinary_version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *;`,
    [
      document.employeeId,
      document.userId,
      document.documentType,
      document.documentLabel,
      document.originalFilename,
      document.mimeType,
      document.sizeBytes,
      document.publicId,
      document.resourceType,
      document.version || null,
    ]
  );
  return rows[0];
};

export const findEmployeeDocumentsRepository = async (employeeId, client = pool) => {
  const { rows } = await client.query(
    `SELECT id, employee_id, document_type, document_label, original_filename,
            mime_type, size_bytes, cloudinary_public_id, cloudinary_resource_type,
            cloudinary_version, created_at
     FROM employee_documents
     WHERE employee_id = $1
     ORDER BY created_at DESC, id DESC;`,
    [employeeId]
  );
  return rows;
};

export const findEmployeeDocumentByIdRepository = async (documentId, employeeId, client = pool) => {
  const { rows } = await client.query(
    `SELECT * FROM employee_documents WHERE id = $1 AND employee_id = $2 LIMIT 1;`,
    [documentId, employeeId]
  );
  return rows[0] || null;
};

export const deleteEmployeeDocumentRepository = async (client, documentId, employeeId) => {
  const { rows } = await client.query(
    `DELETE FROM employee_documents WHERE id = $1 AND employee_id = $2 RETURNING *;`,
    [documentId, employeeId]
  );
  return rows[0] || null;
};
