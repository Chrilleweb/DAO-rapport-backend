import connection from "../config/db.js";
import convertToUTC from "dato-konverter";
import ScheduleReportComment from "../models/scheduleReportComment.model.js";
import Report from "./report.model.js";

class ScheduleReport {
  static async addImageToScheduledReport(scheduleReportId, imageData) {
    try {
      const [result] = await connection.query(
        "INSERT INTO schedule_report_images (schedule_report_id, image_data) VALUES (?, ?)",
        [scheduleReportId, imageData]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getImagesByScheduledReportId(scheduleReportId) {
    try {
      const [rows] = await connection.query(
        "SELECT id, image_data FROM schedule_report_images WHERE schedule_report_id = ?",
        [scheduleReportId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async deleteImageByIdFromScheduledReport(imageId) {
    try {
      const [result] = await connection.query(
        "DELETE FROM schedule_report_images WHERE id = ?",
        [imageId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async createScheduledReport(data) {
    try {
      const { user_id, content, report_type_id, scheduled_time, images } = data;
      const [result] = await connection.query(
        `INSERT INTO schedule_reports (user_id, content, report_type_id, scheduled_time) VALUES (?, ?, ?, ?)`,
        [user_id, content, report_type_id, scheduled_time]
      );

      const scheduleReportId = result.insertId;

      // Tilføj billeder, hvis der er nogen
      if (images && images.length > 0) {
        for (const imageData of images) {
          await this.addImageToScheduledReport(scheduleReportId, imageData);
        }
      }

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

      // Indsæt i reports ved hjælp af Report.create()
      const newReportField = {
        user_id,
        content,
        report_type_id,
      };
      const reportResult = await Report.create(newReportField);
      const newReportId = reportResult.insertId;

      // Kopiér kommentarer
      const [comments] = await connection.query(
        `SELECT id, content, user_id, created_at 
         FROM schedule_report_comments 
         WHERE schedule_report_id = ?`,
        [scheduleReportId]
      );

      for (const comment of comments) {
        const [commentResult] = await connection.query(
          `INSERT INTO report_comments (report_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`,
          [
            newReportId,
            comment.user_id,
            comment.content,
            comment.created_at,
          ]
        );

        const newCommentId = commentResult.insertId;

        // Kopiér kommentar-billeder
        const commentImages = await ScheduleReportComment.getImagesByCommentId(
          comment.id
        );
        for (const image of commentImages) {
          await connection.query(
            `INSERT INTO report_comments_images (comment_id, image_data) VALUES (?, ?)`,
            [newCommentId, image.image_data]
          );
        }
      }

      // Kopiér billeder ved hjælp af Report.addImage()
      const images = await this.getImagesByScheduledReportId(scheduleReportId);
      for (const image of images) {
        await Report.addImage(newReportId, image.image_data);
      }

      return reportResult;
    } catch (error) {
      throw new Error(error);
    }
  }

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
      }))[0]; // Returner det første element
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
        const images = await this.getImagesByScheduledReportId(report.id);
        reportsWithComments.push({
          ...report,
          comments: comments.map((comment) => ({
            ...comment,
            created_at: convertToUTC(comment.created_at),
            id: Number(comment.id),
            schedule_report_id: Number(comment.schedule_report_id),
            user_id: Number(comment.user_id),
          })),
          images, // Inkluder billeder
        });
      }

      return reportsWithComments;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async deleteScheduledReport({ reportId, userId }) {
    try {
      const [result] = await connection.query(
        `DELETE FROM schedule_reports WHERE id = ? AND user_id = ?`,
        [reportId, userId]
      );
  
      if (result.affectedRows === 0) {
        throw new Error("Rapporten kunne ikke findes eller blev ikke slettet.");
      }
  
      return result;
    } catch (error) {
      throw new Error("Error deleting scheduled report: " + error.message);
    }
  }
}

export default ScheduleReport;
