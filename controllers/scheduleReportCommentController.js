import ScheduleReportComment from "../models/scheduleReportComment.model.js";
import ScheduleReport from "../models/scheduleReport.model.js";
import convertToUTC from "dato-konverter";

class ScheduleReportCommentController {
  // Hent alle kommentarer til planlagte rapporter
  static async getAllScheduledReportComments() {
    try {
      const scheduleReports = await ScheduleReport.getAllScheduledReports();
      let allComments = {};

      for (const report of scheduleReports) {
        const comments =
          await ScheduleReportComment.getCommentsByScheduleReportId(report.id);

        // Hent billeder for hver kommentar
        for (const comment of comments) {
          comment.images = await ScheduleReportComment.getImagesByCommentId(
            comment.id
          );
          comment.created_at = convertToUTC(comment.created_at);
        }

        allComments[report.id] = comments.map((comment) => ({
          ...comment,
          id: Number(comment.id),
          schedule_report_id: Number(comment.schedule_report_id),
          user_id: Number(comment.user_id),
        }));
      }

      return allComments;
    } catch (error) {
      throw new Error(
        "Error fetching all schedule report comments: " + error.message
      );
    }
  }

  // Opret en ny kommentar til en planlagt rapport
  static async createScheduledReportComment(data) {
    try {
      const { schedule_report_id, user_id, content, images } = data;

      // Opret selve kommentaren
      const result = await ScheduleReportComment.createComment({
        schedule_report_id,
        user_id,
        content,
      });
      const insertedId = result.insertId;

      // Tilføj billeder, hvis de er vedhæftet
      if (images && images.length > 0) {
        for (const image of images) {
          await ScheduleReportComment.addImage(insertedId, image);
        }
      }

      // Hent den fulde kommentar med billeder
      const [commentData] = await ScheduleReportComment.getCommentById(
        insertedId
      );
      commentData.images = await ScheduleReportComment.getImagesByCommentId(
        insertedId
      );

      // Konverter datoer
      const formattedComment = {
        ...commentData,
        created_at: convertToUTC(commentData.created_at),
        id: Number(commentData.id),
        schedule_report_id: Number(commentData.schedule_report_id),
        user_id: Number(commentData.user_id),
      };

      return formattedComment;
    } catch (error) {
      throw new Error(
        "Error creating new schedule report comment: " + error.message
      );
    }
  }

  // Opdater en kommentar til en planlagt rapport
  static async updateScheduledReportComment(data) {
    const { commentId, userId, updatedContent, imagesToAdd, imagesToRemove } =
      data;
    try {
      // Opdater indholdet, hvis nødvendigt
      if (updatedContent !== undefined) {
        const result = await ScheduleReportComment.updateComment(
          commentId,
          userId,
          updatedContent
        );
        if (result.affectedRows === 0) {
          throw new Error(
            "Du har ikke tilladelse til at redigere denne kommentar."
          );
        }
      }

      // Fjern billeder, hvis nødvendigt
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
        for (const imageId of imagesToRemove) {
          await ScheduleReportComment.deleteImageById(imageId);
        }
      }

      // Tilføj nye billeder, hvis nødvendigt
      if (imagesToAdd && Array.isArray(imagesToAdd)) {
        for (const imageData of imagesToAdd) {
          await ScheduleReportComment.addImage(commentId, imageData);
        }
      }

      // Hent den opdaterede kommentar med billeder
      const [updatedComment] = await ScheduleReportComment.getCommentById(
        commentId
      );
      updatedComment.images = await ScheduleReportComment.getImagesByCommentId(
        commentId
      );

      // Konverter datoer
      const formattedComment = {
        ...updatedComment,
        created_at: convertToUTC(updatedComment.created_at),
        id: Number(updatedComment.id),
        schedule_report_id: Number(updatedComment.schedule_report_id),
        user_id: Number(updatedComment.user_id),
      };

      return formattedComment;
    } catch (error) {
      throw new Error(
        "Error editing schedule report comment: " + error.message
      );
    }
  }

  // Slet en kommentar til en planlagt rapport
  static async deleteScheduledReportComment(data) {
    const { commentId, userId } = data;
    try {
      // Hent `schedule_report_id` før sletning
      const [comment] = await ScheduleReportComment.getCommentById(commentId);
      if (!comment) {
        throw new Error('Kommentaren blev ikke fundet.');
      }
  
      // Udfør sletningen
      const result = await ScheduleReportComment.deleteCommentById(commentId, userId);
      if (result.affectedRows === 0) {
        throw new Error('Du har ikke tilladelse til at slette denne kommentar.');
      }
  
      return { commentId, schedule_report_id: comment.schedule_report_id };
    } catch (error) {
      throw new Error('Error deleting schedule report comment: ' + error.message);
    }
  }
}

export default ScheduleReportCommentController;
