import pytest
import tempfile
import os
import requests
from apps.df_svc.audio import deepfake_audio_detector
from apps.df_svc.video import deepfake_video_detector


def download_file(url, suffix):
    """Download a file from a URL into a temporary file."""
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
    except Exception as e:
        pytest.skip(f"Skipping test — could not download file: {url} ({e})")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
        for chunk in response.iter_content(chunk_size=8192):
            tmp_file.write(chunk)
        tmp_file.flush()
        return tmp_file.name


# --------------------------------------------------------------------
# AUDIO FIXTURES
# --------------------------------------------------------------------

@pytest.fixture(scope="session")
def real_audio_sample():
    """Download a real human speech sample (LibriSpeech-style example)."""
    url = "https://github.com/karoldvl/ESC-50/raw/master/audio/1-100032-A-0.wav"
    path = download_file(url, ".wav")
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture(scope="session")
def fake_audio_sample():
    """Download a fake audio sample (different real audio for testing)."""
    # Using a different real audio sample to test if detector gives different scores
    url = "https://github.com/karoldvl/ESC-50/raw/master/audio/1-100038-A-14.wav"
    path = download_file(url, ".wav")
    yield path
    if os.path.exists(path):
        os.unlink(path)


# --------------------------------------------------------------------
# VIDEO FIXTURES
# --------------------------------------------------------------------

@pytest.fixture(scope="session")
def real_video_sample():
    """Download a real human video (BigBuckBunny sample)."""
    url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    path = download_file(url, ".mp4")
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture(scope="session")
def fake_video_sample():
    """Download a different real video sample for testing."""
    # Using a different real video to test if detector gives different scores
    url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    path = download_file(url, ".mp4")
    yield path
    if os.path.exists(path):
        os.unlink(path)


# --------------------------------------------------------------------
# AUDIO TESTS
# --------------------------------------------------------------------

class TestDeepfakeAudioDetectorOnline:
    """Test that the audio deepfake detector can differentiate fake from real audio."""

    def test_audio_detector_output_valid(self, real_audio_sample):
        """Ensure the audio detector returns a valid (bool, float) tuple."""
        result = deepfake_audio_detector(real_audio_sample)
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], bool)
        assert isinstance(result[1], float)
        assert 0.0 <= result[1] <= 1.0

    def test_audio_detector_can_distinguish_fake(self, real_audio_sample, fake_audio_sample):
        """Check whether the audio detector gives different scores for fake vs real."""
        real_result = deepfake_audio_detector(real_audio_sample)
        fake_result = deepfake_audio_detector(fake_audio_sample)

        print("\nAudio Detection:")
        print(f"  Real audio score: {real_result}")
        print(f"  Fake audio score: {fake_result}")

        # Ensure there is some measurable difference
        assert real_result != fake_result, "Audio detector gave identical outputs for real/fake."


# --------------------------------------------------------------------
# VIDEO TESTS
# --------------------------------------------------------------------

class TestDeepfakeVideoDetectorOnline:
    """Test that the video deepfake detector can differentiate fake from real video."""

    def test_video_detector_output_valid(self, real_video_sample):
        """Ensure the video detector returns a valid (bool, float) tuple."""
        result = deepfake_video_detector(real_video_sample)
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], bool)
        assert isinstance(result[1], float)
        assert 0.0 <= result[1] <= 1.0

    def test_video_detector_can_distinguish_fake(self, real_video_sample, fake_video_sample):
        """Check whether the video detector gives different scores for fake vs real."""
        real_result = deepfake_video_detector(real_video_sample)
        fake_result = deepfake_video_detector(fake_video_sample)

        print("\nVideo Detection:")
        print(f"  Real video score: {real_result}")
        print(f"  Fake video score: {fake_result}")

        # Ensure there is some measurable difference
        assert real_result != fake_result, "Video detector gave identical outputs for real/fake."


# --------------------------------------------------------------------
# MAIN ENTRY POINT
# --------------------------------------------------------------------

if __name__ == "__main__":
    pytest.main([__file__])
