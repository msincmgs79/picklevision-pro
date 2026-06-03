import { getBytes } from 'firebase/storage';
import { ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return Response.json({ success: false, error: 'No video URL provided' }, { status: 400 });
    }

    // Extract the storage path from the download URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlObj = new URL(videoUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.*?)$/);

    if (!pathMatch) {
      return Response.json({ success: false, error: 'Invalid video URL format' }, { status: 400 });
    }

    const encodedPath = pathMatch[1];
    const storagePath = decodeURIComponent(encodedPath);

    // Fetch video from Firebase Storage using admin SDK
    const videoRef = ref(storage, storagePath);
    const blob = await getBytes(videoRef);

    // Return as base64
    const base64 = Buffer.from(blob).toString('base64');

    return Response.json({
      success: true,
      data: base64,
      size: blob.length,
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
