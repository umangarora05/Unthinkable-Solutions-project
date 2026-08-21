import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get("apiKey");
    const provider = formData.get("provider") || "openai";
    const model = formData.get("model");
    if (apiKey) formData.delete("apiKey");
    formData.delete("provider");
    if (model) formData.delete("model");
    const response = await fetch(`${process.env.FASTAPI_URL || "http://127.0.0.1:8001"}/process-audio`, {
      method: "POST",
      body: formData,
      headers: { ...(apiKey ? { "x-ai-api-key": apiKey } : {}), ...(model ? { "x-ai-model": model } : {}), "x-ai-provider": provider },
    });
    const body = await response.json();
    return NextResponse.json(response.ok ? body : { error: body.detail || body.error || "FastAPI processing failed." }, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: `FastAPI service unavailable: ${error.message}` }, { status: 503 });
  }
}