import { Server } from "socket.io";
import Rapport from "../models/report.model.js";
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

    // Listen for 'get reports' event from the client
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

    // Listen for 'new report' event from the client
    socket.on("new report", async (data) => {
      try {
        // Opret ny rapport
        const newReport = await Rapport.create(data);

        // Hent den fulde rapport inkl. kommentarer (selvom der endnu ingen kommentarer er)
        const reportWithDetails = await Rapport.getReportsWithCommentsByTypeIds(
          [data.report_type_id], 
          1 
        );

        // Find den nyoprettede rapport i de hentede rapporter
        const reportData = reportWithDetails.find(
          (report) => report.id === newReport.insertId
        );

        // Emit den nye rapport
        io.emit("new report", reportData);
      } catch (error) {
        console.error("Error creating new report:", error);
        socket.emit("new report error", {
          message: "Fejl ved oprettelse af rapport.",
        });
      }
    });

    // Listen for 'edit report' event from the client
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

    // Optional: Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default socketSetup;
