import * as bulkImportService from '../services/bulkImportService.js';

/**
 * POST /api/products/bulk-import/preview
 * Accepts multipart file upload, parses it, returns validation summary.
 * No DB writes — safe to call for user review.
 */
export async function previewBulkImport(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a .xlsx, .xls, or .csv file.');
      err.statusCode = 400;
      err.code = 'MISSING_FILE';
      return next(err);
    }

    const result = bulkImportService.previewImport(req.file.buffer, req.file.mimetype);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/products/bulk-import/execute
 * Accepts multipart file upload, parses and commits all valid rows to DB.
 * Upserts categories, creates products, skips duplicate SKUs.
 */
export async function executeBulkImport(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a .xlsx, .xls, or .csv file.');
      err.statusCode = 400;
      err.code = 'MISSING_FILE';
      return next(err);
    }

    const { organizationId } = req.user;
    const skipErrors = req.body.skipErrors !== 'false'; // default true

    const result = await bulkImportService.executeBulkImport(
      req.file.buffer,
      req.file.mimetype,
      organizationId,
      { skipErrors }
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
