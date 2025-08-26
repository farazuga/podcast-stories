/**
 * Test CSV Import Date Parsing
 * Test the date parsing functionality with the actual sample CSV data
 */

const fs = require('fs');
const csv = require('csv-parser');
const csvParserService = require('./backend/services/csvParserService');
const csvValidationService = require('./backend/services/csvValidationService');

console.log('🧪 Testing CSV Import with Sample Data\n');
console.log('📁 File: testing/data/sample-data.csv\n');

// Test 1: Load and parse the actual CSV file
async function testCSVParsing() {
    const results = [];
    const errors = [];
    const warnings = [];

    console.log('Test 1: CSV File Parsing');
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('./testing/data/sample-data.csv')
            .pipe(csv({
                skipEmptyLines: true,
                skipLinesWithError: false,
                strict: false,
                separator: ',',
                quote: '"',
                escape: '"'
            }))
            .on('data', (data) => {
                // Handle BOM in header by cleaning first field
                const cleanedData = {};
                Object.keys(data).forEach(key => {
                    const cleanKey = key.replace(/^\uFEFF/, ''); // Remove BOM
                    cleanedData[cleanKey] = data[key];
                });
                
                // Skip empty rows
                if (cleanedData.idea_title) {
                    results.push(cleanedData);
                }
            })
            .on('end', () => {
                console.log(`✅ Parsed ${results.length} rows from CSV`);
                resolve(results);
            })
            .on('error', (error) => {
                console.error('❌ CSV parsing error:', error);
                reject(error);
            });
    });
}

// Test 2: Validate CSV structure
async function testCSVValidation(csvData) {
    console.log('\nTest 2: CSV Validation');
    
    const structureValidation = csvValidationService.validateCSVStructure(csvData);
    console.log('Structure validation:', structureValidation.isValid ? '✅ PASSED' : '❌ FAILED');
    
    if (!structureValidation.isValid) {
        console.log('Error:', structureValidation.message);
        return false;
    }
    
    console.log(`✅ Found ${structureValidation.rowCount} valid rows`);
    
    // Test first few rows
    const sampleRows = csvData.slice(0, 3);
    let validRows = 0;
    
    sampleRows.forEach((row, index) => {
        const rowValidation = csvValidationService.validateCSVRow(row, index + 2);
        if (rowValidation.isValid) {
            validRows++;
            console.log(`✅ Row ${index + 2}: Valid - "${row.idea_title}"`);
        } else {
            console.log(`❌ Row ${index + 2}: Invalid - Errors:`, rowValidation.errors);
        }
    });
    
    console.log(`✅ ${validRows}/${sampleRows.length} sample rows validated successfully`);
    return true;
}

// Test 3: Date Parsing (Critical Test)
async function testDateParsing(csvData) {
    console.log('\nTest 3: Date Parsing Analysis');
    
    const dateFormats = new Map();
    const dateParsingResults = [];
    
    csvData.forEach((row, index) => {
        const startDateRaw = row.coverage_start_date || '';
        const endDateRaw = row.coverage_end_date || '';
        
        // Test start date parsing
        if (startDateRaw.trim()) {
            const parsedStartDate = csvParserService.parseFlexibleDate(startDateRaw);
            const result = {
                row: index + 2,
                title: row.idea_title,
                originalDate: startDateRaw,
                parsedDate: parsedStartDate,
                success: parsedStartDate !== null
            };
            
            dateParsingResults.push(result);
            
            // Track date formats
            if (dateFormats.has(startDateRaw)) {
                dateFormats.set(startDateRaw, dateFormats.get(startDateRaw) + 1);
            } else {
                dateFormats.set(startDateRaw, 1);
            }
        }
        
        // Test end date parsing
        if (endDateRaw.trim()) {
            const parsedEndDate = csvParserService.parseFlexibleDate(endDateRaw);
            const result = {
                row: index + 2,
                title: row.idea_title,
                originalDate: endDateRaw,
                parsedDate: parsedEndDate,
                success: parsedEndDate !== null
            };
            
            dateParsingResults.push(result);
            
            // Track date formats
            if (dateFormats.has(endDateRaw)) {
                dateFormats.set(endDateRaw, dateFormats.get(endDateRaw) + 1);
            } else {
                dateFormats.set(endDateRaw, 1);
            }
        }
    });
    
    console.log('\n📊 Date Format Analysis:');
    dateFormats.forEach((count, format) => {
        if (format.trim()) {
            console.log(`"${format}": ${count} occurrences`);
        }
    });
    
    console.log('\n🎯 Date Parsing Results:');
    const successful = dateParsingResults.filter(r => r.success);
    const failed = dateParsingResults.filter(r => !r.success);
    
    console.log(`✅ Successfully parsed: ${successful.length} dates`);
    console.log(`❌ Failed to parse: ${failed.length} dates`);
    
    if (successful.length > 0) {
        console.log('\nSuccessful parsing examples:');
        successful.slice(0, 5).forEach(result => {
            console.log(`  "${result.originalDate}" → "${result.parsedDate}"`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed parsing examples:');
        failed.slice(0, 5).forEach(result => {
            console.log(`  Row ${result.row}: "${result.originalDate}" → NULL`);
        });
    }
    
    return { successful: successful.length, failed: failed.length, total: dateParsingResults.length };
}

// Test 4: Field Normalization
async function testFieldNormalization(csvData) {
    console.log('\nTest 4: Field Normalization');
    
    const sampleRow = csvData[0];
    console.log('\nOriginal row fields:', Object.keys(sampleRow));
    
    const normalized = csvParserService.normalizeCSVRow(sampleRow);
    console.log('Normalized row fields:', Object.keys(normalized));
    
    // Check specific mappings
    const mappingTests = [
        { original: 'idea_title', normalized: 'idea_title' },
        { original: 'idea_description', normalized: 'idea_description' },
        { original: 'coverage_start_date', normalized: 'coverage_start_date' },
        { original: 'tags', normalized: 'tags' },
        { original: 'interviewees', normalized: 'interviewees' }
    ];
    
    mappingTests.forEach(test => {
        const hasOriginal = sampleRow[test.original];
        const hasNormalized = normalized[test.normalized];
        
        if (hasOriginal && hasNormalized) {
            console.log(`✅ ${test.original} → ${test.normalized}: "${hasNormalized}"`);
        } else if (hasOriginal) {
            console.log(`⚠️ ${test.original} not normalized properly`);
        }
    });
    
    return true;
}

// Test 5: Specific Bug Hunting
async function testSpecificBugs(csvData) {
    console.log('\nTest 5: Bug Detection');
    
    const bugs = [];
    
    // Bug 1: Check for empty required fields
    csvData.forEach((row, index) => {
        if (!row.idea_title || row.idea_title.trim() === '') {
            bugs.push({
                type: 'MISSING_TITLE',
                row: index + 2,
                message: 'Missing required idea_title field'
            });
        }
    });
    
    // Bug 2: Check for malformed dates
    csvData.forEach((row, index) => {
        const startDate = row.coverage_start_date;
        if (startDate && startDate.trim()) {
            const parsed = csvParserService.parseFlexibleDate(startDate);
            if (!parsed) {
                bugs.push({
                    type: 'DATE_PARSE_FAILED',
                    row: index + 2,
                    message: `Cannot parse date: "${startDate}"`,
                    field: 'coverage_start_date'
                });
            }
        }
    });
    
    // Bug 3: Check for missing interviewees data
    let rowsWithoutInterviewees = 0;
    csvData.forEach((row, index) => {
        const interviewees = row.interviewees;
        if (!interviewees || interviewees.trim() === '') {
            rowsWithoutInterviewees++;
        }
    });
    
    if (rowsWithoutInterviewees > csvData.length * 0.5) {
        bugs.push({
            type: 'MISSING_INTERVIEWEES',
            message: `${rowsWithoutInterviewees}/${csvData.length} rows missing interviewees data`
        });
    }
    
    // Bug 4: Check for inconsistent field formats
    const tagFormats = new Set();
    csvData.forEach(row => {
        if (row.tags && row.tags.trim()) {
            tagFormats.add(row.tags.includes(',') ? 'comma-separated' : 'single-value');
        }
    });
    
    if (tagFormats.size > 1) {
        bugs.push({
            type: 'INCONSISTENT_TAG_FORMAT',
            message: 'Mixed tag formats found: ' + Array.from(tagFormats).join(', ')
        });
    }
    
    return bugs;
}

// Main Test Runner
async function runAllTests() {
    try {
        console.log('🚀 Starting CSV Import Testing\n');
        
        // Load CSV data
        const csvData = await testCSVParsing();
        
        // Run all tests
        const validationResult = await testCSVValidation(csvData);
        const dateParsingResults = await testDateParsing(csvData);
        const normalizationResult = await testFieldNormalization(csvData);
        const bugs = await testSpecificBugs(csvData);
        
        // Summary Report
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY REPORT');
        console.log('='.repeat(60));
        
        console.log(`📁 File: testing/data/sample-data.csv`);
        console.log(`📋 Rows processed: ${csvData.length}`);
        console.log(`✅ Structure validation: ${validationResult ? 'PASSED' : 'FAILED'}`);
        console.log(`🗓️ Date parsing: ${dateParsingResults.successful}/${dateParsingResults.total} successful`);
        console.log(`🔄 Field normalization: ${normalizationResult ? 'PASSED' : 'FAILED'}`);
        
        if (bugs.length === 0) {
            console.log(`🎉 Bug detection: No issues found`);
        } else {
            console.log(`🐛 Bug detection: ${bugs.length} issues found`);
        }
        
        console.log('\n📋 DETAILED BUG REPORT:');
        if (bugs.length === 0) {
            console.log('✅ No bugs detected in CSV import functionality');
        } else {
            bugs.forEach((bug, index) => {
                console.log(`\n🐛 Bug #${index + 1}: ${bug.type}`);
                console.log(`   Message: ${bug.message}`);
                if (bug.row) console.log(`   Row: ${bug.row}`);
                if (bug.field) console.log(`   Field: ${bug.field}`);
            });
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (dateParsingResults.failed > 0) {
            console.log('❗ Date parsing issues detected:');
            console.log('   - Consider standardizing date format to YYYY-MM-DD');
            console.log('   - Current "1-Jan" format needs year specification');
        }
        
        if (bugs.some(b => b.type === 'MISSING_INTERVIEWEES')) {
            console.log('❗ Many rows missing interviewees data');
            console.log('   - Consider making interviewees field required or provide defaults');
        }
        
        const successRate = ((dateParsingResults.successful / dateParsingResults.total) * 100).toFixed(1);
        console.log(`\n📊 Overall Success Rate: ${successRate}%`);
        
        if (successRate < 90) {
            console.log('⚠️  Success rate below 90% - requires attention');
        } else {
            console.log('✅ Success rate acceptable');
        }
        
        console.log('\n🎯 TESTING COMPLETE');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
    }
}

// Run the tests
runAllTests();