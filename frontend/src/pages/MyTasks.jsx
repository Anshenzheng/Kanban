import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { taskApi, projectApi } from '../services/api';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  Search,
  Filter,
  FolderKanban,
} from 'lucide-react';

const MyTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        taskApi.getMyTasks(),
        projectApi.getAll(),
      ]);
      setTasks(tasksRes.data.tasks);
      setProjects(projectsRes.data.projects);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesProject = !selectedProject || task.project_id === parseInt(selectedProject);
    const matchesStatus = !selectedStatus || task.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const statusConfig = {
    todo: { label: '待办', icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
    in_progress: { label: '进行中', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    done: { label: '已完成', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  };

  const priorityConfig = {
    low: { label: '低', color: 'text-green-600', bg: 'bg-green-100' },
    medium: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    high: { label: '高', color: 'text-red-600', bg: 'bg-red-100' },
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">我的任务</h1>
        <p className="text-gray-500 mt-1">查看您分配的所有任务</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500 mt-1">全部任务</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-500">{stats.todo}</div>
          <div className="text-sm text-gray-500 mt-1">待办</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-600">{stats.in_progress}</div>
          <div className="text-sm text-gray-500 mt-1">进行中</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
          <div className="text-sm text-gray-500 mt-1">已完成</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索任务..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">全部项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">全部状态</option>
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无任务</h3>
            <p className="text-gray-500">
              {searchTerm || selectedProject || selectedStatus
                ? '没有找到匹配的任务，请调整筛选条件'
                : '您还没有被分配任何任务'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTasks.map((task) => {
              const status = statusConfig[task.status];
              const StatusIcon = status.icon;
              const priority = priorityConfig[task.priority];

              return (
                <div
                  key={task.id}
                  className="p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${status.bg} ${status.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <FolderKanban className="w-4 h-4" />
                            <span>{task.project_name || '未知项目'}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${priority.bg} ${priority.color}`}>
                            <Flag className="w-3 h-3" />
                            {priority.label}优先级
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        创建于 {new Date(task.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;
