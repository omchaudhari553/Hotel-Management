package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasPlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaasPlatformSettingRepository extends JpaRepository<SaasPlatformSetting, Long> {
    Optional<SaasPlatformSetting> findBySettingKey(String settingKey);
    List<SaasPlatformSetting> findAllByCategory(String category);
}
