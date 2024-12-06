import connection from "../config/db.js";
import Comment from "./comment.model.js";
import convertToUTC from "dato-konverter";

class Report {
  static async addImage(reportId, imageData) {
    try {
      const [result] = await connection.query(
        "INSERT INTO report_images (report_id, image_data) VALUES (?, ?)",
        [reportId, imageData]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getImagesByReportId(reportId) {
    try {
      const [rows] = await connection.query(
        "SELECT id, image_data FROM report_images WHERE report_id = ?",
        [reportId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async deleteImageById(imageId) {
    try {
      const [result] = await connection.query(
        "DELETE FROM report_images WHERE id = ?",
        [imageId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async createDailyReport() {
    try {
      const [daoUserRows] = await connection.query(
        "SELECT id FROM users WHERE email = ?",
        ["dao@dao.as"]
      );

      if (!daoUserRows || daoUserRows.length === 0) {
        throw new Error("DAO user not found");
      }

      const user_id = daoUserRows[0].id;

      const content =
        "Kontroltæl oplag til Bornholm og noter oplag i STAT. Hvis der er specielle udgaver til ABO/løssalg skal Bornholms tidene informeres. Optalt af og status på optælling:";

      const report_type_id = 1; // ALLE rapporttype

      const [result] = await connection.query(
        `INSERT INTO reports (user_id, content, report_type_id) VALUES (?, ?, ?)`,
        [user_id, content, report_type_id]
      );

      return result.insertId;
    } catch (error) {
      console.error("Error creating daily report:", error.message);
      throw error;
    }
  }

  static async create(newReportField) {
    try {
      const [result] = await connection.query(
        "INSERT INTO reports SET ?",
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
        "UPDATE reports SET ? WHERE id = ? AND user_id = ?",
        [updatedFields, reportId, userId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async updateReportType(reportId, updatedReportTypeId) {
    try {
      const [result] = await connection.query(
        "UPDATE reports SET report_type_id = ? WHERE id = ?",
        [updatedReportTypeId, reportId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getReportsWithCommentsByTypeIds(reportTypeIds, intervalDays) {
    if (!Array.isArray(reportTypeIds) || reportTypeIds.length === 0) {
      throw new Error("reportTypeIds must be a non-empty array");
    }
    try {
      const placeholders = reportTypeIds.map(() => "?").join(",");
      const [rows] = await connection.query(
        `
        SELECT 
          rf.id AS report_id, rf.content AS report_content, rf.created_at AS report_created_at, 
          rf.user_id AS report_user_id, rf.report_type_id,
          u.firstname AS report_firstname, u.lastname AS report_lastname, rt.report_type,
          rc.id AS comment_id, rc.content AS comment_content, rc.created_at AS comment_created_at,
          rc.user_id AS comment_user_id, cu.firstname AS comment_firstname, cu.lastname AS comment_lastname
        FROM reports rf
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

      const reports = Array.from(reportsMap.values());
      for (const report of reports) {
        report.images = await this.getImagesByReportId(report.id);
      }
      return reports;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getReportsWithCommentsByTypeIdsAndDates(
    reportTypeIds,
    startDate,
    endDate
  ) {
    try {
      const placeholders = reportTypeIds.map(() => "?").join(",");
      const [rows] = await connection.query(
        `
        SELECT 
          rf.id AS report_id, rf.content AS report_content, rf.created_at AS report_created_at, 
          rf.user_id AS report_user_id, rf.report_type_id,
          u.firstname AS report_firstname, u.lastname AS report_lastname, rt.report_type,
          rc.id AS comment_id, rc.content AS comment_content, rc.created_at AS comment_created_at,
          rc.user_id AS comment_user_id, cu.firstname AS comment_firstname, cu.lastname AS comment_lastname
        FROM reports rf
        JOIN users u ON rf.user_id = u.id
        JOIN report_types rt ON rf.report_type_id = rt.id
        LEFT JOIN report_comments rc ON rf.id = rc.report_id
        LEFT JOIN users cu ON rc.user_id = cu.id
        WHERE rf.report_type_id IN (${placeholders})
        AND rf.created_at BETWEEN ? AND ?
        ORDER BY rf.created_at DESC, rc.created_at ASC;
        `,
        [...reportTypeIds, startDate, endDate]
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

      const reports = Array.from(reportsMap.values());
      for (const report of reports) {
        report.images = await this.getImagesByReportId(report.id);
      }
      return reports;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getFullReportById(reportId) {
    try {
      const [rows] = await connection.query(
        `
        SELECT reports.id, reports.content, reports.created_at,
               reports.user_id, reports.report_type_id,
               users.firstname, users.lastname, report_types.report_type
        FROM reports
        JOIN users ON reports.user_id = users.id
        JOIN report_types ON reports.report_type_id = report_types.id
        WHERE reports.id = ?
        `,
        [reportId]
      );
      const report = rows[0];
      if (report) {
        // Hent billeder for rapporten
        report.images = await this.getImagesByReportId(report.id);
  
        // Hent kommentarer for rapporten
        const comments = await Comment.getCommentsByReportId(report.id);
        report.comments = comments.map((comment) => ({
          ...comment,
          created_at: convertToUTC(comment.created_at),
          id: Number(comment.id),
          report_id: Number(comment.report_id),
          user_id: Number(comment.user_id),
        }));
      }
      return report;
    } catch (error) {
      throw new Error(error);
    }
  }  

  static async deleteReport({ reportId, userId }) {
    try {
      const [result] = await connection.query(
        `DELETE FROM reports WHERE id = ? AND user_id = ?`,
        [reportId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Rapporten kunne ikke findes eller blev ikke slettet.");
      }

      return result;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default Report;
