#!/usr/bin/env python3
"""
Simple web server for Gon Voice Assistant
"""

import http.server
import socketserver
import os
import json
from datetime import datetime
from urllib.parse import urlparse

PORT = 3000


class GonVoiceHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        # Handle health check
        if path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'status': 'ok',
                'timestamp': datetime.now().isoformat(),
                'service': 'Gon Voice Assistant Web Server'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle root path
        if path == '/':
            path = '/index.html'
        
        # Try to serve the file
        try:
            file_path = os.path.join(os.getcwd(), 'public', path.lstrip('/'))
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                
                # Set content type based on file extension
                if file_path.endswith('.html'):
                    self.send_header('Content-type', 'text/html')
                elif file_path.endswith('.css'):
                    self.send_header('Content-type', 'text/css')
                elif file_path.endswith('.js'):
                    self.send_header('Content-type', 'application/javascript')
                elif file_path.endswith('.json'):
                    self.send_header('Content-type', 'application/json')
                else:
                    self.send_header('Content-type', 'text/plain')
                
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, 'File not found')
        except Exception as e:
            self.send_error(500, f'Server error: {str(e)}')


def main():
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Create server
    with socketserver.TCPServer(("", PORT), GonVoiceHandler) as httpd:
        print(f"🚀 Gon Voice Web Server running on http://localhost:{PORT}")
        print(f"📊 Health check: http://localhost:{PORT}/health")
        print(f"📁 Serving files from: {os.path.join(os.getcwd(), 'public')}")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")


if __name__ == "__main__":
    main()
