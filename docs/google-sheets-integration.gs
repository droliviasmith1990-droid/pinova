/**
 * Pinterest Pin Generator - Google Sheets Integration
 * 
 * This script connects your Google Sheet data to the Pinterest Pin Generator API.
 * It reads rows from your spreadsheet and generates pins using your template.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Replace the code with this script
 * 3. Update the CONFIG section below with your values
 * 4. Save and Run → generatePins()
 * 5. Grant permissions when prompted
 */

// ============================================
// ⚙️ CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  // Your API key from the dashboard
  API_KEY: 'pingen_0b3253bbff13cd942b8d2a389bdc816e068e310d58bed104fde061a189026de4',
  
  // Your template ID
  TEMPLATE_ID: 'TMPL-AADA84C0',
  
  // Your API base URL (your deployed app URL)
  API_BASE_URL: 'http://localhost:3000', // Change to your production URL
  
  // Sheet configuration
  SHEET_NAME: 'Sheet1',       // Name of the sheet tab
  HEADER_ROW: 1,              // Row number containing headers
  DATA_START_ROW: 2,          // First row of data
  
  // Column mapping: Maps your SHEET columns to TEMPLATE dynamic fields
  // Format: "templateFieldName": "spreadsheetColumnName"
  // Find your template field names by looking at the dynamic text/image placeholders
  FIELD_MAPPING: {
    // Example mappings - adjust based on your actual template fields
    // The left side is the field name in your template (e.g., {{productName}})
    // The right side is your spreadsheet column header
  },
  
  // Where to output the generated image URLs (column letter)
  OUTPUT_COLUMN: 'H',
  
  // Batch size (max 50 per API request)
  BATCH_SIZE: 10,
};

// ============================================
// 🚀 MAIN FUNCTIONS
// ============================================

/**
 * Main function - Generate pins from selected rows or all rows
 * Run this from the Apps Script editor or add as a menu item
 */
function generatePins() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet not found: ' + CONFIG.SHEET_NAME);
    return;
  }
  
  // Get headers and data
  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);
  
  if (dataRows.length === 0) {
    SpreadsheetApp.getUi().alert('No data rows found!');
    return;
  }
  
  Logger.log('Found ' + dataRows.length + ' rows to process');
  
  // Process in batches
  const batches = chunkArray(dataRows, CONFIG.BATCH_SIZE);
  let totalGenerated = 0;
  let totalFailed = 0;
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    Logger.log('Processing batch ' + (batchIndex + 1) + ' of ' + batches.length);
    
    try {
      const result = callGenerateApi(batch.map(row => row.data));
      
      if (result.success) {
        // Write successful URLs back to the sheet
        result.generated.forEach(gen => {
          const rowIndex = batch[gen.row_index].rowNumber;
          writeOutputUrl(sheet, rowIndex, gen.url);
        });
        
        totalGenerated += result.meta.successful;
        totalFailed += result.meta.failed;
        
        Logger.log('Batch ' + (batchIndex + 1) + ': ' + result.meta.successful + ' generated, ' + result.meta.failed + ' failed');
      } else {
        Logger.log('Batch ' + (batchIndex + 1) + ' failed: ' + result.error);
        totalFailed += batch.length;
      }
      
      // Delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        Utilities.sleep(1000); // 1 second delay
      }
    } catch (error) {
      Logger.log('Error in batch ' + (batchIndex + 1) + ': ' + error.message);
      totalFailed += batch.length;
    }
  }
  
  // Show summary
  const message = 'Generation Complete!\n\n' +
    '✅ Generated: ' + totalGenerated + '\n' +
    '❌ Failed: ' + totalFailed + '\n\n' +
    'Check column ' + CONFIG.OUTPUT_COLUMN + ' for URLs.';
  
  SpreadsheetApp.getUi().alert(message);
}

/**
 * Test function - Generate a single pin to verify everything works
 */
function testSingleGeneration() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet not found: ' + CONFIG.SHEET_NAME);
    return;
  }
  
  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);
  
  if (dataRows.length === 0) {
    SpreadsheetApp.getUi().alert('No data rows found!');
    return;
  }
  
  // Test with first row only
  const testRow = [dataRows[0].data];
  
  Logger.log('Testing with row: ' + JSON.stringify(testRow[0]));
  
  try {
    const result = callGenerateApi(testRow);
    
    if (result.success && result.generated.length > 0) {
      const url = result.generated[0].url;
      writeOutputUrl(sheet, dataRows[0].rowNumber, url);
      
      SpreadsheetApp.getUi().alert(
        '✅ Test Successful!\n\n' +
        'Generated URL:\n' + url + '\n\n' +
        'Processing time: ' + result.meta.processing_time_ms + 'ms'
      );
    } else {
      SpreadsheetApp.getUi().alert(
        '❌ Test Failed\n\n' +
        'Error: ' + (result.error || result.failed[0]?.error || 'Unknown error')
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ API Error: ' + error.message);
  }
}

/**
 * Debug function - Check the API connection and template
 */
function debugApiConnection() {
  const url = CONFIG.API_BASE_URL + '/api/v1/generate';
  
  Logger.log('Testing API connection...');
  Logger.log('URL: ' + url);
  Logger.log('Template ID: ' + CONFIG.TEMPLATE_ID);
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.API_KEY,
    },
    muteHttpExceptions: true,
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('Status: ' + statusCode);
    Logger.log('Response: ' + responseText);
    
    if (statusCode === 200) {
      SpreadsheetApp.getUi().alert(
        '✅ API Connection Successful!\n\n' +
        'The API is reachable. You can now run generatePins() or testSingleGeneration().'
      );
    } else {
      SpreadsheetApp.getUi().alert(
        '❌ API returned status ' + statusCode + '\n\n' +
        responseText
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      '❌ Connection Failed\n\n' +
      'Error: ' + error.message + '\n\n' +
      'Make sure:\n' +
      '1. Your API_BASE_URL is correct\n' +
      '2. The server is running\n' +
      '3. For localhost testing, you need ngrok or similar'
    );
  }
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

/**
 * Get headers from the sheet
 */
function getHeaders(sheet) {
  const headerRange = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn());
  const headerValues = headerRange.getValues()[0];
  
  const headers = {};
  headerValues.forEach((header, index) => {
    if (header && header.toString().trim()) {
      headers[header.toString().trim()] = index;
    }
  });
  
  return headers;
}

/**
 * Get data rows from the sheet
 */
function getDataRows(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) {
    return [];
  }
  
  const numRows = lastRow - CONFIG.DATA_START_ROW + 1;
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, numRows, sheet.getLastColumn());
  const dataValues = dataRange.getValues();
  
  const rows = [];
  const headerNames = Object.keys(headers);
  
  dataValues.forEach((row, rowIndex) => {
    // Skip empty rows
    if (row.every(cell => !cell || cell.toString().trim() === '')) {
      return;
    }
    
    const rowData = {};
    headerNames.forEach(header => {
      const colIndex = headers[header];
      rowData[header] = row[colIndex] ? row[colIndex].toString() : '';
    });
    
    rows.push({
      rowNumber: CONFIG.DATA_START_ROW + rowIndex,
      data: rowData,
    });
  });
  
  return rows;
}

/**
 * Call the Generate API
 */
function callGenerateApi(rows) {
  const url = CONFIG.API_BASE_URL + '/api/v1/generate';
  
  const payload = {
    template_id: CONFIG.TEMPLATE_ID,
    rows: rows,
    field_mapping: CONFIG.FIELD_MAPPING,
    multiplier: 2, // 2x resolution
  };
  
  Logger.log('API Request: ' + JSON.stringify(payload, null, 2));
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.API_KEY,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  Logger.log('API Response (' + statusCode + '): ' + responseText);
  
  if (statusCode >= 400) {
    const errorResponse = JSON.parse(responseText);
    return {
      success: false,
      error: errorResponse.error || 'HTTP ' + statusCode,
      generated: [],
      failed: [],
    };
  }
  
  return JSON.parse(responseText);
}

/**
 * Write the output URL to the sheet
 */
function writeOutputUrl(sheet, rowNumber, url) {
  const outputCol = columnLetterToNumber(CONFIG.OUTPUT_COLUMN);
  sheet.getRange(rowNumber, outputCol).setValue(url);
}

/**
 * Convert column letter to number (A=1, B=2, etc.)
 */
function columnLetterToNumber(letter) {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// 📋 CUSTOM MENU
// ============================================

/**
 * Create custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎨 Pin Generator')
    .addItem('📊 Generate All Pins', 'generatePins')
    .addItem('🧪 Test Single Row', 'testSingleGeneration')
    .addSeparator()
    .addItem('🔧 Debug API Connection', 'debugApiConnection')
    .addToUi();
}
