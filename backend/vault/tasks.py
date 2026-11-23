try:
    from celery import shared_task
except ImportError:
    def shared_task(func):
        func.delay = func
        func.apply_async = lambda args=(), kwargs={}: func(*args, **kwargs)
        return func

from .ocr_pipeline import AegisOCRPipeline
from .ml_engine import AegisPredictiveIntelligenceEngine
from .models import User, HabitTelemetrySeries, EncryptedHealthRecord
from .crypto import AegisCryptoEngine
from .web3_client import AegisWeb3Client

@shared_task
def async_process_lab_document_task(file_bytes_base64: str, filename: str, user_id: int):
    """Celery background worker for Tesseract OCR extraction."""
    import base64
    file_bytes = base64.b64decode(file_bytes_base64)
    ocr_result = AegisOCRPipeline.process_lab_document(file_bytes, filename=filename)
    return ocr_result

@shared_task
def scheduled_wellness_nudge_task():
    """Periodic Celery Beat task generating timely habit nudges for active vault users."""
    for user in User.objects.filter(is_active=True):
        if hasattr(user, 'vault_profile'):
            telemetry = []
            for t in HabitTelemetrySeries.objects.filter(user=user).order_by('-metric_date')[:14]:
                try:
                    telemetry.append(t.decrypt_metrics())
                except Exception:
                    pass
            if telemetry:
                anomalies = AegisPredictiveIntelligenceEngine.detect_physiological_anomalies(telemetry)
                burnout = AegisPredictiveIntelligenceEngine.forecast_burnout_trajectory(telemetry)
                AegisPredictiveIntelligenceEngine.generate_contextual_nudges(
                    user=user,
                    telemetry_data=telemetry,
                    anomalies=anomalies,
                    burnout_info=burnout
                )
    return "Scheduled nudges synthesized"
