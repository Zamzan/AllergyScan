import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.realpath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Error: {e}")
