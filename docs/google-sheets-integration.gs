/**
 * 🎨 Pinterest Pin Generator - Google Sheets Integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Save (Ctrl+S)
 * 4. Click Run → testSingleGeneration
 * 5. Grant permissions when prompted
 * 6. Once test works, use the "Pin Generator" menu that appears
 */

// ============================================
// ⚙️ CONFIGURATION
// ============================================
const CONFIG = {
  API_KEY: 'pingen_0b3253bbff13cd942b8d2a389bdc816e068e310d58bed104fde061a189026de4',
  TEMPLATE_ID: 'TMPL-AADA84C0',
  API_BASE_URL: 'https://pinterest-editor-fabric.vercel.app',
  
  SHEET_NAME: 'Sheet1',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  
  // Maps template field names → spreadsheet column names
  // Template has: "Text 1", "Image 1", "Image 2"
  // Sheet has: "Image1", "Image2", "Image Text"
  FIELD_MAPPING: {
    'Text 1': 'Image Text',   // Template text field → Sheet column
    'Image 1': 'Image1',      // Template image field → Sheet column  
    'Image 2': 'Image2',      // Template image field → Sheet column
  },
  
  OUTPUT_COLUMN: 'H',  // Where to write generated URLs
  BATCH_SIZE: 10,
};

// ============================================
// 🚀 MAIN FUNCTIONS
// ============================================

function testSingleGeneration() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert('Sheet not found: ' + CONFIG.SHEET_NAME); return; }
  
  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);
  
  if (dataRows.length === 0) { SpreadsheetApp.getUi().alert('No data rows found!'); return; }
  
  Logger.log('Testing with row: ' + JSON.stringify(dataRows[0].data));
  
  try {
    const result = callGenerateApi([dataRows[0].data]);
    Logger.log('API Response: ' + JSON.stringify(result));
    
    if (result.success && result.generated.length > 0) {
      const url = result.generated[0].url;
      writeOutputUrl(sheet, dataRows[0].rowNumber, url);
      SpreadsheetApp.getUi().alert('✅ Test Successful!\n\nGenerated URL:\n' + url + '\n\nProcessing time: ' + result.meta.processing_time_ms + 'ms');
    } else {
      const errorMsg = result.error || (result.failed[0]?.error) || 'Unknown error';
      SpreadsheetApp.getUi().alert('❌ Test Failed\n\nError: ' + errorMsg);
    }
  } catch (error) {
    Logger.log('Error: ' + error.message);
    SpreadsheetApp.getUi().alert('❌ API Error: ' + error.message);
  }
}

function generatePins() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert('Sheet not found: ' + CONFIG.SHEET_NAME); return; }
  
  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);
  
  if (dataRows.length === 0) { SpreadsheetApp.getUi().alert('No data rows found!'); return; }
  
  Logger.log('Processing ' + dataRows.length + ' rows');
  
  const batches = chunkArray(dataRows, CONFIG.BATCH_SIZE);
  let totalGenerated = 0, totalFailed = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    Logger.log('Batch ' + (i + 1) + '/' + batches.length);
    
    try {
      const result = callGenerateApi(batch.map(r => r.data));
      
      if (result.success) {
        result.generated.forEach(gen => {
          writeOutputUrl(sheet, batch[gen.row_index].rowNumber, gen.url);
        });
        totalGenerated += result.meta.successful;
        totalFailed += result.meta.failed;
      } else {
        totalFailed += batch.length;
      }
      
      if (i < batches.length - 1) Utilities.sleep(1000);
    } catch (error) {
      Logger.log('Batch error: ' + error.message);
      totalFailed += batch.length;
    }
  }
  
  SpreadsheetApp.getUi().alert('Generation Complete!\n\n✅ Generated: ' + totalGenerated + '\n❌ Failed: ' + totalFailed);
}

function debugApiConnection() {
  const url = CONFIG.API_BASE_URL + '/api/v1/generate';
  Logger.log('Testing: ' + url);
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + CONFIG.API_KEY },
      muteHttpExceptions: true,
    });
    
    const status = response.getResponseCode();
    Logger.log('Status: ' + status + ', Response: ' + response.getContentText());
    
    if (status === 200) {
      SpreadsheetApp.getUi().alert('✅ API Connection OK!\n\nYou can now run testSingleGeneration()');
    } else {
      SpreadsheetApp.getUi().alert('❌ API returned status ' + status + '\n\n' + response.getContentText());
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Connection Failed: ' + error.message);
  }
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

function getHeaders(sheet) {
  const values = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = {};
  values.forEach((h, i) => { if (h) headers[h.toString().trim()] = i; });
  return headers;
}

function getDataRows(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) return [];
  
  const data = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  const headerNames = Object.keys(headers);
  
  return data.map((row, i) => {
    if (row.every(c => !c || c.toString().trim() === '')) return null;
    const rowData = {};
    headerNames.forEach(h => { rowData[h] = row[headers[h]]?.toString() || ''; });
    return { rowNumber: CONFIG.DATA_START_ROW + i, data: rowData };
  }).filter(r => r !== null);
}

function callGenerateApi(rows) {
  const url = CONFIG.API_BASE_URL + '/api/v1/generate';
  
  const payload = {
    template_id: CONFIG.TEMPLATE_ID,
    rows: rows,
    field_mapping: CONFIG.FIELD_MAPPING,
    multiplier: 2,
  };
  
  Logger.log('Request: ' + JSON.stringify(payload));
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + CONFIG.API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  
  const status = response.getResponseCode();
  const text = response.getContentText();
  Logger.log('Response (' + status + '): ' + text);
  
  if (status >= 400) {
    const err = JSON.parse(text);
    return { success: false, error: err.error || 'HTTP ' + status, generated: [], failed: [] };
  }
  
  return JSON.parse(text);
}

function writeOutputUrl(sheet, rowNumber, url) {
  const col = CONFIG.OUTPUT_COLUMN.charCodeAt(0) - 64;
  sheet.getRange(rowNumber, col).setValue(url);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ============================================
// 📋 CUSTOM MENU
// ============================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎨 Pin Generator')
    .addItem('🧪 Test Single Row', 'testSingleGeneration')
    .addItem('📊 Generate All Pins', 'generatePins')
    .addSeparator()
    .addItem('🔧 Debug Connection', 'debugApiConnection')
    .addToUi();
}
