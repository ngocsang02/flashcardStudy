import { NextRequest, NextResponse } from "next/server";
import { translateToVietnamese } from "@/lib/translate";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim();
  if (!word) {
    return NextResponse.json({ translatedText: "" });
  }

  const translatedText = await translateToVietnamese(word);
  return NextResponse.json({ translatedText });
}
