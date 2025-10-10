import torch
import torch.nn as nn
from transformers import Wav2Vec2Model, TimesformerModel
from peft import LoraConfig, get_peft_model

class AudioBranch(nn.Module):
    def __init__(self, lora_config=None):
        super().__init__()
        self.backbone = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")
        if lora_config:
            self.backbone = get_peft_model(self.backbone, lora_config)
        self.classifier = nn.Linear(self.backbone.config.hidden_size, 1)

    def forward(self, x):
        outputs = self.backbone(x)
        return self.classifier(outputs.last_hidden_state.mean(dim=1))

class VideoBranch(nn.Module):
    def __init__(self, lora_config=None):
        super().__init__()
        self.backbone = TimesformerModel.from_pretrained("facebook/timesformer-base")
        if lora_config:
            self.backbone = get_peft_model(self.backbone, lora_config)
        self.classifier = nn.Linear(self.backbone.config.hidden_size, 1)

    def forward(self, x):
        outputs = self.backbone(x)
        return self.classifier(outputs.last_hidden_state[:, 0])

class DeepFakeDetector(nn.Module):
    def __init__(self, use_lora=True):
        super().__init__()
        lora_config = LoraConfig(r=16, lora_alpha=32) if use_lora else None
        self.audio_branch = AudioBranch(lora_config)
        self.video_branch = VideoBranch(lora_config)

    def forward(self, audio_input=None, video_input=None):
        if audio_input is not None and video_input is not None:
            audio_logits = self.audio_branch(audio_input)
            video_logits = self.video_branch(video_input)
            return (audio_logits + video_logits) / 2
        elif audio_input is not None:
            return self.audio_branch(audio_input)
        else:
            return self.video_branch(video_input)