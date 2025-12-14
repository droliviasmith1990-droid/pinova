import { renderTemplate, RenderConfig, FieldMapping } from '../engine';

// Mock Fabric.js for Node environment testing
jest.mock('fabric', () => {
    const mockTextbox = jest.fn().mockImplementation((text, options) => ({
        text,
        ...options,
        type: 'textbox',
    }));

    const mockFabricImage = jest.fn().mockImplementation(() => ({
        type: 'image',
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
    }));

    (mockFabricImage as unknown as { fromURL: jest.Mock }).fromURL = jest.fn().mockResolvedValue({
        type: 'image',
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
    });

    const mockCircle = jest.fn().mockImplementation((options) => ({
        type: 'circle',
        ...options,
    }));

    const mockRect = jest.fn().mockImplementation((options) => ({
        type: 'rect',
        ...options,
    }));

    const mockShadow = jest.fn().mockImplementation((options) => options);

    return {
        Textbox: mockTextbox,
        FabricImage: mockFabricImage,
        Circle: mockCircle,
        Rect: mockRect,
        Shadow: mockShadow,
        Line: jest.fn().mockImplementation((points, options) => ({ type: 'line', points, ...options })),
        Path: jest.fn().mockImplementation((path, options) => ({ type: 'path', path, ...options })),
    };
});

// Mock Fetch for Node Environment
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        blob: () => Promise.resolve(new Blob()),
    })
) as jest.Mock;

describe('Shared Engine (Node Environment)', () => {
    let mockCanvas: {
        setDimensions: jest.Mock;
        clear: jest.Mock;
        add: jest.Mock;
        renderAll: jest.Mock;
        backgroundColor: string;
        toDataURL: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Fabric StaticCanvas methods
        mockCanvas = {
            setDimensions: jest.fn(),
            clear: jest.fn(),
            add: jest.fn(),
            renderAll: jest.fn(),
            backgroundColor: '',
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,abc123'),
        };
    });

    describe('renderTemplate', () => {
        it('should set canvas dimensions and background color', async () => {
            const config: RenderConfig = {
                width: 1000,
                height: 1500,
                backgroundColor: '#ffffff',
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await renderTemplate(mockCanvas as any, [], config);

            expect(mockCanvas.setDimensions).toHaveBeenCalledWith({ width: 1000, height: 1500 });
            expect(mockCanvas.backgroundColor).toBe('#ffffff');
            expect(mockCanvas.clear).toHaveBeenCalled();
            expect(mockCanvas.renderAll).toHaveBeenCalled();
        });

        it('should render text elements correctly', async () => {
            const elements = [
                {
                    id: '1',
                    name: 'Title',
                    type: 'text' as const,
                    x: 10,
                    y: 10,
                    width: 200,
                    height: 50,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    zIndex: 0,
                    text: 'Hello World',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontStyle: 'normal' as const,
                    fill: '#000000',
                    align: 'left' as const,
                    verticalAlign: 'top' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textDecoration: '' as const,
                    isDynamic: false,
                }
            ];

            const config: RenderConfig = { width: 800, height: 600 };

            await renderTemplate(mockCanvas, elements, config);

            expect(mockCanvas.add).toHaveBeenCalledTimes(1);
            const addedObject = mockCanvas.add.mock.calls[0][0];
            expect(addedObject.text).toBe('Hello World');
            expect(addedObject.fontSize).toBe(24);
            expect(addedObject.fontFamily).toBe('Arial');
        });

        it('should handle dynamic text replacement', async () => {
            const elements = [
                {
                    id: '1',
                    name: 'Title',
                    type: 'text' as const,
                    x: 10,
                    y: 10,
                    width: 200,
                    height: 50,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    zIndex: 0,
                    text: '{{title}}',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontStyle: 'normal' as const,
                    fill: '#000000',
                    align: 'left' as const,
                    verticalAlign: 'top' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textDecoration: '' as const,
                    isDynamic: true,
                    dynamicField: 'title',
                }
            ];

            const config: RenderConfig = { width: 800, height: 600 };
            const rowData = { title_col: 'Dynamic Title' };
            const fieldMapping: FieldMapping = { title: 'title_col' };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await renderTemplate(mockCanvas as any, elements, config, rowData, fieldMapping);

            expect(mockCanvas.add).toHaveBeenCalledTimes(1);
            const addedObject = mockCanvas.add.mock.calls[0][0];
            expect(addedObject.text).toBe('Dynamic Title');
        });

        it('should skip invisible elements', async () => {
            const elements = [
                {
                    id: '1',
                    name: 'Hidden',
                    type: 'text' as const,
                    x: 10,
                    y: 10,
                    width: 200,
                    height: 50,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: false, // Hidden
                    zIndex: 0,
                    text: 'Hidden Text',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontStyle: 'normal' as const,
                    fill: '#000000',
                    align: 'left' as const,
                    verticalAlign: 'top' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textDecoration: '' as const,
                    isDynamic: false,
                }
            ];

            const config: RenderConfig = { width: 800, height: 600 };

            await renderTemplate(mockCanvas, elements, config);

            expect(mockCanvas.add).not.toHaveBeenCalled();
        });

        it('should render shape elements correctly', async () => {
            const elements = [
                {
                    id: '1',
                    name: 'Rectangle',
                    type: 'shape' as const,
                    shapeType: 'rect' as const,
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    zIndex: 0,
                    fill: '#ff0000',
                    stroke: '#000000',
                    strokeWidth: 2,
                    cornerRadius: 10,
                }
            ];

            const config: RenderConfig = { width: 800, height: 600 };

            await renderTemplate(mockCanvas, elements, config);

            expect(mockCanvas.add).toHaveBeenCalledTimes(1);
            const addedObject = mockCanvas.add.mock.calls[0][0];
            expect(addedObject.type).toBe('rect');
            expect(addedObject.fill).toBe('#ff0000');
        });

        it('should sort elements by zIndex', async () => {
            const elements = [
                {
                    id: '2',
                    name: 'Top',
                    type: 'text' as const,
                    x: 10,
                    y: 10,
                    width: 200,
                    height: 50,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    zIndex: 2, // Higher zIndex
                    text: 'Top Layer',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontStyle: 'normal' as const,
                    fill: '#000000',
                    align: 'left' as const,
                    verticalAlign: 'top' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textDecoration: '' as const,
                    isDynamic: false,
                },
                {
                    id: '1',
                    name: 'Bottom',
                    type: 'text' as const,
                    x: 10,
                    y: 10,
                    width: 200,
                    height: 50,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    zIndex: 1, // Lower zIndex
                    text: 'Bottom Layer',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontStyle: 'normal' as const,
                    fill: '#000000',
                    align: 'left' as const,
                    verticalAlign: 'top' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textDecoration: '' as const,
                    isDynamic: false,
                }
            ];

            const config: RenderConfig = { width: 800, height: 600 };

            await renderTemplate(mockCanvas, elements, config);

            expect(mockCanvas.add).toHaveBeenCalledTimes(2);
            // First called element should be the one with lower zIndex
            expect(mockCanvas.add.mock.calls[0][0].text).toBe('Bottom Layer');
            expect(mockCanvas.add.mock.calls[1][0].text).toBe('Top Layer');
        });
    });
});
