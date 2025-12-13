// NOTE: GenerationController Resume Integration
// 
// The GenerationController component needs manual integration due to file complexity.
// The generationStore is ready to use. Follow these steps:
//
// 1. Add import at top of file:
//    import { useCampaignGeneration } from '@/stores/generationStore';
//    import { RefreshCw } from 'lucide-react';
//
// 2. Add hook after component start (line ~52):
//    const { state: savedState, canResume, save: saveProgress, clear: clearProgress, isStale } = useCampaignGeneration(campaignId);
//
// 3. In the pin generation success handler (around line 124-130), add:
//    saveProgress({
//        campaignId,
//        lastCompletedIndex: pin.rowIndex,
//        totalPins: csvData.length,
//        status: 'processing'
//    });
//
// 4. Add Resume UI button before the existing "Start Generation" button (around line 260):
//    {canResume && !isStale && (
//        <div className="flex items-center gap-3 w-full mb-3">
//            <button
//                onClick={() => {
//                    startGeneration(savedState!.lastCompletedIndex + 1);
//                    toast.info(`Resuming from pin ${savedState!.lastCompletedIndex + 1}`);
//                }}
//                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
//            >
//                <RefreshCw className="w-5 h-5" />
//                Resume from Pin {savedState!.lastCompletedIndex + 1}/{savedState!.totalPins}
//            </button>
//            <button
//                onClick={() => {
//                    clearProgress();
//                    toast.success('Cleared saved progress');
//                }}
//                className="px-4 py-3 text-sm text-gray-600 hover:text-gray-800 transition-colors"
//            >
//                Clear & Restart
//            </button>
//        </div>
//    )}
//
// This will enable the resume generation feature with localStorage persistence.
