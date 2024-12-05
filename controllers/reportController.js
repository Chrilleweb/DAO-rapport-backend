import Report from "../models/report.model.js";
import Comment from "../models/comment.model.js";
import convertToUTC from "dato-konverter";

class ReportController {
  // Opret en ny rapport
  static async createReport(data) {
    try {
      const { content, user_id, report_type_id, images } = data;

      const newReport = await Report.create({
        content,
        user_id,
        report_type_id,
      });

      // Hvis der er vedhæftede billeder, tilføj dem
      if (images && images.length > 0) {
        for (const image of images) {
          await Report.addImage(newReport.insertId, image);
        }
      }

      // Hent rapporten med detaljer
      const reportWithDetails = await Report.getFullReportById(
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
        const typeUpdateResult = await Report.updateReportType(
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
        const contentUpdateResult = await Report.update(
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
          await Report.deleteImageById(imageId);
        }
      }

      // Tilføj nye billeder hvis nødvendigt
      if (imagesToAdd && Array.isArray(imagesToAdd)) {
        for (const imageData of imagesToAdd) {
          await Report.addImage(reportId, imageData);
        }
      }

      // Hent den opdaterede rapport
      const updatedReport = await Report.getFullReportById(reportId);
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
      const reports = await Report.getReportsWithCommentsByTypeIds(
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
      const reports = await Report.getReportsWithCommentsByTypeIdsAndDates(
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
      const newReportId = await Report.createDailyReport();
      const fullReport = await Report.getFullReportById(newReportId);
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

  // Slet en rapport
  static async deleteReport(data) {
    const { reportId, userId } = data;
    try {
      const result = await Report.deleteReport({ reportId, userId });
      if (result.affectedRows === 0) {
        throw new Error('Du har ikke tilladelse til at slette denne rapport.');
      }
      return { success: true, reportId };
    } catch (error) {
      throw new Error('Error deleting report: ' + error.message);
    }
  }
}

export default ReportController;
