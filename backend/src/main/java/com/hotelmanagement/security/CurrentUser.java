package com.hotelmanagement.security;

import com.hotelmanagement.entity.Branch;
import com.hotelmanagement.entity.User;
import com.hotelmanagement.enums.UserRole;
import com.hotelmanagement.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Set;

@Component 
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public User get() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            throw new AccessDeniedException("Authenticated user required");
        }
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (p instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            return users.findWithBusinessByUsernameIgnoreCase(ud.getUsername())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user required"));
        }
        if (p instanceof User u) {
            return users.findWithBusinessByUsernameIgnoreCase(u.getUsername())
                .orElse(u);
        }
        throw new AccessDeniedException("Authenticated user required");
    }

    public Long businessId() {
        return get().getBusiness().getId();
    }

    public Long branchId() {
        Branch b = get().getBranch();
        return b != null ? b.getId() : null;
    }

    public Branch branch() {
        return get().getBranch();
    }

    public boolean isBranchUser() {
        return get().getBranch() != null;
    }

    public boolean isOwner() {
        User u = get();
        return u.getRole() == UserRole.OWNER || (u.getBranch() == null && u.getRole() == UserRole.ADMIN);
    }

    public void requireOwner() {
        if (isBranchUser()) {
            throw new AccessDeniedException("Access denied: Owner privileges required. Branch users cannot access Owner Admin APIs.");
        }
    }

    public void validateBranchAccess(Long targetBranchId) {
        if (isBranchUser()) {
            Long myBranchId = branchId();
            if (targetBranchId != null && !targetBranchId.equals(myBranchId)) {
                throw new AccessDeniedException("Access denied: You are not authorized to access another branch's data.");
            }
        }
    }

    public Long resolveEnforcedBranchId(Long requestedBranchId) {
        if (isBranchUser()) {
            Long myBranchId = branchId();
            if (requestedBranchId != null && !requestedBranchId.equals(myBranchId)) {
                throw new AccessDeniedException("Access denied: You are not authorized to access data for branch ID " + requestedBranchId);
            }
            return myBranchId;
        }
        return requestedBranchId;
    }

    public Set<Long> resolveAllowedBranchIds(Long requestedBranchId) {
        if (isBranchUser()) {
            Long myBranchId = branchId();
            if (requestedBranchId != null && !requestedBranchId.equals(myBranchId)) {
                throw new AccessDeniedException("Access denied: You are not authorized to access data for branch ID " + requestedBranchId);
            }
            return Set.of(myBranchId);
        }
        if (requestedBranchId != null) {
            return Set.of(requestedBranchId);
        }
        return Collections.emptySet();
    }
}
