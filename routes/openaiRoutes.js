import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { reportGeneratorPrompt } from '../lib/utils/reportPromt.js';

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


router.post('/process-reports', async (req, res) => {
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
});

export default router;
