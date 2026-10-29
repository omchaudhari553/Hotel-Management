package com.hotelmanagement.service;
import com.hotelmanagement.dto.AuthDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.*;
import com.hotelmanagement.exception.ConflictException;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
public class AuthService {
    private final UserRepository users;
    private final BusinessRepository businesses;
    private final RefreshTokenRepository refresh;
    private final BranchRepository branches;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    public AuthService(UserRepository users, BusinessRepository businesses, BranchRepository branches, RefreshTokenRepository refresh, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.businesses = businesses;
        this.branches = branches;
        this.refresh = refresh;
        this.encoder = encoder;
        this.jwt = jwt;
    }
    @Transactional public AuthResponse register(RegisterRequest req) {
        if (users.findByUsernameIgnoreCase(req.username()).isPresent() || users.findByEmailIgnoreCase(req.email()).isPresent()) {
            throw new ConflictException("Username or email already exists");
        }
        Business b = new Business();
        b.setName(req.businessName());
        b.setCode(("HOTEL_" + req.username()).toUpperCase(Locale.ROOT));
        b.setIndustryType(IndustryType.HOTEL);
        b.setOwnerName(req.fullName());
        b.setContactEmail(req.email());
        b.setPhone(req.phone());
        b.setCurrency("INR");
        b = businesses.save(b);

        Branch branch = new Branch();
        branch.setBusiness(b);
        branch.setName("Main Branch");
        branch.setCode("MB-" + b.getId());
        branch.setManagerName(req.fullName());
        branch.setContactPhone(req.phone() != null ? req.phone() : "9876543210");
        branch.setEmail(req.email());
        branch.setOperatingHours("24x7");
        branch.setAddress("Hotel Premises");
        branch.setEstablishedOn(LocalDate.now());
        branch.setStatus("ACTIVE");
        branches.save(branch);

        User u = new User();
        u.setBusiness(b);
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setFullName(req.fullName());
        u.setPhone(req.phone());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(UserRole.ADMIN);
        u = users.save(u);
        return issue(u);
    }
    @Transactional public AuthResponse login(LoginRequest req) {
        User u = users.findWithBusinessByUsernameIgnoreCase(req.identifier()) .orElseGet(() -> users.findWithBusinessByEmailIgnoreCase(req.identifier()) .orElseThrow(() -> new BadCredentialsException("Invalid credentials")));
        if (!u.isActive() || !encoder.matches(req.password(), u.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        return issue(u);
    }
    @Transactional public void changePassword(User u, String currentPassword, String newPassword) {
        if (u == null || !encoder.matches(currentPassword, u.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        u.setPasswordHash(encoder.encode(newPassword));
        users.save(u);
    }
    @Transactional public AuthResponse refreshToken(String token) {
        RefreshToken r = refresh.findByToken(token) .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (r.isRevoked() || r.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token expired");
        }
        r.setRevoked(true);
        refresh.save(r);
        return issue(r.getUser());
    }
    @Transactional public void logout(String token) {
        refresh.findByToken(token).ifPresent(r -> {
            r.setRevoked(true); refresh.save(r);
        }
        );
    }
    private AuthResponse issue(User u) {
        User loaded = users.findWithBusinessByUsernameIgnoreCase(u.getUsername()).orElse(u);
        String access = jwt.generateToken(loaded);
        RefreshToken r = new RefreshToken();
        r.setUser(loaded);
        r.setToken(UUID.randomUUID() + "." + UUID.randomUUID());
        r.setExpiresAt(LocalDateTime.now().plusDays(30));
        refresh.save(r);
        return new AuthResponse(access, r.getToken(), "Bearer", userView(loaded), businessView(loaded.getBusiness()));
    }
    @Transactional(readOnly = true) public Map<String, Object> userView(User u) {
        User loaded = users.findWithBusinessByUsernameIgnoreCase(u.getUsername()).orElse(u);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", loaded.getId());
        m.put("businessId", loaded.getBusiness() == null ? null : loaded.getBusiness().getId());
        m.put("businessName", loaded.getBusiness() == null ? null : loaded.getBusiness().getName());
        m.put("username", loaded.getUsername());
        m.put("email", loaded.getEmail());
        m.put("fullName", loaded.getFullName());
        m.put("phone", loaded.getPhone());
        m.put("active", loaded.isActive());
        m.put("roles", List.of("ROLE_" + loaded.getRole().name()));
        m.put("database", "DEFAULT");
        return m;
    }
    public Map<String, Object> businessView(Business b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("name", b.getName());
        m.put("code", b.getCode());
        m.put("industryType", b.getIndustryType() == null ? null : b.getIndustryType().name());
        m.put("ownerName", b.getOwnerName());
        m.put("contactEmail", b.getContactEmail());
        m.put("phone", b.getPhone());
        m.put("address", b.getAddress());
        m.put("city", b.getCity());
        m.put("state", b.getState());
        m.put("currency", b.getCurrency());
        m.put("taxNumber", b.getTaxNumber());
        m.put("active", b.isActive());
        return m;
    }
}
