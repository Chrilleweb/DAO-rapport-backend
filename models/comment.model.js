import connection from "../config/db.js";

class Comment {
  // Tilføj et billede til en kommentar
  static async addImage(commentId, imageData) {
    try {
      const [result] = await connection.query(
        "INSERT INTO report_comments_images (comment_id, image_data) VALUES (?, ?)",
        [commentId, imageData]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Hent billeder ved kommentar-id
  static async getImagesByCommentId(commentId) {
    try {
      const [rows] = await connection.query(
        "SELECT id, image_data FROM report_comments_images WHERE comment_id = ?",
        [commentId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Slet billede ved id
  static async deleteImageById(imageId) {
    try {
      const [result] = await connection.query(
        "DELETE FROM report_comments_images WHERE id = ?",
        [imageId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }
  // Opret en ny kommentar
  static async create(newComment) {
    try {
      const [result] = await connection.query(
        "INSERT INTO report_comments SET ?",
        newComment
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  // Opdater en eksisterende kommentar
  static async update(commentId, userId, updatedFields) {
    try {
      const [result] = await connection.query(
        "UPDATE report_comments SET ? WHERE id = ? AND user_id = ?",
        [updatedFields, commentId, userId]
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getAllComments() {
    try {
      const query = `
        SELECT report_comments.*, users.firstname, users.lastname
        FROM report_comments
        JOIN users ON report_comments.user_id = users.id
        ORDER BY report_comments.created_at ASC
      `;
      const [rows] = await connection.query(query);
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }
  

  // Hent kommentarer til en bestemt rapport
  static async getCommentsByReportId(reportId) {
    try {
      const [rows] = await connection.query(
        `
        SELECT report_comments.*, users.firstname, users.lastname
        FROM report_comments
        JOIN users ON report_comments.user_id = users.id
        WHERE report_comments.report_id = ?
        ORDER BY report_comments.created_at ASC
        `,
        [reportId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getCommentById(commentId) {
    try {
      const [rows] = await connection.query(
        `
        SELECT report_comments.*, users.firstname, users.lastname
        FROM report_comments
        JOIN users ON report_comments.user_id = users.id
        WHERE report_comments.id = ?
        `,
        [commentId]
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }
  
}

export default Comment;
