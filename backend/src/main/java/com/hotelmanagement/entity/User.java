package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="users", uniqueConstraints= {
    @UniqueConstraint(name="uk_user_username",columnNames="username"),@UniqueConstraint(name="uk_user_email",columnNames="email")
}
)@Getter @Setter @NoArgsConstructor
public class User extends BaseEntity implements org.springframework.security.core.userdetails.UserDetails {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String username,email,fullName;
    private String phone;
    @Column(nullable=false) private String passwordHash;
    @Column(nullable=false) private boolean active=true;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.UserRole role=com.hotelmanagement.enums.UserRole.ADMIN;

    public boolean isSuperAdmin() {
        return this.role == com.hotelmanagement.enums.UserRole.SUPER_ADMIN || this.role == com.hotelmanagement.enums.UserRole.PLATFORM_ADMIN || "superadmin".equalsIgnoreCase(this.username);
    }

    public boolean isOwner() {
        return isSuperAdmin() || this.role == com.hotelmanagement.enums.UserRole.OWNER || (this.branch == null && this.role == com.hotelmanagement.enums.UserRole.ADMIN);
    }

    public boolean isBranchUser() {
        return this.branch != null;
    }

    @Override public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority> getAuthorities() {
        return java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_"+role.name()));
    }
    @Override public String getPassword() {
        return passwordHash;
    }
    @Override public String getUsername() {
        return username;
    }
    @Override public boolean isAccountNonExpired() {
        return true;
    }
    @Override public boolean isAccountNonLocked() {
        return active;
    }
    @Override public boolean isCredentialsNonExpired() {
        return true;
    }
    @Override public boolean isEnabled() {
        return active;
    }
}
