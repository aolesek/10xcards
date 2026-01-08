package pl.olesek._xcards.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for AI service (OpenRouter) REST client.
 */
@Configuration
public class AIClientConfig {

    @Value("${app.ai.openrouter.timeout}")
    private int timeout;

    /**
     * RestTemplate configured specifically for AI service calls with appropriate timeout settings.
     * 
     * @param builder RestTemplateBuilder provided by Spring Boot
     * @return configured RestTemplate instance
     */
    @Bean
    public RestTemplate aiRestTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);

        return builder.requestFactory(() -> factory).build();
    }
}
