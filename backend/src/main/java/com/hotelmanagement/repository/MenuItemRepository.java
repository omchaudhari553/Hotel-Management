package com.hotelmanagement.repository;
import com.hotelmanagement.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface MenuItemRepository extends JpaRepository<MenuItem,Long> {
    List<MenuItem> findAllByBusinessId(Long businessId);
    List<MenuItem> findAllByBusinessIdAndActiveTrue(Long businessId);
    Optional<MenuItem> findByIdAndBusinessId(Long id, Long businessId);
}
