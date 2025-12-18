from app.routes.main_routes import main_bp
from app.routes.sensor_routes import sensor_bp
from app.routes.register_routes import register_bp
from app.routes.admin_routes import admin_bp

def register_routes(app):
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(sensor_bp, url_prefix='/api/sensor')
    app.register_blueprint(register_bp, url_prefix='/api/register')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

# Export all blueprints
__all__ = ['main_bp', 'sensor_bp', 'register_bp', 'admin_bp']