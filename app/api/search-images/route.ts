import { NextRequest, NextResponse } from "next/server";

async function fetchFromUnsplash(word: string): Promise<string[]> {
  const unsplashAccessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!unsplashAccessKey) {
    throw new Error("Missing NEXT_PUBLIC_UNSPLASH_ACCESS_KEY");
  }

  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(word)}&per_page=8&client_id=${unsplashAccessKey}`;
  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    results?: Array<{ urls?: { small?: string } }>;
  };

  return (data.results ?? []).map((item) => item.urls?.small).filter(Boolean) as string[];
}

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim();
  if (!word) {
    return NextResponse.json({ error: "Word is required.", images: [] }, { status: 400 });
  }

  try {
    const unsplashImages = await fetchFromUnsplash(word);
    if (unsplashImages.length > 0) {
      return NextResponse.json({ images: unsplashImages, provider: "unsplash" });
    }

    return NextResponse.json({ error: "No images found from Unsplash.", images: [] }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot fetch Unsplash images.";
    return NextResponse.json({ error: message, images: [] }, { status: 500 });
  }
}
