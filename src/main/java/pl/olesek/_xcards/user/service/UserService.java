package pl.olesek._xcards.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.olesek._xcards.common.exception.UserNotFoundException;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;
import pl.olesek._xcards.user.dto.UserProfileResponse;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#userId")
    public UserProfileResponse getUserProfile(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        log.debug("User profile retrieved: {}", userId);
        return UserProfileResponse.from(user);
    }
}

