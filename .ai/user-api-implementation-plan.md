# API Endpoint Implementation Plan: Authentication & User Management

## 1. Przegląd punktów końcowych

System autentykacji i zarządzania użytkownikami obejmuje 7 endpointów REST API odpowiedzialnych za:
- Rejestrację nowych użytkowników z walidacją email i hasła
- Logowanie użytkowników z mechanizmem JWT (access i refresh tokens)
- Odświeżanie tokenów dostępu
- Wylogowanie (unieważnienie sesji)
- Proces resetowania hasła przez email (żądanie i potwierdzenie)
- Pobieranie profilu zalogowanego użytkownika

System wykorzystuje Spring Security do autentykacji, JWT do tokenów sesji, BCrypt do hashowania haseł oraz mechanizmy rate limitingu dla ochrony przed atakami brute-force.

---

## 2. Szczegóły żądań

### 2.1. Register New User
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/register`
- **Parametry:**
  - **Wymagane (Request Body):**
    - `email` (String) - adres email, format zgodny z RFC 5322, max 255 znaków
    - `password` (String) - hasło, min 8 znaków, musi zawierać wielką literę, małą literę, cyfrę i znak specjalny
  - **Opcjonalne:** brak
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### 2.2. Login
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/login`
- **Parametry:**
  - **Wymagane (Request Body):**
    - `email` (String) - adres email użytkownika
    - `password` (String) - hasło użytkownika
  - **Opcjonalne:** brak
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Rate Limiting:** 5 prób na 15 minut na IP

### 2.3. Refresh Token
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/refresh`
- **Parametry:**
  - **Wymagane (Request Body):**
    - `refreshToken` (String) - JWT refresh token
  - **Opcjonalne:** brak
- **Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

### 2.4. Logout
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/logout`
- **Parametry:**
  - **Wymagane (Headers):**
    - `Authorization: Bearer {accessToken}`
  - **Opcjonalne:** brak
- **Request Body:** brak

### 2.5. Request Password Reset
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/password-reset/request`
- **Parametry:**
  - **Wymagane (Request Body):**
    - `email` (String) - adres email użytkownika
  - **Opcjonalne:** brak
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Rate Limiting:** 3 żądania na godzinę na email

### 2.6. Reset Password
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/auth/password-reset/confirm`
- **Parametry:**
  - **Wymagane (Request Body):**
    - `token` (String) - token resetowania hasła z emaila
    - `newPassword` (String) - nowe hasło, wymagania jak przy rejestracji
  - **Opcjonalne:** brak
- **Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

### 2.7. Get Current User Profile
- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/users/me`
- **Parametry:**
  - **Wymagane (Headers):**
    - `Authorization: Bearer {accessToken}`
  - **Opcjonalne:** brak
- **Request Body:** brak

---

## 3. Wykorzystywane typy

### 3.1. Request DTOs (Java Records)

#### RegisterRequest
```java
public record RegisterRequest(
    @NotNull(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    String email,
    
    @NotNull(message = "Password is required")
    @ValidPassword
    String password
) {}
```

#### LoginRequest
```java
public record LoginRequest(
    @NotNull(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,
    
    @NotNull(message = "Password is required")
    String password
) {}
```

#### RefreshTokenRequest
```java
public record RefreshTokenRequest(
    @NotNull(message = "Refresh token is required")
    @NotBlank(message = "Refresh token must not be blank")
    String refreshToken
) {}
```

#### PasswordResetRequestDto
```java
public record PasswordResetRequestDto(
    @NotNull(message = "Email is required")
    @Email(message = "Invalid email format")
    String email
) {}
```

#### PasswordResetConfirmDto
```java
public record PasswordResetConfirmDto(
    @NotNull(message = "Token is required")
    @NotBlank(message = "Token must not be blank")
    String token,
    
    @NotNull(message = "New password is required")
    @ValidPassword
    String newPassword
) {}
```

### 3.2. Response DTOs (Java Records)

#### AuthResponse
```java
public record AuthResponse(
    UUID id,
    String email,
    String role,
    Integer monthlyAiLimit,
    Integer aiUsageInCurrentMonth,
    String accessToken,
    String refreshToken
) {
    public static AuthResponse from(UserEntity user, String accessToken, String refreshToken) {
        return new AuthResponse(
            user.getId(),
            user.getEmail(),
            user.getRole(),
            user.getMonthlyAiLimit(),
            user.getAiUsageInCurrentMonth(),
            accessToken,
            refreshToken
        );
    }
}
```

#### RefreshTokenResponse
```java
public record RefreshTokenResponse(
    String accessToken,
    String refreshToken
) {}
```

#### UserProfileResponse
```java
public record UserProfileResponse(
    UUID id,
    String email,
    String role,
    Integer monthlyAiLimit,
    Integer aiUsageInCurrentMonth,
    Instant createdAt,
    Instant updatedAt
) {
    public static UserProfileResponse from(UserEntity user) {
        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getRole(),
            user.getMonthlyAiLimit(),
            user.getAiUsageInCurrentMonth(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
```

#### MessageResponse
```java
public record MessageResponse(
    String message
) {}
```

### 3.3. Custom Validation Annotations

#### @ValidPassword
```java
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordValidator.class)
public @interface ValidPassword {
    String message() default "Password must be at least 8 characters long and contain uppercase, lowercase, digit, and special character";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

#### PasswordValidator
```java
public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {
    private static final String PASSWORD_PATTERN = 
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$";
    
    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }
        return password.matches(PASSWORD_PATTERN);
    }
}
```

### 3.4. Custom Exceptions

```java
public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String email) {
        super("User with email " + email + " already exists");
    }
}

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("Invalid email or password");
    }
}

public class InvalidTokenException extends RuntimeException {
    public InvalidTokenException(String message) {
        super(message);
    }
}

public class TokenExpiredException extends RuntimeException {
    public TokenExpiredException(String message) {
        super(message);
    }
}

public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
```

### 3.5. Entities

Istniejąca encja `UserEntity` (brak zmian):
- Zawiera wszystkie wymagane pola dla autentykacji
- `password_reset_token` i `password_reset_token_expiry` już dostępne
- Używa `@CreationTimestamp` i `@UpdateTimestamp` z Hibernate

---

## 4. Szczegóły odpowiedzi

### 4.1. Register New User
**Success Response: `201 Created`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 0,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request` - walidacja nie powiodła się (email, hasło)
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Password must be at least 8 characters long and contain uppercase, lowercase, digit, and special character",
  "path": "/api/auth/register"
}
```
- `409 Conflict` - email już istnieje
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "User with email user@example.com already exists",
  "path": "/api/auth/register"
}
```

### 4.2. Login
**Success Response: `200 OK`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 45,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - nieprawidłowe dane logowania
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "path": "/api/auth/login"
}
```
- `429 Too Many Requests` - przekroczony limit prób logowania
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Too many login attempts. Please try again in 15 minutes",
  "path": "/api/auth/login"
}
```

### 4.3. Refresh Token
**Success Response: `200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - nieprawidłowy lub wygasły refresh token
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token",
  "path": "/api/auth/refresh"
}
```

### 4.4. Logout
**Success Response: `204 No Content`**
- Brak treści odpowiedzi

**Error Responses:**
- `401 Unauthorized` - brak lub nieprawidłowy token

### 4.5. Request Password Reset
**Success Response: `200 OK`**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Error Responses:**
- `429 Too Many Requests` - przekroczony limit żądań
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Too many password reset requests. Please try again in 1 hour",
  "path": "/api/auth/password-reset/request"
}
```

### 4.6. Reset Password
**Success Response: `200 OK`**
```json
{
  "message": "Password has been reset successfully."
}
```

**Error Responses:**
- `400 Bad Request` - nieprawidłowy token lub hasło
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid password reset token",
  "path": "/api/auth/password-reset/confirm"
}
```
- `410 Gone` - token wygasł (po 24 godzinach)
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 410,
  "error": "Gone",
  "message": "Password reset token has expired",
  "path": "/api/auth/password-reset/confirm"
}
```

### 4.7. Get Current User Profile
**Success Response: `200 OK`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 45,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:45:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - brak lub nieprawidłowy token

---

## 5. Przepływ danych

### 5.1. Rejestracja użytkownika

```
Client → POST /api/auth/register
  ↓
AuthController.register(@Valid RegisterRequest)
  ↓
Walidacja Bean Validation (email, password)
  ↓
AuthService.register(RegisterRequest)
  ↓
1. Sprawdzenie czy email nie istnieje (UserRepository.existsByEmail)
   - Jeśli istnieje → throw UserAlreadyExistsException (409)
  ↓
2. Konwersja email na lowercase i trim
  ↓
3. Hashowanie hasła (BCrypt, cost factor 12)
  ↓
4. Utworzenie UserEntity:
   - email = email (lowercase)
   - passwordHash = hashedPassword
   - role = "USER"
   - enabled = true
   - monthlyAiLimit = 100
   - aiUsageInCurrentMonth = 0
  ↓
5. Zapis do bazy danych (UserRepository.save)
  ↓
6. Generowanie JWT tokens (JwtService)
   - accessToken (ważność: 15 minut)
   - refreshToken (ważność: 7 dni)
  ↓
7. Mapowanie UserEntity → AuthResponse
  ↓
ResponseEntity<AuthResponse> (201 Created)
  ↓
Client
```

### 5.2. Logowanie użytkownika

```
Client → POST /api/auth/login
  ↓
RateLimitFilter (sprawdzenie limitu na IP)
  - Jeśli przekroczony → throw RateLimitExceededException (429)
  ↓
AuthController.login(@Valid LoginRequest)
  ↓
Walidacja Bean Validation (email)
  ↓
AuthService.login(LoginRequest)
  ↓
1. Konwersja email na lowercase
  ↓
2. Pobranie użytkownika (UserRepository.findByEmail)
   - Jeśli nie istnieje → throw InvalidCredentialsException (401)
  ↓
3. Weryfikacja hasła (BCrypt.matches)
   - Jeśli nieprawidłowe → throw InvalidCredentialsException (401)
  ↓
4. Sprawdzenie czy konto aktywne (user.enabled)
   - Jeśli disabled → throw AccountDisabledException (401)
  ↓
5. Generowanie JWT tokens (JwtService)
   - accessToken (ważność: 15 minut)
   - refreshToken (ważność: 7 dni)
  ↓
6. Mapowanie UserEntity → AuthResponse
  ↓
ResponseEntity<AuthResponse> (200 OK)
  ↓
Client
```

### 5.3. Odświeżanie tokenu

```
Client → POST /api/auth/refresh
  ↓
AuthController.refresh(@Valid RefreshTokenRequest)
  ↓
Walidacja Bean Validation (refreshToken)
  ↓
AuthService.refreshToken(RefreshTokenRequest)
  ↓
1. Walidacja refresh tokenu (JwtService.validateToken)
   - Jeśli nieprawidłowy → throw InvalidTokenException (401)
   - Jeśli wygasły → throw TokenExpiredException (401)
  ↓
2. Ekstrakcja userId z tokenu (JwtService.getUserIdFromToken)
  ↓
3. Pobranie użytkownika (UserRepository.findById)
   - Jeśli nie istnieje → throw InvalidTokenException (401)
  ↓
4. Sprawdzenie czy token nie jest na czarnej liście (TokenBlacklistService)
   - Jeśli jest → throw InvalidTokenException (401)
  ↓
5. Generowanie nowych JWT tokens (JwtService)
   - nowy accessToken (ważność: 15 minut)
   - nowy refreshToken (ważność: 7 dni)
  ↓
6. Dodanie starego refresh tokenu na czarną listę
  ↓
7. Mapowanie → RefreshTokenResponse
  ↓
ResponseEntity<RefreshTokenResponse> (200 OK)
  ↓
Client
```

### 5.4. Wylogowanie

```
Client → POST /api/auth/logout
  ↓
Spring Security Filter (JwtAuthenticationFilter)
  - Ekstrakcja i walidacja JWT z nagłówka Authorization
  ↓
AuthController.logout(Authentication)
  ↓
AuthService.logout(userId, accessToken, refreshToken)
  ↓
1. Dodanie access tokenu na czarną listę (TokenBlacklistService)
  ↓
2. Dodanie refresh tokenu na czarną listę (TokenBlacklistService)
  ↓
ResponseEntity<Void> (204 No Content)
  ↓
Client
```

### 5.5. Żądanie resetowania hasła

```
Client → POST /api/auth/password-reset/request
  ↓
RateLimitFilter (sprawdzenie limitu na email)
  - Jeśli przekroczony → throw RateLimitExceededException (429)
  ↓
AuthController.requestPasswordReset(@Valid PasswordResetRequestDto)
  ↓
Walidacja Bean Validation (email)
  ↓
PasswordResetService.requestPasswordReset(email)
  ↓
1. Konwersja email na lowercase
  ↓
2. Pobranie użytkownika (UserRepository.findByEmail)
   - Jeśli nie istnieje → zwróć success response (nie ujawniaj czy email istnieje)
  ↓
3. Generowanie bezpiecznego losowego tokenu (UUID)
  ↓
4. Ustawienie tokenu i expiry w UserEntity:
   - passwordResetToken = token
   - passwordResetTokenExpiry = now + 24 hours
  ↓
5. Zapis do bazy danych (UserRepository.save)
  ↓
6. Wysłanie emaila z linkiem resetującym (EmailService)
   - Link: {frontendUrl}/reset-password?token={token}
   - W przypadku błędu wysyłki → logowanie, ale nie rzucanie wyjątku
  ↓
7. Mapowanie → MessageResponse
  ↓
ResponseEntity<MessageResponse> (200 OK)
  ↓
Client
```

### 5.6. Potwierdzenie resetowania hasła

```
Client → POST /api/auth/password-reset/confirm
  ↓
AuthController.confirmPasswordReset(@Valid PasswordResetConfirmDto)
  ↓
Walidacja Bean Validation (token, newPassword)
  ↓
PasswordResetService.confirmPasswordReset(token, newPassword)
  ↓
1. Pobranie użytkownika po tokenie (UserRepository.findByPasswordResetToken)
   - Jeśli nie istnieje → throw InvalidTokenException (400)
  ↓
2. Sprawdzenie ważności tokenu (passwordResetTokenExpiry > now)
   - Jeśli wygasły → throw TokenExpiredException (410)
  ↓
3. Hashowanie nowego hasła (BCrypt, cost factor 12)
  ↓
4. Aktualizacja użytkownika:
   - passwordHash = newHashedPassword
   - passwordResetToken = null
   - passwordResetTokenExpiry = null
  ↓
5. Zapis do bazy danych (UserRepository.save)
  ↓
6. Dodanie wszystkich aktywnych tokenów użytkownika na czarną listę
   (wymuszenie ponownego logowania)
  ↓
7. Mapowanie → MessageResponse
  ↓
ResponseEntity<MessageResponse> (200 OK)
  ↓
Client
```

### 5.7. Pobieranie profilu użytkownika

```
Client → GET /api/users/me
  ↓
Spring Security Filter (JwtAuthenticationFilter)
  - Ekstrakcja i walidacja JWT z nagłówka Authorization
  - Ustawienie Authentication w SecurityContext
  ↓
UserController.getCurrentUser(Authentication)
  ↓
1. Pobranie userId z Authentication
  ↓
UserService.getUserProfile(userId)
  ↓
2. Pobranie użytkownika (UserRepository.findById)
   - Jeśli nie istnieje → throw UserNotFoundException (404)
  ↓
3. Mapowanie UserEntity → UserProfileResponse
  ↓
ResponseEntity<UserProfileResponse> (200 OK)
  ↓
Client
```

---

## 6. Względy bezpieczeństwa

### 6.1. Mechanizm autentykacji JWT

**Struktura tokenów:**

**Access Token:**
- Typ: JWT (JSON Web Token)
- Algorytm: HS256 (HMAC with SHA-256)
- Ważność: 15 minut
- Payload:
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "role": "USER",
    "type": "access",
    "iat": 1705756800,
    "exp": 1705757700
  }
  ```

**Refresh Token:**
- Typ: JWT
- Algorytm: HS256
- Ważność: 7 dni
- Payload:
  ```json
  {
    "sub": "user-uuid",
    "type": "refresh",
    "iat": 1705756800,
    "exp": 1706361600
  }
  ```

**Secret Key:**
- Przechowywany w `application.properties` jako `jwt.secret`
- Minimum 256 bitów (32 znaki)
- Używać zmiennej środowiskowej w produkcji
- Rotacja klucza co 90 dni (zalecane)

### 6.2. Hashowanie haseł

**BCrypt:**
- Algorytm: BCrypt z Salt
- Cost factor: 12 (można zwiększyć do 14 dla większego bezpieczeństwa)
- Implementacja: Spring Security BCryptPasswordEncoder
- Każde hasło ma unikalny salt
- Weryfikacja: `BCryptPasswordEncoder.matches(rawPassword, hashedPassword)`

**Walidacja siły hasła:**
- Minimum 8 znaków
- Conajmniej jedna wielka litera (A-Z)
- Conajmniej jedna mała litera (a-z)
- Conajmniej jedna cyfra (0-9)
- Conajmniej jeden znak specjalny (@$!%*?&#)
- Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$`

### 6.3. Rate Limiting

**Implementacja:**
- Biblioteka: Spring Security + Bucket4j lub Resilience4j
- Storage: In-memory ConcurrentHashMap
- Algorytm: Token Bucket

**Limity:**

**Login (POST /api/auth/login):**
- Limit: 5 prób na 15 minut
- Klucz: IP address
- Zachowanie: Po przekroczeniu limitu zwróć 429 z czasem do następnej próby

**Password Reset Request (POST /api/auth/password-reset/request):**
- Limit: 3 żądania na 1 godzinę
- Klucz: email address
- Zachowanie: Po przekroczeniu limitu zwróć 429 z czasem do następnej próby

**Implementacja RateLimitService:**
```java
@Service
public class RateLimitService {
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();
    
    public boolean tryConsume(String key, int maxTokens, Duration refillPeriod) {
        TokenBucket bucket = buckets.computeIfAbsent(key, 
            k -> TokenBucket.create(maxTokens, refillPeriod));
        return bucket.tryConsume();
    }
}
```

### 6.4. Token Blacklist (wylogowanie)

**Cel:**
- Unieważnienie tokenów po wylogowaniu
- Unieważnienie tokenów po zmianie hasła
- Ochrona przed użyciem skradzionych tokenów

**Implementacja:**
- Storage: Redis (zalecane) lub in-memory cache
- Struktura: Set<String> z tokenem jako kluczem
- TTL: czas wygaśnięcia tokenu (7 dni dla refresh, 15 minut dla access)
- Sprawdzanie przy każdym żądaniu z JWT

**TokenBlacklistService:**
```java
@Service
public class TokenBlacklistService {
    private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();
    
    public void blacklist(String token, Duration ttl) {
        blacklistedTokens.add(token);
        // Schedule removal after TTL
        scheduler.schedule(() -> blacklistedTokens.remove(token), ttl);
    }
    
    public boolean isBlacklisted(String token) {
        return blacklistedTokens.contains(token);
    }
}
```

### 6.5. Spring Security Configuration

**SecurityFilterChain:**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // JWT nie wymaga CSRF
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .sessionManagement(session -> 
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtAuthenticationFilter, 
            UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

**JwtAuthenticationFilter:**
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain filterChain) {
        String token = extractTokenFromHeader(request);
        
        if (token != null && jwtService.validateToken(token)) {
            if (!tokenBlacklistService.isBlacklisted(token)) {
                UUID userId = jwtService.getUserIdFromToken(token);
                Authentication auth = new JwtAuthentication(userId);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

### 6.6. Bezpieczeństwo resetowania hasła

**Token resetowania:**
- Format: UUID v4 (128-bit, kryptograficznie bezpieczny)
- Generowanie: `UUID.randomUUID().toString()`
- Długość: 36 znaków (z myślnikami)
- Jednorazowe użycie (usuwany po użyciu)
- Ważność: 24 godziny

**Ochrona przed atakami:**

**Email enumeration prevention:**
- Zawsze zwracaj ten sam komunikat, niezależnie czy email istnieje:
  "If an account exists with this email, a password reset link has been sent."
- Nie ujawniaj czy użytkownik istnieje

**Timing attack prevention:**
- Wykonuj te same operacje niezależnie od wyniku (stały czas odpowiedzi)

**Token guessing prevention:**
- UUID v4 ma 2^122 możliwych wartości (praktycznie niemożliwe do zgadnięcia)
- Rate limiting: 3 próby na godzinę

### 6.7. HTTPS i nagłówki bezpieczeństwa

**Wymagania produkcyjne:**
- Wymuszenie HTTPS (redirect HTTP → HTTPS)
- HSTS (HTTP Strict Transport Security)
- Secure cookies (HttpOnly, Secure, SameSite=Strict)

**Security Headers:**
```properties
# application.properties
server.ssl.enabled=true
security.require-ssl=true
```

**Spring Security Headers:**
```java
http.headers(headers -> headers
    .contentSecurityPolicy("default-src 'self'")
    .frameOptions().deny()
    .xssProtection().enable()
);
```

### 6.8. Walidacja danych wejściowych

**Bean Validation:**
- Wszystkie DTOs wykorzystują JSR-380 Bean Validation
- `@Valid` w kontrolerach zapewnia automatyczną walidację
- Custom validators dla złożonych reguł (np. @ValidPassword)

**SQL Injection Prevention:**
- JPA używa prepared statements (parametryzowane zapytania)
- Nigdy nie konkatenuj SQL z danymi użytkownika
- Używaj `@Query` z named parameters

**XSS Prevention:**
- Backend nie renderuje HTML (to zadanie frontendu)
- Frontend używa React (automatyczne escapowanie)
- Content-Type: application/json

---

## 7. Obsługa błędów

### 7.1. Centralizacja obsługi błędów

**GlobalExceptionHandler (@ControllerAdvice):**

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.joining(", "));
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "Bad Request",
            message,
            request.getRequestURI()
        );
        
        log.warn("Validation error: {}", message);
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleUserAlreadyExists(
            UserAlreadyExistsException ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.CONFLICT.value(),
            "Conflict",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        log.warn("User already exists: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            "Unauthorized",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        log.warn("Invalid credentials attempt from IP: {}", 
            request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(
            InvalidTokenException ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            "Unauthorized",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        log.warn("Invalid token: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(TokenExpiredException.class)
    public ResponseEntity<ErrorResponse> handleTokenExpired(
            TokenExpiredException ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.GONE.value(),
            "Gone",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        log.info("Token expired: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.GONE).body(error);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(
            RateLimitExceededException ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.TOO_MANY_REQUESTS.value(),
            "Too Many Requests",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        log.warn("Rate limit exceeded from IP: {} for endpoint: {}", 
            request.getRemoteAddr(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "Internal Server Error",
            "An unexpected error occurred",
            request.getRequestURI()
        );
        
        log.error("Unexpected error: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(error);
    }
}
```

### 7.2. ErrorResponse DTO

```java
public record ErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path
) {}
```

### 7.3. Scenariusze błędów i kody statusu

| Scenariusz | Status Code | Exception | Message |
|-----------|-------------|-----------|---------|
| Nieprawidłowy format email | 400 | MethodArgumentNotValidException | "Invalid email format" |
| Hasło nie spełnia wymagań | 400 | MethodArgumentNotValidException | "Password must be at least 8 characters long..." |
| Pusty email lub hasło | 400 | MethodArgumentNotValidException | "Email/Password is required" |
| Nieprawidłowy token resetowania | 400 | InvalidTokenException | "Invalid password reset token" |
| Email już istnieje | 409 | UserAlreadyExistsException | "User with email {email} already exists" |
| Nieprawidłowe dane logowania | 401 | InvalidCredentialsException | "Invalid email or password" |
| Nieprawidłowy JWT token | 401 | InvalidTokenException | "Invalid or expired access token" |
| Nieprawidłowy refresh token | 401 | InvalidTokenException | "Invalid or expired refresh token" |
| Brak nagłówka Authorization | 401 | - | "Missing or invalid Authorization header" |
| Token na czarnej liście | 401 | InvalidTokenException | "Token has been revoked" |
| Token resetowania wygasł | 410 | TokenExpiredException | "Password reset token has expired" |
| Przekroczony limit logowania | 429 | RateLimitExceededException | "Too many login attempts. Please try again in X minutes" |
| Przekroczony limit reset hasła | 429 | RateLimitExceededException | "Too many password reset requests. Please try again in X minutes" |
| Błąd serwera (database, email) | 500 | Exception | "An unexpected error occurred" |
| Użytkownik nie znaleziony | 404 | UserNotFoundException | "User not found" |
| Konto wyłączone | 401 | AccountDisabledException | "Account is disabled" |

### 7.4. Logowanie błędów

**Poziomy logowania:**
- `ERROR` - błędy serwera (500), błędy database, błędy wysyłki email
- `WARN` - próby naruszenia bezpieczeństwa, nieprawidłowe dane logowania, rate limiting
- `INFO` - wygasłe tokeny, poprawne operacje
- `DEBUG` - szczegółowe informacje o przepływie (tylko development)

**Przykład logowania:**
```java
@Slf4j
@Service
public class AuthService {
    
    public AuthResponse login(LoginRequest request) {
        log.debug("Login attempt for email: {}", request.email());
        
        try {
            // ... logic ...
            log.info("User logged in successfully: {}", user.getEmail());
            return response;
        } catch (InvalidCredentialsException e) {
            log.warn("Failed login attempt for email: {} from IP: {}", 
                request.email(), requestContext.getRemoteAddr());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during login for email: {}", 
                request.email(), e);
            throw e;
        }
    }
}
```

### 7.5. Bezpieczne komunikaty błędów

**Zasady:**
- Nie ujawniaj szczegółów implementacji (np. nazw tabel, struktur danych)
- Nie ujawniaj czy użytkownik istnieje (email enumeration)
- Nie ujawniaj przyczyny niepowodzenia logowania (email vs hasło)
- Loguj szczegóły do logów serwera, nie do odpowiedzi API

**Przykłady:**
- ❌ Zły: "User with email user@example.com does not exist"
- ✅ Dobry: "Invalid email or password"

- ❌ Zły: "Password is incorrect"
- ✅ Dobry: "Invalid email or password"

- ❌ Zły: "Database connection failed: Connection timeout"
- ✅ Dobry: "An unexpected error occurred"

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

**1. Generowanie tokenów JWT:**
- **Problem:** HMAC SHA-256 jest szybki, ale może być bottleneck przy dużym ruchu
- **Optymalizacja:** 
  - Używać efektywnej biblioteki (jjwt)
  - Rozważyć caching metadanych użytkownika w tokenie
  - Unikać zbędnych operacji database przy każdym żądaniu

**2. Hashowanie haseł BCrypt:**
- **Problem:** BCrypt jest celowo wolny (cost factor 12 = ~250ms)
- **Optymalizacja:** 
  - Wykonywać asynchronicznie gdzie możliwe
  - Używać odpowiedniego cost factor (12 dla większości aplikacji)
  - Nie zwiększać powyżej 14 bez benchmarków

**3. Rate limiting:**
- **Problem:** Operacje na współdzielonych strukturach danych (ConcurrentHashMap)
- **Optymalizacja:** 
  - Używać Redis dla distributed rate limiting
  - Używać Bucket4j (wydajniejszy niż custom implementation)
  - Cleanup expired entries w tle

**4. Token blacklist:**
- **Problem:** Sprawdzanie blacklist przy każdym żądaniu
- **Optymalizacja:** 
  - Używać Redis z TTL (automatic cleanup)
  - Bloomfilter dla pierwszego sprawdzenia (false positives ok)
  - Cache negative results (token not blacklisted)

**5. Database queries:**
- **Problem:** Częste zapytania o użytkownika po email/id
- **Optymalizacja:** 
  - Index na kolumnie email (już istnieje - UNIQUE constraint)
  - Używać @EntityGraph dla eager loading relationships
  - Cache user profile (Redis, 5 minut TTL)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury projektu i dependencies

**1.1. Aktualizacja pom.xml:**
```xml
<!-- Security dependencies -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JWT library -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>

<!-- Email sending -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Rate limiting (optional: Bucket4j) -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.7.0</version>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Cache (optional: for user profile caching) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

**1.2. Konfiguracja application.properties:**
```properties
# JWT Configuration
jwt.secret=${JWT_SECRET:your-256-bit-secret-key-change-in-production}
jwt.access-token-expiration=900000
jwt.refresh-token-expiration=604800000

# Email Configuration
spring.mail.host=${MAIL_HOST:smtp.gmail.com}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Frontend URL (for password reset links)
app.frontend-url=${FRONTEND_URL:http://localhost:3000}

# Rate Limiting
app.rate-limit.login.max-attempts=5
app.rate-limit.login.duration=15m
app.rate-limit.password-reset.max-attempts=3
app.rate-limit.password-reset.duration=1h

# BCrypt strength
app.security.bcrypt-strength=12

# Cache
spring.cache.type=simple
```

**1.3. Struktura pakietów:**
```
pl.olesek._xcards/
├── auth/
│   ├── controller/
│   │   └── AuthController.java
│   ├── dto/
│   │   ├── request/
│   │   │   ├── RegisterRequest.java
│   │   │   ├── LoginRequest.java
│   │   │   ├── RefreshTokenRequest.java
│   │   │   ├── PasswordResetRequestDto.java
│   │   │   └── PasswordResetConfirmDto.java
│   │   └── response/
│   │       ├── AuthResponse.java
│   │       └── RefreshTokenResponse.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── JwtService.java
│   │   ├── PasswordResetService.java
│   │   └── TokenBlacklistService.java
│   ├── exception/
│   │   ├── UserAlreadyExistsException.java
│   │   ├── InvalidCredentialsException.java
│   │   ├── InvalidTokenException.java
│   │   ├── TokenExpiredException.java
│   │   └── RateLimitExceededException.java
│   └── validation/
│       ├── ValidPassword.java
│       └── PasswordValidator.java
├── user/
│   ├── controller/
│   │   └── UserController.java
│   ├── dto/
│   │   └── UserProfileResponse.java
│   ├── service/
│   │   └── UserService.java
│   └── UserEntity.java (already exists)
│   └── UserRepository.java (already exists)
├── security/
│   ├── config/
│   │   └── SecurityConfig.java
│   ├── filter/
│   │   ├── JwtAuthenticationFilter.java
│   │   └── RateLimitFilter.java
│   └── JwtAuthentication.java
├── email/
│   ├── service/
│   │   └── EmailService.java
│   └── template/
│       └── PasswordResetEmailTemplate.java
├── common/
│   ├── dto/
│   │   ├── ErrorResponse.java
│   │   └── MessageResponse.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── UserNotFoundException.java
│   │   └── AccountDisabledException.java
│   └── util/
│       └── RequestContextUtil.java
└── ratelimit/
    └── service/
        └── RateLimitService.java
```

### Krok 2: Implementacja warstwy bezpieczeństwa (Security Layer)

**2.1. Utworzenie JwtService:**
- Metoda generowania access tokenu: `generateAccessToken(UserEntity user)`
- Metoda generowania refresh tokenu: `generateRefreshToken(UserEntity user)`
- Metoda walidacji tokenu: `validateToken(String token)`
- Metoda ekstrakcji userId: `getUserIdFromToken(String token)`
- Metoda ekstrakcji email: `getEmailFromToken(String token)`
- Użycie biblioteki jjwt (io.jsonwebtoken)
- Secret key z application.properties
- Ustawienie expiration time

**2.2. Utworzenie TokenBlacklistService:**
- In-memory Set<String> z ConcurrentHashMap.newKeySet()
- Metoda dodawania tokenu: `blacklist(String token, Duration ttl)`
- Metoda sprawdzania: `isBlacklisted(String token)`
- ScheduledExecutorService do usuwania wygasłych tokenów
- Komentarz o przyszłej migracji na Redis

**2.3. Utworzenie JwtAuthenticationFilter:**
- Extends OncePerRequestFilter
- Ekstrakcja tokenu z nagłówka Authorization
- Walidacja tokenu przez JwtService
- Sprawdzenie blacklist
- Ustawienie Authentication w SecurityContext
- Obsługa wyjątków (nieprawidłowy token)

**2.4. Utworzenie SecurityConfig:**
- Bean SecurityFilterChain
- Wyłączenie CSRF (stateless JWT)
- Konfiguracja CORS
- SessionCreationPolicy.STATELESS
- Permit all dla /api/auth/**
- Authenticated dla pozostałych endpointów
- Dodanie JwtAuthenticationFilter
- Bean BCryptPasswordEncoder (strength z config)
- Bean AuthenticationManager (jeśli potrzebny)

**2.5. Utworzenie JwtAuthentication:**
- Implementacja interfejsu Authentication
- Przechowuje userId i authorities
- Metody: getPrincipal(), getAuthorities(), isAuthenticated()

### Krok 3: Implementacja walidacji i wyjątków

**3.1. Utworzenie custom validation @ValidPassword:**
- Interfejs ValidPassword z @Constraint
- Klasa PasswordValidator implements ConstraintValidator
- Regex dla wymagań hasła
- Message przy niepowodzeniu walidacji

**3.2. Utworzenie custom exceptions:**
- UserAlreadyExistsException (409)
- InvalidCredentialsException (401)
- InvalidTokenException (401)
- TokenExpiredException (410)
- RateLimitExceededException (429)
- UserNotFoundException (404)
- AccountDisabledException (401)
- Wszystkie extends RuntimeException

**3.3. Utworzenie ErrorResponse DTO:**
- Record z polami: timestamp, status, error, message, path
- Zgodne z specyfikacją

**3.4. Utworzenie GlobalExceptionHandler:**
- @ControllerAdvice
- @ExceptionHandler dla każdego typu wyjątku
- Mapowanie exception → ErrorResponse
- Logowanie z odpowiednim poziomem (ERROR, WARN, INFO)
- Metoda handleValidationExceptions dla Bean Validation
- Metoda handleGenericException dla pozostałych (500)

### Krok 4: Implementacja DTOs

**4.1. Request DTOs (jako Java records):**
- RegisterRequest (email, password) + Bean Validation
- LoginRequest (email, password) + Bean Validation
- RefreshTokenRequest (refreshToken) + Bean Validation
- PasswordResetRequestDto (email) + Bean Validation
- PasswordResetConfirmDto (token, newPassword) + Bean Validation

**4.2. Response DTOs (jako Java records):**
- AuthResponse (id, email, role, monthlyAiLimit, aiUsageInCurrentMonth, accessToken, refreshToken)
  - Static method: `from(UserEntity, accessToken, refreshToken)`
- RefreshTokenResponse (accessToken, refreshToken)
- UserProfileResponse (id, email, role, monthlyAiLimit, aiUsageInCurrentMonth, createdAt, updatedAt)
  - Static method: `from(UserEntity)`
- MessageResponse (message)

**4.3. Walidacja w DTOs:**
- @NotNull, @NotBlank dla wymaganych pól
- @Email dla email
- @Size dla maksymalnej długości
- @ValidPassword dla haseł

### Krok 5: Implementacja Rate Limiting

**5.1. Utworzenie RateLimitService:**
- Używanie Bucket4j TokenBucket lub custom implementation
- Map<String, TokenBucket> z ConcurrentHashMap
- Metoda: `tryConsume(String key, int maxTokens, Duration refillPeriod)`
- Automatic cleanup starych bucketów (ScheduledExecutorService)
- Komentarz o przyszłej migracji na Redis

**5.2. Utworzenie RateLimitFilter (opcjonalne):**
- Extends OncePerRequestFilter
- Sprawdzanie rate limit dla /api/auth/login (IP based)
- Throw RateLimitExceededException przy przekroczeniu
- Konfiguracja limitów z application.properties

**5.3. Integracja w AuthService:**
- Sprawdzanie rate limit w metodzie login (IP)
- Sprawdzanie rate limit w metodzie requestPasswordReset (email)
- Throw RateLimitExceededException przy przekroczeniu

### Krok 6: Implementacja Email Service

**6.1. Utworzenie EmailService:**
- @Service z JavaMailSender
- Metoda: `sendPasswordResetEmail(String toEmail, String resetToken)`
- Konstrukcja HTML email template
- Link do frontendu: `{frontendUrl}/reset-password?token={token}`
- Try-catch z logowaniem błędów (nie rzucać wyjątku)
- @Async dla asynchronicznego wysyłania

**6.2. Utworzenie PasswordResetEmailTemplate:**
- Static method generujący HTML email
- Przyjazny dla użytkownika design
- Link z tokenem
- Informacja o ważności (24 godziny)
- Informacja o ignorowaniu jeśli nie żądano

**6.3. Konfiguracja @EnableAsync:**
- W głównej klasie Application lub osobnej konfiguracji
- Bean TaskExecutor dla async operations

### Krok 7: Implementacja AuthService

**7.1. Utworzenie AuthService:**
- @Service z @RequiredArgsConstructor (Lombok)
- Dependency injection: UserRepository, JwtService, BCryptPasswordEncoder, TokenBlacklistService, EmailService, RateLimitService

**7.2. Implementacja metody register:**
```java
@Transactional
public AuthResponse register(RegisterRequest request) {
    1. Trim i lowercase email
    2. Sprawdzenie czy email już istnieje (existsByEmail)
       → throw UserAlreadyExistsException
    3. Hashowanie hasła (BCrypt)
    4. Utworzenie UserEntity:
       - email, passwordHash, role="USER", enabled=true
       - monthlyAiLimit=100, aiUsageInCurrentMonth=0
    5. Zapis do DB (userRepository.save)
    6. Generowanie tokenów (jwtService)
    7. Return AuthResponse.from(user, accessToken, refreshToken)
    8. Logowanie: INFO "User registered: {email}"
}
```

**7.3. Implementacja metody login:**
```java
@Transactional(readOnly = true)
public AuthResponse login(LoginRequest request, String ipAddress) {
    1. Sprawdzenie rate limit (IP based)
       → throw RateLimitExceededException
    2. Trim i lowercase email
    3. Pobranie użytkownika (findByEmail)
       → throw InvalidCredentialsException jeśli nie istnieje
    4. Weryfikacja hasła (passwordEncoder.matches)
       → throw InvalidCredentialsException jeśli nieprawidłowe
    5. Sprawdzenie enabled
       → throw AccountDisabledException jeśli false
    6. Generowanie tokenów (jwtService)
    7. Return AuthResponse.from(user, accessToken, refreshToken)
    8. Logowanie: INFO "User logged in: {email}"
}
```

**7.4. Implementacja metody refreshToken:**
```java
public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {
    1. Walidacja refresh tokenu (jwtService.validateToken)
       → throw InvalidTokenException/TokenExpiredException
    2. Sprawdzenie blacklist
       → throw InvalidTokenException
    3. Ekstrakcja userId (jwtService.getUserIdFromToken)
    4. Pobranie użytkownika (userRepository.findById)
       → throw InvalidTokenException jeśli nie istnieje
    5. Dodanie starego refresh tokenu do blacklist (7 dni TTL)
    6. Generowanie nowych tokenów (jwtService)
    7. Return new RefreshTokenResponse
    8. Logowanie: DEBUG "Token refreshed for user: {userId}"
}
```

**7.5. Implementacja metody logout:**
```java
public void logout(UUID userId, String accessToken, String refreshToken) {
    1. Dodanie access tokenu do blacklist (15 min TTL)
    2. Dodanie refresh tokenu do blacklist (7 dni TTL)
    3. Logowanie: INFO "User logged out: {userId}"
}
```

### Krok 8: Implementacja PasswordResetService

**8.1. Utworzenie PasswordResetService:**
- @Service z @RequiredArgsConstructor
- Dependency injection: UserRepository, BCryptPasswordEncoder, EmailService, RateLimitService, TokenBlacklistService

**8.2. Implementacja metody requestPasswordReset:**
```java
@Transactional
public MessageResponse requestPasswordReset(String email, String ipAddress) {
    1. Sprawdzenie rate limit (email based)
       → throw RateLimitExceededException
    2. Trim i lowercase email
    3. Pobranie użytkownika (findByEmail)
       → Jeśli nie istnieje: return generic message (nie ujawniaj)
    4. Generowanie secure random token (UUID.randomUUID())
    5. Ustawienie tokenExpiry (now + 24 hours)
    6. Aktualizacja UserEntity:
       - passwordResetToken = token
       - passwordResetTokenExpiry = expiry
    7. Zapis do DB (userRepository.save)
    8. Wysłanie emaila (emailService.sendPasswordResetEmail)
       → W przypadku błędu: logowanie ERROR, ale nie throw
    9. Return MessageResponse("If an account exists...")
    10. Logowanie: INFO "Password reset requested for: {email}"
}
```

**8.3. Implementacja metody confirmPasswordReset:**
```java
@Transactional
public MessageResponse confirmPasswordReset(PasswordResetConfirmDto request) {
    1. Pobranie użytkownika po tokenie (findByPasswordResetToken)
       → throw InvalidTokenException jeśli nie istnieje
    2. Sprawdzenie expiry (passwordResetTokenExpiry > now)
       → throw TokenExpiredException jeśli wygasły
    3. Hashowanie nowego hasła (BCrypt)
    4. Aktualizacja UserEntity:
       - passwordHash = newHashedPassword
       - passwordResetToken = null
       - passwordResetTokenExpiry = null
    5. Zapis do DB (userRepository.save)
    6. Invalidacja wszystkich tokenów użytkownika (tokenBlacklistService)
       → TODO: wymaga przechowywania aktywnych tokenów per user
    7. Return MessageResponse("Password has been reset...")
    8. Logowanie: INFO "Password reset confirmed for user: {userId}"
}
```

**8.4. Dodanie metody w UserRepository:**
```java
Optional<UserEntity> findByPasswordResetToken(String token);
```

### Krok 9: Implementacja UserService

**9.1. Utworzenie UserService:**
- @Service z @RequiredArgsConstructor
- Dependency injection: UserRepository

**9.2. Implementacja metody getUserProfile:**
```java
@Transactional(readOnly = true)
public UserProfileResponse getUserProfile(UUID userId) {
    1. Pobranie użytkownika (userRepository.findById)
       → throw UserNotFoundException jeśli nie istnieje
    2. Return UserProfileResponse.from(user)
    3. Logowanie: DEBUG "User profile retrieved: {userId}"
}
```

**9.3. Opcjonalnie: Cache na getUserProfile:**
```java
@Cacheable(value = "users", key = "#userId")
public UserProfileResponse getUserProfile(UUID userId) {
    // ... implementation
}
```

### Krok 10: Implementacja Controllers

**10.1. Utworzenie AuthController:**
- @RestController
- @RequestMapping("/api/auth")
- @RequiredArgsConstructor (Lombok)
- Dependency injection: AuthService, PasswordResetService
- @Slf4j dla logowania

**10.2. Endpoint POST /api/auth/register:**
```java
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(
        @Valid @RequestBody RegisterRequest request) {
    log.debug("Register request for email: {}", request.email());
    AuthResponse response = authService.register(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

**10.3. Endpoint POST /api/auth/login:**
```java
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest) {
    String ipAddress = RequestContextUtil.getClientIpAddress(httpRequest);
    log.debug("Login request for email: {} from IP: {}", 
        request.email(), ipAddress);
    AuthResponse response = authService.login(request, ipAddress);
    return ResponseEntity.ok(response);
}
```

**10.4. Endpoint POST /api/auth/refresh:**
```java
@PostMapping("/refresh")
public ResponseEntity<RefreshTokenResponse> refresh(
        @Valid @RequestBody RefreshTokenRequest request) {
    log.debug("Refresh token request");
    RefreshTokenResponse response = authService.refreshToken(request);
    return ResponseEntity.ok(response);
}
```

**10.5. Endpoint POST /api/auth/logout:**
```java
@PostMapping("/logout")
public ResponseEntity<Void> logout(
        @RequestHeader("Authorization") String authHeader,
        Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    String accessToken = authHeader.substring(7); // Remove "Bearer "
    // Refresh token extraction depends on implementation
    // (could be in cookie or separate header)
    log.debug("Logout request for user: {}", userId);
    authService.logout(userId, accessToken, null);
    return ResponseEntity.noContent().build();
}
```

**10.6. Endpoint POST /api/auth/password-reset/request:**
```java
@PostMapping("/password-reset/request")
public ResponseEntity<MessageResponse> requestPasswordReset(
        @Valid @RequestBody PasswordResetRequestDto request,
        HttpServletRequest httpRequest) {
    String ipAddress = RequestContextUtil.getClientIpAddress(httpRequest);
    log.debug("Password reset request for email: {}", request.email());
    MessageResponse response = passwordResetService
        .requestPasswordReset(request.email(), ipAddress);
    return ResponseEntity.ok(response);
}
```

**10.7. Endpoint POST /api/auth/password-reset/confirm:**
```java
@PostMapping("/password-reset/confirm")
public ResponseEntity<MessageResponse> confirmPasswordReset(
        @Valid @RequestBody PasswordResetConfirmDto request) {
    log.debug("Password reset confirmation");
    MessageResponse response = passwordResetService
        .confirmPasswordReset(request);
    return ResponseEntity.ok(response);
}
```

**10.8. Utworzenie UserController:**
- @RestController
- @RequestMapping("/api/users")
- @RequiredArgsConstructor
- Dependency injection: UserService

**10.9. Endpoint GET /api/users/me:**
```java
@GetMapping("/me")
public ResponseEntity<UserProfileResponse> getCurrentUser(
        Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("Get profile request for user: {}", userId);
    UserProfileResponse response = userService.getUserProfile(userId);
    return ResponseEntity.ok(response);
}
```

### Krok 11: Utworzenie utility classes

**11.1. RequestContextUtil:**
```java
public class RequestContextUtil {
    public static String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

### Krok 12: Testy jednostkowe i integracyjne

**12.1. Testy jednostkowe dla Services:**
- AuthServiceTest:
  - testRegisterSuccess()
  - testRegisterEmailAlreadyExists()
  - testLoginSuccess()
  - testLoginInvalidCredentials()
  - testLoginAccountDisabled()
  - testRefreshTokenSuccess()
  - testRefreshTokenExpired()
  - testRefreshTokenBlacklisted()
  - testLogout()
  
- PasswordResetServiceTest:
  - testRequestPasswordResetSuccess()
  - testRequestPasswordResetUserNotFound()
  - testRequestPasswordResetRateLimitExceeded()
  - testConfirmPasswordResetSuccess()
  - testConfirmPasswordResetInvalidToken()
  - testConfirmPasswordResetExpiredToken()

- JwtServiceTest:
  - testGenerateAccessToken()
  - testGenerateRefreshToken()
  - testValidateTokenSuccess()
  - testValidateTokenExpired()
  - testValidateTokenInvalidSignature()
  - testGetUserIdFromToken()

**12.2. Testy integracyjne dla Controllers:**
- @SpringBootTest
- @AutoConfigureMockMvc
- MockMvc dla testowania endpointów
- Testy dla wszystkich scenariuszy success i error
- Weryfikacja status codes i response bodies

**12.3. Testy bezpieczeństwa:**
- Testowanie rate limiting
- Testowanie token expiration
- Testowanie token blacklist
- Testowanie unauthorized access

### Krok 13: Dokumentacja OpenAPI/Swagger

**13.1. Dodanie dependency springdoc-openapi:**
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.2.0</version>
</dependency>
```

**13.2. Konfiguracja OpenAPI:**
```java
@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("10xCards API")
                .version("1.0")
                .description("Authentication and User Management API"))
            .components(new Components()
                .addSecuritySchemes("bearer-jwt",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
```

**13.3. Annotacje w Controllers:**
- @Tag na klasie
- @Operation na metodach
- @ApiResponse dla różnych status codes
- @SecurityRequirement gdzie potrzebne

### Krok 14: Konfiguracja środowiska i deployment

**14.1. Environment variables:**
```bash
# Production environment variables
JWT_SECRET=your-production-secret-256-bits-minimum
MAIL_HOST=smtp.sendgrid.net
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
FRONTEND_URL=https://10xcards.com
DATABASE_URL=jdbc:postgresql://db:5432/xcards
DATABASE_USERNAME=xcards_user
DATABASE_PASSWORD=secure_password
```

**14.2. Docker configuration:**
- Dockerfile dla aplikacji Spring Boot
- docker-compose.yml z PostgreSQL i aplikacją
- Health check endpoint: /actuator/health

**14.3. Migracje Liquibase (jeśli potrzebne):**
- Brak zmian w tabeli users (już zawiera potrzebne kolumny)

### Krok 15: Monitoring i observability

**15.1. Spring Boot Actuator:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**15.2. Metryki:**
- Ilość rejestracji (counter)
- Ilość logowań (counter)
- Czas odpowiedzi endpointów (timer)
- Rate limit violations (counter)
- Failed login attempts (counter)

**15.3. Health checks:**
- Database connectivity
- Email service availability
- Memory usage
- Disk space