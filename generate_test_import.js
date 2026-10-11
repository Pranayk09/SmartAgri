/**
 * Generates a sample product import Excel file for testing the SmartAgri bulk import feature.
 * Run with: node generate_test_import.js
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Sample data: mix of valid rows, edge-case headers, and intentional errors ──
const data = [
  // Header row (column names — intentionally use common variations to test alias detection)
  ['SKU', 'Product Name', 'Category', 'Base Price', 'Min Stock', 'Unit', 'Status'],

  // ── Category 1: NPK Complex Fertilizers ──
  ['NPK-191919-50KG', 'NPK 19-19-19 Premium Fertilizer',       'NPK Complex Fertilizers',   1250.00, 100, 'KG',    'ACTIVE'],
  ['NPK-202020-50KG', 'NPK 20-20-20 Water Soluble',            'NPK Complex Fertilizers',   1380.00, 80,  'KG',    'ACTIVE'],
  ['NPK-121236-50KG', 'NPK 12-12-36 High Potash Blend',        'NPK Complex Fertilizers',   1420.00, 60,  'KG',    'ACTIVE'],
  ['NPK-282828-25KG', 'NPK 28-28-28 Concentrated Formula',     'NPK Complex Fertilizers',   2100.00, 50,  'KG',    'ACTIVE'],

  // ── Category 2: Nitrogen Fertilizers ──
  ['UREA-46-50KG',    'Urea 46% Nitrogen Granular',            'Nitrogen Fertilizers',       980.00, 200, 'BAG',   'ACTIVE'],
  ['AN-34-50KG',      'Ammonium Nitrate 34% N',                'Nitrogen Fertilizers',      1050.00, 150, 'BAG',   'ACTIVE'],
  ['CAN-26-50KG',     'Calcium Ammonium Nitrate 26% N',        'Nitrogen Fertilizers',       890.00, 120, 'BAG',   'ACTIVE'],

  // ── Category 3: Phosphate Fertilizers ──
  ['DAP-1846-50KG',   'DAP 18-46-0 Di-Ammonium Phosphate',    'Phosphate Fertilizers',     1400.00, 180, 'KG',    'ACTIVE'],
  ['SSP-16-50KG',     'Single Super Phosphate 16%',            'Phosphate Fertilizers',      540.00, 250, 'BAG',   'ACTIVE'],
  ['TSP-46-50KG',     'Triple Super Phosphate 46%',            'Phosphate Fertilizers',     1280.00, 100, 'KG',    'ACTIVE'],

  // ── Category 4: Potassium Fertilizers ──
  ['MOP-60-50KG',     'Muriate of Potash 60% K2O',            'Potassium Fertilizers',     1620.00, 90,  'KG',    'ACTIVE'],
  ['SOP-50-25KG',     'Sulphate of Potash 50% K2O',           'Potassium Fertilizers',     2400.00, 40,  'KG',    'ACTIVE'],

  // ── Category 5: Micro-Nutrients ──
  ['ZINC-SO4-1KG',    'Zinc Sulphate 33% Monohydrate',        'Micro-Nutrients',            420.00, 50,  'KG',    'ACTIVE'],
  ['BORO-ETH-1L',     'Boron Ethanolamine 10% Liquid',        'Micro-Nutrients',            850.00, 30,  'LITER', 'ACTIVE'],
  ['FERRO-SO4-1KG',   'Ferrous Sulphate 19% Iron',            'Micro-Nutrients',            310.00, 60,  'KG',    'ACTIVE'],
  ['MANG-SO4-1KG',    'Manganese Sulphate 30.5%',             'Micro-Nutrients',            395.00, 40,  'KG',    'ACTIVE'],
  ['COPPER-SO4-1KG',  'Copper Sulphate 25% CuSO4',            'Micro-Nutrients',            560.00, 30,  'KG',    'ACTIVE'],

  // ── Category 6: Organic Fertilizers ──
  ['BIO-COMP-25KG',   'Premium Bio-Compost (Enriched)',        'Organic Fertilizers',        180.00, 500, 'BAG',   'ACTIVE'],
  ['VERMI-25KG',      'Vermicompost Granular',                 'Organic Fertilizers',        220.00, 400, 'BAG',   'ACTIVE'],
  ['SEAWEED-1L',      'Seaweed Extract Liquid Fertilizer',    'Organic Fertilizers',        680.00, 50,  'LITER', 'ACTIVE'],
  ['HUM-ACID-1L',     'Humic Acid 12% Liquid Concentrate',    'Organic Fertilizers',        490.00, 60,  'LITER', 'ACTIVE'],

  // ── Category 7: Pesticides & Crop Protection ──
  ['CHLORO-20EC-1L',  'Chlorpyrifos 20% EC',                  'Pesticides',                 340.00, 100, 'LITER', 'ACTIVE'],
  ['IMIDA-17.8-1L',   'Imidacloprid 17.8% SL',               'Pesticides',                 890.00, 80,  'LITER', 'ACTIVE'],
  ['MANCO-75WP-1KG',  'Mancozeb 75% WP Fungicide',            'Pesticides',                 280.00, 150, 'KG',    'ACTIVE'],
  ['GLYPHO-41-1L',    'Glyphosate 41% SL Herbicide',          'Pesticides',                 250.00, 200, 'LITER', 'ACTIVE'],

  // ── Category 8: Bulk / Commodity ──
  ['GYPSUM-TON',      'Agricultural Gypsum Bulk',              'Soil Amendments',            4500.00, 10, 'TON',   'ACTIVE'],
  ['LIME-AG-TON',     'Agricultural Lime Calcium Carbonate',  'Soil Amendments',            3200.00, 10, 'TON',   'ACTIVE'],

  // ── Intentional error rows (to show error handling in preview) ──
  ['',                'Missing SKU Product',                   'NPK Complex Fertilizers',   1000.00, 10,  'KG',    'ACTIVE'],   // ❌ no SKU
  ['NOCAT-001',       'Product With No Category',              '',                          1000.00, 10,  'KG',    'ACTIVE'],   // ❌ no category
  ['BADPRICE-001',    'Product With Bad Price',                'Micro-Nutrients',            'N/A',   10,  'KG',    'ACTIVE'],   // ❌ invalid price
];

// ── Build the worksheet ──
const ws = XLSX.utils.aoa_to_sheet(data);

// Column widths for readability when opened in Excel
ws['!cols'] = [
  { wch: 20 },  // SKU
  { wch: 42 },  // Product Name
  { wch: 30 },  // Category
  { wch: 12 },  // Base Price
  { wch: 12 },  // Min Stock
  { wch: 10 },  // Unit
  { wch: 10 },  // Status
];

// Style header row (bold)
// (basic XLSX doesn't support styles natively; xlsx-style or ExcelJS needed for full styling)

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Products');

// Also create a second sheet showing supported column name aliases
const aliasData = [
  ['Field',          'Accepted Column Names (any of these work)'],
  ['SKU',            'SKU, Product SKU, Item SKU, Code, Product Code'],
  ['Product Name',   'Name, Product Name, Item Name, Product, Description'],
  ['Category',       'Category, Category Name, Cat, Group, Product Group'],
  ['Base Price',     'Base Price, Price, Selling Price, Default Price, MRP, Rate'],
  ['Min Stock',      'Min Stock, Minimum Stock, Safety Stock, Reorder Point'],
  ['Unit',           'Unit, UOM, Unit of Measure   (KG / LITER / BAG / TON)'],
  ['Status',         'Status, State, Active, Is_Active   (ACTIVE / INACTIVE)'],
];
const wsAlias = XLSX.utils.aoa_to_sheet(aliasData);
wsAlias['!cols'] = [{ wch: 16 }, { wch: 60 }];
XLSX.utils.book_append_sheet(wb, wsAlias, 'Column Aliases');

// ── Save ──
const outputPath = path.join(__dirname, 'smartagri_test_import.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`\n✅  File generated successfully!`);
console.log(`📂  Location: ${outputPath}`);
console.log(`\n📊  Contents:`);
console.log(`    • ${data.length - 1} data rows (${data.length - 4} valid products)`);
console.log(`    • 8 product categories (all will be auto-created)`);
console.log(`    • 3 intentional error rows to test validation`);
console.log(`    • Second sheet: column alias reference\n`);
