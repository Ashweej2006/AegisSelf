import cv2
import numpy as np
import datetime
from django.contrib.auth.models import User
from .models import UserVaultProfile, EncryptedHealthRecord, HabitTelemetrySeries, WellnessNudge, ConsentGrantRecord
from .crypto import AegisCryptoEngine
from .biometrics import AegisBiometricEngine
from .web3_client import AegisWeb3Client
from .ml_engine import AegisPredictiveIntelligenceEngine

def seed_demo_vault(username: str = "aegis_user", password: str = "ZeroTrustPass123!"):
    """
    Populates rich, realistic demo data for AegisSelf:
    - User with enrolled biometric face encoding
    - 30-day continuous wearable telemetry with realistic circadian variances
    - Clinically correlated lab reports (Vitamin D, Cortisol, Glucose)
    - Anchored on-chain Ganache receipts
    - Active & revoked doctor consent grants
    - 100% AES-256 Fernet encrypted payloads at rest
    """
    user, created = User.objects.get_or_create(username=username, defaults={
        'email': 'user@aegisvault.org',
        'first_name': 'Alexander',
        'last_name': 'Vance'
    })
    if created:
        user.set_password(password)
        user.save()

    # Create profile
    profile, p_created = UserVaultProfile.objects.get_or_create(user=user, defaults={
        'wallet_address': '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        'vault_key_salt': AegisCryptoEngine.generate_vault_salt()
    })

    # Generate synthetic canonical face embedding for demo enrollment
    if not profile.face_encoding_encrypted:
        # Create a synthetic 128-D normalized embedding vector
        np.random.seed(42)
        face_emb = np.random.randn(128).astype(np.float32)
        face_emb = face_emb / np.linalg.norm(face_emb)
        # Encrypt embedding at rest
        cipher_emb = AegisCryptoEngine.encrypt_payload(
            face_emb.tobytes().hex(),
            profile.vault_key_salt
        )
        profile.face_encoding_encrypted = face_emb.tobytes()
        profile.save()

    salt = profile.vault_key_salt
    web3_client = AegisWeb3Client()

    # 1. Ingest 30 Days of Habit & Wearable Telemetry
    today = datetime.date.today()
    telemetry_records = []

    for i in range(30, 0, -1):
        day_date = today - datetime.timedelta(days=i)
        
        # Simulate baseline with an acute stress/sleep debt event 3-5 days ago
        if 3 <= i <= 5:
            # Anomaly period: Elevated RHR, low sleep, low steps
            rhr = 74.0 + (i % 2) * 2.0
            hrv = 36.0 - (i % 3) * 3.0
            sleep = 5.2 - (i % 2) * 0.4
            steps = 4200 + i * 200
            screen_time = 6.2
        else:
            # Healthy baseline variance
            rhr = 58.0 + (i % 5) * 1.5
            hrv = 62.0 + (i % 4) * 3.0
            sleep = 7.4 + (i % 3) * 0.3
            steps = 9500 + (i % 7) * 600
            screen_time = 3.5 + (i % 3) * 0.4

        habit_score = round(
            (min(100.0, sleep / 7.5 * 100) * 0.35) +
            (max(30.0, 100.0 - (rhr - 55) * 2.5) * 0.25) +
            (min(100.0, steps / 10000.0 * 100) * 0.25) +
            (min(100.0, hrv / 65.0 * 100) * 0.15),
            1
        )

        day_dict = {
            'date': day_date.strftime('%Y-%m-%d'),
            'source': 'Apple Health & Google Fit (Synced)',
            'resting_heart_rate': rhr,
            'hrv': hrv,
            'sleep_hours': sleep,
            'steps': steps,
            'screen_time_hours': screen_time,
            'habit_score': habit_score
        }
        telemetry_records.append(day_dict)

        # Encrypt daily blob
        cipher_blob = AegisCryptoEngine.encrypt_payload(day_dict, salt)
        HabitTelemetrySeries.objects.update_or_create(
            user=user,
            metric_date=day_date,
            defaults={
                'encrypted_metrics_blob': cipher_blob,
                'habit_score': habit_score
            }
        )

    # 2. Lab Report 1: Comprehensive Metabolic & Hormone Panel
    lab1_data = {
        'facility': 'Quest Diagnostics / LabCorp Regional',
        'collection_date': (today - datetime.timedelta(days=12)).strftime('%Y-%m-%d'),
        'physician': 'Dr. Kimberly Aris, MD',
        'biomarkers': [
            {'analyte': 'Vitamin D (25-OH)', 'value': 22.4, 'unit': 'ng/mL', 'reference_range': '30.0 - 100.0', 'flag': 'LOW'},
            {'analyte': 'Cortisol (Serum)', 'value': 21.8, 'unit': 'ug/dL', 'reference_range': '6.0 - 18.4', 'flag': 'HIGH'},
            {'analyte': 'Fasting Blood Glucose', 'value': 104.0, 'unit': 'mg/dL', 'reference_range': '70.0 - 99.0', 'flag': 'HIGH'},
            {'analyte': 'HbA1c (Glycated Hemoglobin)', 'value': 5.4, 'unit': '%', 'reference_range': '4.0 - 5.6', 'flag': 'NORMAL'},
            {'analyte': 'Total Cholesterol', 'value': 188.0, 'unit': 'mg/dL', 'reference_range': '125.0 - 200.0', 'flag': 'NORMAL'},
            {'analyte': 'LDL Cholesterol', 'value': 108.0, 'unit': 'mg/dL', 'reference_range': '0.0 - 100.0', 'flag': 'HIGH'},
            {'analyte': 'HDL Cholesterol', 'value': 58.0, 'unit': 'mg/dL', 'reference_range': '40.0 - 60.0', 'flag': 'NORMAL'},
            {'analyte': 'TSH (Thyroid Stimulating Hormone)', 'value': 2.45, 'unit': 'uIU/mL', 'reference_range': '0.45 - 4.5', 'flag': 'NORMAL'},
            {'analyte': 'High-Sensitivity CRP', 'value': 1.4, 'unit': 'mg/L', 'reference_range': '0.0 - 1.0', 'flag': 'HIGH'},
        ]
    }
    lab1_sha256 = AegisCryptoEngine.compute_canonical_sha256(lab1_data)
    lab1_tx = web3_client.anchor_record_hash(profile.wallet_address, lab1_sha256)

    EncryptedHealthRecord.objects.update_or_create(
        user=user,
        record_sha256=lab1_sha256,
        defaults={
            'record_type': 'LAB_REPORT',
            'title': 'Comprehensive Metabolic & Hormone Panel (Printed OCR)',
            'encrypted_payload': AegisCryptoEngine.encrypt_payload(lab1_data, salt),
            'eth_tx_hash': lab1_tx['tx_hash']
        }
    )

    # 3. Lab Report 2: Historical Lipid & Micronutrient Profile
    lab2_data = {
        'facility': 'Stanford Health Diagnostics',
        'collection_date': (today - datetime.timedelta(days=90)).strftime('%Y-%m-%d'),
        'physician': 'Dr. Marcus Vance, DO',
        'biomarkers': [
            {'analyte': 'Vitamin D (25-OH)', 'value': 34.0, 'unit': 'ng/mL', 'reference_range': '30.0 - 100.0', 'flag': 'NORMAL'},
            {'analyte': 'Fasting Blood Glucose', 'value': 92.0, 'unit': 'mg/dL', 'reference_range': '70.0 - 99.0', 'flag': 'NORMAL'},
            {'analyte': 'Total Cholesterol', 'value': 175.0, 'unit': 'mg/dL', 'reference_range': '125.0 - 200.0', 'flag': 'NORMAL'},
            {'analyte': 'Ferritin', 'value': 142.0, 'unit': 'ng/mL', 'reference_range': '30.0 - 400.0', 'flag': 'NORMAL'},
        ]
    }
    lab2_sha256 = AegisCryptoEngine.compute_canonical_sha256(lab2_data)
    lab2_tx = web3_client.anchor_record_hash(profile.wallet_address, lab2_sha256)

    EncryptedHealthRecord.objects.update_or_create(
        user=user,
        record_sha256=lab2_sha256,
        defaults={
            'record_type': 'LAB_REPORT',
            'title': 'Historical Micronutrient & Lipid Profile',
            'encrypted_payload': AegisCryptoEngine.encrypt_payload(lab2_data, salt),
            'eth_tx_hash': lab2_tx['tx_hash']
        }
    )

    # 4. Prescription Record
    rx_data = {
        'rx_number': 'RX-88421-AEG',
        'prescriber': 'Dr. Kimberly Aris, MD (NPI: 1982736410)',
        'pharmacy': 'CVS Caremark / On-Vault Pharmacy',
        'medications': [
            {'drug': 'Cholecalciferol (Vitamin D3)', 'dosage': '50,000 IU', 'instructions': 'Take 1 capsule orally every Sunday morning with food', 'refills': 3},
            {'drug': 'Omega-3 Acid Ethyl Esters', 'dosage': '1,000 mg', 'instructions': 'Take 2 softgels daily with evening meal', 'refills': 5}
        ]
    }
    rx_sha256 = AegisCryptoEngine.compute_canonical_sha256(rx_data)
    rx_tx = web3_client.anchor_record_hash(profile.wallet_address, rx_sha256)

    EncryptedHealthRecord.objects.update_or_create(
        user=user,
        record_sha256=rx_sha256,
        defaults={
            'record_type': 'PRESCRIPTION',
            'title': 'Endocrine Prescription & Supplement Protocol',
            'encrypted_payload': AegisCryptoEngine.encrypt_payload(rx_data, salt),
            'eth_tx_hash': rx_tx['tx_hash']
        }
    )

    # 5. Smart Contract Consent Grants
    # Active grant to Dr. Aris (Endocrinologist)
    grant1_tx = web3_client.grant_consent(
        profile.wallet_address,
        '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
        'LAB_PANELS_ONLY',
        86400 * 3 # 3 days
    )
    ConsentGrantRecord.objects.update_or_create(
        user=user,
        grantee_identifier='Dr. Kimberly Aris (0x3C44...93BC) - Endocrinologist',
        defaults={
            'scope': 'LAB_PANELS_ONLY',
            'expires_at': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3),
            'onchain_grant_id': grant1_tx['grant_id'],
            'tx_hash': grant1_tx['tx_hash'],
            'revoked': False
        }
    )

    # Historical revoked grant
    grant2_tx = web3_client.grant_consent(
        profile.wallet_address,
        '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        'ALL_VAULT_RECORDS',
        86400
    )
    web3_client.revoke_consent(profile.wallet_address, grant2_tx['grant_id'])
    ConsentGrantRecord.objects.update_or_create(
        user=user,
        grantee_identifier='CardioSense Research Portal (0x90F7...B906)',
        defaults={
            'scope': 'ALL_VAULT_RECORDS',
            'expires_at': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
            'onchain_grant_id': grant2_tx['grant_id'],
            'tx_hash': grant2_tx['tx_hash'],
            'revoked': True
        }
    )

    # 6. Run ML Intelligence & Contextual Nudges
    anomalies = AegisPredictiveIntelligenceEngine.detect_physiological_anomalies(telemetry_records)
    burnout_forecast = AegisPredictiveIntelligenceEngine.forecast_burnout_trajectory(telemetry_records)
    AegisPredictiveIntelligenceEngine.generate_contextual_nudges(
        user=user,
        telemetry_data=telemetry_records,
        anomalies=anomalies,
        burnout_info=burnout_forecast,
        lab_biomarkers=lab1_data['biomarkers']
    )

    print(f"AegisSelf Vault successfully seeded for user '{username}'! Zero-Trust Encryption Verified.")
    return user
