package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.AuthDtos.*;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication and account APIs")

public class AuthController {
    private final AuthService service;
    private final CurrentUser current;

    public AuthController(AuthService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }
    @PostMapping("/register")
    @Operation(summary = "Register a hotel administrator")
    public org.springframework.http.ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest r) {
        return org.springframework.http.ResponseEntity.status(201).body(ApiResponse.ok("Registration successful", service.register(r)));
    }
    @PostMapping("/login")
    @Operation(summary = "Login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest r) {
        return ApiResponse.ok("Login successful", service.login(r));
    }
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest r) {
        return ApiResponse.ok("Token refreshed", service.refreshToken(r.refreshToken()));
    }
    @PostMapping("/logout")
    @Operation(summary = "Logout")
    public ApiResponse<Void> logout(@RequestHeader(name = "X-Refresh-Token", required = false) String token) {
        if (token != null && !token.isBlank()) service.logout(token);
        return ApiResponse.ok("Logged out", null);
    }
    @GetMapping("/me")
    @Operation(summary = "Get current user")
    public ApiResponse<?> me() {
        return ApiResponse.ok("Current user", service.userView(current.get()));
    }
    @PostMapping("/change-password")
    @Operation(summary = "Change current user password")
    public ApiResponse<Void> change(@Valid @RequestBody ChangePasswordRequest r) {
        service.changePassword(current.get(), r.currentPassword(), r.newPassword());
        return ApiResponse.ok("Password changed", null);
    }
}
