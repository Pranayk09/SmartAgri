import { generateCopilotSummary } from '../services/aiCopilotService.js';

export const getExecutiveSummary = async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await generateCopilotSummary(req.user.organizationId, forceRefresh);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[AiCopilot] Controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_COPILOT_ERROR',
        message: error.message || 'Failed to generate AI operations summary.'
      }
    });
  }
};
