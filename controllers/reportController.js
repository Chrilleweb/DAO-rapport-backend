import Rapport from "../models/report.model.js";
import Comment from "../models/comment.model.js";
import convertToUTC from "dato-konverter";

class ReportController {
  // Opret en ny rapport
  static async createReport(data) {
    try {
      const { content, user_id, report_type_id, images } = data;

      const newReport = await Rapport.create({
        content,
        user_id,
        report_type_id,
      });

      // Hvis der er et vedhæftet billede, tilføj det
      if (images && images.length > 0) {
        for (const image of images) {
          await Rapport.addImage(newReport.insertId, image);
        }
      }

      // Hent rapporten med detaljer
      const reportWithDetails = await Rapport.getFullReportById(
        newReport.insertId
      );

      // Hent kommentarer for den nye rapport
      const comments = await Comment.getCommentsByReportId(newReport.insertId);

      const formattedComments = comments.map((comment) => ({
        ...comment,
        created_at: convertToUTC(comment.created_at),
        id: Number(comment.id),
        report_id: Number(comment.report_id),
        user_id: Number(comment.user_id),
      }));

      return {
        ...reportWithDetails,
        created_at: convertToUTC(reportWithDetails.created_at),
        comments: formattedComments,
        images: reportWithDetails.images,
      };
    } catch (error) {
      throw new Error("Error creating new report: " + error.message);
    }
  }

  // Opdater en eksisterende rapport
  static async updateReport(data) {
    const {
      reportId,
      userId,
      updatedContent,
      updatedReportTypeId,
      imagesToAdd,
      imagesToRemove,
    } = data;
    try {
      // Opdater report_type_id hvis nødvendigt
      if (updatedReportTypeId !== undefined) {
        const typeUpdateResult = await Rapport.updateReportType(
          reportId,
          updatedReportTypeId
        );
        if (typeUpdateResult.affectedRows === 0) {
          throw new Error(
            "Rapporttypen blev ikke opdateret. Rapporten findes ikke."
          );
        }
      }

      // Opdater content hvis nødvendigt
      if (updatedContent !== undefined) {
        const updatedFields = { content: updatedContent };
        const contentUpdateResult = await Rapport.update(
          reportId,
          userId,
          updatedFields
        );
        if (contentUpdateResult.affectedRows === 0) {
          throw new Error(
            "Du har ikke tilladelse til at redigere indholdet af denne rapport."
          );
        }
      }

      // Fjern billeder hvis nødvendigt
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
        for (const imageId of imagesToRemove) {
          await Rapport.deleteImageById(imageId);
        }
      }

      // Tilføj nye billeder hvis nødvendigt
      if (imagesToAdd && Array.isArray(imagesToAdd)) {
        for (const imageData of imagesToAdd) {
          await Rapport.addImage(reportId, imageData);
        }
      }

      // Hent den opdaterede rapport
      const updatedReport = await Rapport.getFullReportById(reportId);
      if (!updatedReport) {
        throw new Error("Rapporten blev ikke fundet.");
      }

      const reportData = {
        id: updatedReport.id,
        content: updatedReport.content,
        user_id: updatedReport.user_id,
        report_type_id: updatedReport.report_type_id,
        created_at: convertToUTC(updatedReport.created_at),
        firstname: updatedReport.firstname,
        lastname: updatedReport.lastname,
        report_type: updatedReport.report_type,
        images: updatedReport.images, // Inkluder de opdaterede billeder
      };
      return reportData;
    } catch (error) {
      throw new Error("Error editing report: " + error.message);
    }
  }

  // Hent rapporter inden for interval
  static async getReports(reportTypeIds, intervalDays) {
    try {
      const reports = await Rapport.getReportsWithCommentsByTypeIds(
        reportTypeIds,
        intervalDays
      );
      return reports;
    } catch (error) {
      throw new Error("Error fetching reports: " + error.message);
    }
  }

  // Hent rapporter mellem datoer
  static async getReportsByDates(reportTypeIds, startDate, endDate) {
    try {
      const reports = await Rapport.getReportsWithCommentsByTypeIdsAndDates(
        reportTypeIds,
        startDate,
        endDate
      );
      return reports;
    } catch (error) {
      throw new Error("Error fetching reports by dates: " + error.message);
    }
  }

  // Opret daglig rapport
  static async createDailyReport() {
    try {
      const newReportId = await Rapport.createDailyReport();
      const fullReport = await Rapport.getFullReportById(newReportId);
      if (fullReport) {
        return {
          ...fullReport,
          created_at: convertToUTC(fullReport.created_at),
          comments: [],
        };
      } else {
        throw new Error("Daily report not found after creation.");
      }
    } catch (error) {
      throw new Error(
        "Error creating or emitting daily report: " + error.message
      );
    }
  }

  // Hent alle planlagte rapporter
  static async getScheduledReports() {
    try {
      const scheduledReports = await Rapport.getScheduledReportsWithComments();
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

      const result = await Rapport.createScheduledReport({
        user_id,
        content,
        report_type_id,
        scheduled_time,
        images, // Pass images
      });

      const [newScheduledReport] = await Rapport.getScheduledReportById(
        result.insertId
      );

      // Get images for the new scheduled report
      const imagesData = await Rapport.getImagesByScheduledReportId(
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
      // Update report_type_id if necessary
      if (updatedReportTypeId !== undefined) {
        const typeUpdateResult = await Rapport.updateScheduledReportType(
          reportId,
          updatedReportTypeId
        );
        if (typeUpdateResult.affectedRows === 0) {
          throw new Error(
            "Rapporttypen blev ikke opdateret. Den planlagte rapport findes ikke."
          );
        }
      }

      // Update content or scheduled_time if necessary
      if (updatedContent !== undefined || updatedScheduledTime !== undefined) {
        const updatedFields = {};
        if (updatedContent !== undefined) {
          updatedFields.content = updatedContent;
        }
        if (updatedScheduledTime !== undefined) {
          updatedFields.scheduled_time = updatedScheduledTime;
        }
        const contentUpdateResult = await Rapport.updateScheduledReport(
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

      // Remove images if necessary
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
        for (const imageId of imagesToRemove) {
          await Rapport.deleteImageByIdFromScheduledReport(imageId);
        }
      }

      // Add new images if necessary
      if (imagesToAdd && Array.isArray(imagesToAdd)) {
        for (const imageData of imagesToAdd) {
          await Rapport.addImageToScheduledReport(reportId, imageData);
        }
      }

      // Get the updated scheduled report
      const [updatedReport] = await Rapport.getScheduledReportById(reportId);
      if (!updatedReport) {
        throw new Error("Den planlagte rapport blev ikke fundet.");
      }

      // Get images
      const imagesData = await Rapport.getImagesByScheduledReportId(reportId);

      return {
        ...updatedReport,
        images: imagesData,
      };
    } catch (error) {
      throw new Error("Error editing scheduled report: " + error.message);
    }
  }

  // Process due scheduled reports
  static async processDueScheduledReports(io) {
    try {
      const dueReports = await Rapport.getDueScheduledReports();

      for (const report of dueReports) {
        // Insert the report into report_fields
        const insertResult = await Rapport.insertScheduledReport(report);

        // Mark the scheduled report as sent
        await Rapport.markScheduledReportAsSent(report.id);

        // Get the full report to send to clients
        const fullReport = await Rapport.getFullReportById(
          insertResult.insertId
        );

        if (fullReport) {
          // Get comments for the new report
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

          // Emit report with its comments and images
          io.emit("new report", {
            ...fullReport,
            created_at: convertToUTC(fullReport.created_at),
            comments: formattedComments,
            images: fullReport.images, // Include images
          });
        }
      }
    } catch (error) {
      throw new Error("Error processing scheduled reports: " + error.message);
    }
  }
}

export default ReportController;
