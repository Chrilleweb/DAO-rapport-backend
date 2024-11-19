import Rapport from "../models/report.model.js";
import Comment from "../models/comment.model.js";
import convertToUTC from "dato-konverter";

class ReportController {
  // Opret en ny rapport
  static async createReport(data) {
    try {
      const newReport = await Rapport.create(data);

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
      };
    } catch (error) {
      throw new Error("Error creating new report: " + error.message);
    }
  }

  // Opdater en eksisterende rapport
  static async updateReport(data) {
    const { reportId, userId, updatedContent, updatedReportTypeId } = data;
    try {
      const updatedFields = { content: updatedContent };
      if (updatedReportTypeId !== undefined) {
        updatedFields.report_type_id = updatedReportTypeId;
      }
      const result = await Rapport.update(reportId, userId, updatedFields);
      if (result.affectedRows > 0) {
        // Hent den opdaterede rapport
        const updatedReport = await Rapport.getFullReportById(reportId);
        const reportData = {
          id: updatedReport.id,
          content: updatedReport.content,
          user_id: updatedReport.user_id,
          report_type_id: updatedReport.report_type_id,
          created_at: convertToUTC(updatedReport.created_at),
          firstname: updatedReport.firstname,
          lastname: updatedReport.lastname,
          report_type: updatedReport.report_type,
        };
        return reportData;
      } else {
        throw new Error(
          "Du har ikke tilladelse til at redigere denne rapport."
        );
      }
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
      const scheduledReports = await Rapport.getAllScheduledReports();
      return scheduledReports;
    } catch (error) {
      throw new Error("Error fetching scheduled reports: " + error.message);
    }
  }

  // Opret en planlagt rapport
  static async createScheduledReport(data) {
    try {
      const { user_id, content, scheduled_time, report_type_id } = data;
      if (!report_type_id) {
        throw new Error("report_type_id er ikke defineret eller ugyldigt");
      }

      const result = await Rapport.createScheduledReport({
        user_id,
        content,
        report_type_id,
        scheduled_time,
      });

      const [newScheduledReport] = await Rapport.getScheduledReportById(
        result.insertId
      );

      return newScheduledReport;
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
    } = data;
    try {
      const updatedFields = { content: updatedContent };

      if (updatedScheduledTime) {
        updatedFields.scheduled_time = updatedScheduledTime;
      }

      if (updatedReportTypeId !== undefined) {
        updatedFields.report_type_id = updatedReportTypeId;
      }

      const result = await Rapport.updateScheduledReport(
        reportId,
        userId,
        updatedFields
      );

      if (result.affectedRows > 0) {
        const [updatedReport] = await Rapport.getScheduledReportById(reportId);
        return updatedReport;
      } else {
        throw new Error(
          "Du har ikke tilladelse til at redigere denne planlagte rapport."
        );
      }
    } catch (error) {
      throw new Error("Error editing scheduled report: " + error.message);
    }
  }

  // Process due scheduled reports
  static async processDueScheduledReports(io) {
    try {
      const dueReports = await Rapport.getDueScheduledReports();

      for (const report of dueReports) {
        // Indsæt rapporten i report_fields
        const insertResult = await Rapport.insertScheduledReport(report);

        // Marker rapporten som sendt
        await Rapport.markScheduledReportAsSent(report.id);

        // Hent den fulde rapport for at sende til klienterne
        const fullReport = await Rapport.getFullReportById(
          insertResult.insertId
        );

        if (fullReport) {
          // Hent kommentarer for den nye rapport
          const comments = await Comment.getCommentsByReportId(
            insertResult.insertId
          );
          const formattedComments = comments.map((comment) => ({
            ...comment,
            created_at: convertToUTC(comment.created_at),
            id: Number(comment.id),
            report_id: Number(comment.report_id),
            user_id: Number(comment.user_id),
          }));

          // Emit rapport med dens kommentarer
          io.emit("new report", {
            ...fullReport,
            created_at: convertToUTC(fullReport.created_at),
            comments: formattedComments,
          });
        }
      }
    } catch (error) {
      throw new Error("Error processing scheduled reports: " + error.message);
    }
  }
}

export default ReportController;
