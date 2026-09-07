import * as inventoryService from '../services/inventoryService.js';
import * as expiryService from '../services/expiryService.js';

export async function getBatches(req, res, next) {
  try {
    const { organizationId } = req.user;
    const batches = await inventoryService.getBatches(organizationId);
    
    res.status(200).json({
      success: true,
      data: batches
    });
  } catch (error) {
    next(error);
  }
}

export async function createBatch(req, res, next) {
  try {
    const { organizationId } = req.user;
    const batch = await inventoryService.createBatch(organizationId, req.body);
    
    res.status(201).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const batch = await inventoryService.adjustStock(organizationId, id, req.body, userId);
    
    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(req, res, next) {
  try {
    const { organizationId } = req.user;
    const movements = await inventoryService.getStockMovements(organizationId);
    
    res.status(200).json({
      success: true,
      data: movements
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXPIRY MANAGEMENT HANDLERS
// ==========================================

export async function syncExpiry(req, res, next) {
  try {
    const { organizationId } = req.user;
    const result = await expiryService.syncBatchExpiryStatuses(organizationId);

    res.status(200).json({
      success: true,
      message: `Expiry sync complete. ${result.updated} batch(es) updated.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpiryDashboard(req, res, next) {
  try {
    const { organizationId } = req.user;
    const dashboard = await expiryService.getExpiryDashboard(organizationId);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// FEFO PREVIEW HANDLER
// ==========================================

export async function fefoPreview(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'productId and quantity are required.',
        },
      });
    }

    const result = await inventoryService.allocateFEFO(organizationId, productId, quantity);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
