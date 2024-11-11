import { Server } from "socket.io";
import Rapport from "../models/report.model.js";
import convertToUTC from "dato-konverter";

const socketSetup = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for 'get reports' event from the client
    socket.on("get reports", async (reportTypeIds) => {
      try {
        const reports = await Rapport.getReportsByTypeIds(reportTypeIds);

        const convertedReports = reports.map((report) => ({
          ...report,
          created_at: convertToUTC(report.created_at),
        }));

        socket.emit("previous reports", convertedReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    });

    // Listen for 'new report' event from the client
    socket.on("new report", async (data) => {
      try {
        const newReport = await Rapport.create(data);
        const reportWithDetails = await Rapport.getFullReportById(
          newReport.insertId
        ); // Fetch full report

        const reportData = {
          id: newReport.insertId,
          content: reportWithDetails.content,
          user_id: data.user_id,
          report_type_id: data.report_type_id,
          created_at: convertToUTC(reportWithDetails.created_at),
          firstname: reportWithDetails.firstname,
          lastname: reportWithDetails.lastname,
          report_type: reportWithDetails.report_type,
        };

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
