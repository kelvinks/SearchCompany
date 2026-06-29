import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 제공되지 않았습니다." }, { status: 400 });
    }

    const rawExt = file.name.split(".").pop() || "xlsx";
    const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "xlsx";
    const fileName = `excel-uploads/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error("[BlobUpload] Error:", err);
    return NextResponse.json({ error: err.message || "업로드 실패" }, { status: 500 });
  }
}
