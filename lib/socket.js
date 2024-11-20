import { Server } from "socket.io";
import cron from "node-cron";
import ReportController from "../controllers/reportController.js";
import CommentController from "../controllers/commentController.js";
import authenticateSocket from "../middleware/authenticateSocket.js";

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

    // Listen for 'get reports' event fra klienten
    socket.on("get reports", async (reportTypeIds) => {
      try {
        const reports = await ReportController.getReports(reportTypeIds, 1);
        socket.emit("previous reports", reports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Listen for 'get reports dates' event fra klienten
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

    // Listen for 'new report' event fra klienten
    socket.on("new report", async (data) => {
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

    // Listen for 'edit report' event fra klienten
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
        const scheduledReports = await ReportController.getScheduledReports();
        socket.emit("scheduled reports", scheduledReports);
      } catch (error) {
        console.error("Error fetching scheduled reports:", error);
      }
    });

    // Håndter 'schedule report' event
    socket.on("schedule report", async (data) => {
      try {
        const newScheduledReport = await ReportController.createScheduledReport(
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
        const updatedReport = await ReportController.updateScheduledReport(
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
          await CommentController.getAllScheduledReportComments();
        socket.emit("all schedule report comments", allComments);
      } catch (error) {
        console.error("Error fetching all schedule report comments:", error);
      }
    });

    // Håndter 'new schedule report comment' event
    socket.on("new schedule report comment", async (data) => {
      try {
        const formattedComment =
          await CommentController.createScheduledReportComment(data);
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
          await CommentController.updateScheduledReportComment(data);
        io.emit("update schedule report comment", formattedComment);
      } catch (error) {
        console.error("Error editing schedule report comment:", error);
        socket.emit("edit schedule report comment error", {
          message: error.message,
        });
      }
    });

    // Optional: Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  cron.schedule("0 6 * * *", async () => {
    try {
      const dailyReport = await ReportController.createDailyReport();
      io.emit("new report", dailyReport);
      console.log("Daily report emitted successfully.");
    } catch (error) {
      console.error("Error creating or emitting daily report:", error.message);
    }
  });

  // Håndter periodisk flytning af planlagte rapporter til rapporter
  setInterval(async () => {
    try {
      await ReportController.processDueScheduledReports(io);
    } catch (error) {
      console.error("Error processing scheduled reports:", error);
    }
  }, 60000); // Tjek hvert minut

  return io;
};

export default socketSetup;
