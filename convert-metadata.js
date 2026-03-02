#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File paths
const inputFile = path.join(__dirname, 'build', 'json', '_metadata.json');
const outputFile = path.join(__dirname, 'build', 'json', 'metadata.csv');

try {
    // Read and parse the JSON file
    console.log(`Reading JSON file from: ${inputFile}`);
    const jsonData = fs.readFileSync(inputFile, 'utf8');
    const metadata = JSON.parse(jsonData);

    if (!metadata || metadata.length === 0) {
        throw new Error('No data found in JSON file');
    }

    // First, find all unique attribute types while preserving order of first appearance
    const attributeTypes = [];
    const attributeSet = new Set();
    
    metadata.forEach(item => {
        if (item.attributes && Array.isArray(item.attributes)) {
            item.attributes.forEach(attr => {
                if (attr.trait_type && !attributeSet.has(attr.trait_type)) {
                    attributeSet.add(attr.trait_type);
                    attributeTypes.push(attr.trait_type);
                }
            });
        }
    });
    
    console.log(`Found ${attributeTypes.length} unique attribute types`);

    // Define base headers (always present)
    const baseHeaders = ['tokenID', 'name', 'description', 'file_name'];
    
    // Create attribute headers preserving original order
    const attributeHeaders = attributeTypes.map(attr => `attributes[${attr}]`);
    
    // Combine all headers
    const headers = [...baseHeaders, ...attributeHeaders];

    // Process each item and create CSV rows
    const rows = metadata.map(item => {
        // Extract attributes into a map for easy lookup
        const attrMap = {};
        if (item.attributes && Array.isArray(item.attributes)) {
            item.attributes.forEach(attr => {
                if (attr.trait_type) {
                    attrMap[attr.trait_type] = attr.value || '';
                }
            });
        }

        // Extract file name from image URL
        const fileName = path.basename(item.image || '');

        // Create base row data
        const rowData = [
            item.edition || '',
            item.name || '',
            `"${(item.description || '').replace(/"/g, '""')}"`, // Escape quotes in description
            fileName
        ];

        // Add attributes in the original order they appeared
        attributeTypes.forEach(attrType => {
            rowData.push(attrMap[attrType] || '');
        });

        return rowData;
    });

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Ensure the output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write CSV file
    fs.writeFileSync(outputFile, csvContent, 'utf8');
    
    console.log(`✅ Successfully converted ${metadata.length} items to CSV`);
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`📊 CSV contains ${headers.length} columns (${attributeTypes.length} attribute columns)`);
    
    // Optional: Show the attribute columns found (in original order)
    if (attributeTypes.length > 0) {
        console.log('\n📋 Attribute columns created (in order of appearance):');
        attributeTypes.forEach(attr => console.log(`   ${attributeTypes.indexOf(attr) + 1}. ${attr}`));
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}