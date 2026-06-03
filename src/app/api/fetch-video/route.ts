export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return Response.json({ success: false, error: 'No video URL provided' }, { status: 400 });
    }

    // Fetch video from Firebase Storage URL directly on server (no CORS issues)
    console.log('📥 Fetching video from Firebase Storage URL:', videoUrl);

    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: { 'Accept': 'video/*' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: HTTP ${response.status} ${response.statusText}`);
    }

    // Get video data as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to base64
    const base64 = buffer.toString('base64');

    console.log('✅ Video fetched successfully:', buffer.length, 'bytes');

    return Response.json({
      success: true,
      data: base64,
      size: buffer.length,
    });
  } catch (error) {
    console.error('❌ Error fetching video:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
