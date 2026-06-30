import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file: fileB64, password } = body;

    if (!fileB64) {
      return NextResponse.json({ error: "파일이 제공되지 않았습니다." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "비밀번호가 제공되지 않았습니다." }, { status: 400 });
    }

    // Decode base64 and write to temp file
    const fileData = Buffer.from(fileB64, "base64");
    const tmpDir = "/tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpInput = path.join(tmpDir, `decrypt_input_${Date.now()}.xlsx`);
    fs.writeFileSync(tmpInput, fileData);

    const scriptPath = path.join(process.cwd(), "api", "py-decrypt.py");

    try {
      const cmd = `~/.pyenv/versions/3.12.7/bin/python "${scriptPath}" --input "${tmpInput}" --password "${password}"`;
      const stdout = execSync(cmd, {
        timeout: 30000,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
      });

      const result = JSON.parse(stdout);

      // Cleanup temp file
      try { fs.unlinkSync(tmpInput); } catch {}

      return NextResponse.json(result);
    } catch (execErr: any) {
      // Cleanup temp file
      try { fs.unlinkSync(tmpInput); } catch {}

      const stderr = (execErr.stderr || "").toString();
      const stdout = (execErr.stdout || "").toString();
      const code = execErr.status ?? "?";
      const signal = execErr.signal ?? "?";
      console.error(
        "[py-decrypt] execSync failed. code:", code, "signal:", signal,
        "stderr:", stderr.slice(0, 1000),
        "stdout:", stdout.slice(0, 1000),
      );

      // Try to parse stdout as JSON error
      try {
        const errData = JSON.parse(stdout || stderr || "{}");
        return NextResponse.json(errData, { status: 400 });
      } catch {
        const detail = execErr.message?.slice(0, 500) || "알 수 없는 오류";
        return NextResponse.json({
          error: `복호화 실패: ${detail}`,
          debug: { code, signal, stderr: stderr.slice(0, 300), stdout: stdout.slice(0, 100) },
        }, { status: 400 });
      }
    }
  } catch (err: any) {
    console.error("[py-decrypt] Error:", err);
    return NextResponse.json({ error: err.message?.slice(0, 300) || "서버 오류" }, { status: 500 });
  }
}
