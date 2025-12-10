"use client";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "purple" | "green" | "yellow" | "rose";
  onClick?: () => void;
}

export default function StatsCard({
  icon,
  label,
  value,
  subtitle,
  color = "blue",
  onClick,
}: StatsCardProps) {
  const colorClasses = {
    blue: "from-blue-400 to-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    purple: "from-purple-400 to-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    green: "from-green-400 to-green-600 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    yellow: "from-yellow-400 to-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    rose: "from-rose-400 to-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-700 rounded-xl shadow-md p-6 
        transition-all duration-200 hover:shadow-lg
        ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}
        border border-gray-100 dark:border-slate-600
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`
            w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]}
            flex items-center justify-center text-2xl shadow-md
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

