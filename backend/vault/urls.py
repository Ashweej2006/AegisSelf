from django.urls import path
from .views import (
    LoginView, RegisterView, BiometricVerifyView, BiometricEnrollView,
    VaultStatusView, HealthRecordsView, ZeroTrustDBInspectorView,
    WearableIngestView, DocumentOCRView, CommitDocumentView,
    CorrelationsView, IntelligenceNudgesView, DismissNudgeView,
    ConsentGrantView, ConsentRevokeView, BlockchainLedgerView,
    BiometricAutoFillView, DemoSeedView,
    VaultFullStateView, VaultVerifyView, VaultExportEncryptedView,
    AnomalySimulationView, VoiceWellnessBriefingView, VoiceTranscribeView,
    AwsKmsStatusView
)

urlpatterns = [
    # Auth & Biometrics
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/biometric-verify/', BiometricVerifyView.as_view(), name='auth-biometric-verify'),
    path('auth/biometric-enroll/', BiometricEnrollView.as_view(), name='auth-biometric-enroll'),

    # Vault & Records (AegisSelf 1.1.2 Unified State)
    path('vault/state/', VaultFullStateView.as_view(), name='vault-state'),
    path('vault/verify/', VaultVerifyView.as_view(), name='vault-verify'),
    path('vault/export/', VaultExportEncryptedView.as_view(), name='vault-export'),
    path('vault/status/', VaultStatusView.as_view(), name='vault-status'),
    path('vault/records/', HealthRecordsView.as_view(), name='vault-records'),
    path('vault/db-inspector/', ZeroTrustDBInspectorView.as_view(), name='vault-db-inspector'),
    path('vault/autofill-payload/', BiometricAutoFillView.as_view(), name='vault-autofill'),
    path('vault/kms-status/', AwsKmsStatusView.as_view(), name='vault-kms-status'),

    # Multi-Modal Ingestion
    path('ingest/wearable/', WearableIngestView.as_view(), name='ingest-wearable'),
    path('ingest/document/', DocumentOCRView.as_view(), name='ingest-document'),
    path('ingest/commit-document/', CommitDocumentView.as_view(), name='ingest-commit-document'),

    # Analytics, Simulation & Predictive Intelligence
    path('analytics/correlations/', CorrelationsView.as_view(), name='analytics-correlations'),
    path('anomalies/simulate/', AnomalySimulationView.as_view(), name='anomalies-simulate'),
    path('intelligence/nudges/', IntelligenceNudgesView.as_view(), name='intelligence-nudges'),
    path('intelligence/nudges/<uuid:nudge_id>/dismiss/', DismissNudgeView.as_view(), name='dismiss-nudge'),

    # Voice & Audio AI (ElevenLabs Flash v2.5 TTS & Scribe v3 STT)
    path('voice/briefing/', VoiceWellnessBriefingView.as_view(), name='voice-briefing'),
    path('voice/transcribe/', VoiceTranscribeView.as_view(), name='voice-transcribe'),

    # Web3 & Consent
    path('blockchain/consent/', ConsentGrantView.as_view(), name='blockchain-consent'),
    path('blockchain/revoke/', ConsentRevokeView.as_view(), name='blockchain-revoke'),
    path('blockchain/ledger/', BlockchainLedgerView.as_view(), name='blockchain-ledger'),

    # Demo Seed
    path('demo/seed/', DemoSeedView.as_view(), name='demo-seed'),
]
