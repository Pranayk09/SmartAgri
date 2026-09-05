import * as inventoryService from '../services/inventoryService.js';

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
