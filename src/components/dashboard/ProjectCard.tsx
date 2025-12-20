import { cn } from "@/lib/utils";
import { DashboardProject } from "@/lib/db/dashboard";

const PROJECT_VARIANTS: Record<string, any> = {
  blue: {
    overlay: "bg-gradient-to-br from-blue-300/30 to-blue-500/30 dark:from-blue-600/30 dark:to-blue-800/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconText: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    barBg: "bg-blue-500",
    statusText: "text-blue-600 dark:text-blue-400"
  },
  purple: {
    overlay: "bg-gradient-to-br from-purple-300/30 to-purple-500/30 dark:from-purple-600/30 dark:to-purple-800/30",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconText: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-100 dark:bg-purple-900/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    barBg: "bg-purple-500",
    statusText: "text-purple-600 dark:text-purple-400"
  },
  orange: {
    overlay: "bg-gradient-to-br from-orange-300/30 to-orange-500/30 dark:from-orange-600/30 dark:to-orange-800/30",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconText: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-700 dark:text-orange-300",
    barBg: "bg-orange-500",
    statusText: "text-orange-600 dark:text-orange-400"
  },
  green: {
    overlay: "bg-gradient-to-br from-green-300/30 to-green-500/30 dark:from-green-600/30 dark:to-green-800/30",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconText: "text-green-600 dark:text-green-400",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    badgeText: "text-green-700 dark:text-green-300",
    barBg: "bg-green-500",
    statusText: "text-green-600 dark:text-green-400"
  },
  gray: {
    overlay: "bg-gradient-to-br from-gray-300/30 to-gray-500/30 dark:from-gray-600/30 dark:to-gray-800/30",
    iconBg: "bg-gray-100 dark:bg-gray-900/30",
    iconText: "text-gray-600 dark:text-gray-400",
    badgeBg: "bg-gray-100 dark:bg-gray-900/40",
    badgeText: "text-gray-700 dark:text-gray-300",
    barBg: "bg-gray-500",
    statusText: "text-gray-600 dark:text-gray-400"
  }
};

interface ProjectCardProps {
  project: DashboardProject;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusConfig: Record<string, { text: string, icon: string }> = {
    completed: { text: "Completed", icon: "check_circle" },
    in_progress: { text: "In Progress", icon: "play_arrow" },
    pending: { text: "Pending", icon: "pause" },
    paused: { text: "Paused", icon: "error" },
    failed: { text: "Failed", icon: "warning" },
    draft: { text: "Draft", icon: "edit_document" }
  };

  const statusInfo = statusConfig[project.status] || { text: project.status, icon: "info" };
  const styles = PROJECT_VARIANTS[project.color] || PROJECT_VARIANTS['gray'];

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-creative-md relative overflow-hidden group hover:shadow-creative-lg transition-all duration-300">
      <div className={cn(
          "absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity",
           styles.overlay
      )}></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                styles.iconBg, styles.iconText
            )}>
              <span className="material-symbols-outlined text-3xl">{project.icon}</span>
            </div>
            <div>
              <h4 className="text-lg font-heading font-bold text-gray-900 dark:text-white">{project.name}</h4>
              <p className={cn("text-sm flex items-center mt-1", styles.statusText)}>
                <span className="material-symbols-outlined text-base mr-1">{statusInfo.icon}</span> {statusInfo.text}
              </p>
            </div>
          </div>
          <span className={cn(
              "text-sm font-heading font-bold px-3 py-1 rounded-md",
              styles.badgeBg, styles.badgeText
          )}>{project.progress}%</span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
          <div className={cn("h-2 rounded-full", styles.barBg)} style={{ width: `${project.progress}%` }}></div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="font-body"><strong className="text-gray-900 dark:text-gray-200">{project.generated_pins}</strong> of {project.total_pins} pins</span>
          <span className="material-symbols-outlined text-lg cursor-pointer hover:text-primary-creative dark:hover:text-accent-1 transition-colors">arrow_right_alt</span>
        </div>
      </div>
    </div>
  );
}
