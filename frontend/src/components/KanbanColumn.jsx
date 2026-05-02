import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

const KanbanColumn = ({ column, tasks, children, canAdd, onAddTask }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 rounded-xl ${
        column.color
      } ${isOver ? 'ring-2 ring-blue-400' : ''} transition-all duration-200`}
    >
      <div
        className={`px-4 py-3 rounded-t-xl ${column.headerColor} border-b border-gray-200`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${column.titleColor}`}>
              {column.title}
            </h3>
            <span className="px-2 py-0.5 bg-white bg-opacity-60 rounded-full text-xs font-medium text-gray-600">
              {tasks.length}
            </span>
          </div>
          {canAdd && (
            <button
              onClick={onAddTask}
              className="p-1 hover:bg-white hover:bg-opacity-60 rounded-lg transition-colors"
              title="添加任务"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 min-h-[200px] space-y-3">
        {children}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            拖拽任务到这里
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
