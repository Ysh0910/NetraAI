/**
 * API Route: /api/ai-response
 * Receives processed AI response from netra-comms (text + audio URL)
 * and stores it in Zustand for UI display.
 */

import { NextResponse } from "next/server";

// Store for AI responses (in-memory, shared across requests)
// In production, use Redis or similar
const aiResponseStore = {
  lastResponse: null,
  listeners: [],
  responseCount: 0,
  
  setResponse(response) {
    this.responseCount++;
    this.lastResponse = {
      ...response,
      _storeId: this.responseCount, // Unique ID for debugging
      _storedAt: Date.now()
    };
    console.log('[STORE] Response stored:', this.responseCount, response.decision?.substring(0, 30));
    // Notify all listeners (Server-Sent Events)
    this.listeners.forEach(listener => listener(this.lastResponse));
  },
  
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  getLastResponse() {
    return this.lastResponse;
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    
    const { decision, audio_url, timestamp, context } = body;
    
    if (!decision || !audio_url) {
      return NextResponse.json(
        { error: "Missing decision or audio_url" },
        { status: 400 }
      );
    }
    
    // Store the response
    const responseData = {
      decision,
      audioUrl: audio_url,
      timestamp: timestamp || Date.now(),
      context: context || {},
      receivedAt: Date.now()
    };
    
    aiResponseStore.setResponse(responseData);
    
    console.log("[AI-RESPONSE] Received from netra-comms:", {
      decision: decision.substring(0, 50) + "...",
      audioUrl: audio_url
    });
    
    return NextResponse.json({
      success: true,
      received: true
    });
    
  } catch (error) {
    console.error("[AI-RESPONSE] Error:", error);
    return NextResponse.json(
      { error: "Invalid request", message: error.message },
      { status: 400 }
    );
  }
}

// GET endpoint for polling (optional fallback)
export async function GET(request) {
  const lastResponse = aiResponseStore.getLastResponse();
  
  console.log('[API GET] Poll request, has response:', !!lastResponse, 'id:', lastResponse?._storeId);
  
  if (!lastResponse) {
    return NextResponse.json(
      { success: false, message: "No response yet" },
      { status: 404 }
    );
  }
  
  // Force no caching
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  
  return NextResponse.json({
    success: true,
    response: lastResponse
  }, { headers });
}

// Export for use by other server components
export { aiResponseStore };
