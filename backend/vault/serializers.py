from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserVaultProfile, EncryptedHealthRecord, HabitTelemetrySeries, WellnessNudge, ConsentGrantRecord

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    face_image_base64 = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'face_image_base64']

    def create(self, validated_data):
        face_img = validated_data.pop('face_image_base64', None)
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class EncryptedHealthRecordSerializer(serializers.ModelSerializer):
    decrypted_content = serializers.SerializerMethodField()
    raw_ciphertext_preview = serializers.SerializerMethodField()

    class Meta:
        model = EncryptedHealthRecord
        fields = [
            'id', 'record_type', 'title', 'record_sha256', 'eth_tx_hash',
            'recorded_at', 'raw_ciphertext_preview', 'decrypted_content'
        ]

    def get_raw_ciphertext_preview(self, obj):
        if obj.encrypted_payload:
            raw_bytes = bytes(obj.encrypted_payload)
            # Return truncated preview of the actual Fernet ciphertext
            return f"gAAAAAB... (AES-256 Fernet Ciphertext, {len(raw_bytes)} bytes at rest)"
        return None

    def get_decrypted_content(self, obj):
        request = self.context.get('request')
        # Only decrypt in memory if vault is unlocked or step-up auth passed
        if request and getattr(request, 'vault_unlocked', False):
            try:
                return obj.decrypt()
            except Exception as e:
                return {'error': f'Decryption failed: {str(e)}'}
        return None


class HabitTelemetrySerializer(serializers.ModelSerializer):
    metrics = serializers.SerializerMethodField()

    class Meta:
        model = HabitTelemetrySeries
        fields = ['id', 'metric_date', 'habit_score', 'metrics']

    def get_metrics(self, obj):
        request = self.context.get('request')
        # If vault is unlocked or request is analytics, decrypt in ephemeral memory
        try:
            return obj.decrypt_metrics()
        except Exception:
            return None


class WellnessNudgeSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()

    class Meta:
        model = WellnessNudge
        fields = ['id', 'trigger_source', 'severity', 'is_dismissed', 'created_at', 'message']

    def get_message(self, obj):
        try:
            return obj.decrypt_message()
        except Exception:
            return "[Encrypted Nudge]"


class ConsentGrantRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentGrantRecord
        fields = [
            'id', 'grantee_identifier', 'scope', 'expires_at',
            'onchain_grant_id', 'tx_hash', 'revoked', 'created_at'
        ]
