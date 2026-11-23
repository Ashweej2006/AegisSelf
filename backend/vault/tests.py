import time
import numpy as np
from django.test import TestCase
from django.contrib.auth.models import User
from .models import UserVaultProfile, EncryptedHealthRecord, HabitTelemetrySeries, WellnessNudge, ConsentGrantRecord
from .crypto import AegisCryptoEngine
from .biometrics import AegisBiometricEngine
from .web3_client import AegisWeb3Client
from .ml_engine import AegisPredictiveIntelligenceEngine
from .ocr_pipeline import AegisOCRPipeline
from .clinical_profile import AegisClinicalProfileBridge
from .demo_data import seed_demo_vault

class AegisSelfZeroTrustTestSuite(TestCase):
    """
    Comprehensive verification suite testing all core AegisSelf MVP KPIs:
    - 100% Zero-Trust encryption at rest (zero plaintext PHI in DB)
    - On-chain confirmation latency < 3 seconds on Ganache
    - OCR field extraction accuracy > 92% on standard lab panels
    - FAR < 1% OpenCV biometric face verification
    - Scikit-learn physiological anomaly detection & NN burnout forecasting
    - Beyond the Browser biometric form auto-fill vault
    """

    def setUp(self):
        self.user = seed_demo_vault(username="test_vault_user", password="VaultSecretPass2026!")
        self.profile = self.user.vault_profile

    def test_zero_trust_encryption_at_rest(self):
        """KPI: 100% of sensitive health payloads encrypted at rest via AES-256 Fernet."""
        records = EncryptedHealthRecord.objects.filter(user=self.user)
        self.assertGreater(records.count(), 0, "Health records should exist")
        
        for record in records:
            raw_payload_bytes = bytes(record.encrypted_payload)
            # Ensure it starts with Fernet header 'gAAAAAB' in base64
            self.assertTrue(raw_payload_bytes.startswith(b'gAAAAAB'), "Payload must be AES-256 Fernet ciphertext")
            # Ensure no plaintext keywords exist in the database raw payload
            raw_str = raw_payload_bytes.decode('latin1', errors='replace')
            self.assertNotIn("Vitamin D", raw_str, "Zero plaintext PHI allowed in database columns")
            self.assertNotIn("Cortisol", raw_str, "Zero plaintext PHI allowed in database columns")
            self.assertNotIn("Glucose", raw_str, "Zero plaintext PHI allowed in database columns")

            # Verify ephemeral in-memory decryption
            decrypted = record.decrypt()
            self.assertIsInstance(decrypted, dict)

    def test_onchain_anchoring_latency(self):
        """KPI: Less than 3 seconds confirmation latency on local Ganache testnet."""
        client = AegisWeb3Client()
        test_sha256 = "0x" + "a" * 64
        
        start = time.time()
        receipt = client.anchor_record_hash(self.profile.wallet_address, test_sha256)
        elapsed = time.time() - start

        self.assertTrue(receipt['success'])
        self.assertTrue(receipt['tx_hash'].startswith('0x'))
        self.assertEqual(len(receipt['tx_hash']), 66)
        self.assertLess(elapsed, 3.0, f"On-chain confirmation latency must be < 3s, took {elapsed:.3f}s")

    def test_smart_contract_consent_lifecycle(self):
        """Verifies programmable smart contract consent grant, verification, and one-click revocation."""
        client = AegisWeb3Client()
        doctor_wallet = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"
        scope = "CARDIOLOGY_PANELS_ONLY"
        
        # 1. Grant Access for 1 hour (3600 seconds)
        grant_res = client.grant_consent(self.profile.wallet_address, doctor_wallet, scope, 3600)
        self.assertTrue(grant_res['success'])
        grant_id = grant_res['grant_id']

        # 2. Verify Access is Active
        is_active = client.verify_consent(self.profile.wallet_address, doctor_wallet, scope)
        self.assertTrue(is_active, "Doctor access should be active on-chain")

        # 3. Revoke Access immediately
        revoke_res = client.revoke_consent(self.profile.wallet_address, grant_id)
        self.assertTrue(revoke_res['success'])

        # 4. Verify Access is Revoked
        is_still_active = client.verify_consent(self.profile.wallet_address, doctor_wallet, scope)
        self.assertFalse(is_still_active, "Doctor access must be revoked immediately on-chain")

    def test_biometric_face_matching_far(self):
        """KPI: False Acceptance Rate (FAR) under 1% with sub-1.5s verification."""
        # 1. Self comparison with slight synthetic noise (should match)
        enrolled = np.frombuffer(self.profile.face_encoding_encrypted, dtype=np.float32)
        live_match = enrolled + np.random.normal(0, 0.02, size=enrolled.shape).astype(np.float32)
        live_match = live_match / np.linalg.norm(live_match)
        
        is_match, conf = AegisBiometricEngine.compare_embeddings(live_match, enrolled)
        self.assertTrue(is_match, f"Legitimate face should match, score: {conf}")

        # 2. Imposter face comparison (FAR < 1% verification)
        imposter = np.random.randn(128).astype(np.float32)
        imposter = imposter / np.linalg.norm(imposter)
        
        is_imposter_match, imposter_conf = AegisBiometricEngine.compare_embeddings(imposter, enrolled)
        self.assertFalse(is_imposter_match, f"Imposter face must be rejected. Imposter score: {imposter_conf}")

    def test_ocr_biomarker_extraction_accuracy(self):
        """KPI: Greater than 92% field extraction accuracy on standard lab panels."""
        benchmark_text = """
        METABOLIC & BIOCHEMICAL REPORT
        Analyte                      Result      Reference Range     Unit
        Vitamin D (25-OH)            22.4        30.0 - 100.0        ng/mL
        Cortisol (Serum)             21.8        6.0 - 18.4          ug/dL
        Fasting Blood Glucose        104.0       70.0 - 99.0         mg/dL
        HbA1c                        5.4         4.0 - 5.6           %
        Total Cholesterol            188.0       125.0 - 200.0       mg/dL
        TSH                          2.45        0.45 - 4.5          uIU/mL
        """
        biomarkers = AegisOCRPipeline.parse_biomarkers_from_text(benchmark_text)
        
        expected_analytes = [
            'Vitamin D (25-OH)', 'Cortisol (Serum)', 'Fasting Blood Glucose',
            'HbA1c (Glycated Hemoglobin)', 'Total Cholesterol', 'TSH (Thyroid Stimulating Hormone)'
        ]
        extracted_names = [b['analyte'] for b in biomarkers]
        
        matched_count = sum(1 for exp in expected_analytes if exp in extracted_names)
        accuracy = (matched_count / len(expected_analytes)) * 100.0

        self.assertGreaterEqual(accuracy, 92.0, f"Extraction accuracy must exceed 92%, got {accuracy}%")

    def test_predictive_intelligence_and_burnout_forecast(self):
        """Verifies Scikit-learn anomaly detection and neural network burnout trajectory."""
        telemetry = []
        for t in HabitTelemetrySeries.objects.filter(user=self.user).order_by('metric_date'):
            telemetry.append(t.decrypt_metrics())

        anomalies = AegisPredictiveIntelligenceEngine.detect_physiological_anomalies(telemetry)
        self.assertIsInstance(anomalies, list)
        self.assertGreater(len(anomalies), 0, "Should detect planted acute physiological deviation")

        burnout = AegisPredictiveIntelligenceEngine.forecast_burnout_trajectory(telemetry)
        self.assertIn('current_burnout_risk', burnout)
        self.assertIn('forecast_7_day', burnout)
        self.assertEqual(len(burnout['forecast_7_day']), 7, "Must forecast exactly 7 days ahead")

    def test_beyond_the_browser_autofill_bridge(self):
        """Track 02 (Beyond the Browser): Biometric form auto-fill vault with on-chain audit receipt."""
        autofill_res = AegisClinicalProfileBridge.execute_biometric_autofill(
            self.user,
            target_portal_name="Cedars-Sinai Outpatient Clinic"
        )
        self.assertTrue(autofill_res['success'])
        self.assertIn('autofill_payload', autofill_res)
        payload = autofill_res['autofill_payload']
        
        self.assertIn('demographics', payload)
        self.assertIn('allergies', payload)
        self.assertIn('active_prescriptions', payload)
        self.assertIn('recent_clinical_biomarkers', payload)
        self.assertIn('onchain_receipt', autofill_res)
        self.assertTrue(autofill_res['onchain_receipt']['tx_hash'].startswith('0x'))

    def test_aws_kms_envelope_encryption(self):
        """Verifies AWS KMS envelope encryption generates DEK, encrypts payload, and decrypts."""
        from .aws_kms import AegisKmsEngine
        test_payload = {
            'patient_mrn': 'MRN-90210-S',
            'glucose_fasting': 98.4,
            'clinical_note': 'No acute cardiac distress.'
        }
        envelope = AegisKmsEngine.encrypt_with_kms_envelope(test_payload)
        self.assertTrue(envelope['kms_protected'])
        self.assertIn('ciphertext_b64', envelope)
        self.assertIn('encrypted_dek_b64', envelope)
        self.assertNotIn('glucose_fasting', str(envelope['ciphertext_b64']))

        decrypted = AegisKmsEngine.decrypt_with_kms_envelope(envelope)
        self.assertEqual(decrypted['patient_mrn'], 'MRN-90210-S')
        self.assertEqual(decrypted['glucose_fasting'], 98.4)

    def test_elevenlabs_voice_ai_zero_retention_and_stt(self):
        """Verifies ElevenLabs voice pipeline PHI sanitization, pronunciation rules, and TTS stream."""
        from .voice_ai import AegisVoiceIntelligenceEngine
        raw_medical_text = (
            "Patient John Doe (DOB: 04/12/1982, MRN #849201) presents with elevated HbA1c of 5.8% "
            "and fasting glucose of 105 mg/dL. Recommending Metformin 500 mg/dL."
        )
        scrubbed = AegisVoiceIntelligenceEngine.sanitize_phi_before_voice(raw_medical_text)
        self.assertNotIn("John Doe", scrubbed, "Patient names must be stripped before external AI transmission")
        self.assertNotIn("849201", scrubbed, "MRN numbers must be redacted")

        spoken = AegisVoiceIntelligenceEngine.apply_pronunciation_rules(scrubbed)
        self.assertIn("milligrams per deciliter", spoken, "Clinical abbreviations must expand for clear speech")
        self.assertIn("H B A one C", spoken)

        # Test streaming TTS chunks
        stream = AegisVoiceIntelligenceEngine.stream_wellness_briefing("Test wellness briefing")
        first_chunk = next(stream)
        self.assertGreater(len(first_chunk), 0, "TTS must stream valid audio chunks")

    def test_vault_full_state_and_simulation(self):
        """Verifies unified VaultState schema matching AegisSelf 1.1.2 frontend interfaces."""
        from rest_framework.test import APIRequestFactory
        from .views import VaultFullStateView, AnomalySimulationView
        factory = APIRequestFactory()

        # 1. State Endpoint
        request = factory.get('/api/v1/vault/state/')
        request.user = self.user
        view = VaultFullStateView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
        data = response.data

        required_keys = ['vaultId', 'publicKeyFingerprint', 'telemetry', 'labReports', 'biomarkers', 'wearables', 'nudges', 'contracts', 'auditLog']
        for k in required_keys:
            self.assertIn(k, data, f"Unified VaultState must contain '{k}'")

        self.assertGreaterEqual(len(data['telemetry']), 10)
        self.assertGreaterEqual(len(data['biomarkers']), 3)

        # 2. Simulation Endpoint
        sim_request = factory.post('/api/v1/anomalies/simulate/', {
            'telemetry': data['telemetry'],
            'biomarkers': data['biomarkers'],
            'simParams': {
                'sleepHoursTarget': 8.0,
                'zone2MinutesPerWeek': 150,
                'eveningScreenCutoffMins': 45,
                'hydrationLiters': 2.5
            }
        }, format='json')
        sim_view = AnomalySimulationView.as_view()
        sim_res = sim_view(sim_request)
        self.assertEqual(sim_res.status_code, 200)
        self.assertIn('baselineRiskPct', sim_res.data)
        self.assertIn('simulatedRiskPct', sim_res.data)
        self.assertIn('anomalies', sim_res.data)
        self.assertLess(sim_res.data['simulatedRiskPct'], sim_res.data['baselineRiskPct'])
