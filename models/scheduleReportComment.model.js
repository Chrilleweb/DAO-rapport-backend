import connection from "../config/db.js";

class ScheduleReportComment {
  // Hent alle kommentarer for en specifik planlagt rapport
  static async getCommentsByScheduleReportId(scheduleReportId) {
    try {
      const [rows] = await connection.query(
        `SELECT sc.id, sc.content, sc.created_at, sc.updated_at, sc.user_id,
                u.firstname, u.lastname
         FROM schedule_report_comments sc
         JOIN users u ON sc.user_id = u.id
         WHERE sc.schedule_report_id = ?
         ORDER BY sc.created_at ASC`,
        [scheduleReportId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Opret en ny kommentar
  static async createComment(data) {
    try {
      const { schedule_report_id, user_id, content } = data;
      const [result] = await connection.query(
        `INSERT INTO schedule_report_comments (schedule_report_id, user_id, content) VALUES (?, ?, ?)`,
        [schedule_report_id, user_id, content]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Opdater en eksisterende kommentar
  static async updateComment(commentId, userId, updatedContent) {
    try {
      const [result] = await connection.query(
        `UPDATE schedule_report_comments SET content = ? WHERE id = ? AND user_id = ?`,
        [updatedContent, commentId, userId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Hent en kommentar ved ID
  static async getCommentById(commentId) {
    try {
      const [rows] = await connection.query(
        `SELECT sc.id, sc.content, sc.created_at, sc.updated_at, sc.user_id,
                u.firstname, u.lastname, sc.schedule_report_id
         FROM schedule_report_comments sc
         JOIN users u ON sc.user_id = u.id
         WHERE sc.id = ?`,
        [commentId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default ScheduleReportComment;
