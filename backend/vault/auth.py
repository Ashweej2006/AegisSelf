import jwt
import datetime
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication, exceptions

JWT_SECRET = getattr(settings, 'SECRET_KEY', 'aegis-secret')
JWT_ALGORITHM = 'HS256'

def generate_tokens_for_user(user: User, vault_unlocked: bool = False, unlock_duration_minutes: int = 15) -> dict:
    """Generates standard access token and optional short-lived vault unlock token."""
    now = datetime.datetime.now(datetime.timezone.utc)
    
    access_payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': now + datetime.timedelta(minutes=60),
        'iat': now,
        'type': 'access',
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    refresh_payload = {
        'user_id': user.id,
        'exp': now + datetime.timedelta(days=7),
        'iat': now,
        'type': 'refresh',
    }
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    vault_token = None
    if vault_unlocked:
        vault_payload = {
            'user_id': user.id,
            'vault_unlocked': True,
            'exp': now + datetime.timedelta(minutes=unlock_duration_minutes),
            'iat': now,
            'type': 'vault_unlock',
        }
        vault_token = jwt.encode(vault_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        'access': access_token,
        'refresh': refresh_token,
        'vault_token': vault_token,
        'expires_in': 3600,
    }

def verify_vault_unlock_token(token: str, user: User) -> bool:
    """Verifies if the biometric vault unlock token is valid and not expired."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('type') == 'vault_unlock' and payload.get('user_id') == user.id and payload.get('vault_unlocked'):
            return True
    except Exception:
        return False
    return False


class AegisJWTAuthentication(authentication.BaseAuthentication):
    """
    Stateless JWT Authentication Handler for DRF.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('user_id')
            if not user_id:
                raise exceptions.AuthenticationFailed('Invalid token payload')
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise exceptions.AuthenticationFailed('User does not exist')

            if not user.is_active:
                raise exceptions.AuthenticationFailed('User is inactive')

            # Attach vault_unlocked status to request if X-Vault-Token header is present
            vault_token = request.headers.get('X-Vault-Token')
            request.vault_unlocked = verify_vault_unlock_token(vault_token, user)

            return (user, token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Authentication token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid authentication token')
