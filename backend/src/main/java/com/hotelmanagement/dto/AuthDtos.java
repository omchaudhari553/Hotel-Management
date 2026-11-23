package com.hotelmanagement.dto;
import jakarta.validation.constraints.*;
import java.util.*;


public final class AuthDtos {
    private AuthDtos() {
    }
    
    public record RegisterRequest(
        @NotBlank String fullName,
        @NotBlank String businessName,
        @NotBlank String username,
        @Email @NotBlank String email,
        @Size(min=8) String password,
        @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone,
        String industryType,
        String role,
        String businessType
    ) {
        public RegisterRequest(String fullName, String businessName, String username, String email, String password, String phone, String industryType) {
            this(fullName, businessName, username, email, password, phone, industryType, "SINGLE_USER", "SINGLE");
        }
    }
    
public record LoginRequest(@NotBlank String identifier,@NotBlank String password,boolean rememberMe) {
    }
    
public record RefreshRequest(@NotBlank String refreshToken) {
    }
    
public record ChangePasswordRequest(@NotBlank String currentPassword,@Size(min=8) String newPassword) {
    }

public record ForgotPasswordRequest(@NotBlank String identifier) {
    }

public record ForgotPasswordResponse(boolean success, String message, String maskedEmail, String debugOtp) {
    }

public record VerifyOtpRequest(@NotBlank String identifier, @NotBlank String otp) {
    }

public record ResetPasswordRequest(@NotBlank String identifier, @NotBlank String otp, @NotBlank @Size(min=6) String newPassword) {
    }
    
public record AuthResponse(String token,String refreshToken,String tokenType,Object user,Object business) {
    }
}
