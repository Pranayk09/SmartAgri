import { getDashboardKPIs, getDashboardAlerts } from '../services/dashboardService.js';
import { getReportData } from '../services/reportService.js';

export const getKPIs = async (req, res) => {
  try {
    const kpis = await getDashboardKPIs(req.user.organizationId);
    res.status(200).json({ success: true, data: kpis });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await getDashboardAlerts(req.user.organizationId);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getReport = async (req, res) => {
  try {
    const { type } = req.params;
    const reportData = await getReportData(req.user.organizationId, type);
    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error(`Error fetching report [${req.params.type}]:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
