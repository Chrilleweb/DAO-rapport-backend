import connection from "../config/db.js"; // Importer din databaseforbindelse
import convertToUTC from "dato-konverter";

class Rapport {
// opret daglig rapport 
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
        `INSERT INTO report_fields (user_id, content, report_type_id) VALUES (?, ?, ?)`,
        [user_id, content, report_type_id]
      );

      return result.insertId;
    } catch (error) {
      console.error("Error creating daily report:", error.message);
      throw error;
    }
  }
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

  static async updateReportType(reportId, updatedReportTypeId) {
    try {
      const [result] = await connection.query(
        "UPDATE report_fields SET report_type_id = ? WHERE id = ?",
        [updatedReportTypeId, reportId]
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
        FROM report_fields rf
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
      return rows[0];
    } catch (error) {
      throw new Error(error);
    }
  }

  static async createScheduledReport(data) {
    try {
      const { user_id, content, report_type_id, scheduled_time } = data;
      const [result] = await connection.query(
        `INSERT INTO schedule_reports (user_id, content, report_type_id, scheduled_time) VALUES (?, ?, ?, ?)`,
        [user_id, content, report_type_id, scheduled_time]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async insertScheduledReport(scheduleReport) {
    try {
      const {
        id: scheduleReportId,
        user_id,
        content,
        report_type_id,
      } = scheduleReport;

      // Indsæt rapporten i report_fields
      const [result] = await connection.query(
        `INSERT INTO report_fields (user_id, content, report_type_id) VALUES (?, ?, ?)`,
        [user_id, content, report_type_id]
      );

      const newReportId = result.insertId; // Få det nye rapport-ID

      // Kopier kommentarer fra den planlagte rapport til den nye aktive rapport
      const [comments] = await connection.query(
        `SELECT content, user_id, created_at, updated_at 
         FROM schedule_report_comments 
         WHERE schedule_report_id = ?`,
        [scheduleReportId]
      );

      for (const comment of comments) {
        await connection.query(
          `INSERT INTO report_comments (report_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          [
            newReportId,
            comment.user_id,
            comment.content,
            comment.created_at, // Kopier det oprindelige 'created_at'
            comment.updated_at || comment.created_at, // Kopier 'updated_at', eller brug 'created_at' hvis det ikke findes
          ]
        );
      }

      return result; // Returner resultatet af den indsatte rapport
    } catch (error) {
      throw new Error(error);
    }
  }

  // Hent planlagte rapporter, der skal sendes
  static async getAllScheduledReports() {
    try {
      const [rows] = await connection.query(
        `SELECT sr.id, sr.user_id, sr.content, sr.report_type_id, sr.scheduled_time, sr.is_sent,
         u.firstname, u.lastname, rt.report_type
         FROM schedule_reports sr
         JOIN users u ON sr.user_id = u.id
         JOIN report_types rt ON sr.report_type_id = rt.id
         WHERE sr.is_sent = FALSE
         ORDER BY sr.scheduled_time ASC`
      );

      return rows.map((row) => ({
        ...row,
        scheduled_time: convertToUTC(row.scheduled_time),
      }));
    } catch (error) {
      throw new Error(error);
    }
  }

  // Hent en planlagt rapport ved dens ID
  static async getScheduledReportById(id) {
    try {
      const [rows] = await connection.query(
        `SELECT sr.id, sr.user_id, sr.content, sr.report_type_id, sr.scheduled_time, sr.is_sent,
         u.firstname, u.lastname, rt.report_type
         FROM schedule_reports sr
         JOIN users u ON sr.user_id = u.id
         JOIN report_types rt ON sr.report_type_id = rt.id
         WHERE sr.id = ?`,
        [id]
      );

      return rows.map((row) => ({
        ...row,
        scheduled_time: convertToUTC(row.scheduled_time),
      }));
    } catch (error) {
      throw new Error(error);
    }
  }

  static async updateScheduledReport(reportId, userId, updatedFields) {
    try {
      const [result] = await connection.query(
        "UPDATE schedule_reports SET ? WHERE id = ? AND user_id = ?",
        [updatedFields, reportId, userId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async updateScheduledReportType(reportId, updatedReportTypeId) {
    try {
      const [result] = await connection.query(
        "UPDATE schedule_reports SET report_type_id = ? WHERE id = ?",
        [updatedReportTypeId, reportId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Marker rapporten som sendt
  static async markScheduledReportAsSent(scheduleReportId) {
    try {
      const [result] = await connection.query(
        `UPDATE schedule_reports SET is_sent = TRUE WHERE id = ?`,
        [scheduleReportId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Tilføj denne metode for at hente due scheduled reports
  static async getDueScheduledReports() {
    try {
      const [rows] = await connection.query(
        `SELECT sr.id, sr.user_id, sr.content, sr.report_type_id, sr.scheduled_time, sr.is_sent
         FROM schedule_reports sr
         WHERE sr.scheduled_time <= NOW() AND sr.is_sent = FALSE`
      );

      return rows.map((row) => ({
        ...row,
        scheduled_time: convertToUTC(row.scheduled_time),
      }));
    } catch (error) {
      throw new Error("Error fetching due scheduled reports: " + error.message);
    }
  }

  static async getScheduledReportsWithComments() {
    try {
      const scheduledReports = await this.getAllScheduledReports();
      const reportsWithComments = [];

      for (const report of scheduledReports) {
        const comments =
          await ScheduleReportComment.getCommentsByScheduleReportId(report.id);
        reportsWithComments.push({
          ...report,
          comments: comments.map((comment) => ({
            ...comment,
            created_at: convertToUTC(comment.created_at),
            updated_at: convertToUTC(comment.updated_at),
            id: Number(comment.id),
            schedule_report_id: Number(comment.schedule_report_id),
            user_id: Number(comment.user_id),
          })),
        });
      }

      return reportsWithComments;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default Rapport;
