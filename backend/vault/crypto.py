import base64
import json
import hashlib
import os
from typing import Any, Dict, Tuple, Union
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings

class AegisCryptoEngine:
    """
    AES-256 Fernet zero-trust encryption engine with ephemeral key derivation.
    Guarantees zero plaintext PHI/PII at rest in database columns.
    """
    
    @staticmethod
    def generate_vault_salt() -> bytes:
        """Generate a cryptographically secure random 16-byte salt for user vault."""
        return os.urandom(16)

    @classmethod
    def derive_user_vault_key(cls, user_salt: bytes, user_secret: str = None) -> bytes:
        """
        Derives a 32-byte key formatted for Fernet (urlsafe base64) using PBKDF2HMAC.
        Uses master server secret combined with optional user password/secret and salt.
        """
        if not user_secret:
            user_secret = getattr(settings, 'AEGIS_MASTER_VAULT_KEY', 'AegisSelfZeroTrustSuperSecretMasterKey32BytesLong!')
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=user_salt,
            iterations=100000,
        )
        derived_key = kdf.derive(user_secret.encode('utf-8'))
        return base64.urlsafe_b64encode(derived_key)

    @classmethod
    def encrypt_payload(cls, payload_data: Union[Dict[str, Any], str, list], user_salt: bytes, user_secret: str = None) -> bytes:
        """
        Encrypts arbitrary structured data into AES-256 Fernet ciphertext bytes.
        """
        key = cls.derive_user_vault_key(user_salt, user_secret)
        fernet = Fernet(key)
        
        if not isinstance(payload_data, str):
            json_str = json.dumps(payload_data, sort_keys=True, default=str)
        else:
            json_str = payload_data
            
        ciphertext = fernet.encrypt(json_str.encode('utf-8'))
        return ciphertext

    @classmethod
    def decrypt_payload(cls, ciphertext: Union[bytes, memoryview], user_salt: bytes, user_secret: str = None) -> Any:
        """
        Decrypts AES-256 Fernet ciphertext bytes in ephemeral memory and parses JSON.
        Returns parsed structured data. Ciphertext is never leaked into plaintext tables.
        """
        key = cls.derive_user_vault_key(user_salt, user_secret)
        fernet = Fernet(key)
        
        if isinstance(ciphertext, memoryview):
            ciphertext = bytes(ciphertext)
            
        decrypted_bytes = fernet.decrypt(ciphertext)
        decrypted_str = decrypted_bytes.decode('utf-8')
        
        try:
            return json.loads(decrypted_str)
        except json.JSONDecodeError:
            return decrypted_str

    @staticmethod
    def compute_canonical_sha256(data: Union[Dict[str, Any], list, str, bytes]) -> str:
        """
        Computes deterministic SHA-256 hash of unencrypted canonical record
        for on-chain cryptographic anchoring on Ethereum/Ganache.
        """
        if isinstance(data, (dict, list)):
            canonical_bytes = json.dumps(data, sort_keys=True, separators=(',', ':'), default=str).encode('utf-8')
        elif isinstance(data, str):
            canonical_bytes = data.encode('utf-8')
        elif isinstance(data, bytes):
            canonical_bytes = data
        else:
            canonical_bytes = str(data).encode('utf-8')

        return hashlib.sha256(canonical_bytes).hexdigest()

    @staticmethod
    def hash_scope(scope_string: str) -> str:
        """Computes bytes32 hex representation of scope string."""
        return '0x' + hashlib.sha256(scope_string.encode('utf-8')).hexdigest()
