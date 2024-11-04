import connection from "../config/db.js"; // Importer din databaseforbindelse

class Rapport {
  // Opret en ny rapport
  static async create(newReportField) {
    try {
      const [result] = await connection.query(
        "INSERT INTO report_fields SET ?",
        newReportField
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async update(reportId, userId, updatedFields) {
    try {
      const [result] = await connection.query(
        "UPDATE report_fields SET ? WHERE id = ? AND user_id = ?",
        [updatedFields, reportId, userId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getReportsByTypeIds(reportTypeIds) {
    try {
      // Prepare placeholders for the IN clause
      const placeholders = reportTypeIds.map(() => "?").join(",");
      const [rows] = await connection.query(
        `
        SELECT report_fields.id, report_fields.content, report_fields.created_at, 
               report_fields.user_id, report_fields.report_type_id,
               users.firstname, users.lastname, report_types.report_type
        FROM report_fields 
        JOIN users ON report_fields.user_id = users.id 
        JOIN report_types ON report_fields.report_type_id = report_types.id
        WHERE report_fields.report_type_id IN (${placeholders})
        AND report_fields.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        ORDER BY report_fields.created_at DESC;
        `,
        reportTypeIds
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getFullReportById(reportId) {
    try {
      const [rows] = await connection.query(
        `
        SELECT report_fields.id, report_fields.content, report_fields.created_at,
               report_fields.user_id, report_fields.report_type_id,
               users.firstname, users.lastname, report_types.report_type
        FROM report_fields
        JOIN users ON report_fields.user_id = users.id
        JOIN report_types ON report_fields.report_type_id = report_types.id
        WHERE report_fields.id = ?
        `,
        [reportId]
      );
      return rows[0]; // Return the first row (should only be one)
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default Rapport;
