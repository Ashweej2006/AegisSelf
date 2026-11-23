import csv
import json
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Tuple, Optional
from .crypto import AegisCryptoEngine
from .models import HabitTelemetrySeries, EncryptedHealthRecord

class AegisWearableIngestion:
    """
    Parses, standardizes, and normalizes wearable telemetry from Apple Health (XML/JSON)
    and Google Fit (JSON/CSV) into unified time-series habit data.
    """

    @classmethod
    def calculate_habit_score(cls, rhr: float, hrv: float, sleep_hours: float, steps: int) -> float:
        """
        Calculates a composite daily habit readiness score (0 - 100).
        Weights: Sleep (35%), RHR recovery (25%), Activity/Steps (25%), HRV (15%).
        """
        # Sleep score: ideal 7.5 - 8.5 hours
        if sleep_hours >= 7.5 and sleep_hours <= 8.5:
            sleep_score = 100.0
        elif sleep_hours > 8.5:
            sleep_score = max(60.0, 100.0 - (sleep_hours - 8.5) * 20.0)
        else:
            sleep_score = max(20.0, (sleep_hours / 7.5) * 100.0)

        # RHR score: ideal 52 - 65 bpm
        if rhr <= 65:
            rhr_score = min(100.0, max(70.0, 100.0 - max(0.0, rhr - 55) * 2.0))
        else:
            rhr_score = max(30.0, 100.0 - (rhr - 65) * 3.5)

        # Step score: target 8000 - 12000 steps
        step_score = min(100.0, (steps / 10000.0) * 100.0)

        # HRV score: normal healthy range 45 - 85 ms
        hrv_score = min(100.0, max(30.0, (hrv / 65.0) * 100.0))

        composite = (sleep_score * 0.35) + (rhr_score * 0.25) + (step_score * 0.25) + (hrv_score * 0.15)
        return round(float(composite), 1)

    @classmethod
    def parse_apple_health_json(cls, data: Any) -> List[Dict[str, Any]]:
        """Parses Apple Health JSON records into standardized metric dictionaries."""
        records = []
        raw_items = data if isinstance(data, list) else data.get('data', data.get('metrics', []))
        
        for item in raw_items:
            m_date = item.get('date') or item.get('startDate')
            if not m_date:
                continue
            
            # Normalize date string YYYY-MM-DD
            dt_str = str(m_date).split('T')[0]
            rhr = float(item.get('resting_heart_rate', item.get('rhr', 62.0)))
            hrv = float(item.get('hrv', item.get('heart_rate_variability', 55.0)))
            sleep = float(item.get('sleep_hours', item.get('sleep_duration', 7.2)))
            steps = int(item.get('steps', item.get('step_count', 8500)))
            screen_time = float(item.get('screen_time_hours', 4.0))

            score = cls.calculate_habit_score(rhr, hrv, sleep, steps)
            records.append({
                'date': dt_str,
                'source': 'Apple Health',
                'resting_heart_rate': rhr,
                'hrv': hrv,
                'sleep_hours': sleep,
                'steps': steps,
                'screen_time_hours': screen_time,
                'habit_score': score,
            })
        return records

    @classmethod
    def parse_google_fit_csv(cls, csv_text: str) -> List[Dict[str, Any]]:
        """Parses Google Fit CSV export into standardized records."""
        records = []
        reader = csv.DictReader(csv_text.strip().splitlines())
        
        for row in reader:
            dt_str = row.get('Date') or row.get('date') or str(date.today())
            try:
                rhr = float(row.get('Resting Heart Rate (bpm)', row.get('rhr', 64.0)))
                hrv = float(row.get('HRV (ms)', row.get('hrv', 50.0)))
                sleep = float(row.get('Sleep Duration (hours)', row.get('sleep_hours', 7.0)))
                steps = int(float(row.get('Step Count', row.get('steps', 8000))))
                screen_time = float(row.get('Screen Time (hours)', row.get('screen_time', 4.5)))
            except (ValueError, TypeError):
                continue

            score = cls.calculate_habit_score(rhr, hrv, sleep, steps)
            records.append({
                'date': dt_str,
                'source': 'Google Fit',
                'resting_heart_rate': rhr,
                'hrv': hrv,
                'sleep_hours': sleep,
                'steps': steps,
                'screen_time_hours': screen_time,
                'habit_score': score,
            })
        return records

    @classmethod
    def process_and_encrypt_batch(cls, user, records: List[Dict[str, Any]]) -> Tuple[int, str]:
        """
        Encrypts records at rest using user's salt and commits to HabitTelemetrySeries.
        Returns count and canonical SHA-256 batch hash.
        """
        salt = user.vault_profile.vault_key_salt
        count = 0
        canonical_batch = []

        for rec in records:
            d_obj = datetime.strptime(rec['date'], '%Y-%m-%d').date()
            canonical_batch.append(rec)
            
            # Encrypt individual daily telemetry blob
            cipher_blob = AegisCryptoEngine.encrypt_payload(rec, salt)
            
            HabitTelemetrySeries.objects.update_or_create(
                user=user,
                metric_date=d_obj,
                defaults={
                    'encrypted_metrics_blob': cipher_blob,
                    'habit_score': rec['habit_score']
                }
            )
            count += 1

        batch_sha256 = AegisCryptoEngine.compute_canonical_sha256(canonical_batch)
        
        # Save a master batch health record
        EncryptedHealthRecord.objects.create(
            user=user,
            record_type='WEARABLE_BATCH',
            title=f"Wearable Telemetry ({records[0]['source'] if records else 'Sync'}) - {len(records)} Days",
            encrypted_payload=AegisCryptoEngine.encrypt_payload(canonical_batch, salt),
            record_sha256=batch_sha256
        )

        return count, batch_sha256
