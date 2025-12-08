package pl.olesek._xcards.flashcard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pl.olesek._xcards.AbstractIntegrationTest;
import pl.olesek._xcards.auth.dto.request.RegisterRequest;
import pl.olesek._xcards.auth.dto.response.AuthResponse;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.flashcard.dto.CreateFlashcardRequest;
import pl.olesek._xcards.flashcard.dto.UpdateFlashcardRequest;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FlashcardControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FlashcardRepository flashcardRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private UserRepository userRepository;

    private String accessToken;
    private UserEntity testUser;
    private UserEntity otherUser;
    private DeckEntity testDeck;

    @BeforeEach
    void setUp() throws Exception {
        flashcardRepository.deleteAll();
        deckRepository.deleteAll();
        userRepository.deleteAll();

        // Create first user
        RegisterRequest registerRequest = new RegisterRequest("test@example.com", "Password123!");
        String response = mockMvc
                .perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        AuthResponse authResponse = objectMapper.readValue(response, AuthResponse.class);
        accessToken = authResponse.accessToken();
        testUser = userRepository.findByEmail("test@example.com").orElseThrow();

        // Create second user for security tests
        RegisterRequest otherRegisterRequest = new RegisterRequest("other@example.com", "Password123!");
        mockMvc
                .perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otherRegisterRequest)))
                .andExpect(status().isCreated());

        otherUser = userRepository.findByEmail("other@example.com").orElseThrow();

        // Create test deck
        testDeck = createDeck(testUser, "Biology 101");
    }

    @Test
    void shouldListFlashcardsInDeck() throws Exception {
        createFlashcard(testDeck, "What is photosynthesis?", "Process of converting light to energy",
                FlashcardSource.MANUAL);
        createFlashcard(testDeck, "What is mitosis?", "Cell division process", FlashcardSource.AI);

        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .param("page", "0")
                .param("size", "50")
                .param("sort", "createdAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].front").exists())
                .andExpect(jsonPath("$.content[0].back").exists())
                .andExpect(jsonPath("$.content[0].source").exists())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(50))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void shouldFilterFlashcardsBySource() throws Exception {
        createFlashcard(testDeck, "Front 1", "Back 1", FlashcardSource.MANUAL);
        createFlashcard(testDeck, "Front 2", "Back 2", FlashcardSource.MANUAL);
        createFlashcard(testDeck, "Front 3", "Back 3", FlashcardSource.AI);

        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .param("source", "manual"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].source").value("manual"))
                .andExpect(jsonPath("$.content[1].source").value("manual"));
    }

    @Test
    void shouldReturnBadRequestForInvalidSource() throws Exception {
        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .param("source", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Invalid source value: invalid. Must be one of: manual, ai, ai-edited"));
    }

    @Test
    void shouldReturnEmptyListWhenNoFlashcards() throws Exception {
        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    void shouldReturnNotFoundWhenDeckDoesNotExist() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

        mockMvc.perform(get("/api/decks/" + nonExistentId + "/flashcards")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Deck not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnNotFoundWhenDeckBelongsToOtherUser() throws Exception {
        DeckEntity otherUserDeck = createDeck(otherUser, "Other User Deck");

        mockMvc.perform(get("/api/decks/" + otherUserDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldGetSingleFlashcard() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "What is photosynthesis?",
                "Process of converting light to energy", FlashcardSource.AI);

        mockMvc.perform(get("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(flashcard.getId().toString()))
                .andExpect(jsonPath("$.deckId").value(testDeck.getId().toString()))
                .andExpect(jsonPath("$.front").value("What is photosynthesis?"))
                .andExpect(jsonPath("$.back").value("Process of converting light to energy"))
                .andExpect(jsonPath("$.source").value("ai"))
                .andExpect(jsonPath("$.generationId").isEmpty())
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldReturnNotFoundWhenFlashcardDoesNotExist() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

        mockMvc.perform(get("/api/flashcards/" + nonExistentId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Flashcard not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnNotFoundWhenFlashcardBelongsToOtherUser() throws Exception {
        DeckEntity otherUserDeck = createDeck(otherUser, "Other User Deck");
        FlashcardEntity otherUserFlashcard = createFlashcard(otherUserDeck, "Front", "Back", FlashcardSource.MANUAL);

        mockMvc.perform(get("/api/flashcards/" + otherUserFlashcard.getId())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateFlashcard() throws Exception {
        CreateFlashcardRequest request = new CreateFlashcardRequest(
                "What is mitosis?",
                "Cell division process");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.front").value("What is mitosis?"))
                .andExpect(jsonPath("$.back").value("Cell division process"))
                .andExpect(jsonPath("$.source").value("manual"))
                .andExpect(jsonPath("$.generationId").isEmpty());
    }

    @Test
    void shouldTrimFlashcardContentWhenCreating() throws Exception {
        CreateFlashcardRequest request = new CreateFlashcardRequest(
                "  What is mitosis?  ",
                "  Cell division process  ");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.front").value("What is mitosis?"))
                .andExpect(jsonPath("$.back").value("Cell division process"));
    }

    @Test
    void shouldReturnBadRequestWhenFrontIsBlank() throws Exception {
        CreateFlashcardRequest request = new CreateFlashcardRequest("", "Back content");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("front: Front cannot be blank"));
    }

    @Test
    void shouldReturnBadRequestWhenBackIsBlank() throws Exception {
        CreateFlashcardRequest request = new CreateFlashcardRequest("Front content", "");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("back: Back cannot be blank"));
    }

    @Test
    void shouldReturnBadRequestWhenFrontTooLong() throws Exception {
        String longFront = "A".repeat(501);
        CreateFlashcardRequest request = new CreateFlashcardRequest(longFront, "Back");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("front: Front cannot exceed 500 characters"));
    }

    @Test
    void shouldReturnBadRequestWhenFrontEmptyAfterTrimming() throws Exception {
        CreateFlashcardRequest request = new CreateFlashcardRequest("   ", "Back content");

        mockMvc.perform(post("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("front: Front cannot be blank"));
    }

    @Test
    void shouldReturnNotFoundWhenCreatingFlashcardInNonExistentDeck() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
        CreateFlashcardRequest request = new CreateFlashcardRequest("Front", "Back");

        mockMvc.perform(post("/api/decks/" + nonExistentId + "/flashcards")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Deck not found with id: " + nonExistentId));
    }

    @Test
    void shouldUpdateFlashcard() throws Exception {
        FlashcardEntity flashcard =
                createFlashcard(testDeck, "Original front", "Original back", FlashcardSource.MANUAL);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        mockMvc.perform(put("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(flashcard.getId().toString()))
                .andExpect(jsonPath("$.front").value("Updated front"))
                .andExpect(jsonPath("$.back").value("Updated back"))
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldChangeSourceFromAiToAiEditedWhenUpdating() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "AI Front", "AI Back", FlashcardSource.AI);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        mockMvc.perform(put("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("ai-edited"));
    }

    @Test
    void shouldKeepManualSourceWhenUpdating() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "Manual Front", "Manual Back", FlashcardSource.MANUAL);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        mockMvc.perform(put("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("manual"));
    }

    @Test
    void shouldKeepAiEditedSourceWhenUpdating() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "Edited Front", "Edited Back", FlashcardSource.AI_EDITED);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        mockMvc.perform(put("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("ai-edited"));
    }

    @Test
    void shouldReturnBadRequestWhenUpdatingWithBlankFront() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "Front", "Back", FlashcardSource.MANUAL);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("", "Updated back");

        mockMvc.perform(put("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("front: Front cannot be blank"));
    }

    @Test
    void shouldReturnNotFoundWhenUpdatingNonExistentFlashcard() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Front", "Back");

        mockMvc.perform(put("/api/flashcards/" + nonExistentId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Flashcard not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnNotFoundWhenUpdatingFlashcardOfOtherUser() throws Exception {
        DeckEntity otherUserDeck = createDeck(otherUser, "Other User Deck");
        FlashcardEntity otherUserFlashcard = createFlashcard(otherUserDeck, "Front", "Back", FlashcardSource.MANUAL);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated", "Updated");

        mockMvc.perform(put("/api/flashcards/" + otherUserFlashcard.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldDeleteFlashcard() throws Exception {
        FlashcardEntity flashcard = createFlashcard(testDeck, "Front", "Back", FlashcardSource.MANUAL);

        mockMvc.perform(delete("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/flashcards/" + flashcard.getId())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundWhenDeletingNonExistentFlashcard() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

        mockMvc.perform(delete("/api/flashcards/" + nonExistentId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Flashcard not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnNotFoundWhenDeletingFlashcardOfOtherUser() throws Exception {
        DeckEntity otherUserDeck = createDeck(otherUser, "Other User Deck");
        FlashcardEntity otherUserFlashcard = createFlashcard(otherUserDeck, "Front", "Back", FlashcardSource.MANUAL);

        mockMvc.perform(delete("/api/flashcards/" + otherUserFlashcard.getId())
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnForbiddenWhenNoToken() throws Exception {
        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards"))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldReturnForbiddenWhenInvalidToken() throws Exception {
        mockMvc.perform(get("/api/decks/" + testDeck.getId() + "/flashcards")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isForbidden());
    }

    private DeckEntity createDeck(UserEntity user, String name) {
        DeckEntity deck = new DeckEntity();
        deck.setName(name);
        deck.setUser(user);
        return deckRepository.save(deck);
    }

    private FlashcardEntity createFlashcard(DeckEntity deck, String front, String back, FlashcardSource source) {
        FlashcardEntity flashcard = new FlashcardEntity();
        flashcard.setDeck(deck);
        flashcard.setFront(front);
        flashcard.setBack(back);
        flashcard.setSource(source);
        flashcard.setGeneration(null);
        return flashcardRepository.save(flashcard);
    }
}

