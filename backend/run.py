from app import create_app

app = create_app()

if __name__ == "__main__":
    # Run Flask on all interfaces (0.0.0.0) so it can be accessed from other devices
    # Port 5000, debug mode enabled for development
    app.run(host="0.0.0.0", port=5000, debug=True)
