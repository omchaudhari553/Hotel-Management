package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "saas_product_modules", uniqueConstraints = {
    @UniqueConstraint(name = "uk_saas_module_prod_code", columnNames = {"product_id", "code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaasProductModule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private SaasProduct product;

    @Column(nullable = false, length = 80)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean isCore = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
