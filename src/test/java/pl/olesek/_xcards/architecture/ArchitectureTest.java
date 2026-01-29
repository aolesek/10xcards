package pl.olesek._xcards.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * Architecture tests using ArchUnit. These tests enforce architectural rules and best practices.
 */
class ArchitectureTest {

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("pl.olesek._xcards");
    }

    @Test
    void layersShouldBeRespected() {
        // This is an example architecture test
        // Adjust layers based on your actual package structure
        ArchRule rule = layeredArchitecture()
                .consideringAllDependencies()
                .layer("Controller").definedBy("..controller..")
                .layer("Service").definedBy("..service..")
                .layer("Filter").definedBy("..filter..")
                .layer("Config").definedBy("..config..")

                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service", "Filter")
                .whereLayer("Filter").mayOnlyBeAccessedByLayers("Config")
                .whereLayer("Config").mayNotBeAccessedByAnyLayer();

        rule.check(importedClasses);
    }

    @Test
    void servicesShouldBeAnnotatedWithService() {
        ArchRule rule = classes()
                .that().resideInAPackage("..service..")
                .and().haveSimpleNameEndingWith("Service")
                .and().areNotInterfaces()
                .should().beAnnotatedWith(org.springframework.stereotype.Service.class)
                .allowEmptyShould(true);

        rule.check(importedClasses);
    }

    @Test
    void repositoriesShouldBeInterfaces() {
        ArchRule rule = classes()
                .that().resideInAPackage("..repository..")
                .and().haveSimpleNameEndingWith("Repository")
                .should().beInterfaces()
                .allowEmptyShould(true);

        rule.check(importedClasses);
    }

    @Test
    void controllersShouldBeAnnotatedWithRestController() {
        ArchRule rule = classes()
                .that().resideInAPackage("..controller..")
                .and().haveSimpleNameEndingWith("Controller")
                .should().beAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .allowEmptyShould(true);

        rule.check(importedClasses);
    }

    @Test
    void entitiesShouldNotDependOnInfrastructure() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..entity..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "..repository..",
                        "..controller..",
                        "org.springframework.web..")
                .allowEmptyShould(true);

        rule.check(importedClasses);
    }
}
