package com.hotelmanagement.entity.saas;

import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "saas_platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaasPlatformSetting extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String settingKey;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String settingValue;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "GENERAL";

    @Column(length = 250)
    private String description;
}
