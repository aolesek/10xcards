package pl.olesek._xcards.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for Email service (Resend.com) REST client.
 */
@Configuration
public class EmailClientConfig {

    /**
     * RestTemplate configured for email service calls via Resend API.
     * 
     * @param builder RestTemplateBuilder provided by Spring Boot
     * @return configured RestTemplate instance
     */
    @Bean
    public RestTemplate emailRestTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
