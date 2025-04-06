/**
 * Audio processing utilities for browser-based Twilio calls
 */

// Initialize audio context and related variables
let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let processorNode: ScriptProcessorNode | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;

/**
 * Start capturing microphone audio and process it for WebSocket transmission
 * @param webSocket The WebSocket connection to send audio data to
 * @param streamSid The Twilio Stream SID to include in messages
 * @returns Promise resolving to boolean indicating success
 */
export async function startCapturingMicrophone(
  webSocket: WebSocket | null,
  streamSid: string | null
): Promise<boolean> {
  if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
    console.error('Cannot start microphone capture: WebSocket not connected');
    return false;
  }
  
  try {
    // Request microphone access with optimized audio settings
    microphoneStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      }
    });
    
    console.log('Microphone access granted for audio streaming');
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create source from microphone stream
    microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
    
    // Create processor node for audio processing
    // Note: ScriptProcessorNode is deprecated but still widely supported
    // We use 4096 buffer size for better quality/latency balance
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    
    // Set up audio processing
    processorNode.onaudioprocess = (e) => {
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN || !streamSid) return;
      
      // Get input data from microphone
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level (RMS) to avoid sending silence
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      
      // Only send if audio level is above threshold
      if (rms > 0.005) {
        // Convert to 16-bit PCM format that Twilio expects
        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and convert float to int16
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
        
        // Convert to base64 for WebSocket transmission
        const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer) as unknown as number[]));
        
        // Send to WebSocket
        webSocket.send(JSON.stringify({
          event: 'browser_audio',
          payload: base64Audio
        }));
      }
    };
    
    // Connect the audio nodes
    microphoneSource.connect(processorNode);
    processorNode.connect(audioContext.destination);
    
    console.log('Microphone audio capture started successfully');
    return true;
  } catch (error) {
    console.error('Failed to start microphone capture:', error);
    stopCapturingMicrophone();
    return false;
  }
}

/**
 * Stop capturing microphone audio and clean up resources
 */
export function stopCapturingMicrophone(): void {
  try {
    // Disconnect audio processor
    if (processorNode) {
      processorNode.disconnect();
      processorNode = null;
    }
    
    // Disconnect microphone source
    if (microphoneSource) {
      microphoneSource.disconnect();
      microphoneSource = null;
    }
    
    // Stop all microphone tracks
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      microphoneStream = null;
    }
    
    // Close audio context
    if (audioContext) {
      if (audioContext.state !== 'closed') {
        audioContext.close().catch(err => {
          console.warn('Error closing audio context:', err);
        });
      }
      audioContext = null;
    }
    
    console.log('Microphone audio capture stopped');
  } catch (error) {
    console.error('Error stopping microphone capture:', error);
  }
}

/**
 * Play incoming audio from WebSocket
 * @param base64Audio Base64 encoded audio data
 */
export function playIncomingAudio(base64Audio: string): void {
  if (!audioContext) {
    console.warn('Cannot play audio: AudioContext not initialized');
    return;
  }
  
  try {
    // Convert base64 to array buffer
    const binary = atob(base64Audio);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Decode audio data
    audioContext.decodeAudioData(buffer)
      .then(decodedData => {
        // Create buffer source
        const source = audioContext.createBufferSource();
        source.buffer = decodedData;
        
        // Connect to destination (speakers)
        source.connect(audioContext.destination);
        
        // Play the audio
        source.start(0);
      })
      .catch(error => {
        console.error('Error decoding audio data:', error);
      });
  } catch (error) {
    console.error('Error processing incoming audio:', error);
  }
}

/**
 * Test audio output functionality
 * @param deviceId Optional audio output device ID
 * @returns Promise resolving to boolean indicating success
 */
export async function testAudioOutput(deviceId?: string): Promise<boolean> {
  try {
    const audio = new Audio('/sounds/dialtone.mp3');
    
    // If deviceId is provided and setSinkId is supported, use it
    if (deviceId && 'setSinkId' in audio) {
      await (audio as any).setSinkId(deviceId);
    }
    
    // Set volume and play test tone
    audio.volume = 0.3;
    await audio.play();
    
    // Stop after a short time
    setTimeout(() => {
      audio.pause();
      audio.remove();
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error testing audio output:', error);
    return false;
  }
}

/**
 * Get audio output level from a Twilio call
 * @param call The active Twilio call
 * @returns Number between 0-1 representing volume level
 */
export function getAudioLevel(call: any): number {
  if (!call || typeof call.getInputVolume !== 'function') {
    return 0;
  }
  
  try {
    return call.getInputVolume();
  } catch (error) {
    return 0;
  }
}
