/**
 * API Route: /api/stt
 * Receives audio blob from frontend, forwards to netra-comms STT service
 */

export async function POST(request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return Response.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Forward to netra-comms STT service
    const commsFormData = new FormData();
    commsFormData.append('audio', audioFile);

    const sttResponse = await fetch('http://localhost:3002/stt', {
      method: 'POST',
      body: commsFormData,
    });

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('[STT] Comms service error:', errorText);
      return Response.json(
        { error: 'STT service failed', details: errorText },
        { status: 502 }
      );
    }

    const result = await sttResponse.json();
    
    return Response.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
    });

  } catch (error) {
    console.error('[STT] API route error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
