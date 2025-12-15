/**
 * Field Name Parser Tests
 */

import {
    parseFieldNameFromLayer,
    getNextFieldNumber,
    generateLayerName,
    isDynamicLayerName,
    extractDynamicFieldsFromElements
} from '../fieldNameParser';

describe('fieldNameParser', () => {
    describe('parseFieldNameFromLayer', () => {
        // Image patterns
        it('should parse "Image 1" for image type', () => {
            const result = parseFieldNameFromLayer('Image 1', 'image');
            expect(result).toEqual({
                fieldName: 'image1',
                fieldType: 'image',
                number: 1
            });
        });

        it('should parse "Image1" without space', () => {
            const result = parseFieldNameFromLayer('Image1', 'image');
            expect(result).toEqual({
                fieldName: 'image1',
                fieldType: 'image',
                number: 1
            });
        });

        it('should parse "Img 2"', () => {
            const result = parseFieldNameFromLayer('Img 2', 'image');
            expect(result).toEqual({
                fieldName: 'image2',
                fieldType: 'image',
                number: 2
            });
        });

        it('should parse "Photo 5"', () => {
            const result = parseFieldNameFromLayer('Photo 5', 'image');
            expect(result).toEqual({
                fieldName: 'image5',
                fieldType: 'image',
                number: 5
            });
        });

        it('should parse "Dynamic Image" with default number 1', () => {
            const result = parseFieldNameFromLayer('Dynamic Image', 'image');
            expect(result).toEqual({
                fieldName: 'image1',
                fieldType: 'image',
                number: 1
            });
        });

        // Text patterns
        it('should parse "Text 1" for text type', () => {
            const result = parseFieldNameFromLayer('Text 1', 'text');
            expect(result).toEqual({
                fieldName: 'text1',
                fieldType: 'text',
                number: 1
            });
        });

        it('should parse "Title" with default number 1', () => {
            const result = parseFieldNameFromLayer('Title', 'text');
            expect(result).toEqual({
                fieldName: 'text1',
                fieldType: 'text',
                number: 1
            });
        });

        it('should parse "Description 3"', () => {
            const result = parseFieldNameFromLayer('Description 3', 'text');
            expect(result).toEqual({
                fieldName: 'text3',
                fieldType: 'text',
                number: 3
            });
        });

        it('should parse "Heading 2"', () => {
            const result = parseFieldNameFromLayer('Heading 2', 'text');
            expect(result).toEqual({
                fieldName: 'text2',
                fieldType: 'text',
                number: 2
            });
        });

        // Edge cases
        it('should be case insensitive', () => {
            const result = parseFieldNameFromLayer('IMAGE 5', 'image');
            expect(result?.number).toBe(5);
        });

        it('should handle extra whitespace', () => {
            const result = parseFieldNameFromLayer('  Text  2  ', 'text');
            expect(result?.number).toBe(2);
        });

        it('should return null for non-matching names', () => {
            const result = parseFieldNameFromLayer('Random Name', 'text');
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = parseFieldNameFromLayer('', 'text');
            expect(result).toBeNull();
        });
    });

    describe('getNextFieldNumber', () => {
        it('should return 1 for empty array', () => {
            const nextNumber = getNextFieldNumber([], 'text');
            expect(nextNumber).toBe(1);
        });

        it('should return next sequential number', () => {
            const existingFields = ['text1', 'text2', 'text3'];
            const nextNumber = getNextFieldNumber(existingFields, 'text');
            expect(nextNumber).toBe(4);
        });

        it('should find max even with gaps', () => {
            const existingFields = ['text1', 'text5', 'text3'];
            const nextNumber = getNextFieldNumber(existingFields, 'text');
            expect(nextNumber).toBe(6);
        });

        it('should handle mixed field types', () => {
            const existingFields = ['text1', 'image1', 'text2', 'image2'];
            const nextNumber = getNextFieldNumber(existingFields, 'image');
            expect(nextNumber).toBe(3);
        });

        it('should ignore invalid format', () => {
            const existingFields = ['text1', 'randomField', 'text2'];
            const nextNumber = getNextFieldNumber(existingFields, 'text');
            expect(nextNumber).toBe(3);
        });
    });

    describe('generateLayerName', () => {
        it('should generate "Image 1" for image type', () => {
            const name = generateLayerName('image', 1);
            expect(name).toBe('Image 1');
        });

        it('should generate "Text 5" for text type', () => {
            const name = generateLayerName('text', 5);
            expect(name).toBe('Text 5');
        });

        it('should handle large numbers', () => {
            const name = generateLayerName('image', 100);
            expect(name).toBe('Image 100');
        });
    });

    describe('isDynamicLayerName', () => {
        it('should return true for dynamic image names', () => {
            expect(isDynamicLayerName('Image 1', 'image')).toBe(true);
            expect(isDynamicLayerName('Photo 2', 'image')).toBe(true);
        });

        it('should return true for dynamic text names', () => {
            expect(isDynamicLayerName('Text 1', 'text')).toBe(true);
            expect(isDynamicLayerName('Title', 'text')).toBe(true);
        });

        it('should return false for non-dynamic names', () => {
            expect(isDynamicLayerName('My Custom Layer', 'text')).toBe(false);
            expect(isDynamicLayerName('Background', 'image')).toBe(false);
        });
    });

    describe('extractDynamicFieldsFromElements', () => {
        it('should extract fields from explicitly marked dynamic elements', () => {
            const elements = [
                {
                    id: 'el1',
                    name: 'Custom Name',
                    type: 'text' as const,
                    isDynamic: true,
                    dynamicField: 'text1'
                },
                {
                    id: 'el2',
                    name: 'Another Name',
                    type: 'image' as const,
                    isDynamic: true,
                    dynamicSource: 'image1'
                }
            ];

            const fields = extractDynamicFieldsFromElements(elements);

            expect(fields).toHaveLength(2);
            expect(fields[0].fieldName).toBe('image1');
            expect(fields[1].fieldName).toBe('text1');
        });

        it('should extract fields from layer names', () => {
            const elements = [
                {
                    id: 'el1',
                    name: 'Image 1',
                    type: 'image' as const
                },
                {
                    id: 'el2',
                    name: 'Text 1',
                    type: 'text' as const
                }
            ];

            const fields = extractDynamicFieldsFromElements(elements);

            expect(fields).toHaveLength(2);
            expect(fields.map(f => f.fieldName)).toContain('image1');
            expect(fields.map(f => f.fieldName)).toContain('text1');
        });

        it('should avoid duplicates', () => {
            const elements = [
                {
                    id: 'el1',
                    name: 'Image 1',
                    type: 'image' as const,
                    isDynamic: true,
                    dynamicSource: 'image1'
                },
                {
                    id: 'el2',
                    name: 'Image 1',
                    type: 'image' as const,
                    isDynamic: true,
                    dynamicSource: 'image1'
                }
            ];

            const fields = extractDynamicFieldsFromElements(elements);

            expect(fields).toHaveLength(1);
        });

        it('should sort fields with images first, then numerically', () => {
            const elements = [
                { id: 'el1', name: 'Text 3', type: 'text' as const },
                { id: 'el2', name: 'Image 2', type: 'image' as const },
                { id: 'el3', name: 'Text 1', type: 'text' as const },
                { id: 'el4', name: 'Image 1', type: 'image' as const }
            ];

            const fields = extractDynamicFieldsFromElements(elements);

            expect(fields[0].fieldName).toBe('image1');
            expect(fields[1].fieldName).toBe('image2');
            expect(fields[2].fieldName).toBe('text1');
            expect(fields[3].fieldName).toBe('text3');
        });

        it('should mark first field as required', () => {
            const elements = [
                { id: 'el1', name: 'Image 1', type: 'image' as const }
            ];

            const fields = extractDynamicFieldsFromElements(elements);

            expect(fields[0].required).toBe(true);
        });
    });
});
