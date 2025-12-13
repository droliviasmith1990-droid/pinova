import { MoreHorizontal, Calendar, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; // We might need to install date-fns or use native Intl

// Fallback if date-fns is not installed, simple formatter
const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        -Math.ceil((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)),
        'day'
    );
};

interface ProjectCardProps {
    id: string;
    title: string;
    thumbnailUrl?: string;
    updatedAt: Date;
}

export function ProjectCard({ id, title, thumbnailUrl, updatedAt }: ProjectCardProps) {
    return (
        <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300">
            {/* Thumbnail Area */}
            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                {thumbnailUrl ? (
                    <Image
                        src={thumbnailUrl}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        {/* Placeholder Pattern */}
                        <div className="opacity-10 w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Link href={`/editor?id=${id}`} className="bg-white text-black px-4 py-2 rounded-full font-medium text-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 shadow-lg">
                        Open Editor <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={title}>
                        {title}
                    </h3>
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>Edited {formatDate(updatedAt)}</span>
                </div>
            </div>
        </div>
    );
}
