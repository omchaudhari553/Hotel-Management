package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.*;

@Entity @Table(name="refresh_tokens", indexes=@Index(name="idx_refresh_token",columnList="token"))@Getter @Setter @NoArgsConstructor
public class RefreshToken extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") private User user;
    @Column(nullable=false,unique=true,length=120) private String token;
    @Column(nullable=false) private LocalDateTime expiresAt;
    @Column(nullable=false) private boolean revoked=false;
}
