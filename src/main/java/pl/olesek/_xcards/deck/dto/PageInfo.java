package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Pagination information")
public record PageInfo(
        @Schema(description = "Current page number (0-indexed)", example = "0")
        int number,
        @Schema(description = "Number of items per page", example = "20")
        int size,
        @Schema(description = "Total number of items", example = "1")
        long totalElements,
        @Schema(description = "Total number of pages", example = "1")
        int totalPages) {}

