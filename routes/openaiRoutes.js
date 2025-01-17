import { Router } from 'express';
import { authenticateToken } from '../middleware/jwtToken.js';
import { processReports, processReportsWithDates } from '../controllers/openaiController.js';

const router = Router();

router.use(authenticateToken);

router.post('/process-reports', processReports);
router.post('/process-reports-dates', processReportsWithDates);

export default router;
