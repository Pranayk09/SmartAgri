import XLSX from 'xlsx';
import { prisma } from '../config/db.js';

// ==========================================
// COLUMN ALIASES — flexible header matching
// ==========================================
const COLUMN_ALIASES = {
  sku:   ['sku', 'product_sku', 'product sku', 'item sku', 'item_sku', 'code', 'product code', 'product_code'],
  name:  ['name', 'product name', 'product_name', 'item name', 'item_name', 'product', 'description'],
  category: ['category', 'category name', 'category_name', 'cat', 'group', 'product group', 'product_group'],
  basePrice: ['base price', 'baseprice', 'base_price', 'price', 'selling price', 'selling_price', 'default price', 'default_price', 'mrp', 'rate'],
  minStock:  ['min stock', 'minstock', 'min_stock', 'minimum stock', 'minimum_stock', 'safety stock', 'safety_stock', 'reorder point', 'reorder_point'],
  unit:   ['unit', 'uom', 'unit of measure', 'unit_of_measure', 'measure'],
  status: ['status', 'state', 'active', 'is_active'],
};

const VALID_UNITS   = ['KG', 'LITER', 'BAG', 'TON'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Parse a raw file buffer (CSV or XLSX) and return normalized row objects.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Array<Object>} - Array of raw row objects with original headers
 */
export function parseFileBuffer(buffer, mimetype) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    const err = new Error('Unable to parse the uploaded file. Ensure it is a valid .xlsx, .xls, or .csv file.');
    err.statusCode = 400;
    err.code = 'INVALID_FILE';
    throw err;
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const err = new Error('The uploaded file contains no sheets.');
    err.statusCode = 400;
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    const err = new Error('The uploaded file has no data rows.');
    err.statusCode = 400;
    err.code = 'EMPTY_FILE';
    throw err;
  }

  return rows;
}

/**
 * Detect which column in the file header maps to our canonical field names.
 * @param {Object} sampleRow - A single row from the file
 * @returns {Object} - Map of canonical field name -> detected file column name
 */
export function detectColumnMap(sampleRow) {
  const fileHeaders = Object.keys(sampleRow).map(h => h.toString().trim().toLowerCase());
  const columnMap = {};

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = fileHeaders.findIndex(h => h === alias.toLowerCase());
      if (idx !== -1) {
        columnMap[canonical] = Object.keys(sampleRow)[idx]; // original cased header
        break;
      }
    }
  }

  return columnMap;
}

/**
 * Validate and transform a single raw file row into a structured product record.
 * Returns { record, errors } where errors is an array of field-level messages.
 */
function transformRow(rawRow, columnMap, rowIndex) {
  const get = (field) => {
    const col = columnMap[field];
    return col ? String(rawRow[col] ?? '').trim() : '';
  };

  const errors = [];

  const sku       = get('sku').toUpperCase();
  const name      = get('name');
  const category  = get('category');
  const rawPrice  = get('basePrice');
  const rawStock  = get('minStock');
  const rawUnit   = get('unit').toUpperCase();
  const rawStatus = get('status').toUpperCase();

  if (!sku)      errors.push('SKU is required');
  if (!name)     errors.push('Product Name is required');
  if (!category) errors.push('Category is required');
  if (!rawPrice) errors.push('Base Price is required');

  const basePrice = parseFloat(rawPrice);
  if (rawPrice && isNaN(basePrice)) errors.push(`Base Price "${rawPrice}" is not a valid number`);
  if (!isNaN(basePrice) && basePrice < 0) errors.push('Base Price cannot be negative');

  const minStock = rawStock ? parseFloat(rawStock) : 0;
  if (rawStock && isNaN(minStock)) errors.push(`Min Stock "${rawStock}" is not a valid number`);

  const unit = VALID_UNITS.includes(rawUnit) ? rawUnit : 'KG'; // default to KG if unrecognized
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'ACTIVE';

  return {
    record: { sku, name, category, basePrice, minStock, unit, status },
    errors,
    rowIndex,
  };
}

/**
 * Preview: parse file and return normalized rows + detected column mapping + validation summary.
 * No DB writes.
 */
export function previewImport(buffer, mimetype) {
  const rows = parseFileBuffer(buffer, mimetype);
  const columnMap = detectColumnMap(rows[0]);

  const missingRequired = [];
  if (!columnMap.sku)       missingRequired.push('SKU');
  if (!columnMap.name)      missingRequired.push('Product Name');
  if (!columnMap.category)  missingRequired.push('Category');
  if (!columnMap.basePrice) missingRequired.push('Base Price');

  const transformed = rows.map((row, i) => transformRow(row, columnMap, i + 2)); // row 1 = header

  const validRows   = transformed.filter(r => r.errors.length === 0);
  const invalidRows = transformed.filter(r => r.errors.length > 0);

  return {
    totalRows:      rows.length,
    validCount:     validRows.length,
    invalidCount:   invalidRows.length,
    columnMap,
    detectedColumns: Object.keys(rows[0]),
    missingRequired,
    preview:        transformed.slice(0, 10).map(r => ({ ...r.record, _rowIndex: r.rowIndex, _errors: r.errors })),
    allRows:        transformed.map(r => ({ ...r.record, _rowIndex: r.rowIndex, _errors: r.errors })),
  };
}

/**
 * Execute bulk import: upsert categories + create products (skip duplicates).
 * Returns detailed import result summary.
 */
export async function executeBulkImport(buffer, mimetype, organizationId, options = {}) {
  const { skipErrors = true } = options;

  const rows = parseFileBuffer(buffer, mimetype);
  const columnMap = detectColumnMap(rows[0]);
  const transformed = rows.map((row, i) => transformRow(row, columnMap, i + 2));

  const results = {
    total:           rows.length,
    categoriesCreated: 0,
    productsCreated:  0,
    productsSkipped:  0,
    rowErrors:       [],
  };

  // ---- Step 1: Collect all unique category names from the file ----
  const categoryNames = [...new Set(
    transformed
      .filter(r => r.errors.length === 0 && r.record.category)
      .map(r => r.record.category.trim())
  )];

  // ---- Step 2: Upsert categories (create if not exists) ----
  const categoryMap = {}; // name (lower) -> id

  for (const catName of categoryNames) {
    try {
      // Try to find existing
      let cat = await prisma.productCategory.findFirst({
        where: {
          organizationId,
          name: { equals: catName, mode: 'insensitive' },
        },
      });

      if (!cat) {
        cat = await prisma.productCategory.create({
          data: {
            organizationId,
            name: catName,
            status: 'ACTIVE',
          },
        });
        results.categoriesCreated++;
      }

      categoryMap[catName.toLowerCase()] = cat.id;
    } catch (err) {
      // category upsert failure - mark affected rows
      results.rowErrors.push({
        type: 'category_error',
        message: `Failed to upsert category "${catName}": ${err.message}`,
      });
    }
  }

  // ---- Step 3: Create products (skip existing SKUs) ----
  for (const { record, errors, rowIndex } of transformed) {
    if (errors.length > 0) {
      results.rowErrors.push({
        rowIndex,
        sku: record.sku || 'N/A',
        name: record.name || 'N/A',
        errors,
        type: 'validation_error',
      });
      results.productsSkipped++;
      continue;
    }

    const categoryId = categoryMap[record.category.toLowerCase()];
    if (!categoryId) {
      results.rowErrors.push({
        rowIndex,
        sku: record.sku,
        name: record.name,
        errors: [`Category "${record.category}" could not be resolved`],
        type: 'category_resolution_error',
      });
      results.productsSkipped++;
      continue;
    }

    try {
      // Check if SKU already exists
      const existing = await prisma.product.findFirst({
        where: {
          organizationId,
          sku: { equals: record.sku, mode: 'insensitive' },
        },
      });

      if (existing) {
        results.rowErrors.push({
          rowIndex,
          sku: record.sku,
          name: record.name,
          errors: [`SKU "${record.sku}" already exists — skipped`],
          type: 'duplicate_sku',
        });
        results.productsSkipped++;
        continue;
      }

      await prisma.product.create({
        data: {
          organizationId,
          categoryId,
          name: record.name,
          sku: record.sku,
          unit: record.unit,
          defaultSellingPrice: record.basePrice,
          minimumStock: record.minStock || 0,
          status: record.status,
        },
      });

      results.productsCreated++;
    } catch (err) {
      results.rowErrors.push({
        rowIndex,
        sku: record.sku,
        name: record.name,
        errors: [err.message],
        type: 'db_error',
      });
      results.productsSkipped++;
    }
  }

  return results;
}
