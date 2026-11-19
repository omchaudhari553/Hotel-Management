package com.hotelmanagement.config;
import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.security.*;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.*;

@Configuration 
public class OpenApiConfig {
    @Bean OpenAPI hotelOpenAPI() {
        return new OpenAPI().info(new Info().title("Hotel Management API").version("1.0.0").description("Hotel Management REST API with JWT authentication, separated feature controllers/services, reporting and financial modules.")).addServersItem(new Server().url("http://localhost:8080").description("Local server")).components(new Components().addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }
}
