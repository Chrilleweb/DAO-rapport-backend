import { Router } from "express";
import { authenticateToken } from "../middleware/jwtToken.js";
import {
  createReportField,
  getRecentReports,
  updateReportField,
  getReportsByDateRange,
  getRecentReportsByUBD,
  getRecentReportsByIndhentingsruter,
  getRecentReportsByPakkeshopruter,
  getRecentReportsByLedelsesrapport,
} from "../controllers/reportController.js";

const router = Router();

router.use(authenticateToken);

//GET requests
router.get("/recent-reports", getRecentReports);
router.get("/reports-by-date", getReportsByDateRange);

// POST requests
router.post("/create-reports", createReportField);
router.post("/reports-by-date", getReportsByDateRange);

// PUT requests
router.put("/report-fields/:reportId", updateReportField);

//GET requests for specific report types
router.get(
  "/recent-indhentingsruter-reports",
  getRecentReportsByIndhentingsruter
);
router.get("/recent-pakkeshopruter-reports", getRecentReportsByPakkeshopruter);
router.get(
  "/recent-ledelsesrapport-reports",
  getRecentReportsByLedelsesrapport
);
router.get("/recent-ubd-reports", getRecentReportsByUBD);

export default router;
