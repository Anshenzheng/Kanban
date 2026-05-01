import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { taskApi } from '../services/api';

const KanbanBoard = ({
  initialTasks,
  project,
  currentUser,
  onTaskUpdated,
  onAddTask,
  onEditTask,
}) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState(null);

  const isManager = project.manager_id === currentUser.id || currentUser.role === 'admin';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id) => {
    if (id in tasks) {
      return id;
    }
    return Object.keys(tasks).find((key) =>
      tasks[key].some((task) => task.id === id)
    );
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const activeIndex = tasks[activeContainer].findIndex(
        (task) => task.id === active.id
      );
      const overIndex = tasks[overContainer].findIndex(
        (task) => task.id === over.id
      );

      if (activeIndex !== overIndex) {
        const newTasks = {
          ...tasks,
          [activeContainer]: arrayMove(
            tasks[activeContainer],
            activeIndex,
            overIndex
          ),
        };

        const updatedTasks = newTasks[activeContainer].map((task, index) => ({
          id: task.id,
          status: activeContainer,
          order_in_column: index,
        }));

        setTasks(newTasks);
        try {
          await taskApi.reorder(updatedTasks);
          if (onTaskUpdated) onTaskUpdated();
        } catch (error) {
          console.error('Failed to reorder tasks:', error);
        }
      }
    } else {
      const activeIndex = tasks[activeContainer].findIndex(
        (task) => task.id === active.id
      );
      const overIndex = tasks[overContainer].findIndex(
        (task) => task.id === over.id
      );

      const taskToMove = tasks[activeContainer][activeIndex];

      const newActiveTasks = [...tasks[activeContainer]];
      newActiveTasks.splice(activeIndex, 1);

      const newOverTasks = [...tasks[overContainer]];
      newOverTasks.splice(overIndex, 0, taskToMove);

      const newTasks = {
        ...tasks,
        [activeContainer]: newActiveTasks,
        [overContainer]: newOverTasks,
      };

      setTasks(newTasks);

      try {
        await taskApi.update(taskToMove.id, {
          status: overContainer,
          order_in_column: overIndex,
        });

        const updatedActiveTasks = newActiveTasks.map((task, index) => ({
          id: task.id,
          status: activeContainer,
          order_in_column: index,
        }));

        const updatedOverTasks = newOverTasks.map((task, index) => ({
          id: task.id,
          status: overContainer,
          order_in_column: index,
        }));

        await taskApi.reorder([...updatedActiveTasks, ...updatedOverTasks]);
        if (onTaskUpdated) onTaskUpdated();
      } catch (error) {
        console.error('Failed to move task:', error);
        setTasks(initialTasks);
      }
    }
  };

  const activeTask = activeId
    ? Object.values(tasks)
        .flat()
        .find((task) => task.id === activeId)
    : null;

  const columns = [
    {
      id: 'todo',
      title: '待办',
      color: 'bg-gray-100',
      headerColor: 'bg-gray-200',
      titleColor: 'text-gray-700',
    },
    {
      id: 'in_progress',
      title: '进行中',
      color: 'bg-blue-50',
      headerColor: 'bg-blue-100',
      titleColor: 'text-blue-700',
    },
    {
      id: 'done',
      title: '已完成',
      color: 'bg-green-50',
      headerColor: 'bg-green-100',
      titleColor: 'text-green-700',
    },
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <SortableContext
            key={column.id}
            items={tasks[column.id]?.map((t) => t.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              column={column}
              tasks={tasks[column.id] || []}
              canAdd={isManager}
              onAddTask={() => onAddTask(column.id)}
            >
              {tasks[column.id]?.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canEdit={isManager}
                  onEdit={onEditTask}
                />
              ))}
            </KanbanColumn>
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 scale-105 cursor-grabbing">
            <TaskCard task={activeTask} canEdit={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
