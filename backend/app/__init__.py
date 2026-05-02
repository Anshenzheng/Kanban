from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kanban-secret-key-2026'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kanban.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_TYPE'] = 'filesystem'

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, supports_credentials=True, origins=['http://localhost:3000', 'http://localhost:3001'])

from app import models
from app import routes

def init_db():
    from app.models import User, Project, Task, ProjectMember
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            
            employee1 = User(username='employee1', role='employee')
            employee1.set_password('123456')
            db.session.add(employee1)
            
            employee2 = User(username='employee2', role='employee')
            employee2.set_password('123456')
            db.session.add(employee2)
            
            manager = User(username='manager1', role='manager')
            manager.set_password('123456')
            db.session.add(manager)
            
            db.session.commit()
            print('Database initialized with default users')
