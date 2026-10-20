from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.usuarios.urls')),
    path('api/', include('apps.pacientes.urls')),
    path('api/agenda/', include('apps.agenda.urls')),
    path('api/prontuario/', include('apps.prontuario.urls')),
]
