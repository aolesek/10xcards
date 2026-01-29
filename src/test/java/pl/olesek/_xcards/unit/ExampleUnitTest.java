package pl.olesek._xcards.unit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Example unit test demonstrating best practices: - Use of JUnit 5 - Mockito for mocking - AssertJ
 * for fluent assertions - Proper test structure (Arrange-Act-Assert) - Descriptive test names
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Example Unit Test")
class ExampleUnitTest {

    @Mock
    private ExampleDependency dependency;

    private ExampleService service;

    @BeforeEach
    void setUp() {
        service = new ExampleService(dependency);
    }

    @Test
    @DisplayName("Should return correct result when dependency returns valid data")
    void shouldReturnCorrectResult() {
        // Arrange
        String input = "test";
        String expected = "TEST";
        when(dependency.process(input)).thenReturn(expected);

        // Act
        String result = service.execute(input);

        // Assert
        assertThat(result).isEqualTo(expected);
        verify(dependency).process(input);
        verifyNoMoreInteractions(dependency);
    }

    @Test
    @DisplayName("Should throw exception when input is null")
    void shouldThrowExceptionWhenInputIsNull() {
        // Arrange & Act & Assert
        assertThatThrownBy(() -> service.execute(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Input cannot be null");

        verifyNoInteractions(dependency);
    }

    @Test
    @DisplayName("Should handle empty string correctly")
    void shouldHandleEmptyString() {
        // Arrange
        String input = "";
        when(dependency.process(input)).thenReturn("");

        // Act
        String result = service.execute(input);

        // Assert
        assertThat(result).isEmpty();
    }

    // Example classes for demonstration
    static class ExampleService {
        private final ExampleDependency dependency;

        ExampleService(ExampleDependency dependency) {
            this.dependency = dependency;
        }

        String execute(String input) {
            if (input == null) {
                throw new IllegalArgumentException("Input cannot be null");
            }
            return dependency.process(input);
        }
    }

    interface ExampleDependency {
        String process(String input);
    }
}
