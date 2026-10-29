package com.hotelmanagement.security;
import com.hotelmanagement.entity.User;
import com.hotelmanagement.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component 
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public User get() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authenticated user required");
        }
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (p instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            return users.findWithBusinessByUsernameIgnoreCase(ud.getUsername())
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Authenticated user required"));
        }
        if (p instanceof User u) {
            return users.findWithBusinessByUsernameIgnoreCase(u.getUsername())
                .orElse(u);
        }
        throw new org.springframework.security.access.AccessDeniedException("Authenticated user required");
    }

    public Long businessId() {
        return get().getBusiness().getId();
    }
}
