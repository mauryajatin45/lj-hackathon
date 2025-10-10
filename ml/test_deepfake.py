#!/usr/bin/env python3
"""
Test script for deepfake detection endpoints
"""
import requests
import os
import tempfile

def test_deepfake_endpoints():
    """Test the deepfake detection endpoints"""
    base_url = "http://localhost:8001"

    # Test health endpoint
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return

    # Test readiness endpoint
    print("\nTesting readiness endpoint...")
    try:
        response = requests.get(f"{base_url}/ready")
        result = response.json()
        print(f"Readiness: {result['status']}")
        print(f"Models: {result['models']}")
    except Exception as e:
        print(f"Readiness check failed: {e}")
        return

    # Test deepfake detection with sample files
    print("\nTesting deepfake detection...")

    # Create a simple test audio file (sine wave)
    try:
        import numpy as np
        import wave

        # Generate a simple sine wave audio file
        sample_rate = 16000
        duration = 2  # seconds
        frequency = 440  # A4 note

        t = np.linspace(0, duration, int(sample_rate * duration), False)
        audio_data = np.sin(frequency * 2 * np.pi * t)

        # Convert to 16-bit PCM
        audio_data = (audio_data * 32767).astype(np.int16)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            with wave.open(tmp_file.name, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())

            # Test audio deepfake detection
            with open(tmp_file.name, 'rb') as f:
                files = {'audio': ('test_audio.wav', f, 'audio/wav')}
                response = requests.post(f"{base_url}/detect_deepfake_audio", files=files)
                if response.status_code == 200:
                    result = response.json()
                    print(f"Audio deepfake detection result: {result}")
                else:
                    print(f"Audio deepfake detection failed: {response.status_code} - {response.text}")

        os.unlink(tmp_file.name)

    except ImportError:
        print("NumPy not available for audio test generation")
    except Exception as e:
        print(f"Audio test failed: {e}")

    # Test unified endpoint
    print("\nTesting unified deepfake endpoint...")
    try:
        # This will fail without actual files, but tests the endpoint structure
        response = requests.post(f"{base_url}/detect_deepfake")
        print(f"Unified endpoint response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Unified endpoint test failed: {e}")

if __name__ == "__main__":
    print("Deepfake Detection Test Script")
    print("=" * 40)
    test_deepfake_endpoints()
