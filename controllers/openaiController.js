import OpenAI from "openai";
import dotenv from "dotenv";
import Rapport from "../models/report.model.js";
import { reportGeneratorPrompt } from "../lib/utils/reportPromt.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const processReports = async (req, res) => {
  const { reportTypeIds } = req.body;

  try {
    // Hent rapporter og kommentarer for de sidste 1 dag
    const reports = await Rapport.getReportsWithCommentsByTypeIds(
      reportTypeIds,
      1
    );

    // Map data til den struktur, som OpenAI skal bruge
    const reportContents = reports.map((report) => ({
      content: report.content,
      created_at: report.created_at,
      user: `${report.firstname} ${report.lastname}`,
      report_type: report.report_type,
      comments: report.comments.map((comment) => ({
        content: comment.content,
        created_at: comment.created_at,
        user: `${comment.firstname} ${comment.lastname}`,
      })),
    }));

    // Send data til OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: reportGeneratorPrompt },
        { role: "user", content: JSON.stringify(reportContents) },
      ],
    });

    const processedData = response.choices[0].message.content;

    // Returnér behandlet data
    res.json({ processedData });
  } catch (error) {
    console.error(
      "Error with OpenAI API:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Fejl ved behandling af data med OpenAI." });
  }
};

export const processReportsWithDates = async (req, res) => {
  const { reportTypeIds, startDate, endDate } = req.body;

  try {
    const reports = await Rapport.getReportsWithCommentsByTypeIdsAndDates(
      reportTypeIds,
      startDate,
      endDate
    );

    // Map data til den struktur, som OpenAI skal bruge
    const reportContents = reports.map((report) => ({
      content: report.content,
      created_at: report.created_at,
      user: `${report.firstname} ${report.lastname}`,
      report_type: report.report_type,
      comments: report.comments.map((comment) => ({
        content: comment.content,
        created_at: comment.created_at,
        user: `${comment.firstname} ${comment.lastname}`,
      })),
    }));

    // Send data til OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: reportGeneratorPrompt },
        { role: "user", content: JSON.stringify(reportContents) },
      ],
    });

    const processedData = response.choices[0].message.content;

    // Returnér behandlet data
    res.json({ processedData });
  } catch (error) {
    console.error(
      "Error with OpenAI API:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Fejl ved behandling af data med OpenAI." });
  }
};
