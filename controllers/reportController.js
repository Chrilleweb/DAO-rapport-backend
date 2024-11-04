import Rapport from "../models/report.model.js";
import convertToUTC from "dato-konverter";

// Opret en ny rapport
export const createReportField = async (req, res) => {
  try {
    const { content, user_id, report_type_id } = req.body;

    // Tjek for manglende felter
    if (!content || !user_id) {
      return res.status(400).json({ message: "Please fill in all fields" }); // Returner 400 ved manglende felter
    }

    // Valider report_type_id
    if (report_type_id !== undefined) { // Hvis report_type_id er sendt med
      const validReportType = await Rapport.getReportTypeById(report_type_id); // Antag, at denne funktion eksisterer
      if (!validReportType) {
        return res.status(400).json({ message: "Invalid report type ID" }); // Returner 400 for ugyldig ID
      }
    }

    const newReportField = await Rapport.create(req.body);
    const createdField = await Rapport.findById(newReportField.insertId);
    return res.status(201).json(createdField);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hent nylige rapporter
export const getRecentReports = async (req, res) => {
  try {
    const recentReports = await Rapport.getRecentReports();

    // Map over reports to convert 'created_at' to the desired format
    const formattedReports = recentReports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));

    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Opdater en eksisterende rapport
export const updateReportField = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { user_id, content } = req.body;

    // Find rapporten først
    const report = await Rapport.findById(reportId);

    // Tjek om rapporten findes
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Tjek om brugeren har ret til at redigere rapporten
    if (report.user_id !== user_id) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this report" });
    }

    // Tjek om rapporten er redigerbar
    if (!report.is_editable) {
      return res.status(400).json({ message: "This report is not editable" });
    }

    // Opdater rapporten
    const updatedData = { content }; // Opdater kun de felter, du har brug for
    const rowsAffected = await Rapport.update(reportId, updatedData);

    // Tjek om noget blev opdateret
    if (rowsAffected === 0) {
      return res.status(400).json({ message: "Nothing was updated" });
    }

    return res.status(200).json({ message: "Report updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide start and end dates" });
    }

    const reports = await Rapport.getReportsByDateRange(startDate, endDate);

    // Format the 'created_at' field in the reports
    const formattedReports = reports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));

    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hent rapporter med report_type UBD
export const getRecentReportsByUBD = async (req, res) => {
  try {
    const ubdReports = await Rapport.getRecentReportsByType(1);

    // Map over reports to convert 'created_at' to the desired format
    const convertedReports = ubdReports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));

    return res.status(200).json(convertedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hent rapporter med report_type Indhentingsruter
export const getRecentReportsByIndhentingsruter = async (req, res) => {
  try {
    const reports = await Rapport.getRecentReportsByType(2); // 2 er id for Indhentingsruter
    const formattedReports = reports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));
    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hent rapporter med report_type Pakkeshopruter
export const getRecentReportsByPakkeshopruter = async (req, res) => {
  try {
    const reports = await Rapport.getRecentReportsByType(3); // 3 er id for Pakkeshopruter
    const formattedReports = reports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));
    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hent rapporter med report_type Ledelsesrapport
export const getRecentReportsByLedelsesrapport = async (req, res) => {
  try {
    const reports = await Rapport.getRecentReportsByType(4); // 4 er id for Ledelsesrapport
    const formattedReports = reports.map((report) => ({
      ...report,
      created_at: convertToUTC(new Date(report.created_at)),
    }));
    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

