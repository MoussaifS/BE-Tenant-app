const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function extractUnitsFromExcel() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, '..', '2024 01 23 - List of Unit-operation-new.xlsx - Sheet1.numbers');
    
    // Since it's a .numbers file, we need to try different approaches
    // First, let's try to read it as an Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('Raw data preview:', jsonData.slice(0, 5));
    
    // Find the header row - look for row with "Reference" column
    let headerRowIndex = 0;
    let headers = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        // Check if this row contains "Reference" which indicates it's the header row
        const hasReference = row.some(cell => 
          cell && typeof cell === 'string' && 
          cell.toLowerCase().includes('reference')
        );
        if (hasReference) {
          headers = row;
          headerRowIndex = i;
          break;
        }
      }
    }
    
    console.log('Headers found:', headers);
    console.log('Header row index:', headerRowIndex);
    
    // Map headers to our schema fields
    const fieldMapping = {
      'Reference': 'Reference',
      'Development': 'Development', 
      'Units': 'Units',
      'Number of bedrooms': 'Number_of_bedrooms',
      'Floor': 'Floor',
      'Neighborhood': 'Neighborhood',
      'Neighborhood ': 'Neighborhood', // Handle trailing space
      'Tourism License': 'Tourism_License',
      'Parking': 'Parking',
      'Location': 'Location',
      'add': 'Add' // This is the column we'll use to filter
    };
    
    // Find column indices
    const columnIndices = {};
    headers.forEach((header, index) => {
      if (header) {
        const cleanHeader = header.toString().trim();
        // First try exact match
        if (fieldMapping[cleanHeader]) {
          columnIndices[fieldMapping[cleanHeader]] = index;
        } else {
          // Then try case-insensitive match
          Object.keys(fieldMapping).forEach(key => {
            if (cleanHeader.toLowerCase() === key.toLowerCase()) {
              columnIndices[fieldMapping[key]] = index;
            }
          });
        }
      }
    });
    
    console.log('Column indices:', columnIndices);
    
    // Extract data rows
    const units = [];
    const dataRows = jsonData.slice(headerRowIndex + 1);
    
    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return;
      
      // Check if the "Add" column says "no" - if so, skip this row
      const addColumnIndex = columnIndices['Add'];
      if (addColumnIndex !== undefined && row[addColumnIndex]) {
        const addValue = row[addColumnIndex].toString().toLowerCase().trim();
        if (addValue === 'no') {
          console.log(`Skipping row ${index + headerRowIndex + 1}: Add column is "no"`);
          return;
        }
      }
      
      // Extract unit data
      const unit = {};
      
      Object.keys(columnIndices).forEach(field => {
        const colIndex = columnIndices[field];
        if (colIndex !== undefined && row[colIndex] !== undefined) {
          let value = row[colIndex];
          
          // Clean up the value
          if (value !== null && value !== undefined) {
            value = value.toString().trim();
            if (value === '') value = null;
          }
          
          // No special handling needed for Floor field - import as-is
          
          unit[field] = value;
        }
      });
      
      // Only add if we have at least a Reference (required field)
      if (unit.Reference) {
        units.push(unit);
      }
    });
    
    console.log(`Extracted ${units.length} units`);
    console.log('Sample unit:', units[0]);
    
    return units;
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
    
    // If the .numbers file can't be read directly, let's try to convert it
    console.log('Attempting to read as CSV or other format...');
    
    // Try to read the file as text first to see what format it is
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log('File content preview:', fileContent.substring(0, 200));
    } catch (readError) {
      console.error('Cannot read file as text:', readError);
    }
    
    return [];
  }
}

// Export the function
module.exports = { extractUnitsFromExcel };

// If run directly, execute the extraction
if (require.main === module) {
  const units = extractUnitsFromExcel();
  console.log('Final units count:', units.length);
}
