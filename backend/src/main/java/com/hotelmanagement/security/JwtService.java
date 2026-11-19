package com.hotelmanagement.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiration;

    public JwtService(@Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.expiration-ms}") long expiration) {
        if (secret.length() < 32)
            throw new IllegalArgumentException("JWT_SECRET must be at least 32 characters");
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generateToken(UserDetails user) {
        String role = user.getAuthorities().isEmpty() ? "ROLE_USER"
                : user.getAuthorities().iterator().next().getAuthority();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return extract(token, claims -> Objects.requireNonNull(claims).getSubject());
    }

    public boolean isValid(String token, UserDetails user) {
        try {
            return extractUsername(token).equalsIgnoreCase(user.getUsername()) && !isExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isExpired(String token) {
        try {
            Date exp = extract(token, claims -> claims.getExpiration());
            return exp != null && exp.before(new Date());
        } catch (Exception e) {
            return true;
        }
    }

    private <T> T extract(String token, Function<Claims, T> resolver) {
        return resolver.apply(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
    }
}
