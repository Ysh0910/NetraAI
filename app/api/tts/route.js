/**
 * API Route: /api/tts
 * Receives text, forwards to netra-comms TTS service, returns audio URL
 */

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return Response.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Forward to netra-comms TTS service
    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('return_url', 'true');

    const ttsResponse = await fetch('http://localhost:3002/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[TTS] Comms service error:', errorText);
      return Response.json(
        { error: 'TTS service failed', details: errorText },
        { status: 502 }
      );
    }

    const result = await ttsResponse.json();
    
    // Convert relative URL to absolute
    const audioUrl = result.audio_url 
      ? `http://localhost:3002${result.audio_url}`
      : null;

    return Response.json({
      success: true,
      audioUrl: audioUrl,
      text: result.text,
      filename: result.filename,
    });

  } catch (error) {
    console.error('[TTS] API route error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
