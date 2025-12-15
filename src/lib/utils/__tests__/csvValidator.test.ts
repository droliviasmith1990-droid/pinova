/**
 * CSV Validator Tests
 */

import {
    validateCSV,
    getValidationSummary,
    groupValidationIssues,
    CSVValidationResult
} from '../csvValidator';

describe('csvValidator', () => {
    describe('validateCSV', () => {
        it('should pass validation for valid data', () => {
            const csvData = [
                { name: 'Product 1', price: '10', image: 'https://example.com/image.jpg' },
                { name: 'Product 2', price: '20', image: 'https://example.com/photo.png' }
            ];
            const fieldMapping = {
                text1: 'name',
                text2: 'price',
                image1: 'image'
            };
            const requiredFields = ['text1', 'image1'];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect unmapped required fields', () => {
            const csvData = [{ name: 'Test' }];
            const fieldMapping = { text1: 'name' };
            const requiredFields = ['text1', 'image1']; // image1 not mapped

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('invalid_mapping');
            expect(result.errors[0].field).toBe('image1');
        });

        it('should detect empty rows', () => {
            const csvData = [
                { name: 'Product 1', price: '10' },
                { name: '', price: '' }, // Empty row
                { name: 'Product 2', price: '20' }
            ];
            const fieldMapping = { text1: 'name', text2: 'price' };
            const requiredFields = [];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('empty_row');
            expect(result.errors[0].rowIndex).toBe(1);
        });

        it('should detect missing required field values', () => {
            const csvData = [
                { name: 'Product 1', price: '10' },
                { name: '', price: '20' } // Missing required name
            ];
            const fieldMapping = { text1: 'name', text2: 'price' };
            const requiredFields = ['text1'];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('missing_required_field');
            expect(result.errors[0].field).toBe('name');
        });

        it('should validate image URLs', () => {
            const csvData = [
                { name: 'Product', image: 'not-a-url' }
            ];
            const fieldMapping = { text1: 'name', image1: 'image' };
            const requiredFields = ['image1'];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('invalid_url');
        });

        it('should warn about suspicious URLs', () => {
            const csvData = [
                { name: 'Product', image: 'https://example.com/image' } // No extension
            ];
            const fieldMapping = { text1: 'name', image1: 'image' };
            const requiredFields = [];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(true); // Not an error, just warning
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('suspicious_url');
        });

        it('should warn about localhost URLs', () => {
            const csvData = [
                { name: 'Product', image: 'http://localhost:3000/image.jpg' }
            ];
            const fieldMapping = { text1: 'name', image1: 'image' };
            const requiredFields = [];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('suspicious_url');
        });

        it('should warn about very long text', () => {
            const longText = 'A'.repeat(600);
            const csvData = [
                { name: longText, price: '10' }
            ];
            const fieldMapping = { text1: 'name', text2: 'price' };
            const requiredFields = [];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('text_too_long');
            expect(result.warnings[0].field).toBe('name');
        });

        it('should warn about special characters', () => {
            const csvData = [
                { name: 'Product <script>', price: '10' }
            ];
            const fieldMapping = { text1: 'name', text2: 'price' };
            const requiredFields = [];

            const result = validateCSV(csvData, fieldMapping, requiredFields);

            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('special_characters');
        });
    });

    describe('getValidationSummary', () => {
        it('should return success message for no issues', () => {
            const result: CSVValidationResult = {
                valid: true,
                errors: [],
                warnings: []
            };

            const summary = getValidationSummary(result);

            expect(summary).toBe('✓ All validations passed');
        });

        it('should summarize errors only', () => {
            const result: CSVValidationResult = {
                valid: false,
                errors: [
                    { type: 'empty_row', rowIndex: 1, message: 'Empty row' },
                    { type: 'empty_row', rowIndex: 2, message: 'Empty row' }
                ],
                warnings: []
            };

            const summary = getValidationSummary(result);

            expect(summary).toBe('2 errors');
        });

        it('should summarize warnings only', () => {
            const result: CSVValidationResult = {
                valid: true,
                errors: [],
                warnings: [
                    { type: 'text_too_long', rowIndex: 0, field: 'name', message: 'Too long' }
                ]
            };

            const summary = getValidationSummary(result);

            expect(summary).toBe('1 warning');
        });

        it('should summarize both errors and warnings', () => {
            const result: CSVValidationResult = {
                valid: false,
                errors: [
                    { type: 'empty_row', rowIndex: 1, message: 'Empty' }
                ],
                warnings: [
                    { type: 'text_too_long', rowIndex: 0, field: 'name', message: 'Long' },
                    { type: 'suspicious_url', rowIndex: 2, field: 'image', message: 'Bad URL' }
                ]
            };

            const summary = getValidationSummary(result);

            expect(summary).toBe('1 error, 2 warnings');
        });
    });

    describe('groupValidationIssues', () => {
        it('should group errors by type', () => {
            const result: CSVValidationResult = {
                valid: false,
                errors: [
                    { type: 'empty_row', rowIndex: 1, message: 'Row 1 empty' },
                    { type: 'empty_row', rowIndex: 2, message: 'Row 2 empty' },
                    { type: 'invalid_url', rowIndex: 3, field: 'image', message: 'Bad URL' }
                ],
                warnings: []
            };

            const grouped = groupValidationIssues(result);

            expect(grouped.errors.size).toBe(2);
            expect(grouped.errors.get('empty_row')).toHaveLength(2);
            expect(grouped.errors.get('invalid_url')).toHaveLength(1);
        });

        it('should group warnings by type', () => {
            const result: CSVValidationResult = {
                valid: true,
                errors: [],
                warnings: [
                    { type: 'text_too_long', rowIndex: 0, field: 'name', message: 'Long' },
                    { type: 'text_too_long', rowIndex: 1, field: 'desc', message: 'Long' },
                    { type: 'suspicious_url', rowIndex: 2, field: 'image', message: 'Suspicious' }
                ]
            };

            const grouped = groupValidationIssues(result);

            expect(grouped.warnings.size).toBe(2);
            expect(grouped.warnings.get('text_too_long')).toHaveLength(2);
            expect(grouped.warnings.get('suspicious_url')).toHaveLength(1);
        });
    });
});
