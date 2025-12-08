package pl.olesek._xcards.common.exception;

import jakarta.servlet.http.HttpServletRequest;

import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import pl.olesek._xcards.auth.exception.InvalidCredentialsException;
import pl.olesek._xcards.auth.exception.InvalidTokenException;
import pl.olesek._xcards.auth.exception.RateLimitExceededException;
import pl.olesek._xcards.auth.exception.TokenExpiredException;
import pl.olesek._xcards.auth.exception.UserAlreadyExistsException;
import pl.olesek._xcards.common.dto.ErrorResponse;
import pl.olesek._xcards.deck.exception.DeckAlreadyExistsException;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.flashcard.exception.FlashcardNotFoundException;

import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.BAD_REQUEST.value(),
                "Bad Request", message, request.getRequestURI());

        log.warn("Validation error: {}", message);
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleUserAlreadyExists(UserAlreadyExistsException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.CONFLICT.value(),
                "Conflict", ex.getMessage(), request.getRequestURI());

        log.warn("User already exists: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized", ex.getMessage(), request.getRequestURI());

        log.warn("Invalid credentials attempt from IP: {}", request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized", ex.getMessage(), request.getRequestURI());

        log.warn("Invalid token: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(TokenExpiredException.class)
    public ResponseEntity<ErrorResponse> handleTokenExpired(TokenExpiredException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.GONE.value(), "Gone",
                ex.getMessage(), request.getRequestURI());

        log.info("Token expired: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.GONE).body(error);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(RateLimitExceededException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(), "Too Many Requests", ex.getMessage(),
                request.getRequestURI());

        log.warn("Rate limit exceeded from IP: {} for endpoint: {}", request.getRemoteAddr(),
                request.getRequestURI());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.NOT_FOUND.value(),
                "Not Found", ex.getMessage(), request.getRequestURI());

        log.warn("User not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AccountDisabledException.class)
    public ResponseEntity<ErrorResponse> handleAccountDisabled(AccountDisabledException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized", ex.getMessage(), request.getRequestURI());

        log.warn("Account disabled: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(DeckNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDeckNotFound(DeckNotFoundException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.NOT_FOUND.value(),
                "Not Found", ex.getMessage(), request.getRequestURI());

        log.warn("Deck not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(DeckAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleDeckAlreadyExists(
            DeckAlreadyExistsException ex, HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.CONFLICT.value(),
                "Conflict", ex.getMessage(), request.getRequestURI());

        log.warn("Deck already exists: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(FlashcardNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleFlashcardNotFound(
            FlashcardNotFoundException ex, HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.NOT_FOUND.value(),
                "Not Found", ex.getMessage(), request.getRequestURI());

        log.warn("Flashcard not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(), HttpStatus.BAD_REQUEST.value(),
                "Bad Request", ex.getMessage(), request.getRequestURI());

        log.warn("Invalid argument: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal Server Error",
                "An unexpected error occurred", request.getRequestURI());

        log.error("Unexpected error: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

