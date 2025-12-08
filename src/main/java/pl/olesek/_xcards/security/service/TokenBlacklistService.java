package pl.olesek._xcards.security.service;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Note: For production with multiple instances, consider using Redis for distributed blacklist.
 */
@Service
@Slf4j
public class TokenBlacklistService {

    private final Map<String, Instant> blacklistedTokens = new ConcurrentHashMap<>();

    private final ScheduledExecutorService cleanupScheduler = Executors.newSingleThreadScheduledExecutor();

    public TokenBlacklistService() {
        cleanupScheduler.scheduleAtFixedRate(this::cleanupExpiredTokens, 1, 1, TimeUnit.HOURS);
        log.info("TokenBlacklistService initialized with automatic cleanup");
    }

    public void blacklist(String token, Duration ttl) {
        Instant expirationTime = Instant.now().plus(ttl);
        blacklistedTokens.put(token, expirationTime);
        log.debug("Token added to blacklist, expires at: {}", expirationTime);
    }

    public boolean isBlacklisted(String token) {
        Instant expirationTime = blacklistedTokens.get(token);

        if (expirationTime == null) {
            return false;
        }

        if (Instant.now().isAfter(expirationTime)) {
            blacklistedTokens.remove(token);
            return false;
        }

        return true;
    }

    private void cleanupExpiredTokens() {
        Instant now = Instant.now();
        AtomicInteger removedCount = new AtomicInteger(0);

        blacklistedTokens.entrySet().removeIf(entry -> {
            if (now.isAfter(entry.getValue())) {
                removedCount.incrementAndGet();
                return true;
            }
            return false;
        });

        if (removedCount.get() > 0) {
            log.info("Cleaned up {} expired tokens from blacklist. Remaining: {}",
                    removedCount.get(), blacklistedTokens.size());
        }
    }
}

