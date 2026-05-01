import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { projectApi, taskApi, userApi } from '../services/api';
import KanbanBoard from '../components/KanbanBoard';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Users,
  Clock,
  AlertCircle,
} from 'lucide-react';

const KanbanPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState({ todo: [], in_progress: [], done: [] });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [initialStatus, setInitialStatus] = useState('todo');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee_id: '',
    status: 'todo',
  });

  const isManager = project?.manager_id === user?.id || user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectRes, usersRes] = await Promise.all([
        projectApi.getById(projectId),
        userApi.getAll(),
      ]);
      setProject(projectRes.data.project);
      setTasks(projectRes.data.tasks);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (status) => {
    setInitialStatus(status);
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      assignee_id: '',
      status: status,
    });
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee_id: task.assignee_id ? task.assignee_id.toString() : '',
      status: task.status,
    });
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await taskApi.update(editingTask.id, {
          ...taskForm,
          assignee_id: taskForm.assignee_id ? parseInt(taskForm.assignee_id) : null,
        });
      } else {
        await taskApi.create(projectId, {
          ...taskForm,
          assignee_id: taskForm.assignee_id ? parseInt(taskForm.assignee_id) : null,
        });
      }
      setShowTaskModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('确定要删除这个任务吗？')) {
      try {
        await taskApi.delete(taskId);
        setShowTaskModal(false);
        fetchData();
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const priorityOptions = [
    { value: 'low', label: '低优先级', color: 'text-green-600' },
    { value: 'medium', label: '中优先级', color: 'text-yellow-600' },
    { value: 'high', label: '高优先级', color: 'text-red-600' },
  ];

  const statusOptions = [
    { value: 'todo', label: '待办' },
    { value: 'in_progress', label: '进行中' },
    { value: 'done', label: '已完成' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">项目不存在</h3>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-700"
        >
          返回项目列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1">{project.description}</p>
          )}
        </div>
        {isManager && (
          <button
            onClick={() => handleAddTask('todo')}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建任务
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>负责人: {project.manager_name || '未知'}</span>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <ProgressBar
              progress={project.progress}
              total={project.total_tasks || 0}
              completed={project.completed_tasks || 0}
            />
          </div>
        </div>
      </div>

      <div className="min-h-[calc(100vh-300px)]">
        <KanbanBoard
          key={JSON.stringify(tasks)}
          initialTasks={tasks}
          project={project}
          currentUser={user}
          onTaskUpdated={fetchData}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
        />
      </div>

      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? '编辑任务' : '新建任务'}
      >
        <form onSubmit={handleSubmitTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务标题 *
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="请输入任务标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务描述
            </label>
            <textarea
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={3}
              placeholder="请输入任务描述"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                优先级
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              负责人
            </label>
            <select
              value={taskForm.assignee_id}
              onChange={(e) =>
                setTaskForm({ ...taskForm, assignee_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">未指派</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between pt-4">
            {editingTask && (
              <button
                type="button"
                onClick={() => handleDeleteTask(editingTask.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
            <div className={`flex gap-3 ${editingTask ? '' : 'ml-auto'}`}>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                {editingTask ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KanbanPage;
