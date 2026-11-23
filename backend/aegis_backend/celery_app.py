import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aegis_backend.settings')

try:
    from celery import Celery
    app = Celery('aegis_backend')
    app.config_from_object('django.conf:settings', namespace='CELERY')
    app.autodiscover_tasks()
except ImportError:
    class DummyCelery:
        def task(self, *args, **kwargs):
            def decorator(func):
                func.delay = func
                func.apply_async = lambda args=(), kwargs={}: func(*args, **kwargs)
                return func
            return decorator
        def autodiscover_tasks(self):
            pass
        def config_from_object(self, *args, **kwargs):
            pass
    app = DummyCelery()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
