/**
 * API Route: Analyze uploaded video for game breakdown
 * Uses Claude Vision API to extract shot data from video frames
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      );
    }

    // Fetch video and convert to base64 frames
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Video = btoa(binary);

    // Analyze video with Claude Vision
    const analysisResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'video/mp4',
                data: base64Video,
              },
            },
            {
              type: 'text',
              text: `Analyze this pickleball game video and provide a detailed breakdown:

1. Count the shots: How many dinks, drives, drops, lobs, volleys, smashes, and serves?
2. Player technique: Rate the footwork, positioning, and consistency (1-100)
3. Game style: Is it aggressive (drives/smashes) or defensive (dinks/drops)?
4. Key observations: What are 3-5 key insights about the player's game?

Respond in JSON format:
{
  "shotCounts": {
    "dinks": number,
    "drives": number,
    "drops": number,
    "lobs": number,
    "volleys": number,
    "smashes": number,
    "serves": number
  },
  "technique": {
    "footwork": 1-100,
    "positioning": 1-100,
    "consistency": 1-100
  },
  "gameStyle": "aggressive|defensive|balanced",
  "insights": ["insight1", "insight2", "insight3"],
  "totalShots": number
}`
            }
          ],
        }
      ],
    });

    const content = analysisResponse.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    const analysis = JSON.parse(content.text);

    return NextResponse.json({
      success: true,
      analysis: {
        shotCounts: analysis.shotCounts,
        technique: analysis.technique,
        gameStyle: analysis.gameStyle,
        insights: analysis.insights,
        totalShots: analysis.totalShots,
      },
    });
  } catch (error) {
    console.error('Video analysis error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
