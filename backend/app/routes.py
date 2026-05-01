from flask import request, jsonify, session
from app import app, db
from app.models import User, Project, Task, ProjectMember
from functools import wraps
from datetime import datetime

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': '请先登录'}), 401
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated_function

def project_manager_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': '请先登录'}), 401
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        project_id = kwargs.get('project_id') or request.json.get('project_id')
        if project_id:
            project = Project.query.get(project_id)
            if not project:
                return jsonify({'error': '项目不存在'}), 404
            if user.role != 'admin' and project.manager_id != user_id:
                return jsonify({'error': '需要项目负责人权限'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'employee')
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400
    
    user = User(username=username, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': '注册成功', 'user': user.to_dict()}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': '用户名或密码错误'}), 401
    
    session['user_id'] = user.id
    
    return jsonify({'message': '登录成功', 'user': user.to_dict()})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': '退出成功'})

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    user = User.query.get(session['user_id'])
    return jsonify({'user': user.to_dict()})

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    users = User.query.all()
    return jsonify({'users': [u.to_dict() for u in users]})

@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    if user.role == 'admin':
        projects = Project.query.all()
    else:
        managed_projects = Project.query.filter_by(manager_id=user_id).all()
        member_projects = db.session.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id
        ).all()
        projects = list(set(managed_projects + member_projects))
    
    result = []
    for project in projects:
        tasks = Task.query.filter_by(project_id=project.id).all()
        total = len(tasks)
        completed = len([t for t in tasks if t.status == 'done'])
        progress = (completed / total * 100) if total > 0 else 0
        
        project_dict = project.to_dict()
        project_dict['progress'] = progress
        project_dict['total_tasks'] = total
        project_dict['completed_tasks'] = completed
        project_dict['manager_name'] = project.manager.username if project.manager else None
        
        members = [pm.user.to_dict() for pm in project.members]
        project_dict['members'] = members
        
        result.append(project_dict)
    
    return jsonify({'projects': result})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    user_id = session['user_id']
    project = Project.query.get_or_404(project_id)
    
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        is_manager = project.manager_id == user_id
        is_member = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
        if not is_manager and not is_member:
            return jsonify({'error': '无权访问此项目'}), 403
    
    tasks = Task.query.filter_by(project_id=project_id).all()
    total = len(tasks)
    completed = len([t for t in tasks if t.status == 'done'])
    progress = (completed / total * 100) if total > 0 else 0
    
    project_dict = project.to_dict()
    project_dict['progress'] = progress
    project_dict['total_tasks'] = total
    project_dict['completed_tasks'] = completed
    project_dict['manager_name'] = project.manager.username if project.manager else None
    
    members = [pm.user.to_dict() for pm in project.members]
    project_dict['members'] = members
    
    tasks_by_status = {
        'todo': [],
        'in_progress': [],
        'done': []
    }
    
    for task in tasks:
        tasks_by_status[task.status].append(task.to_dict())
    
    return jsonify({'project': project_dict, 'tasks': tasks_by_status})

@app.route('/api/projects', methods=['POST'])
@admin_required
def create_project():
    data = request.json
    name = data.get('name')
    description = data.get('description', '')
    manager_id = data.get('manager_id')
    member_ids = data.get('member_ids', [])
    
    if not name:
        return jsonify({'error': '项目名称不能为空'}), 400
    
    if manager_id:
        manager = User.query.get(manager_id)
        if not manager:
            return jsonify({'error': '指定的负责人不存在'}), 400
    else:
        manager_id = session['user_id']
    
    project = Project(
        name=name,
        description=description,
        manager_id=manager_id
    )
    db.session.add(project)
    db.session.commit()
    
    for member_id in member_ids:
        member = User.query.get(member_id)
        if member:
            pm = ProjectMember(project_id=project.id, user_id=member_id)
            db.session.add(pm)
    
    db.session.commit()
    
    return jsonify({'message': '项目创建成功', 'project': project.to_dict()}), 201

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@project_manager_required
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.json
    
    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'manager_id' in data:
        manager = User.query.get(data['manager_id'])
        if manager:
            project.manager_id = data['manager_id']
    if 'member_ids' in data:
        ProjectMember.query.filter_by(project_id=project_id).delete()
        for member_id in data['member_ids']:
            member = User.query.get(member_id)
            if member:
                pm = ProjectMember(project_id=project.id, user_id=member_id)
                db.session.add(pm)
    
    db.session.commit()
    
    return jsonify({'message': '项目更新成功', 'project': project.to_dict()})

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@admin_required
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    
    return jsonify({'message': '项目删除成功'})

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
@login_required
def get_tasks(project_id):
    user_id = session['user_id']
    project = Project.query.get_or_404(project_id)
    
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        is_manager = project.manager_id == user_id
        is_member = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
        if not is_manager and not is_member:
            return jsonify({'error': '无权访问此项目'}), 403
    
    tasks = Task.query.filter_by(project_id=project_id).order_by(Task.order_in_column).all()
    
    tasks_by_status = {
        'todo': [],
        'in_progress': [],
        'done': []
    }
    
    for task in tasks:
        tasks_by_status[task.status].append(task.to_dict())
    
    return jsonify({'tasks': tasks_by_status})

@app.route('/api/projects/<int:project_id>/tasks', methods=['POST'])
@project_manager_required
def create_task(project_id):
    data = request.json
    title = data.get('title')
    description = data.get('description', '')
    priority = data.get('priority', 'medium')
    assignee_id = data.get('assignee_id')
    status = data.get('status', 'todo')
    
    if not title:
        return jsonify({'error': '任务标题不能为空'}), 400
    
    max_order = db.session.query(db.func.max(Task.order_in_column)).filter(
        Task.project_id == project_id,
        Task.status == status
    ).scalar() or 0
    
    task = Task(
        title=title,
        description=description,
        priority=priority,
        status=status,
        project_id=project_id,
        assignee_id=assignee_id,
        created_by_id=session['user_id'],
        order_in_column=max_order + 1
    )
    db.session.add(task)
    db.session.commit()
    
    return jsonify({'message': '任务创建成功', 'task': task.to_dict()}), 201

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@login_required
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify({'task': task.to_dict()})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    user_id = session['user_id']
    task = Task.query.get_or_404(task_id)
    project = Project.query.get(task.project_id)
    user = User.query.get(user_id)
    
    is_manager = project.manager_id == user_id
    is_admin = user.role == 'admin'
    
    data = request.json
    
    if 'status' in data:
        task.status = data['status']
        if 'order_in_column' in data:
            task.order_in_column = data['order_in_column']
    else:
        if not is_manager and not is_admin:
            return jsonify({'error': '需要项目负责人权限才能编辑任务'}), 403
        
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'priority' in data:
            task.priority = data['priority']
        if 'assignee_id' in data:
            task.assignee_id = data['assignee_id']
        if 'status' in data:
            task.status = data['status']
        if 'order_in_column' in data:
            task.order_in_column = data['order_in_column']
    
    db.session.commit()
    
    return jsonify({'message': '任务更新成功', 'task': task.to_dict()})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@project_manager_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    
    return jsonify({'message': '任务删除成功'})

@app.route('/api/tasks/reorder', methods=['POST'])
@login_required
def reorder_tasks():
    user_id = session['user_id']
    data = request.json
    
    task_updates = data.get('tasks', [])
    
    for update in task_updates:
        task_id = update.get('id')
        status = update.get('status')
        order_in_column = update.get('order_in_column')
        
        if task_id and status is not None and order_in_column is not None:
            task = Task.query.get(task_id)
            if task:
                project = Project.query.get(task.project_id)
                user = User.query.get(user_id)
                
                is_manager = project.manager_id == user_id
                is_member = ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first()
                is_admin = user.role == 'admin'
                
                if is_manager or is_member or is_admin:
                    task.status = status
                    task.order_in_column = order_in_column
                    
                    db.session.commit()
    
    return jsonify({'message': '任务排序更新成功'})

@app.route('/api/tasks/my', methods=['GET'])
@login_required
def get_my_tasks():
    user_id = session['user_id']
    
    project_id_filter = request.args.get('project_id')
    
    query = Task.query.filter_by(assignee_id=user_id)
    
    if project_id_filter:
        query = query.filter_by(project_id=int(project_id_filter))
    
    tasks = query.order_by(Task.created_at.desc()).all()
    
    result = []
    for task in tasks:
        task_dict = task.to_dict()
        project = Project.query.get(task.project_id)
        task_dict['project_name'] = project.name if project else None
        result.append(task_dict)
    
    return jsonify({'tasks': result})
