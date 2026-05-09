/**
 * API Route: /api/voice
 * Sends voice command (unit + message) to simulation server
 */

export async function POST(request) {
  try {
    const { unit, message } = await request.json();

    if (!unit || !message) {
      return Response.json(
        { error: 'Missing unit or message' },
        { status: 400 }
      );
    }

    // Forward to simulation server HTTP endpoint
    const response = await fetch('http://localhost:3001/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unit,
        message,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VOICE] Simulation server error:', errorText);
      return Response.json(
        { error: 'Simulation server failed', details: errorText },
        { status: 502 }
      );
    }

    const result = await response.json();
    
    return Response.json({
      success: true,
      queued: result.queued,
      unit,
      message,
    });

  } catch (error) {
    console.error('[VOICE] API route error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
