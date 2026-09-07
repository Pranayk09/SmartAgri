import * as customerService from '../services/customerService.js';
import * as creditValidationService from '../services/creditValidationService.js';

// ==========================================
// CUSTOMER CRUD HANDLERS
// ==========================================

export async function getCustomers(req, res, next) {
  try {
    const { organizationId } = req.user;
    const customers = await customerService.getCustomers(organizationId);
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const { organizationId } = req.user;
    const customer = await customerService.createCustomer(organizationId, req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const customer = await customerService.updateCustomer(organizationId, id, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const result = await customerService.deleteCustomer(organizationId, id);
    res.status(200).json({
      success: true,
      message:
        result.status === 'INACTIVE'
          ? 'Customer deactivated (has transaction history).'
          : 'Customer permanently deleted.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CREDIT MANAGEMENT HANDLERS
// ==========================================

export async function updateCreditLimit(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const customer = await customerService.updateCreditLimit(organizationId, id, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function getCreditSummary(req, res, next) {
  try {
    const { organizationId } = req.user;
    const summary = await creditValidationService.getCreditSummary(organizationId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}
