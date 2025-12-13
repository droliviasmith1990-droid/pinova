import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
    // Mock templates
    const templates = Array.from({ length: 8 }).map((_, i) => ({
        id: `template-${i}`,
        title: `Pinterest Template ${i + 1}`,
        category: ['Fashion', 'Food', 'Travel'][i % 3],
    }));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
                    <p className="text-gray-500 mt-1">Start with a professionally designed template.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <Link href="/editor" className="group flex flex-col gap-3 cursor-pointer">
                    <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Blank Canvas</span>
                    </div>
                </Link>

                {templates.map((template) => (
                    <div key={template.id} className="group flex flex-col gap-3 cursor-pointer">
                        <div className="aspect-[3/4] rounded-xl bg-gray-200 relative overflow-hidden group-hover:shadow-lg transition-all duration-300">
                            {/* Placeholder for template preview */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-300"></div>

                            <Link href={`/editor?template=${template.id}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                <span className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg">Use Template</span>
                            </Link>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">{template.title}</h3>
                            <p className="text-xs text-gray-500">{template.category}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
