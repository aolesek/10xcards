package pl.olesek._xcards.deck.controller;

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
import pl.olesek._xcards.deck.dto.CreateDeckRequest;
import pl.olesek._xcards.deck.dto.UpdateDeckRequest;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DeckControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private UserRepository userRepository;

    private String accessToken;
    private UserEntity testUser;

    @BeforeEach
    void setUp() throws Exception {
        deckRepository.deleteAll();
        userRepository.deleteAll();

        RegisterRequest registerRequest =
                new RegisterRequest("test@example.com", "Password123!");

        String response = mockMvc
                .perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        AuthResponse authResponse = objectMapper.readValue(response, AuthResponse.class);
        accessToken = authResponse.accessToken();
        testUser = userRepository.findByEmail("test@example.com").orElseThrow();
    }

    @Test
    void shouldListUserDecksWithPagination() throws Exception {
        createDeck("Biology 101");
        createDeck("Chemistry 101");

        mockMvc.perform(get("/api/decks").header("Authorization", "Bearer " + accessToken)
                .param("page", "0").param("size", "20").param("sort", "createdAt,desc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].name").exists())
                .andExpect(jsonPath("$.content[0].flashcardCount").value(0))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void shouldReturnEmptyListWhenNoDecks() throws Exception {
        mockMvc.perform(get("/api/decks").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    void shouldGetSingleDeck() throws Exception {
        DeckEntity deck = createDeck("Biology 101");

        mockMvc.perform(get("/api/decks/" + deck.getId()).header("Authorization",
                "Bearer " + accessToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deck.getId().toString()))
                .andExpect(jsonPath("$.name").value("Biology 101"))
                .andExpect(jsonPath("$.flashcardCount").value(0))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldReturnNotFoundForNonExistentDeck() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

        mockMvc.perform(get("/api/decks/" + nonExistentId).header("Authorization",
                "Bearer " + accessToken)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Deck not found with id: " + nonExistentId));
    }

    @Test
    void shouldCreateNewDeck() throws Exception {
        CreateDeckRequest request = new CreateDeckRequest("Biology 101");

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Biology 101"))
                .andExpect(jsonPath("$.flashcardCount").value(0));
    }

    @Test
    void shouldTrimDeckNameWhenCreating() throws Exception {
        CreateDeckRequest request = new CreateDeckRequest("  Biology 101  ");

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Biology 101"));
    }

    @Test
    void shouldReturnBadRequestForBlankDeckName() throws Exception {
        CreateDeckRequest request = new CreateDeckRequest("");

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("name: Deck name cannot be blank"));
    }

    @Test
    void shouldReturnBadRequestForEmptyDeckNameAfterTrimming() throws Exception {
        CreateDeckRequest request = new CreateDeckRequest("   ");

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message")
                        .value("name: Deck name cannot be blank"));
    }

    @Test
    void shouldReturnBadRequestForTooLongDeckName() throws Exception {
        String longName = "A".repeat(101);
        CreateDeckRequest request = new CreateDeckRequest(longName);

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message")
                        .value("name: Deck name cannot exceed 100 characters"));
    }

    @Test
    void shouldReturnConflictWhenDeckNameAlreadyExists() throws Exception {
        createDeck("Biology 101");

        CreateDeckRequest request = new CreateDeckRequest("Biology 101");

        mockMvc.perform(post("/api/decks").header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict()).andExpect(
                        jsonPath("$.message").value("Deck with name 'Biology 101' already exists"));
    }

    @Test
    void shouldUpdateDeckName() throws Exception {
        DeckEntity deck = createDeck("Biology 101");
        UpdateDeckRequest request = new UpdateDeckRequest("Advanced Biology");

        mockMvc.perform(put("/api/decks/" + deck.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deck.getId().toString()))
                .andExpect(jsonPath("$.name").value("Advanced Biology"));
    }

    @Test
    void shouldReturnNotFoundWhenUpdatingNonExistentDeck() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
        UpdateDeckRequest request = new UpdateDeckRequest("Advanced Biology");

        mockMvc.perform(put("/api/decks/" + nonExistentId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Deck not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnConflictWhenUpdatingToExistingName() throws Exception {
        DeckEntity deck1 = createDeck("Biology 101");
        createDeck("Chemistry 101");

        UpdateDeckRequest request = new UpdateDeckRequest("Chemistry 101");

        mockMvc.perform(put("/api/decks/" + deck1.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message")
                        .value("Deck with name 'Chemistry 101' already exists"));
    }

    @Test
    void shouldDeleteDeck() throws Exception {
        DeckEntity deck = createDeck("Biology 101");

        mockMvc.perform(delete("/api/decks/" + deck.getId()).header("Authorization",
                "Bearer " + accessToken)).andExpect(status().isNoContent());

        // Verify deck is deleted
        mockMvc.perform(get("/api/decks/" + deck.getId()).header("Authorization",
                "Bearer " + accessToken)).andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundWhenDeletingNonExistentDeck() throws Exception {
        String nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

        mockMvc.perform(delete("/api/decks/" + nonExistentId).header("Authorization",
                "Bearer " + accessToken)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Deck not found with id: " + nonExistentId));
    }

    @Test
    void shouldReturnUnauthorizedWhenNoToken() throws Exception {
        mockMvc.perform(get("/api/decks")).andExpect(status().isForbidden());
    }

    @Test
    void shouldReturnUnauthorizedWhenInvalidToken() throws Exception {
        mockMvc.perform(get("/api/decks").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isForbidden());
    }

    private DeckEntity createDeck(String name) {
        DeckEntity deck = new DeckEntity();
        deck.setName(name);
        deck.setUser(testUser);
        return deckRepository.save(deck);
    }
}

