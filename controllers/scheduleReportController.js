import ScheduleReport from "../models/scheduleReport.model.js";
import Comment from "../models/comment.model.js";
import convertToUTC from "dato-konverter";
import Report from "../models/report.model.js";

class ScheduleReportController {
  // Hent alle planlagte rapporter
  static async getScheduledReports() {
    try {
      const scheduledReports = await ScheduleReport.getScheduledReportsWithComments();
      return scheduledReports;
    } catch (error) {
      throw new Error("Error fetching scheduled reports: " + error.message);
    }
  }

  // Opret en planlagt rapport
  static async createScheduledReport(data) {
    try {
      const { user_id, content, scheduled_time, report_type_id, images } = data;
      if (!report_type_id) {
        throw new Error("report_type_id er ikke defineret eller ugyldigt");
      }

      const result = await ScheduleReport.createScheduledReport({
        user_id,
        content,
        report_type_id,
        scheduled_time,
        images, // Pass images
      });

      const newScheduledReport = await ScheduleReport.getScheduledReportById(
        result.insertId
      );

      // Hent billeder for den nye planlagte rapport
      const imagesData = await ScheduleReport.getImagesByScheduledReportId(
        result.insertId
      );

      return {
        ...newScheduledReport,
        images: imagesData,
      };
    } catch (error) {
      throw new Error("Error scheduling report: " + error.message);
    }
  }

  // Opdater en planlagt rapport
  static async updateScheduledReport(data) {
    const {
      reportId,
      userId,
      updatedContent,
      updatedScheduledTime,
      updatedReportTypeId,
      imagesToAdd,
      imagesToRemove,
    } = data;
    try {
      // Opdater report_type_id hvis nødvendigt
      if (updatedReportTypeId !== undefined) {
        const typeUpdateResult = await ScheduleReport.updateScheduledReportType(
          reportId,
          updatedReportTypeId
        );
        if (typeUpdateResult.affectedRows === 0) {
          throw new Error(
            "Rapporttypen blev ikke opdateret. Den planlagte rapport findes ikke."
          );
        }
      }

      // Opdater content eller scheduled_time hvis nødvendigt
      if (updatedContent !== undefined || updatedScheduledTime !== undefined) {
        const updatedFields = {};
        if (updatedContent !== undefined) {
          updatedFields.content = updatedContent;
        }
        if (updatedScheduledTime !== undefined) {
          updatedFields.scheduled_time = updatedScheduledTime;
        }
        const contentUpdateResult = await ScheduleReport.updateScheduledReport(
          reportId,
          userId,
          updatedFields
        );
        if (contentUpdateResult.affectedRows === 0) {
          throw new Error(
            "Du har ikke tilladelse til at redigere denne planlagte rapport."
          );
        }
      }

      // Fjern billeder hvis nødvendigt
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
        for (const imageId of imagesToRemove) {
          await ScheduleReport.deleteImageByIdFromScheduledReport(imageId);
        }
      }

      // Tilføj nye billeder hvis nødvendigt
      if (imagesToAdd && Array.isArray(imagesToAdd)) {
        for (const imageData of imagesToAdd) {
          await ScheduleReport.addImageToScheduledReport(reportId, imageData);
        }
      }

      // Hent den opdaterede planlagte rapport
      const updatedReport = await ScheduleReport.getScheduledReportById(reportId);
      if (!updatedReport) {
        throw new Error("Den planlagte rapport blev ikke fundet.");
      }

      // Hent billeder
      const imagesData = await ScheduleReport.getImagesByScheduledReportId(reportId);

      return {
        ...updatedReport,
        images: imagesData,
      };
    } catch (error) {
      throw new Error("Error editing scheduled report: " + error.message);
    }
  }

  // Processer forfaldne planlagte rapporter
  static async processDueScheduledReports(io) {
    try {
      const dueReports = await ScheduleReport.getDueScheduledReports();

      for (const report of dueReports) {
        // Indsæt rapporten i reports
        const insertResult = await ScheduleReport.insertScheduledReport(report);

        // Marker den planlagte rapport som sendt
        await ScheduleReport.markScheduledReportAsSent(report.id);

        // Hent den fulde rapport for at sende til klienter
        const fullReport = await Report.getFullReportById(
          insertResult.insertId
        );

        if (fullReport) {
          // Hent kommentarer for den nye rapport
          const comments = await Comment.getCommentsByReportId(
            insertResult.insertId
          );

          // Hent billeder for hver kommentar
          for (const comment of comments) {
            comment.images = await Comment.getImagesByCommentId(comment.id);
            comment.created_at = convertToUTC(comment.created_at);
          }

          const formattedComments = comments.map((comment) => ({
            ...comment,
            id: Number(comment.id),
            report_id: Number(comment.report_id),
            user_id: Number(comment.user_id),
          }));

          // Emit rapport med dens kommentarer og billeder
          io.emit("new report", {
            ...fullReport,
            created_at: convertToUTC(fullReport.created_at),
            comments: formattedComments,
            images: fullReport.images, // Inkluder billeder
          });
          io.emit("delete scheduled report success", { reportId: report.id });
        }
      }
    } catch (error) {
      throw new Error("Error processing scheduled reports: " + error.message);
    }
  }

  // Slet en planlagt rapport
  static async deleteScheduledReport(data) {
    const { reportId, userId } = data;
    try {
      const result = await ScheduleReport.deleteScheduledReport({ reportId, userId });
      if (result.affectedRows === 0) {
        throw new Error('Du har ikke tilladelse til at slette denne planlagte rapport.');
      }
      return { success: true, reportId };
    } catch (error) {
      throw new Error('Error deleting scheduled report: ' + error.message);
    }
  }
}

export default ScheduleReportController;
