package com.hotelmanagement.security;

import com.hotelmanagement.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res,
            @NonNull FilterChain chain) throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            String token = h.substring(7);
            try {
                String u = jwt.extractUsername(token);
                UserDetails ud = users.findWithBusinessByUsernameIgnoreCase(u).orElse(null);
                if (ud instanceof com.hotelmanagement.entity.User user) {
                    if (!user.isActive() || (user.getBranch() != null && !"ACTIVE".equalsIgnoreCase(user.getBranch().getStatus()))) {
                        SecurityContextHolder.clearContext();
                        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        res.setContentType("application/json");
                        res.setCharacterEncoding("UTF-8");
                        res.getWriter().write("{\"success\":false,\"message\":\"This branch is deactivated. You have been logged out.\",\"errorCode\":\"BRANCH_DEACTIVATED\"}");
                        return;
                    }
                }
                if (ud != null && ud.isEnabled() && jwt.isValid(token, ud))
                    SecurityContextHolder.getContext()
                            .setAuthentication(new UsernamePasswordAuthenticationToken(ud, null, ud.getAuthorities()));
            } catch (Exception ignored) {
            }
        }
        chain.doFilter(req, res);
    }
}
