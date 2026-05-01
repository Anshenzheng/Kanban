import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { projectApi, userApi } from '../services/api';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import {
  Plus,
  FolderKanban,
  Users,
  Edit2,
  Trash2,
  MoreVertical,
  Search,
} from 'lucide-react';

const ProjectList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    member_ids: [],
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectApi.getAll(),
        userApi.getAll(),
      ]);
      setProjects(projectsRes.data.projects);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      manager_id: user.id.toString(),
      member_ids: [],
    });
    setShowModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      manager_id: project.manager_id.toString(),
      member_ids: project.members?.map((m) => m.id.toString()) || [],
    });
    setShowModal(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      try {
        await projectApi.delete(projectId);
        fetchData();
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await projectApi.update(editingProject.id, {
          ...formData,
          manager_id: parseInt(formData.manager_id),
          member_ids: formData.member_ids.map((id) => parseInt(id)),
        });
      } else {
        await projectApi.create({
          ...formData,
          manager_id: parseInt(formData.manager_id),
          member_ids: formData.member_ids.map((id) => parseInt(id)),
        });
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('保存失败，请重试');
    }
  };

  const handleMemberToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter((id) => id !== userId)
        : [...prev.member_ids, userId],
    }));
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      employee: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      admin: '管理员',
      manager: '负责人',
      employee: '员工',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[role]}`}>
        {labels[role]}
      </span>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">项目管理</h1>
          <p className="text-gray-500 mt-1">管理您参与的所有项目</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建项目
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索项目..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      负责人: {project.manager_name || '未知'}
                    </p>
                  </div>
                </div>
                {(isAdmin || project.manager_id === user.id) && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setDropdownOpen(dropdownOpen === project.id ? null : project.id)
                      }
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    {dropdownOpen === project.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            handleEditProject(project);
                            setDropdownOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              handleDeleteProject(project.id);
                              setDropdownOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{project.members?.length || 0} 成员</span>
                </div>
                <div className="text-sm text-gray-500">
                  {project.total_tasks || 0} 任务
                </div>
              </div>

              <ProgressBar
                progress={project.progress}
                total={project.total_tasks || 0}
                completed={project.completed_tasks || 0}
              />
            </div>

            <div
              className="bg-gray-50 px-5 py-3 border-t border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <span className="text-sm font-medium text-blue-600">
                查看看板 →
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无项目</h3>
          <p className="text-gray-500">
            {searchTerm
              ? '没有找到匹配的项目，请尝试其他关键词'
              : isAdmin
              ? '点击上方按钮创建您的第一个项目'
              : '您还没有参与任何项目'}
          </p>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProject ? '编辑项目' : '新建项目'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="请输入项目名称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={3}
              placeholder="请输入项目描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目负责人 *
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) =>
                setFormData({ ...formData, manager_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">请选择负责人</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目成员
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.member_ids.includes(u.id.toString())}
                    onChange={() => handleMemberToggle(u.id.toString())}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">
                      {u.username}
                    </span>
                  </div>
                  {getRoleBadge(u.role)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              {editingProject ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectList;
