package com.hotelmanagement.entity.saas;

import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "saas_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaasProduct extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code; // 'HOTEL', 'MESS', 'CAFE'

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(length = 50)
    private String icon;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SaasProductModule> modules = new ArrayList<>();
}
