import React from 'react';

const ProgressBar = ({ progress, total, completed }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  let barColor = 'bg-blue-500';
  if (percentage >= 80) {
    barColor = 'bg-green-500';
  } else if (percentage >= 50) {
    barColor = 'bg-yellow-500';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span className="font-medium">进度</span>
        <span>{completed}/{total} 任务</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right text-sm text-gray-500 mt-1">
        {percentage}%
      </div>
    </div>
  );
};

export default ProgressBar;
