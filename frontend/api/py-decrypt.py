#!/usr/bin/env python3
"""
Excel OLE2 복호화 도구
- Vercel: Python 서버리스 함수 (BaseHTTPRequestHandler)
- Local:  CLI 모드 (Next.js API route에서 execSync로 호출)
"""
import json
import io
import base64
import msoffcrypto

def decrypt_bytes(file_data: bytes, password: str) -> dict:
    """핵심 복호화 로직 — Vercel/CLI 공통"""
    try:
        input_stream = io.BytesIO(file_data)
        output_stream = io.BytesIO()
        office_file = msoffcrypto.OfficeFile(input_stream)

        if not office_file.is_encrypted():
            return {"success": True, "data": base64.b64encode(file_data).decode(), "encrypted": False}

        office_file.load_key(password=password)
        office_file.decrypt(output_stream)

        decrypted_data = output_stream.getvalue()
        return {"success": True, "data": base64.b64encode(decrypted_data).decode(), "encrypted": True}

    except (msoffcrypto.exceptions.DecryptionError, msoffcrypto.exceptions.InvalidKeyError):
        return {"error": "비밀번호가 올바르지 않습니다. 파일명에 포함된 비밀번호를 확인하세요."}
    except msoffcrypto.exceptions.FileFormatError as e:
        return {"error": f"지원하지 않는 파일 형식입니다: {str(e)[:200]}"}
    except Exception as e:
        return {"error": f"비밀번호 해제 실패: {str(e)[:300]}"}


# ═══════════════════════════════════════════
# Vercel Python Serverless Function Mode
# ═══════════════════════════════════════════
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 20 * 1024 * 1024:
                self.send_json(413, {"error": "파일이 너무 큽니다. (최대 20MB)"})
                return

            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_json(400, {"error": "JSON 형식이 필요합니다."})
                return

            file_b64 = data.get("file")
            password = data.get("password")

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

            result = decrypt_bytes(file_data, password)
            self.send_json(200, result)

        except Exception as e:
            self.send_json(500, {"error": f"서버 오류: {str(e)[:300]}"})

    def send_json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()


# ═══════════════════════════════════════════
# CLI Mode (for local Next.js API route via execSync)
# ═══════════════════════════════════════════
if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Excel OLE2 복호화")
    parser.add_argument("--input", required=True, help="입력 파일 경로")
    parser.add_argument("--password", required=True, help="비밀번호")
    args = parser.parse_args()

    try:
        with open(args.input, "rb") as f:
            file_data = f.read()

        result = decrypt_bytes(file_data, args.password)

        sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
        sys.stdout.flush()

        if not result.get("success"):
            sys.exit(1)
    except Exception as e:
        import traceback
        err = {"error": f"CLI 오류: {str(e)[:300]}"}
        sys.stdout.write(json.dumps(err, ensure_ascii=False) + "\n")
        sys.stdout.flush()
        sys.exit(1)
