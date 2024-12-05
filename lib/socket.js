import { Server } from "socket.io";
import cron from "node-cron";
import ReportController from "../controllers/reportController.js";
import ScheduleReportController from "../controllers/scheduleReportController.js";
import CommentController from "../controllers/CommentController.js";
import ScheduleReportCommentController from "../controllers/scheduleReportCommentController.js";
import authenticateSocket from "../middleware/authenticateSocket.js";
import rateLimiter from "../middleware/reportLimiter.js";

const socketSetup = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Håndter 'get all comments' event
    socket.on("get all comments", async () => {
      try {
        const groupedComments = await CommentController.getAllComments();
        socket.emit("all comments", groupedComments);
      } catch (error) {
        console.error("Error fetching all comments:", error);
      }
    });

    // Håndter 'new comment' event
    socket.on("new comment", async (data) => {
      if (!rateLimiter(socket, "new comment", 20, 60 * 1000)) {
        return;
      }
      try {
        const commentData = await CommentController.createComment(data);
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
      try {
        const updatedComment = await CommentController.updateComment(data);
        io.emit("update comment", updatedComment);
      } catch (error) {
        console.error("Error editing comment:", error);
        socket.emit("edit comment error", {
          message: error.message,
        });
      }
    });

    // Håndter 'delete report' event
    socket.on("delete report", async ({ reportId, userId }) => {
      try {
        await ReportController.deleteReport({
          reportId,
          userId,
        });
        io.emit("delete report success", { reportId });
      } catch (error) {
        socket.emit("delete report error", { message: error.message });
      }
    });

    // Håndter 'delete report comment' event
    socket.on("delete report comment", async ({ commentId, userId }) => {
      try {
        const result = await CommentController.deleteComment({
          commentId,
          userId,
        });
        io.emit("delete comment success", {
          commentId,
          report_id: result.report_id,
        });
      } catch (error) {
        socket.emit("delete comment error", { message: error.message });
      }
    });

    // Håndter 'get reports' event
    socket.on("get reports", async (reportTypeIds) => {
      try {
        const reports = await ReportController.getReports(reportTypeIds, 1);
        socket.emit("previous reports", reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Håndter 'get reports dates' event
    socket.on("get reports dates", async (data) => {
      const { reportTypeIds, startDate, endDate } = data;
      try {
        const reports = await ReportController.getReportsByDates(
          reportTypeIds,
          startDate,
          endDate
        );
        socket.emit("previous reports", reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Håndter 'new report' event
    socket.on("new report", async (data) => {
      if (!rateLimiter(socket, "new report", 20, 60 * 1000)) {
        return;
      }
      try {
        const reportWithComments = await ReportController.createReport(data);
        io.emit("new report", reportWithComments);
      } catch (error) {
        console.error("Error creating new report:", error);
        socket.emit("new report error", {
          message: "Fejl ved oprettelse af rapport.",
        });
      }
    });

    // Håndter 'edit report' event
    socket.on("edit report", async (data) => {
      try {
        const reportData = await ReportController.updateReport(data);
        io.emit("update report", reportData);
      } catch (error) {
        console.error("Error editing report:", error);
        socket.emit("edit error", {
          message: error.message,
        });
      }
    });

    // Håndter 'get scheduled reports' event
    socket.on("get scheduled reports", async () => {
      try {
        const scheduledReports = await ScheduleReportController.getScheduledReports();
        socket.emit("scheduled reports", scheduledReports);
      } catch (error) {
        console.error("Error fetching scheduled reports:", error);
      }
    });

    // Håndter 'schedule report' event
    socket.on("schedule report", async (data) => {
      if (!rateLimiter(socket, "schedule report", 20, 60 * 1000)) {
        return;
      }
      try {
        const newScheduledReport = await ScheduleReportController.createScheduledReport(
          data
        );
        io.emit("new scheduled report", newScheduledReport);
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
      try {
        const updatedReport = await ScheduleReportController.updateScheduledReport(
          data
        );
        io.emit("update scheduled report", updatedReport);
      } catch (error) {
        console.error("Error editing scheduled report:", error);
        socket.emit("edit scheduled report error", {
          message: error.message,
        });
      }
    });

    // Håndter 'get all schedule report comments' event
    socket.on("get all schedule report comments", async () => {
      try {
        const allComments =
          await ScheduleReportCommentController.getAllScheduledReportComments();
        socket.emit("all schedule report comments", allComments);
      } catch (error) {
        console.error("Error fetching all schedule report comments:", error);
      }
    });

    // Håndter 'new schedule report comment' event
    socket.on("new schedule report comment", async (data) => {
      if (!rateLimiter(socket, "new schedule report comment", 20, 60 * 1000)) {
        return;
      }
      try {
        const formattedComment =
          await ScheduleReportCommentController.createScheduledReportComment(data);
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
      try {
        const formattedComment =
          await ScheduleReportCommentController.updateScheduledReportComment(data);
        io.emit("update schedule report comment", formattedComment);
      } catch (error) {
        console.error("Error editing schedule report comment:", error);
        socket.emit("edit schedule report comment error", {
          message: error.message,
        });
      }
    });

    // Håndter 'delete scheduled report comment' event
    socket.on("delete scheduled report comment", async (data) => {
      try {
        const result = await ScheduleReportCommentController.deleteScheduledReportComment(
          data
        );
        io.emit("delete scheduled report comment success", result);
      } catch (error) {
        socket.emit("delete scheduled report comment error", {
          message: error.message,
        });
      }
    });

    // Håndter 'delete scheduled report' event
    socket.on("delete scheduled report", async (data) => {
      try {
        const result = await ScheduleReportController.deleteScheduledReport(data);
        socket.emit("delete scheduled report success", result);
      } catch (error) {
        socket.emit("delete scheduled report error", {
          message: error.message,
        });
      }
    });

    // Optional: Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  // Planlæg daglig rapport
  cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        const dailyReport = await ReportController.createDailyReport();
        io.emit("new report", dailyReport);
        console.log("Daily report emitted successfully.");
      } catch (error) {
        console.error(
          "Error creating or emitting daily report:",
          error.message
        );
      }
    },
    {
      timezone: "Europe/Copenhagen", // Angiv dansk tid
    }
  );

  // Håndter periodisk flytning af planlagte rapporter til rapporter
  setInterval(async () => {
    try {
      await ScheduleReportController.processDueScheduledReports(io);
    } catch (error) {
      console.error("Error processing scheduled reports:", error);
    }
  }, 60000); // Tjek hvert minut

  return io;
};

export default socketSetup;
