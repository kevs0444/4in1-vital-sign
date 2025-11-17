from app.routes.main_routes import main_bp
from app.routes.sensor_routes import sensor_bp
from app.routes.register_routes import register_bp

# Export all blueprints
__all__ = ['main_bp', 'sensor_bp', 'register_bp']