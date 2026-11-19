package com.hotelmanagement.repository;

import com.hotelmanagement.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByBusinessIdOrderByCreatedAtDesc(Long businessId);
    List<Notification> findAllByBusinessIdAndBranchIdOrderByCreatedAtDesc(Long businessId, Long branchId);
    long countByBusinessIdAndReadFalse(Long businessId);
    Optional<Notification> findByIdAndBusinessId(Long id, Long businessId);
    boolean existsByBusinessIdAndTypeAndTitle(Long businessId, String type, String title);
}
