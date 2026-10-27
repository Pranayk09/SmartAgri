import { calculateAgriForecast, scheduleReplenishmentBatch, SEASONS } from '../services/agriForecastService.js';

export const getForecast = async (req, res) => {
  try {
    const forecast = await calculateAgriForecast(req.user.organizationId, req.query);
    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error calculating AgriForecast:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'FORECAST_CALCULATION_ERROR',
        message: error.message || 'Failed to compute agricultural demand forecast.'
      }
    });
  }
};

export const simulateForecast = async (req, res) => {
  try {
    const forecast = await calculateAgriForecast(req.user.organizationId, req.body);
    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error simulating AgriForecast scenario:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'FORECAST_SIMULATION_ERROR',
        message: error.message || 'Failed to simulate scenario.'
      }
    });
  }
};

export const getAvailableSeasons = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: Object.values(SEASONS)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

export const scheduleBatch = async (req, res) => {
  try {
    const result = await scheduleReplenishmentBatch(
      req.user.organizationId,
      req.user.userId,
      req.body
    );
    res.status(201).json({
      success: true,
      data: result,
      message: `Production batch ${result.batch.batchNumber} scheduled successfully.`
    });
  } catch (error) {
    console.error('Error scheduling replenishment batch:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'BATCH_SCHEDULE_ERROR',
        message: error.message || 'Failed to schedule replenishment batch.'
      }
    });
  }
};
