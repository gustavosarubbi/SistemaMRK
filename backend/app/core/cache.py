"""
Sistema de cache em memória simples para endpoints da API.
Usa TTL (Time To Live) para invalidar automaticamente entradas antigas.
"""
from typing import Any, Optional
from datetime import datetime, timedelta
import threading

class CacheEntry:
    """Entrada de cache com valor e timestamp de expiração."""
    def __init__(self, value: Any, ttl_seconds: int = 60):
        self.value = value
        self.created_at = datetime.now()
        self.ttl = timedelta(seconds=ttl_seconds)
    
    def is_expired(self) -> bool:
        """Verifica se a entrada expirou."""
        return datetime.now() - self.created_at > self.ttl

class SimpleCache:
    """Cache em memória thread-safe com TTL."""
    
    def __init__(self):
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Obtém um valor do cache se existir e não estiver expirado."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            
            if entry.is_expired():
                # Remove entrada expirada
                del self._cache[key]
                return None
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        """Armazena um valor no cache com TTL especificado."""
        with self._lock:
            self._cache[key] = CacheEntry(value, ttl_seconds)
    
    def delete(self, key: str) -> None:
        """Remove uma entrada do cache."""
        with self._lock:
            self._cache.pop(key, None)
    
    def clear(self) -> None:
        """Limpa todo o cache."""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove todas as entradas expiradas."""
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                del self._cache[key]

# Instância global do cache
cache = SimpleCache()




