import torch
import torch.nn as nn
from collections import deque
import random
from sklearn.metrics import roc_auc_score
import numpy as np

class ReplayBuffer:
    def __init__(self, max_size=1000):
        self.buffer = deque(maxlen=max_size)

    def add(self, sample):
        """Add a sample to the buffer. Sample should be a dict with 'input' and 'label'"""
        self.buffer.append(sample)

    def sample(self, batch_size):
        """Sample a batch from the buffer"""
        return random.sample(self.buffer, min(len(self.buffer), batch_size))

    def __len__(self):
        return len(self.buffer)

class AdaptationEngine:
    def __init__(self, model, buffer_size=1000, adaptation_interval_hours=24):
        self.model = model
        self.buffer = ReplayBuffer(buffer_size)
        self.optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=1e-5)
        self.criterion = nn.BCEWithLogitsLoss()
        self.adaptation_interval = adaptation_interval_hours * 3600  # Convert to seconds
        self.last_adaptation_time = 0
        self.drift_threshold = 0.1  # TPR@1%FPR drop threshold

    def add_flagged_sample(self, sample):
        """Add a flagged sample from user reports to the replay buffer"""
        self.buffer.add(sample)

    def should_adapt(self, current_time):
        """Check if adaptation is needed based on time and drift detection"""
        time_since_last = current_time - self.last_adaptation_time
        return time_since_last >= self.adaptation_interval

    def detect_drift(self, val_loader):
        """Detect concept drift by evaluating TPR@1%FPR"""
        self.model.eval()
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for batch in val_loader:
                if 'input_values' in batch:  # Audio
                    outputs = self.model.audio_branch(batch['input_values'])
                elif 'pixel_values' in batch:  # Video
                    outputs = self.model.video_branch(batch['pixel_values'])
                else:  # Fusion
                    outputs = self.model(audio_input=batch.get('input_values'), video_input=batch.get('pixel_values'))

                preds = torch.sigmoid(outputs.squeeze()).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(batch['labels'].cpu().numpy())

        # Calculate TPR@1%FPR (simplified)
        fpr_threshold = 0.01
        sorted_indices = np.argsort(all_preds)[::-1]
        sorted_labels = np.array(all_labels)[sorted_indices]

        cum_positives = np.cumsum(sorted_labels)
        cum_negatives = np.arange(1, len(sorted_labels) + 1) - cum_positives

        tpr_at_fpr = cum_positives[cum_negatives <= fpr_threshold * len(sorted_labels)]
        if len(tpr_at_fpr) > 0:
            current_tpr = tpr_at_fpr[-1] / cum_positives[-1] if cum_positives[-1] > 0 else 0
        else:
            current_tpr = 0

        return current_tpr

    def adapt(self, current_time, val_loader=None):
        """Perform adaptation using replay buffer"""
        if len(self.buffer) < 32:
            print("Not enough samples in replay buffer for adaptation")
            return False

        print(f"Starting adaptation with {len(self.buffer)} samples...")

        # Detect drift if validation loader provided
        baseline_tpr = None
        if val_loader:
            baseline_tpr = self.detect_drift(val_loader)
            print(f"Baseline TPR@1%FPR: {baseline_tpr:.4f}")

        # Fine-tune on replay buffer
        self.model.train()
        adaptation_epochs = 3

        for epoch in range(adaptation_epochs):
            batch = self.buffer.sample(min(32, len(self.buffer)))
            total_loss = 0

            for sample in batch:
                self.optimizer.zero_grad()

                if 'input_values' in sample:  # Audio sample
                    outputs = self.model.audio_branch(sample['input_values'].unsqueeze(0))
                elif 'pixel_values' in sample:  # Video sample
                    outputs = self.model.video_branch(sample['pixel_values'].unsqueeze(0))
                else:  # Fusion sample
                    outputs = self.model(
                        audio_input=sample.get('input_values'),
                        video_input=sample.get('pixel_values')
                    )

                loss = self.criterion(outputs.squeeze(), sample['label'].unsqueeze(0))
                loss.backward()
                self.optimizer.step()

                total_loss += loss.item()

            print(f"Adaptation epoch {epoch+1}/{adaptation_epochs}, Loss: {total_loss/len(batch):.4f}")

        # Evaluate after adaptation
        if val_loader:
            new_tpr = self.detect_drift(val_loader)
            print(f"New TPR@1%FPR: {new_tpr:.4f}")
            if baseline_tpr and new_tpr < baseline_tpr - self.drift_threshold:
                print("Warning: Adaptation may have degraded performance")

        self.last_adaptation_time = current_time
        print("Adaptation completed")
        return True

    def get_adaptation_stats(self):
        """Get statistics about the adaptation process"""
        return {
            'buffer_size': len(self.buffer),
            'last_adaptation_time': self.last_adaptation_time,
            'adaptation_interval': self.adaptation_interval
        }
