import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SERIAL_PORT = os.environ.get('SERIAL_PORT') or 'COM3'
    SERIAL_BAUDRATE = 9600