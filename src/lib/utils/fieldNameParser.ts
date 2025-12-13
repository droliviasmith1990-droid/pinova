/**
 * Field Name Parser Utility
 * Parses layer names to auto-detect dynamic field names
 * Example: "Image 1" → "image1", "Text 2" → "text2"
 */

export type FieldType = 'image' | 'text';

export interface ParsedField {
    fieldName: string;  // e.g., "image1", "text2"
    fieldType: FieldType;
    number: number;
}

/**
 * Parse layer name to extract dynamic field name
 * @param layerName - The name of the layer (e.g., "Image 1", "Text 2")
 * @param layerType - The type of element ('image' or 'text')
 * @returns ParsedField or null if no match
 */
export function parseFieldNameFromLayer(
    layerName: string,
    layerType: 'image' | 'text'
): ParsedField | null {
    if (!layerName) return null;

    const cleanName = layerName.trim().toLowerCase();

    // Patterns for image fields
    const imagePatterns = [
        /^image\s*(\d+)$/i,      // "Image 1", "image 1"
        /^image(\d+)$/i,         // "Image1" (no space)
        /^img\s*(\d+)$/i,        // "Img 1"
        /^photo\s*(\d+)$/i,      // "Photo 1"
        /^picture\s*(\d+)$/i,    // "Picture 1"
        /^dynamic\s*image\s*(\d*)$/i  // "Dynamic Image", "Dynamic Image 1"
    ];

    // Patterns for text fields
    const textPatterns = [
        /^text\s*(\d+)$/i,       // "Text 1", "text 1"
        /^text(\d+)$/i,          // "Text1" (no space)
        /^title\s*(\d*)$/i,      // "Title", "Title 1"
        /^description\s*(\d*)$/i, // "Description"
        /^heading\s*(\d*)$/i,    // "Heading"
        /^label\s*(\d*)$/i,      // "Label"
        /^dynamic\s*text\s*(\d*)$/i  // "Dynamic Text", "Dynamic Text 1"
    ];

    const patterns = layerType === 'image' ? imagePatterns : textPatterns;

    for (const pattern of patterns) {
        const match = cleanName.match(pattern);
        if (match) {
            const number = match[1] ? parseInt(match[1]) : 1;
            return {
                fieldName: `${layerType}${number}`,
                fieldType: layerType,
                number
            };
        }
    }

    return null;
}

/**
 * Get the next available field number for a given type
 * @param existingFields - Array of existing field names
 * @param fieldType - The type to get next number for
 * @returns The next available number
 */
export function getNextFieldNumber(existingFields: string[], fieldType: FieldType): number {
    const pattern = new RegExp(`^${fieldType}(\\d+)$`);
    const numbers = existingFields
        .map(f => {
            const match = f.match(pattern);
            return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * Generate a default layer name from field type and number
 * @param fieldType - 'image' or 'text'
 * @param number - The field number
 * @returns Layer name like "Image 1" or "Text 2"
 */
export function generateLayerName(fieldType: FieldType, number: number): string {
    const prefix = fieldType === 'image' ? 'Image' : 'Text';
    return `${prefix} ${number}`;
}

/**
 * Check if a layer name indicates a dynamic field
 * @param layerName - The layer name to check
 * @param layerType - The type of element
 * @returns true if the name matches a dynamic field pattern
 */
export function isDynamicLayerName(layerName: string, layerType: 'image' | 'text'): boolean {
    return parseFieldNameFromLayer(layerName, layerType) !== null;
}

/**
 * Extract all dynamic fields from an array of elements
 * @param elements - Array of template elements
 * @returns Array of field metadata
 */
export interface DynamicFieldInfo {
    fieldName: string;
    fieldType: FieldType;
    layerName: string;
    elementId: string;
    required: boolean;
}

export function extractDynamicFieldsFromElements(elements: Array<{
    id: string;
    name: string;
    type: 'text' | 'image';
    isDynamic?: boolean;
    dynamicField?: string;
    dynamicSource?: string;
}>): DynamicFieldInfo[] {
    const fields: DynamicFieldInfo[] = [];
    const seen = new Set<string>();

    elements.forEach(element => {
        let fieldName: string | null = null;

        // Check for explicit dynamic field assignment
        if (element.type === 'text' && element.isDynamic && element.dynamicField) {
            fieldName = element.dynamicField;
        } else if (element.type === 'image' && element.isDynamic && element.dynamicSource) {
            fieldName = element.dynamicSource;
        }

        // If no explicit field, try to parse from layer name
        if (!fieldName) {
            const parsed = parseFieldNameFromLayer(element.name, element.type);
            if (parsed) {
                fieldName = parsed.fieldName;
            }
        }

        // Add to fields list if found and not duplicate
        if (fieldName && !seen.has(fieldName)) {
            seen.add(fieldName);
            fields.push({
                fieldName,
                fieldType: element.type as FieldType,
                layerName: element.name,
                elementId: element.id,
                required: fields.length < 1 // First field of each type is required
            });
        }
    });

    // Sort by field name for consistent ordering
    return fields.sort((a, b) => {
        if (a.fieldType !== b.fieldType) {
            return a.fieldType === 'image' ? -1 : 1;
        }
        return a.fieldName.localeCompare(b.fieldName, undefined, { numeric: true });
    });
}
