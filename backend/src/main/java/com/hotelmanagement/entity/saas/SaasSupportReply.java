package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "saas_support_replies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaasSupportReply extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    @JsonIgnore
    private SaasSupportTicket ticket;

    @Column(nullable = false, length = 30)
    private String senderType; // 'ADMIN', 'CUSTOMER'

    @Column(nullable = false, length = 100)
    private String senderName;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private boolean isInternal = false;
}
