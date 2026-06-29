from http.server import BaseHTTPRequestHandler
import json
import msoffcrypto
import io
import base64

class handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            
            if content_length > 20 * 1024 * 1024:
                self.send_json(413, {"error": "파일이 너무 큽니다. (최대 20MB)"})
                return

            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_json(400, {"error": "JSON 형식이 필요합니다."})
                return
            
            file_b64 = data.get('file')
            password = data.get('password')
            
            if not file_b64:
                self.send_json(400, {"error": "파일이 제공되지 않았습니다."})
                return
            
            if not password:
                self.send_json(400, {"error": "비밀번호가 제공되지 않았습니다."})
                return
            
            try:
                file_data = base64.b64decode(file_b64)
            except Exception:
                self.send_json(400, {"error": "파일 디코딩 실패"})
                return
            
            input_file = io.BytesIO(file_data)
            output_file = io.BytesIO()
            
            try:
                office_file = msoffcrypto.OfficeFile(input_file)
                
                if not office_file.is_encrypted():
                    self.send_json(200, {
                        "success": True,
                        "data": base64.b64encode(file_data).decode(),
                        "encrypted": False
                    })
                    return
                
                office_file.load_key(password=password)
                office_file.decrypt(output_file)
                
                decrypted_data = output_file.getvalue()
                self.send_json(200, {
                    "success": True,
                    "data": base64.b64encode(decrypted_data).decode(),
                    "encrypted": True
                })
                
            except msoffcrypto.exceptions.InvalidPasswordError:
                self.send_json(400, {"error": "비밀번호가 올바르지 않습니다. 파일명에 포함된 비밀번호를 확인하세요."})
                
            except Exception as e:
                self.send_json(400, {"error": f"비밀번호 해제 실패: {str(e)[:300]}"})
        
        except Exception as e:
            self.send_json(500, {"error": f"서버 오류: {str(e)[:300]}"})
    
    def send_json(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()
