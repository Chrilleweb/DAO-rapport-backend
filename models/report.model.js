import connection from "../config/db.js"; // Importer din databaseforbindelse
import convertToUTC from "dato-konverter";

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

  // Opdater en eksisterende rapport
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

  // Hent rapporter med kommentarer for et givent interval
  static async getReportsWithCommentsByTypeIds(reportTypeIds, intervalDays) {
    try {
      // Prepare placeholders for the IN clause
      const placeholders = reportTypeIds.map(() => "?").join(",");
      const [rows] = await connection.query(
        `
        SELECT 
          rf.id AS report_id, rf.content AS report_content, rf.created_at AS report_created_at, 
          rf.user_id AS report_user_id, rf.report_type_id,
          u.firstname AS report_firstname, u.lastname AS report_lastname, rt.report_type,
          rc.id AS comment_id, rc.content AS comment_content, rc.created_at AS comment_created_at,
          rc.user_id AS comment_user_id, cu.firstname AS comment_firstname, cu.lastname AS comment_lastname
        FROM report_fields rf
        JOIN users u ON rf.user_id = u.id
        JOIN report_types rt ON rf.report_type_id = rt.id
        LEFT JOIN report_comments rc ON rf.id = rc.report_id
        LEFT JOIN users cu ON rc.user_id = cu.id
        WHERE rf.report_type_id IN (${placeholders})
        AND rf.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY rf.created_at DESC, rc.created_at ASC;
        `,
        [...reportTypeIds, intervalDays]
      );

      const reportsMap = new Map();

      rows.forEach((row) => {
        const reportId = row.report_id;

        if (!reportsMap.has(reportId)) {
          reportsMap.set(reportId, {
            id: reportId,
            content: row.report_content,
            created_at: convertToUTC(row.report_created_at),
            user_id: row.report_user_id,
            report_type_id: row.report_type_id,
            firstname: row.report_firstname,
            lastname: row.report_lastname,
            report_type: row.report_type,
            comments: [],
          });
        }

        if (row.comment_id) {
          reportsMap.get(reportId).comments.push({
            id: row.comment_id,
            content: row.comment_content,
            created_at: convertToUTC(row.comment_created_at),
            user_id: row.comment_user_id,
            firstname: row.comment_firstname,
            lastname: row.comment_lastname,
          });
        }
      });

      return Array.from(reportsMap.values());
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
