package com.hotelmanagement.repository;

import com.hotelmanagement.entity.SubscriptionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SubscriptionHistoryRepository extends JpaRepository<SubscriptionHistory, Long> {

    @Query("SELECT h FROM SubscriptionHistory h WHERE h.business.id = :businessId ORDER BY h.createdAt DESC")
    List<SubscriptionHistory> findAllByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT h FROM SubscriptionHistory h ORDER BY h.createdAt DESC")
    List<SubscriptionHistory> findAllOrdered();
}

