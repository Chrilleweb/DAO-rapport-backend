import { Server } from "socket.io";
import Rapport from "../models/report.model.js";
import ScheduleReportComment from "../models/scheduleReportComment.model.js";
import Comment from "../models/comment.model.js";
import convertToUTC from "dato-konverter";

const socketSetup = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Håndter 'get all comments' event
    socket.on("get all comments", async () => {
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

        socket.emit("all comments", groupedComments);
      } catch (error) {
        console.error("Error fetching all comments:", error);
      }
    });

    // Håndter 'new comment' event
    socket.on("new comment", async (data) => {
      try {
        const result = await Comment.create(data);
        const insertedId = result.insertId;
        const [commentData] = await Comment.getCommentById(insertedId);

        // Konverter 'created_at' datoen
        commentData.created_at = convertToUTC(commentData.created_at);

        io.emit("new comment", commentData);
      } catch (error) {
        console.error("Error creating new comment:", error);
        socket.emit("new comment error", {
          message: "Fejl ved oprettelse af kommentar.",
        });
      }
    });

    // Håndter 'edit comment' event
    socket.on("edit comment", async (data) => {
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

          io.emit("update comment", updatedComment);
        } else {
          socket.emit("edit comment error", {
            message: "Du har ikke tilladelse til at redigere denne kommentar.",
          });
        }
      } catch (error) {
        console.error("Error editing comment:", error);
        socket.emit("edit comment error", {
          message: "Fejl ved redigering af kommentar.",
        });
      }
    });

    // Listen for 'get reports' event fra klienten
    socket.on("get reports", async (reportTypeIds) => {
      try {
        const reports = await Rapport.getReportsWithCommentsByTypeIds(
          reportTypeIds,
          1
        );

        socket.emit("previous reports", reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Listen for 'get reports dates' event fra klienten
    socket.on("get reports dates", async (data) => {
      const { reportTypeIds, startDate, endDate } = data;
      try {
        const reports = await Rapport.getReportsWithCommentsByTypeIdsAndDates(
          reportTypeIds,
          startDate,
          endDate
        );
        socket.emit("previous reports", reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Listen for 'new report' event fra klienten
    // Emit the full report with comments when a new report is created
    socket.on("new report", async (data) => {
      try {
        // Opret ny rapport
        const newReport = await Rapport.create(data);

        // Hent rapporten med kommentarer
        const reportWithDetails = await Rapport.getFullReportById(
          newReport.insertId
        );

        // Hent kommentarer for den nye rapport
        const comments = await Comment.getCommentsByReportId(
          newReport.insertId
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
          ...reportWithDetails,
          created_at: convertToUTC(reportWithDetails.created_at), // Konverter dato
          comments: formattedComments, // Inkluder kommentarer
        });
      } catch (error) {
        console.error("Error creating new report:", error);
        socket.emit("new report error", {
          message: "Fejl ved oprettelse af rapport.",
        });
      }
    });

    // Listen for 'edit report' event fra klienten
    socket.on("edit report", async (data) => {
      const { reportId, userId, updatedContent } = data;
      try {
        const result = await Rapport.update(reportId, userId, {
          content: updatedContent,
        });
        if (result.affectedRows > 0) {
          // Fetch the updated report to emit
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
          io.emit("update report", reportData);
        } else {
          // Report not found or user is not authorized
          socket.emit("edit error", {
            message: "Du har ikke tilladelse til at redigere denne rapport.",
          });
        }
      } catch (error) {
        console.error("Error editing report:", error);
        socket.emit("edit error", {
          message: "Fejl ved redigering af rapport.",
        });
      }
    });

    // Håndter 'get scheduled reports' event
    socket.on("get scheduled reports", async () => {
      try {
        const scheduledReports = await Rapport.getAllScheduledReports();
        socket.emit("scheduled reports", scheduledReports);
      } catch (error) {
        console.error("Error fetching scheduled reports:", error);
      }
    });

    // Håndter 'schedule report' event
    socket.on("schedule report", async (data) => {
      try {
        const { user_id, content, scheduled_time, report_type_id } = data;

        if (!report_type_id) {
          throw new Error("report_type_id er ikke defineret eller ugyldigt");
        }

        // Gem den planlagte rapport
        const result = await Rapport.createScheduledReport({
          user_id,
          content,
          report_type_id,
          scheduled_time,
        });

        // Hent den fulde planlagte rapport
        const [newScheduledReport] = await Rapport.getScheduledReportById(
          result.insertId
        );

        // Emit den nye planlagte rapport til alle klienter
        io.emit("new scheduled report", newScheduledReport);

        // Send succesbesked til klienten
        socket.emit("schedule report success", {
          message: "Rapport planlagt med succes.",
        });
      } catch (error) {
        console.error("Error scheduling report:", error);
        socket.emit("schedule report error", {
          message: "Fejl ved planlægning af rapport.",
        });
      }
    });

    // Håndter 'edit scheduled report' event
    socket.on("edit scheduled report", async (data) => {
      const { reportId, userId, updatedContent } = data;
      try {
        const result = await Rapport.updateScheduledReport(reportId, userId, {
          content: updatedContent,
        });

        if (result.affectedRows > 0) {
          // Hent den opdaterede planlagte rapport
          const [updatedReport] = await Rapport.getScheduledReportById(
            reportId
          );

          // Emit den opdaterede rapport til alle klienter
          io.emit("update scheduled report", updatedReport);
        } else {
          socket.emit("edit scheduled report error", {
            message:
              "Du har ikke tilladelse til at redigere denne planlagte rapport.",
          });
        }
      } catch (error) {
        console.error("Error editing scheduled report:", error);
        socket.emit("edit scheduled report error", {
          message: "Fejl ved redigering af planlagt rapport.",
        });
      }
    });

    socket.on("get all schedule report comments", async () => {
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

        socket.emit("all schedule report comments", allComments);
      } catch (error) {
        console.error("Error fetching all schedule report comments:", error);
      }
    });

    // Håndter 'new schedule report comment' event
    socket.on("new schedule report comment", async (data) => {
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

        io.emit("new schedule report comment", formattedComment);
      } catch (error) {
        console.error("Error creating new schedule report comment:", error);
        socket.emit("new schedule report comment error", {
          message: "Fejl ved oprettelse af kommentar.",
        });
      }
    });

    // Håndter 'edit schedule report comment' event
    socket.on("edit schedule report comment", async (data) => {
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

          io.emit("update schedule report comment", formattedComment);
        } else {
          socket.emit("edit schedule report comment error", {
            message: "Du har ikke tilladelse til at redigere denne kommentar.",
          });
        }
      } catch (error) {
        console.error("Error editing schedule report comment:", error);
        socket.emit("edit schedule report comment error", {
          message: "Fejl ved redigering af kommentar.",
        });
      }
    });

    // Optional: Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  // Håndter periodisk flytning af planlagte rapporter til rapporter
setInterval(async () => {
  try {
    const dueReports = await Rapport.getDueScheduledReports();

    for (const report of dueReports) {
      // Indsæt rapporten i report_fields
      const insertResult = await Rapport.insertScheduledReport(report);

      // Marker rapporten som sendt
      await Rapport.markScheduledReportAsSent(report.id);

      // Hent den fulde rapport for at sende til klienterne
      const fullReport = await Rapport.getFullReportById(insertResult.insertId);

      if (fullReport) {
        // Hent kommentarer for den nye rapport
        const comments = await Comment.getCommentsByReportId(insertResult.insertId);
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
          created_at: convertToUTC(fullReport.created_at), // Konverter dato
          comments: formattedComments, // Inkluder kommentarer
        });
      }
    }
  } catch (error) {
    console.error("Error processing scheduled reports:", error);
  }
}, 60000); // Tjek hvert minut

  return io;
};

export default socketSetup;
