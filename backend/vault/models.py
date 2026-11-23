import uuid
from django.db import models
from django.contrib.auth.models import User
from .crypto import AegisCryptoEngine

class UserVaultProfile(models.Model):
    """
    User Vault Profile anchoring biometric enrollment and cryptographic keys.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vault_profile')
    face_encoding_encrypted = models.BinaryField(null=True, blank=True, help_text="AES-256 Encrypted 128-D OpenCV face embedding")
    wallet_address = models.CharField(max_length=66, default="0x70997970c51812dc3a010c7d01b50e0d17dc79c8")
    vault_key_salt = models.BinaryField(help_text="16-byte random salt for PBKDF2HMAC key derivation")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.vault_key_salt:
            self.vault_key_salt = AegisCryptoEngine.generate_vault_salt()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"VaultProfile({self.user.username} - {self.wallet_address[:10]}...)"


class EncryptedHealthRecord(models.Model):
    """
    Encrypted medical and wearable records at rest.
    Zero plaintext PHI/PII in PostgreSQL columns.
    """
    RECORD_TYPE_CHOICES = [
        ('LAB_REPORT', 'Analog Lab Report / Blood Panel'),
        ('PRESCRIPTION', 'Clinical Prescription'),
        ('WEARABLE_BATCH', 'Wearable Telemetry Batch'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_records')
    record_type = models.CharField(max_length=30, choices=RECORD_TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=255, default='Encrypted Health Document')
    encrypted_payload = models.BinaryField(help_text="AES-256 Fernet ciphertext bytes")
    record_sha256 = models.CharField(max_length=64, db_index=True, help_text="Canonical SHA-256 hash anchored on-chain")
    eth_tx_hash = models.CharField(max_length=66, blank=True, null=True, help_text="Ethereum / Ganache transaction receipt hash")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def decrypt(self) -> dict:
        """Decrypts the payload in ephemeral memory using user's vault key salt."""
        salt = self.user.vault_profile.vault_key_salt
        return AegisCryptoEngine.decrypt_payload(self.encrypted_payload, salt)

    def __str__(self):
        return f"{self.record_type} - {self.record_sha256[:12]}... ({self.recorded_at.strftime('%Y-%m-%d')})"


class HabitTelemetrySeries(models.Model):
    """
    Daily normalized habit metrics and composite score.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habit_telemetry')
    metric_date = models.DateField(db_index=True)
    encrypted_metrics_blob = models.BinaryField(help_text="AES-256 Fernet encrypted metrics (RHR, HRV, Sleep, Steps)")
    habit_score = models.FloatField(default=0.0, help_text="Composite readiness score 0-100")

    class Meta:
        ordering = ['-metric_date']
        unique_together = ('user', 'metric_date')

    def decrypt_metrics(self) -> dict:
        salt = self.user.vault_profile.vault_key_salt
        return AegisCryptoEngine.decrypt_payload(self.encrypted_metrics_blob, salt)

    def __str__(self):
        return f"Telemetry({self.metric_date} - Score: {self.habit_score})"


class WellnessNudge(models.Model):
    """
    AI-driven predictive wellness and habit nudges.
    """
    TRIGGER_SOURCE_CHOICES = [
        ('ANOMALY_SKLEARN', 'Scikit-learn Anomaly Detection'),
        ('BURNOUT_TF', 'TensorFlow Stress/Burnout Forecast'),
    ]
    SEVERITY_CHOICES = [
        ('INFO', 'Informational / Habit Optimization'),
        ('WATCH', 'Elevated Strain Watch'),
        ('HIGH', 'Critical Anomaly / Burnout Risk'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nudges')
    trigger_source = models.CharField(max_length=30, choices=TRIGGER_SOURCE_CHOICES)
    encrypted_message = models.BinaryField(help_text="AES-256 Fernet encrypted message text")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='INFO')
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def decrypt_message(self) -> str:
        salt = self.user.vault_profile.vault_key_salt
        return AegisCryptoEngine.decrypt_payload(self.encrypted_message, salt)

    def __str__(self):
        return f"Nudge({self.trigger_source} - {self.severity} - {self.created_at.strftime('%Y-%m-%d')})"


class ConsentGrantRecord(models.Model):
    """
    On-chain consent grants mirrored for local auditability and instant UI revocation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consent_grants')
    grantee_identifier = models.CharField(max_length=255, help_text="Clinician name or Ethereum public address")
    scope = models.CharField(max_length=100, default="LAB_PANELS_ONLY")
    expires_at = models.DateTimeField()
    onchain_grant_id = models.IntegerField(default=0)
    tx_hash = models.CharField(max_length=66, blank=True)
    revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "REVOKED" if self.revoked else "ACTIVE"
        return f"Consent({self.grantee_identifier} - {self.scope} - {status})"
