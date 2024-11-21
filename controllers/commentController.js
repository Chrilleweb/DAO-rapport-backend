import Comment from '../models/comment.model.js';
import ScheduleReportComment from '../models/scheduleReportComment.model.js';
import Rapport from '../models/report.model.js';
import convertToUTC from 'dato-konverter';

class CommentController {
  // Hent alle kommentarer
  static async getAllComments() {
    try {
      const allComments = await Comment.getAllComments();

      // Konverter 'created_at' datoen og sikre data typer
      const convertedComments = allComments.map((comment) => ({
        ...comment,
        created_at: convertToUTC(comment.created_at),
        id: Number(comment.id),
        report_id: Number(comment.report_id),
        user_id: Number(comment.user_id),
      }));

      const groupedComments = convertedComments.reduce((acc, comment) => {
        const reportId = String(comment.report_id);
        if (!acc[reportId]) acc[reportId] = [];
        acc[reportId].push(comment);
        return acc;
      }, {});

      return groupedComments;
    } catch (error) {
      throw new Error('Error fetching all comments: ' + error.message);
    }
  }

  // Opret en ny kommentar
  static async createComment(data) {
    try {
      const result = await Comment.create(data);
      const insertedId = result.insertId;
      const [commentData] = await Comment.getCommentById(insertedId);

      // Konverter 'created_at' datoen
      commentData.created_at = convertToUTC(commentData.created_at);

      return commentData;
    } catch (error) {
      throw new Error('Error creating new comment: ' + error.message);
    }
  }

  // Opdater en kommentar
  static async updateComment(data) {
    const { commentId, userId, updatedContent } = data;
    try {
      const result = await Comment.update(commentId, userId, {
        content: updatedContent,
      });
      if (result.affectedRows > 0) {
        const updatedComments = await Comment.getCommentsByReportId(
          data.report_id
        );
        const updatedComment = updatedComments.find(
          (c) => c.id === commentId
        );

        // Konverter 'created_at' datoen
        updatedComment.created_at = convertToUTC(updatedComment.created_at);

        return updatedComment;
      } else {
        throw new Error('Du har ikke tilladelse til at redigere denne kommentar.');
      }
    } catch (error) {
      throw new Error('Error editing comment: ' + error.message);
    }
  }

  // Hent alle kommentarer til planlagte rapporter
  static async getAllScheduledReportComments() {
    try {
      const scheduleReports = await Rapport.getAllScheduledReports();
      let allComments = {};

      for (const report of scheduleReports) {
        const comments =
          await ScheduleReportComment.getCommentsByScheduleReportId(
            report.id
          );
        allComments[report.id] = comments.map((comment) => ({
          ...comment,
          created_at: convertToUTC(comment.created_at),
          updated_at: convertToUTC(comment.updated_at),
          id: Number(comment.id),
          schedule_report_id: Number(comment.schedule_report_id),
          user_id: Number(comment.user_id),
        }));
      }

      return allComments;
    } catch (error) {
      throw new Error('Error fetching all schedule report comments: ' + error.message);
    }
  }

  // Opret en ny kommentar til en planlagt rapport
  static async createScheduledReportComment(data) {
    try {
      const result = await ScheduleReportComment.createComment(data);
      const insertedId = result.insertId;
      const commentData = await ScheduleReportComment.getCommentById(
        insertedId
      );

      // Konverter 'created_at' og 'updated_at' datoen
      const formattedComment = {
        ...commentData[0],
        created_at: convertToUTC(commentData[0].created_at),
        updated_at: convertToUTC(commentData[0].updated_at),
        id: Number(commentData[0].id),
        schedule_report_id: Number(commentData[0].schedule_report_id),
        user_id: Number(commentData[0].user_id),
      };

      return formattedComment;
    } catch (error) {
      throw new Error('Error creating new schedule report comment: ' + error.message);
    }
  }

  // Opdater en kommentar til en planlagt rapport
  static async updateScheduledReportComment(data) {
    const { commentId, userId, updatedContent } = data;
    try {
      const result = await ScheduleReportComment.updateComment(
        commentId,
        userId,
        updatedContent
      );
      if (result.affectedRows > 0) {
        const [updatedComment] = await ScheduleReportComment.getCommentById(
          commentId
        );
        const formattedComment = {
          ...updatedComment,
          created_at: convertToUTC(updatedComment.created_at),
          updated_at: convertToUTC(updatedComment.updated_at),
          id: Number(updatedComment.id),
          schedule_report_id: Number(updatedComment.schedule_report_id),
          user_id: Number(updatedComment.user_id),
        };

        return formattedComment;
      } else {
        throw new Error('Du har ikke tilladelse til at redigere denne kommentar.');
      }
    } catch (error) {
      throw new Error('Error editing schedule report comment: ' + error.message);
    }
  }
}

export default CommentController;