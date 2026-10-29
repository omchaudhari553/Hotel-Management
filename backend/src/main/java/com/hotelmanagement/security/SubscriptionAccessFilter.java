package com.hotelmanagement.security;

import com.hotelmanagement.dto.SubscriptionDtos.SubscriptionStatusResponse;
import com.hotelmanagement.entity.User;
import com.hotelmanagement.service.SubscriptionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SubscriptionAccessFilter extends OncePerRequestFilter {

    private final SubscriptionService subscriptionService;

    public SubscriptionAccessFilter(@Lazy SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Allow all safe HTTP methods (GET, OPTIONS) so viewing dashboards, reports,
        // and history is always permitted
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Whitelisted paths for management, authentication, renewals, notifications
        if (path.startsWith("/api/v1/subscriptions") ||
                path.startsWith("/api/v1/auth") ||
                path.startsWith("/api/v1/webhooks") ||
                path.startsWith("/api/webhooks") ||
                path.startsWith("/api/v1/hotel/notifications") ||
                path.startsWith("/swagger") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/actuator") ||
                path.equals("/error")) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User user) {
            try {
                Long businessId = user.getBusiness().getId();
                SubscriptionStatusResponse sub = subscriptionService.getSubscriptionForBusiness(businessId);

                if (!sub.isCanOperate()) {
                    response.setStatus(402); // HTTP 402 Payment Required
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(
                            "{\"success\":false,\"errorCode\":\"SUBSCRIPTION_EXPIRED\",\"message\":\"Your subscription or free trial has expired. Please renew your license to perform operations.\",\"data\":null}");
                    return;
                }
            } catch (Exception e) {
                // If checking subscription fails gracefully, allow downstream to process
            }
        }

        filterChain.doFilter(request, response);
    }
}
