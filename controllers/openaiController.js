import OpenAI from 'openai';
import dotenv from 'dotenv';
import Rapport from '../models/report.model.js';
import { reportGeneratorPrompt, weeklyReportGeneratorPrompt } from '../lib/utils/reportPromt.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const processReports = async (req, res) => {
  const { reports } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: reportGeneratorPrompt },
        { role: 'user', content: JSON.stringify(reports) },
      ],
    });

    const processedData = response.choices[0].message.content;

    res.json({ processedData });
  } catch (error) {
    console.error('Error with OpenAI API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fejl ved behandling af data med OpenAI.' });
  }
};

export const processWeeklyReports = async (req, res) => {
  const { reportTypeIds } = req.body;

  try {
    const reports = await Rapport.getWeeklyReportsByTypeIds(reportTypeIds);

    const reportContents = reports.map((report) => ({
      content: report.content,
      created_at: report.created_at,
      user: `${report.firstname} ${report.lastname}`,
      report_type: report.report_type,
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: weeklyReportGeneratorPrompt },
        { role: 'user', content: JSON.stringify(reportContents) },
      ],
    });

    const processedData = response.choices[0].message.content;

    res.json({ processedData });
  } catch (error) {
    console.error('Error with OpenAI API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fejl ved behandling af data med OpenAI.' });
  }
};
