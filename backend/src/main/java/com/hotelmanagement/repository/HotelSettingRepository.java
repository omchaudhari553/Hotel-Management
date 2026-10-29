package com.hotelmanagement.repository;
import com.hotelmanagement.entity.HotelSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface HotelSettingRepository extends JpaRepository<HotelSetting,Long> {
    @Query("SELECT s FROM HotelSetting s WHERE s.business.id = :businessId")
    List<HotelSetting> findAllByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT s FROM HotelSetting s WHERE s.business.id = :businessId AND s.category = :category")
    List<HotelSetting> findAllByBusinessIdAndCategory(@Param("businessId") Long businessId, @Param("category") String category);

    @Query("SELECT s FROM HotelSetting s WHERE s.business.id = :businessId AND s.category = :category AND s.settingKey = :settingKey")
    Optional<HotelSetting> findByBusinessIdAndCategoryAndSettingKey(@Param("businessId") Long businessId, @Param("category") String category, @Param("settingKey") String settingKey);
}
