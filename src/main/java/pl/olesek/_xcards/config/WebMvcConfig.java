package pl.olesek._xcards.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Web MVC configuration for serving React SPA frontend Configures fallback to index.html for all
 * non-API routes (React Router)
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /**
     * Configure resource handlers for static content and SPA routing All non-API requests fall back to
     * index.html to support React Router
     */
    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(@NonNull String resourcePath,
                            @NonNull Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);

                        // If resource exists (e.g., JS, CSS, images), return it
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }

                        // For all other paths (React Router routes), return index.html
                        // But skip API endpoints - they should return 404/401 as JSON
                        if (!resourcePath.startsWith("api/")) {
                            return new ClassPathResource("/static/index.html");
                        }

                        return null;
                    }
                });
    }
}
