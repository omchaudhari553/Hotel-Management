package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hotelmanagement.entity.BaseEntity;
import com.hotelmanagement.entity.Business;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "saas_support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SaasSupportTicket extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String ticketNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(nullable = false, length = 250)
    private String subject;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(length = 50)
    private String productCode; // 'HOTEL', 'MESS', 'CAFE'

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String priority = "MEDIUM"; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'

    @Column(length = 100)
    private String assignedTo;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SaasSupportReply> replies = new ArrayList<>();
}
