import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

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
        { role: 'system', content: `
            Du er en rapportgenerator. Din opgave er at:
            1. Gruppere rapporter med samme type og slå ensartet indhold sammen.
            2. Fjerne irrelevante detaljer som navn, dato, rapport ID, og bruger ID.
            3. Formatere indholdet på en måde, der er overskuelig og let at læse.
            4. Kombinere rapporter med samme rutenummer og stop-numre, så de vises som én linje.
            5. Give en kort og klar opsummering af, hvad der sker, grupperet efter rute eller emne.
        
            Eksempel:
            Input:
            [
              {
                "content": "Rute 221811 - stop nr. 3344 og 5666 mangler retur"
              },
              {
                "content": "Rute 221811 - stop nummer 5510 og 2312 mangler også retur"
              },
              {
                "content": "Rute 228155 - stop nummer 3322 og 3344 mangler retur"
              }
            ]
        
            Output:
            - Rute 221811: Stop nummer 3344, 5666, 5510, og 2312 mangler retur.
            - Rute 228155: Stop nummer 3322 og 3344 mangler retur.
        
            Følg dette format og sørg for, at det er let at læse og hurtigt at forstå.
          `,
        },
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
